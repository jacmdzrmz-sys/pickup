import { requireUser } from '@/lib/session';
import { getOfficialLinks } from '@/lib/official';
import type { Location, LocationClosure, LocationHours } from '@/lib/db-types';
import { addDays, evanstonNowTime, evanstonToday } from '@/lib/time';
import CreateGameForm from './create-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Create a Game · Evanston Dinks' };

export default async function NewGamePage({ searchParams }: { searchParams: { location?: string } }) {
  const { supabase } = await requireUser('/games/new');
  const today = evanstonToday();

  const [{ data: locs }, { data: hours }, { data: closures }, links] = await Promise.all([
    supabase.from('locations').select('*').order('sort_order'),
    supabase.from('location_hours').select('*'),
    supabase.from('location_closures').select('*').gte('ends_on', today).lte('starts_on', addDays(today, 60)),
    getOfficialLinks(supabase),
  ]);

  const locations = (locs ?? []) as Location[];
  const initial = locations.find((l) => l.slug === searchParams.location);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900">Create a Game</h1>
      <p className="mt-1 text-sm text-gray-600">Takes less than a minute. Creating a game does not reserve a public court.</p>
      <CreateGameForm
        locations={locations}
        hours={(hours ?? []) as LocationHours[]}
        closures={(closures ?? []) as LocationClosure[]}
        today={today}
        nowTime={evanstonNowTime()}
        initialLocationId={initial?.id}
        links={links}
      />
    </main>
  );
}
