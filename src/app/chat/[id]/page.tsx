import { cookies } from 'next/headers';
import { DEFAULT_MODEL_NAME, models } from '@/ai/models';
import { Chat as PreviewChat } from '@/components/chat';

export default async function Page(props: { params: Promise<any> }) {
  const params = await props.params;
  const { id } = params;
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
  return <PreviewChat id={id} selectedModelId={selectedModelId} settings={parsedSettings}/>;
}