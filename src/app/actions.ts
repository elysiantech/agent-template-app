'use server';

import { createOpenAI } from '@ai-sdk/openai';
import { type CoreUserMessage, generateText, generateObject, Message } from 'ai';
import { cookies } from 'next/headers';
import { z } from 'zod'

const suggestSchema = z.object({
  suggestions: z.array(z.string().max(30)).length(3),
});

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

export async function generateSuggestions({messages}: { messages: Message[]}) {
  const { object } = await generateObject({
    model: openai('gpt-4o-mini'),
    temperature: 0,
    maxTokens: 300,
    topP: 0.3,
    topK: 7,  
    system:
      `You are a search engine query/questions generator. You 'have' to create only '3' questions for the search engine based on the message history which has been provided to you.
      The questions should be open-ended and should encourage further discussion while maintaining the whole context. Limit it to 5-10 words per question.`,
    messages,
    schema: suggestSchema,
  })
  console.log('serverAction:', object)  
  
  return { success:true, content:object }
}

export async function generateTitleFromUserMessage({message}: { message: CoreUserMessage;}) {
  console.log('serverAction: generateTitleFromUserMessage')
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