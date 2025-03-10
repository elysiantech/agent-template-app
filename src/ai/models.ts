
export interface Model {
    id: string; // User-visible ID (e.g., "gpt-4o")
    modelName: string; // Model name used by the provider (e.g., "gpt-4o-2024-05-13")
    description: string;
    provider: string;
}
  
  export const models: Array<Model> = [
    {
      id: 'gpt-4o-mini',
      modelName: 'gpt-4o-2024-05-13', // Assuming this is the current model name from OpenAI
      description: 'Small, fast model for quick tasks.',
      provider: 'openai',
    },
    {
      id: 'gpt-4o',
      modelName: 'gpt-4o-2024-05-13', // Assuming this is the current model name from OpenAI
      description: 'Powerful model for complex, multi-step tasks.',
      provider: 'openai',
    },
    {
      id: 'o1',
      modelName: 'o1', // Placeholder - replace with actual model name
      description: 'Advanced model for deep reasoning and complex tasks.',
      provider: 'openai',
    },
    {
      id: 'o1-mini',
      modelName: 'o1-mini', // Placeholder - replace with actual model name
      description: 'A smaller version of the o1 for deep reasoning and complex tasks',
      provider: 'openai',
    },
    {
      id: 'o3-mini',
      modelName: 'o3-mini', // Placeholder - replace with actual model name
      description: 'Cost-effective option for deep reasoning and complex tasks.',
      provider: 'openai',
    },
    {
      id: 'deepseek-v3',
      modelName: 'accounts/fireworks/models/deepseek-v3',
      description: 'General-purpose model from DeepSeek.',
      provider: 'fireworks',
    },
    {
      id: 'Qwen-32b-Chat',
      modelName: 'accounts/fireworks/models/qwq-32b',
      description: 'Large, multimodal language model from Qwen, optimized for chat.',
      provider: 'fireworks',
    },
    {
      id: 'Gemini-1.5 Pro',
      modelName: 'gemini-1.5-pro-latest',
      description: 'Large, multimodal language model from Google.',
      provider: 'google',
    },
    {
      id: 'deepseek-ai/DeepSeek-R1',
      modelName: 'deepseek-ai/DeepSeek-R1', 
      description: 'High-performance model from DeepSeek.',
      provider: 'togetherai',
    },
  ];
  
export const DEFAULT_MODEL_NAME = 'gpt-4o-mini';
  
