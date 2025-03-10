import { Message } from "ai";
import { AIMessage, AIMessageChunk, ChatMessage, HumanMessage, } from "@langchain/core/messages";
import { agent } from './graph'
import { models } from '@/ai/models';
import { formatDataStreamPart, Attachment} from "@ai-sdk/ui-utils"

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { messages, modelId, userId, ...options } = await request.json();
    const {temperature, maxTokens } = options;
    const model = models.find((model) => model.id === modelId);
    if (!model) return new Response('Model not found', { status: 404 });
    

    const eventStream = agent.streamEvents({
        messages: convertToLangChainMessages(messages)
      }, 
      { 
        version:"v2", 
        streamMode:['updates', 'custom'],
        configurable: { 
          userId,
          modelId,
          thread_id: "2",
        },
        recursionLimit: 50,
      }
    )
    
    const finalStream = toDataStream(eventStream)
    return new Response(finalStream, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "x-vercel-ai-data-stream": "v1",
      },
    });
  } catch (error) {
    console.error('Request processing error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

function toDataStream(stream: ReadableStream) {
  const encoder = new TextEncoder();
  return stream.pipeThrough(new TransformStream({
        transform: async (value, controller) => {
      if (typeof value === 'string') return controller.enqueue(value);
      const chunk = value.data.chunk;
      if (value.event === 'on_chat_model_stream') {
        const msg = chunk as AIMessageChunk
        if ((msg.tool_call_chunks?.length ?? 0) > 0) {
				} else if (msg.content) 
          controller.enqueue(encoder.encode(formatDataStreamPart("text", msg.content.toString())));
      } 
      else if (value.event === 'on_tool_end') {
        controller.enqueue(encoder.encode(
          formatDataStreamPart('tool_call', {
            toolCallId: value.data.output.tool_call_id,
            toolName: value.name,
            args:JSON.parse(value.data.input.input),
          })))
          controller.enqueue(
            encoder.encode(
              formatDataStreamPart('tool_result', {
                toolCallId: value.data.output.tool_call_id,
                result: value.data.output.content,
              })
            )
          );
          controller.enqueue(
            encoder.encode(
              formatDataStreamPart('finish_step', {
                finishReason: 'tool-calls',
                usage:{ promptTokens:0, completionTokens: 0},
                isContinued: false,
              })
            )
          );
      }
    },
  }));
}

const convertToLangChainMessages = (messages: Message[]) => {
  return messages.map(({ role, content }) => {
    if (role === 'user') {
      return new HumanMessage(content)
    } else if (role === 'assistant') {
    return new AIMessage(content)
    } else {
      return new ChatMessage(content, role)
    }
  })
}
