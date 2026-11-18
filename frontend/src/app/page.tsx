import { createClient } from '@/utils/supabase/server';
import type { GameView } from '@/lib/db-types';
import HomeContent from './home-content';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let games: GameView[] = [];
  let signedIn = false;
  try {
    const supabase = createClient();
    const [{ data }, { data: auth }] = await Promise.all([
      supabase
        .from('community_games_view')
        .select('*')
        .eq('status', 'scheduled')
        .eq('is_past', false)
        .order('game_date')
        .order('start_time')
        .limit(3),
      supabase.auth.getUser(),
    ]);
    games = (data ?? []) as GameView[];
    signedIn = !!auth.user;
  } catch {
    // Show the page without listings if the database isn't reachable.
  }

  return <HomeContent games={games} signedIn={signedIn} />;
}
