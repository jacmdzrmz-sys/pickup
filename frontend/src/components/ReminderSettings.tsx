'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAsync } from '@/lib/use-async';
import { removePushSubscription, savePushSubscription, saveReminderSettings } from '@/app/profile/reminder-actions';

const CHOICES = [
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 120, label: '2 hours before' },
  { value: 1440, label: '1 day before' },
];

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

function keyToBytes(base64: string) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

type PushState = 'checking' | 'unsupported' | 'ios-install' | 'off' | 'on' | 'blocked';

export default function ReminderSettings({ enabled, minutes }: { enabled: boolean; minutes: number }) {
  const router = useRouter();
  const [on, setOn] = useState(enabled);
  const [mins, setMins] = useState(minutes);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [push, setPush] = useState<PushState>('checking');
  const [pending, run] = useAsync();

  useEffect(() => {
    (async () => {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone = window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window) || !VAPID) {
        setPush(ios && !standalone ? 'ios-install' : 'unsupported');
        return;
      }
      if (Notification.permission === 'denied') return setPush('blocked');
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setPush(sub ? 'on' : 'off');
    })().catch(() => setPush('unsupported'));
  }, []);

  async function turnOnPush() {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      setPush(permission === 'denied' ? 'blocked' : 'off');
      return;
    }
    const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register('/sw.js'));
    await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(VAPID) });
    const json = sub.toJSON() as { endpoint: string; keys?: { p256dh?: string; auth?: string } };
    const res = await savePushSubscription({ endpoint: json.endpoint, p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' });
    if (!res.ok) {
      await sub.unsubscribe();
      setMsg({ ok: false, text: res.error });
      return;
    }
    setPush('on');
    // Turning on phone notifications implies wanting reminders.
    if (!on) {
      setOn(true);
      await saveReminderSettings(true, mins);
      router.refresh();
    }
    setMsg({ ok: true, text: 'Phone notifications are on for this device.' });
  }

  async function turnOffPush() {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await removePushSubscription(sub.endpoint);
      await sub.unsubscribe();
    }
    setPush('off');
    setMsg({ ok: true, text: 'Phone notifications are off for this device.' });
  }

  return (
    <section id="reminders" className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="text-lg font-bold">⏰ Game reminders</h2>
      <p className="text-sm text-gray-600">
        Optional. We’ll remind you before games and round robins you’ve joined or are hosting. Reminders show up here under
        Notifications, and on your phone if you turn that on below.
      </p>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            const res = await saveReminderSettings(on, mins);
            setMsg(res.ok ? { ok: true, text: on ? 'Reminders are on.' : 'Reminders are off.' } : { ok: false, text: res.error });
            if (res.ok) router.refresh();
          });
        }}
      >
        <label className="flex min-h-[44px] items-center gap-3">
          <input type="checkbox" className="h-5 w-5" checked={on} onChange={(e) => setOn(e.target.checked)} />
          <span className="font-semibold">Remind me before my games</span>
        </label>
        <label className="block text-sm">
          <span className="font-semibold text-gray-700">When</span>
          <select
            value={mins}
            disabled={!on}
            onChange={(e) => setMins(Number(e.target.value))}
            className="mt-1 block min-h-[48px] w-full rounded-lg border border-gray-300 bg-white px-3 text-base disabled:bg-gray-100"
          >
            {CHOICES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>
        <button type="submit" disabled={pending} className="min-h-[48px] rounded-lg bg-blue-600 px-5 font-semibold text-white disabled:opacity-60">
          {pending ? 'Saving…' : 'Save'}
        </button>
      </form>

      <div className="rounded-lg bg-gray-50 p-3 text-sm">
        <p className="font-semibold text-gray-900">📱 Phone notifications</p>
        {push === 'checking' && <p className="text-gray-600">Checking this device…</p>}
        {push === 'unsupported' && <p className="text-gray-600">This browser can’t show notifications. You’ll still see reminders in the app.</p>}
        {push === 'ios-install' && (
          <p className="text-gray-700">
            On iPhone, first add Evanston Dinks to your Home Screen (Share → Add to Home Screen), open it from there, then come back
            here to turn on notifications.
          </p>
        )}
        {push === 'blocked' && (
          <p className="text-gray-700">Notifications are blocked for this site. Turn them on in your browser or phone settings, then reload.</p>
        )}
        {push === 'off' && (
          <button type="button" disabled={pending} onClick={() => run(turnOnPush)}
            className="mt-2 min-h-[48px] rounded-lg bg-dink-pink px-5 font-semibold text-white disabled:opacity-60">
            Turn on phone notifications
          </button>
        )}
        {push === 'on' && (
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <span className="font-semibold text-green-800">✓ On for this device</span>
            <button type="button" disabled={pending} onClick={() => run(turnOffPush)} className="font-semibold text-gray-700 underline">
              Turn off
            </button>
          </div>
        )}
      </div>
      {msg && <p role="status" className={msg.ok ? 'text-sm text-green-700' : 'text-sm text-red-700'}>{msg.text}</p>}
    </section>
  );
}
