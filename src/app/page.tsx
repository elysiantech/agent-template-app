import { cookies } from 'next/headers';
import { Chat } from '@/components/chat';
import { DEFAULT_MODEL_NAME, models } from '@/ai/models';
import { v4 as uuidv4 } from 'uuid';

export default async function Page() {
  const id = uuidv4();
  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get('model-id')?.value;
  const selectedModelId =  models.find((model) => model.id === modelIdFromCookie)?.id || DEFAULT_MODEL_NAME;
  const settingsCookie = cookieStore.get('settings')?.value;

  let parsedSettings: Record<string, any> = {};
  if (settingsCookie) {
    try {
      parsedSettings = JSON.parse(settingsCookie);
    } catch (error) {
    }
  }
  return (
    <main className="flex flex-col h-screen w-full">
      <Chat key={id} id={id} selectedModelId={selectedModelId} settings={parsedSettings}/>
    </main>
  )
}