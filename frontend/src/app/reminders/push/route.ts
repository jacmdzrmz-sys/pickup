import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'crypto';
import { isPushEndpoint } from '@/lib/push';

// Called every few minutes by the database scheduler (pg_cron + pg_net) with
// the reminders that are due. Sends each one as a phone notification.
export const dynamic = 'force-dynamic';

type Message = { endpoint: string; p256dh: string; auth: string; title: string; body: string; url: string };

function authorized(header: string | null) {
  const secret = process.env.REMINDERS_PUSH_SECRET ?? '';
  if (!secret || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!authorized(request.headers.get('authorization'))) return new Response('Unauthorized', { status: 401 });
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return new Response('Push not configured', { status: 503 });
  webpush.setVapidDetails('https://www.evanstondinks.app', pub, priv);

  let messages: Message[] = [];
  try {
    const body = (await request.json()) as { messages?: Message[] };
    messages = Array.isArray(body.messages) ? body.messages.slice(0, 1000) : [];
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  const gone: string[] = [];
  let sent = 0;
  await Promise.all(
    messages.map(async (m) => {
      if (!isPushEndpoint(m.endpoint) || typeof m.p256dh !== 'string' || typeof m.auth !== 'string') return;
      const url = typeof m.url === 'string' && m.url.startsWith('/') && !m.url.startsWith('//') ? m.url : '/';
      try {
        await webpush.sendNotification(
          { endpoint: m.endpoint, keys: { p256dh: m.p256dh, auth: m.auth } },
          JSON.stringify({ title: String(m.title ?? 'Evanston Dinks').slice(0, 80), body: String(m.body ?? '').slice(0, 240), url }),
          { TTL: 3600, urgency: 'high' }
        );
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) gone.push(m.endpoint);
      }
    })
  );

  if (gone.length) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key) {
      await createClient(url, key, { auth: { persistSession: false } })
        .rpc('prune_push_subscriptions', { p_secret: process.env.REMINDERS_PUSH_SECRET, p_endpoints: gone })
        .then(() => undefined, () => undefined);
    }
  }
  return Response.json({ sent, removed: gone.length });
}
