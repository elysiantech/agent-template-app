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

const tools = langchainTools.reduce((acc, toolDef) => {
  const convertedTool = convertTool(toolDef);
  return { ...acc, ...convertedTool };
}, {});

const modelProvider: Record<string, any> = {
  openai: createOpenAI({apiKey:process.env.OPENAI_API_KEY}),
  togetherai: createTogetherAI({apiKey:process.env.TOGETHER_API_KEY}),
  fireworks: createFireworks({apiKey:process.env.FIREWORKS_API_KEY}),
  google: createGoogleGenerativeAI({apiKey:process.env.GOOGLE_API_KEY}),
  deepinfra: createDeepInfra({apiKey:process.env.DEEPINFRA_API_KEY}),
}

export async function POST(request: Request) {
  try {
    const { messages, modelId, userId, ...options } = await request.json();
    const {temperature, maxTokens, maxSteps } = options;
    const model = models.find((model) => model.id === modelId);
    if (!model) return new Response('Model not found', { status: 404 });
    const provider = modelProvider[model.provider]

    return createDataStreamResponse({
      execute: (dataStream) => {
        const currentMessage = messages[messages.length - 1];
        const messageId = currentMessage.id;
        dataStream.writeData({
          type: 'user-message-id',
          content: messageId,
        });
  
        const result = streamText({
          model: provider(model.modelName),
          messages,
          temperature: temperature || 0.7,
          // maxTokens: maxTokens || 16384,
          // maxSteps: maxSteps || 5,
          system:`You are a helpful assistant.\n Today's date:${new Date().toString()}`,
          onStepFinish:({ toolResults, toolCalls, finishReason }) =>{
          },
          tools,
        });
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