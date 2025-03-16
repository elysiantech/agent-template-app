import { createOpenAI } from "@ai-sdk/openai";
import { createTogetherAI } from '@ai-sdk/togetherai';
import { createFireworks } from '@ai-sdk/fireworks'
import { createDeepInfra } from '@ai-sdk/deepinfra'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamText, createDataStreamResponse } from "ai";
import { tool } from "ai";
import { models } from '@/ai/models';
import { tools as langchainTools } from "@/ai/tools"
import { z } from "zod";

export const maxDuration = 60;

const tools = langchainTools.reduce((acc, tool) => {
  const { tool: toolDef } = tool;
  const convertedTool = convertTool(toolDef);
  return { ...acc, ...convertedTool };
}, {} as Record<string, any>); // Ensure it's an object

const modelProvider: Record<string, any> = {
  openai: createOpenAI({apiKey:process.env.OPENAI_API_KEY}),
  togetherai: createTogetherAI({apiKey:process.env.TOGETHER_API_KEY}),
  fireworks: createFireworks({apiKey:process.env.FIREWORKS_API_KEY}),
  google: createGoogleGenerativeAI({apiKey:process.env.GOOGLE_API_KEY}),
  deepinfra: createDeepInfra({apiKey:process.env.DEEPINFRA_API_KEY}),
}

export async function POST(request: Request) {
  try {
    const { messages, modelId, userId, selectedTools, customInstructions } = await request.json();
    const model = models.find((model) => model.id === modelId);
    if (!model) return new Response('Model not found', { status: 404 });
    const provider = modelProvider[model.provider]

    const agentTools =
      selectedTools && selectedTools.length > 0
        ? Object.fromEntries(Object.entries(tools).filter(([name]) => selectedTools.includes(name)))
        : {};
    
    const currentMessage = messages[messages.length - 1]; 
    const { experimental_attachments, toolInvocations } = currentMessage   
    return createDataStreamResponse({
      execute: (dataStream) => {
        const result = streamText({
          model: provider(model.modelName),
          messages,
          system:`
          You are a highly capable AI assistant with advanced reasoning and tool-usage abilities.
          You adapt dynamically to user needs, whether analyzing content, generating insights, or assisting with technical tasks.
          Use all available tools effectively before responding to ensure accuracy and completeness.
          Today's date: ${new Date().toString()}
          \n\n${customInstructions}`,
          onStepFinish:({ toolResults, toolCalls, finishReason }) =>{},
          tools:{
            ...agentTools,
            askForConfirmation: {
              description: 'Ask the user for confirmation.',
              parameters: z.object({
                message: z.string().describe('The message to ask for confirmation.'),
              }),
            },
            authTool: {
              description: "Request OAuth2 authentication from the user via a popup login.",
              parameters: z.object({
                provider: z.enum(["google", "github"]).describe("OAuth provider.")
                .describe("The authentication provider the user will use."),
              }),
            }
          },
        });
        dataStream.writeData({ type: 'title', content: "This is a data stream message"});
        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true,
        });
      }
    });
  } catch (error) {
    console.error('Request processing error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

function convertTool(
  toolDef:{name: string; description: string; schema: z.AnyZodObject },
) {
  // @ts-ignore
  const toolCallFn = toolDef.func;
  return {[toolDef.name]: tool({
    description: toolDef.description,
    parameters: toolDef.schema,
    execute: async (args: any) => {
      return await toolCallFn(args);
    },
  }) }
}