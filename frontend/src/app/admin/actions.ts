'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/session';

async function admin() {
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/auth/login?next=/admin');
  const { data } = await supabase.rpc('is_admin');
  if (data !== true) redirect('/');
  return { supabase, user };
}

const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
};

function done(tab: string, msg?: string): never {
  revalidatePath('/admin');
  revalidatePath('/courts');
  revalidatePath('/games');
  redirect(`/admin?tab=${tab}${msg ? `&msg=${encodeURIComponent(msg)}` : ''}`);
}

export async function updateReport(f: FormData) {
  const { supabase } = await admin();
  const { error } = await supabase.rpc('admin_update_report', {
    p_report_id: str(f, 'id'),
    p_status: str(f, 'status'),
    p_note: str(f, 'note'),
  });
  done('reports', error ? error.message : 'Report updated');
}

export async function removeGame(f: FormData) {
  const { supabase } = await admin();
  const { error } = await supabase.rpc('admin_remove_game', { p_game_id: str(f, 'id'), p_reason: str(f, 'reason') ?? 'Removed by moderator' });
  done(str(f, 'tab') ?? 'games', error ? error.message : 'Game removed and players notified');
}

export async function setSuspension(f: FormData) {
  const { supabase } = await admin();
  const { error } = await supabase.rpc('admin_set_suspension', {
    p_user_id: str(f, 'user_id'),
    p_suspend: f.get('suspend') === '1',
    p_reason: str(f, 'reason'),
  });
  done(str(f, 'tab') ?? 'users', error ? error.message : 'Account updated');
}

export async function updateLocation(f: FormData) {
  const { supabase } = await admin();
  const id = str(f, 'id');
  const fields = [
    'name', 'address', 'phone', 'maps_query', 'court_notes', 'hours_summary', 'reservation_info', 'first_come_info',
    'open_gym_info', 'rental_info', 'contact_method', 'official_url', 'schedule_url', 'reservation_url', 'status_note',
  ];
  const patch: Record<string, unknown> = {};
  for (const k of fields) patch[k] = str(f, k);
  patch.status = str(f, 'status') ?? 'open';
  patch.accepts_games = f.get('accepts_games') === 'on';
  patch.has_lights = f.get('has_lights') === 'on';
  const courts = Number(str(f, 'court_count'));
  patch.court_count = Number.isFinite(courts) && courts > 0 ? courts : null;
  patch.access_types = f.getAll('access_types').map(String);
  patch.info_checked_on = str(f, 'info_checked_on');
  if (!patch.name) done('locations', 'Name is required');
  const { error } = await supabase.from('locations').update(patch).eq('id', id);
  done('locations', error ? error.message : 'Location saved');
}

export async function addHours(f: FormData) {
  const { supabase } = await admin();
  const days = f.getAll('days').map(Number).filter((d) => d >= 0 && d <= 6);
  if (!days.length) done('locations', 'Choose at least one day');
  const rows = days.map((d) => ({
    location_id: str(f, 'location_id'),
    day_of_week: d,
    open_time: str(f, 'open_time'),
    close_time: str(f, 'close_time'),
    valid_from: str(f, 'valid_from'),
    valid_until: str(f, 'valid_until'),
    note: str(f, 'note'),
  }));
  const { error } = await supabase.from('location_hours').insert(rows);
  done('locations', error ? error.message : 'Hours added');
}

export async function deleteHours(f: FormData) {
  const { supabase } = await admin();
  const { error } = await supabase.from('location_hours').delete().eq('id', str(f, 'id'));
  done('locations', error ? error.message : 'Hours removed');
}

export async function addClosure(f: FormData) {
  const { supabase } = await admin();
  const scope = str(f, 'scope') ?? '';
  const row = {
    location_id: scope.startsWith('loc:') ? scope.slice(4) : null,
    setting: scope === 'outdoor' || scope === 'indoor' ? scope : null,
    starts_on: str(f, 'starts_on'),
    ends_on: str(f, 'ends_on') ?? str(f, 'starts_on'),
    start_time: str(f, 'start_time'),
    end_time: str(f, 'end_time'),
    reason: str(f, 'reason') ?? 'Closed',
  };
  if ((row.start_time && !row.end_time) || (!row.start_time && row.end_time)) done('closures', 'Give both a start and end time, or neither');
  const { error } = await supabase.from('location_closures').insert(row);
  done('closures', error ? error.message : 'Closure added');
}

export async function deleteClosure(f: FormData) {
  const { supabase } = await admin();
  const { error } = await supabase.from('location_closures').delete().eq('id', str(f, 'id'));
  done('closures', error ? error.message : 'Closure removed');
}

export async function updateLink(f: FormData) {
  const { supabase } = await admin();
  const { error } = await supabase
    .from('official_links')
    .update({ label: str(f, 'label'), url: str(f, 'url'), description: str(f, 'description'), updated_at: new Date().toISOString() })
    .eq('key', str(f, 'key'));
  done('links', error ? error.message : 'Link saved');
}
