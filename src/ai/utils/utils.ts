import { RunnableConfig } from '@langchain/core/runnables';
import { ChatOpenAI } from "@langchain/openai";
import { ChatFireworks } from "@langchain/community/chat_models/fireworks"
import { ChatDeepInfra } from "@langchain/community/chat_models/deepinfra"
import { models, DEFAULT_MODEL_NAME } from '@/ai/models';

export async function getModelFromConfig(
    config: RunnableConfig
): Promise<any> {
    const { modelId } = config.configurable as { modelId: string };
    const model = models.find((model) => model.id === modelId);
    if (!model) throw 'Model not found'
    const { provider, modelName } = model;
    
    switch(provider){
        case "openai":
          return new ChatOpenAI({ modelName, apiKey:process.env.OPENAI_API_KEY});
        case "fireworks":
          return new ChatFireworks({ modelName, apiKey:process.env.FIREWORKS_API_KEY });
        case "deepinfra":
          return new ChatDeepInfra({ model:modelName, apiKey:process.env.DEEPINFRA_API_KEY });
        // case "togetherai":
        //   return new ChatTogetherAI({ modelName, apiKey:process.env.TOGETHER_API_KEY });
        // case "google":
        //   return new ChatGoogle({ modelName, apiKey:process.env.GOOGLE_API_KEY });
        default:
          return new ChatOpenAI({ modelName:DEFAULT_MODEL_NAME, apiKey:process.env.OPENAI_API_KEY});
    }
}
  