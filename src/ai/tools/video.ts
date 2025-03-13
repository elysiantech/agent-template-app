import { Runnable, RunnableConfig } from "@langchain/core/runnables";
import { BaseLanguageModelInput } from "@langchain/core/language_models/base";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { searchDocuments } from "@/ai/utils/opensearch";
import { AIMessage, SystemMessage, ToolMessage, HumanMessage } from "@langchain/core/messages";
import { MessagesAnnotation } from '@langchain/langgraph'
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ChatOpenAI } from "@langchain/openai";
import { ChatFireworks } from "@langchain/community/chat_models/fireworks"

const s3Client = new S3Client({ region: process.env.AWS_REGION! });

const llm = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0, verbose: false });
const qwen2VL = new ChatFireworks({model:"accounts/fireworks/models/qwen2-vl-72b-instruct", apiKey: process.env.FIREWORKS_API_KEY})

export const searchDocumentsToolSchema = z.object({
  //assetId: z.string().describe("Unique identifier for the media asset.")
  queryText: z.string().optional().describe("Semantic search query for relevant content."),
  timestamp: z.object({
    start: z.number()
      .describe("Start time (in seconds) for filtering video content")
      .optional(),
    end: z.number()
      .describe("End time (in seconds) for filtering video content")
      .optional()
  }).optional().describe("Retrieve content from a specific timestamp (in seconds)."),
  mediaType: z.enum(["image", "audio"]).describe("Specify 'image' to retrieve video frames or 'audio' to retrieve transcripts and sound descriptions."),
  numberOfResults: z.number().int().min(1).max(100)
    .describe("Maximum number of search results to return")
    .default(10)
    .optional()
}).describe("Search filters and retrieval options.");

export const retrieveVideoTool = tool(
  async ({ timestamp, queryText, mediaType, numberOfResults }, config?: RunnableConfig) => {
    const { assetId } = config?.configurable as { assetId: string };

    const filters: Record<string, any> = {};
    if (timestamp?.start !== undefined) filters.timestamp = { gte: timestamp.start };
    if (timestamp?.end !== undefined) filters.timestamp = { lte: timestamp.end, ...filters.timestamp }
    if (mediaType) filters.mediaType = mediaType;

    const documents = await searchDocuments(assetId, { filters, numberOfResults, queryText });
    const sortedDocs = documents.sort((a: any, b: any) => a.metadata.timestamp - b.metadata.timestamp);
    

    if (mediaType === "audio") {
      const content = sortedDocs
          .filter((doc: any) => doc.metadata.mediaType === "audio")
          .map((doc: any) => `${new Date(doc.metadata.timestamp * 1000).toISOString()}: ${doc.text}`)
          .join("\n");
      const metadata = sortedDocs
        .filter((doc: any) => doc.metadata.mediaType === "audio")
        .map((doc: any) => doc.metadata);

      return [
          content ? `audio transcription:\n${content}` : "no audio found or silence",
          metadata,
      ];
    }
    const metadata = sortedDocs
        .filter((doc: any) => doc.metadata.mediaType === "image")
        .map((doc: any) => doc.metadata);
    const minFrameTs = sortedDocs[0]?.metadata.timestamp
      ? new Date(sortedDocs[0].metadata.timestamp * 1000).toISOString()
      : null;
    const maxFrameTs = sortedDocs[sortedDocs.length - 1]?.metadata.timestamp
      ? new Date(sortedDocs[sortedDocs.length - 1].metadata.timestamp * 1000).toISOString()
      : null;
    const content =
      minFrameTs && maxFrameTs
        ? `successfully retrieved frames from ${minFrameTs} - ${maxFrameTs}`
        : "no frames retrieved";

    return [content, metadata];
  },
  {
    name: "videoSearch",
    description: "Retrieves frames and captions from the video feed. Can retrieve by text query, audio transcriptions, or metadata based on filters or semantic search.",
    schema: searchDocumentsToolSchema,
    responseFormat: 'content_and_artifact',
    returnDirect: true,
  }
)

const visionToolSchema = z.object({
  timestamps: z
    .array(
      // z.number(), // For internal calculations
      z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid ISO timestamp" })
    ).min(1).max(2)
    .describe(
      "Array of timestamps in seconds (as numbers or as ISO 8601 strings). Provide one number for a single frame or two numbers for a start-stop range."
    ),    
  detail: z.enum(['low', 'high'])
    .describe('Fidelity of the analysis. For detailed analysis, use "high". For general questions, use "low".'),
  query: z.optional(z.string()).describe("Detailed instruction of what specific objects or details to analyze and extract,"),
  
})

const createVisionTool = (
  name: string,
  description: string,
  llm: Runnable<BaseLanguageModelInput, any, RunnableConfig>, 
  systemPrompt: string
) => {
  return (state: typeof MessagesAnnotation.State) => 
    tool(
      async ({ timestamps, query, detail }: z.infer<typeof visionToolSchema>) => {
        if (!timestamps || timestamps.length === 0) {
          throw new Error("No timestamps provided for image processing.");
        }
        const toolMessages = state.messages.filter((message) => message instanceof ToolMessage);
        const lastToolMessage = toolMessages[toolMessages.length - 1];
        if  (lastToolMessage?.name?.startsWith("retrieve") && lastToolMessage.artifact){
          const images = await Promise.all(
            lastToolMessage.artifact
              .filter((frame:any) => {
                const frameTs = frame.timestamp; // Assume `timestamp` is in seconds
                const startTs = parseFloat(timestamps[0]); // Convert string to number
                const endTs = timestamps.length > 1 ? parseFloat(timestamps[1]) : startTs; // If single timestamp, start === end
          
                return frameTs >= startTs && frameTs <= endTs; // Ensure frame is within the requested range
              })
              .map(async (frame:any) => {
                // Generate signed URL for the frame
                const frameUrl = await getSignedUrl(
                  s3Client,
                  new GetObjectCommand({ Bucket: process.env.AWS_BUCKET, Key: frame.key }),
                  { expiresIn: 3600 }
                );
          
                return {
                  timestamp: new Date(frame.timestamp * 1000).toISOString(), // Convert to ISO 8601
                  image_url: frameUrl,
                };
              })
          );
          
        
          // Construct the LLM messages: systemPrompt + interleaved images and timestamps
          const messages:any[] = [
            new SystemMessage(systemPrompt),
            new HumanMessage({
              content: [
                { type: "text", text: query ? `Query: ${query}` : "Analyze the provided frames." }, 
                ...images.flatMap(({ timestamp, image_url }) => [
                { type: "text", text: `Timestamp: ${timestamp}`  },
                { type: "image_url", image_url: { url: image_url } },
                ])
              ] as ({ type: "text"; text: string } | { type: "image"; image: string })[]
            })
          ];

          const response = await llm.invoke(messages);
          return response.content || ""
        }
        return ""
      },
      {
        name,
        description,
        schema: visionToolSchema,
        // returnDirect: true,
      }
    );
};


export const imageCaptioningTool = createVisionTool(
  "imageCaptioning",
  "Generates a descriptive caption for retrieved video frames.",
  llm,
  "You are an AI that generates meaningful captions for images.",
 );

export const objectDetectionTool = createVisionTool(
  "objectDetection",
  "Detects objects present in retrieved video frames.",
  llm,
  "You are an AI specialized in identifying objects in images.",
 );

const bboxSchema = z.object({
  detections: z.array(
    z.object({
      label: z.string().describe("The detected object's label"),
      box: z.tuple([
        z.number().describe("x_min"),
        z.number().describe("y_min"),
        z.number().describe("x_max"),
        z.number().describe("y_max")
      ]).describe("Bounding box coordinates in pixels")
    })
  ).describe("List of detected objects and their bounding boxes")
});

export const boundingBoxTool = createVisionTool(
  "boundingBoxDetection",
  "Detects objects and provides bounding box coordinates in retrieved video frames.",
  qwen2VL,
  "You are an AI specialized in detecting objects. Generate bounding box coordinates for detected objects in JSON",
);
