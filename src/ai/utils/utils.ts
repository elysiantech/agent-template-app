import { RunnableConfig } from '@langchain/core/runnables';
import { ChatOpenAI } from "@langchain/openai";
import { ChatFireworks } from "@langchain/community/chat_models/fireworks"
import { ChatDeepInfra } from "@langchain/community/chat_models/deepinfra"
import { models, DEFAULT_MODEL_NAME } from '@/ai/models';

import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({ region: process.env.AWS_REGION! });

export const getPublicUrl = async (key:string) => getSignedUrl(s3Client, new GetObjectCommand({ Bucket: process.env.AWS_BUCKET, Key: key }), { expiresIn: 3600 })

export async function getModelFromId(modelId:string, options:any={}): Promise<any> {
   const model = models.find((model) => model.id === modelId);
    if (!model) throw 'Model not found'
    const { provider, modelName } = model;
    
    switch(provider){
        case "openai":
          return new ChatOpenAI({ modelName, apiKey:process.env.OPENAI_API_KEY, ...options});
        case "fireworks":
          return new ChatFireworks({ modelName, apiKey:process.env.FIREWORKS_API_KEY, ...options });
        case "deepinfra":
          return new ChatDeepInfra({ model:modelName, apiKey:process.env.DEEPINFRA_API_KEY, ...options });
        // case "togetherai":
        //   return new ChatTogetherAI({ modelName, apiKey:process.env.TOGETHER_API_KEY });
        // case "google":
        //   return new ChatGoogle({ modelName, apiKey:process.env.GOOGLE_API_KEY });
        default:
          return new ChatOpenAI({ modelName:DEFAULT_MODEL_NAME, apiKey:process.env.OPENAI_API_KEY, ...options});
    }
}
  