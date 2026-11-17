import { createClient } from '@/utils/supabase/server';
import HomeContent from './home-content';

export default async function Home() {
  const supabase = createClient();
  const { data: todos } = await supabase.from('todos').select();

  return <HomeContent todos={todos ?? []} />;
}
