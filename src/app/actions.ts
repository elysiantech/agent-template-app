'use server';

import { createOpenAI } from '@ai-sdk/openai';
import { type CoreUserMessage, generateText, generateObject, Message, convertToCoreMessages } from 'ai';
import { cookies } from 'next/headers';
import { models, Model } from '@/ai/models'
import  { getToolsInfo  } from '@/ai/tools'
import { z } from 'zod'

export const getAvailableToolsInfo = async () => getToolsInfo()

const suggestSchema = z.object({
  suggestions: z.array(z.string()).length(3),
});

export async function saveModelId(model: string) {
  console.log('serverAction: saveModelId')
  const cookieStore = await cookies();
  cookieStore.set('model-id', model);
}

export async function saveSettingsAction(settings: Record<string, any>) {
  console.log('serverAction: saveSettings')
  const cookieStore = await cookies();
  cookieStore.set('settings', JSON.stringify(settings));
}

export async function generateSuggestions({ messages }: { messages: Message[] }) {
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const filteredMessages = messages.filter(
    (msg) => !(msg.toolInvocations && msg.toolInvocations.length > 0)
  );
    
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    temperature: 0,
    maxTokens: 300,
    topP: 0.3,
    topK: 7,
    system: `
      You generate follow-up queries or commands **from the user's perspective** to help refine their analysis.
      
      **Your role:**
      - **Anticipate the user's next logical question** based on what they are asking.
      - **Encourage deeper insights**, helping the user refine their understanding.
      - **Ensure suggestions build on what’s already discussed**, avoiding redundant or generic questions.
      - Maintain the **user's voice**, avoiding assistant-like phrasing.

      **Guidelines:**
      - If the user **focused on a detail (e.g., 'the boy')**, suggest a **deeper** aspect (e.g., "What is he doing?" or "How does he react?").
      - If the user **is summarizing**, suggest **next steps** (e.g., "What do these details suggest?").
      - If the user **asks for a description**, suggest **contextual insights** (e.g., "How does this setting affect the scene?").
      - Avoid vague suggestions like **"What details should I focus on?"** unless the user has expressed uncertainty.

      **Rules:**
      - Generate exactly **3** follow-up queries or commands.
      - Write them in **first-person**, as if the user is asking/thinking.
      - Keep them **concise (5-10 words)** while maintaining full context.

      **Examples:**
      - Instead of: "Would you like to analyze X?"  
        -> "How does X affect the scene?"
      - Instead of: "Do you want more details on Y?"  
        -> "What stands out about Y"
      - Instead of: "Shall we explore Z further?"  
        -> "What does Z suggest or reveal?"
    `,
    messages:filteredMessages,
    schema: suggestSchema,
  });

  return object.suggestions;
}

export async function generateTitleFromUserMessage({message}: { message: CoreUserMessage;}) {
  console.log('serverAction: generateTitleFromUserMessage')
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const { text: title } = await generateText({
    model: openai('gpt-4o-mini'),
    system: `\n
    - you will generate a short title based on the first message a user begins a conversation with
    - ensure it is not more than 80 characters long
    - the title should be a summary of the user's message
    - do not use quotes or colons`,
    prompt: JSON.stringify(message),
  });

  return title;
}

export async function generateSpeech(text: string) {
  const data = {
    text,
    model_id: 'eleven_turbo_v2_5',
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.5,
    },
  }
  
  const VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb'
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`
  const response = await fetch(url, {
    method:'POST',
    body:JSON.stringify(data),
    headers:{
      Accept: 'audio/mpeg',
      'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      'Content-Type': 'application/json',
    }
  })
  const arrayBuffer = await response.arrayBuffer();
  const base64Audio = Buffer.from(arrayBuffer).toString('base64');
  return { audio: `data:audio/mp3;base64,${base64Audio}`};
}

export async function getModels(): Promise<Model[]> {
  return models.filter((model) => {
    switch (model.provider) {
      case 'openai':
        return !!process.env.OPENAI_API_KEY;
      case 'fireworks':
        return !!process.env.FIREWORKS_API_KEY;
      case 'deepinfra':
        return !!process.env.DEEPINFRA_API_KEY;
      case 'google':
        return !!process.env.GOOGLE_API_KEY;
      case 'togetherai':
        return !!process.env.TOGETHER_API_KEY;
      default:
        console.warn(`Unknown provider: ${model.provider} or missing API Key.`);
        return false;
    }
  });
}


