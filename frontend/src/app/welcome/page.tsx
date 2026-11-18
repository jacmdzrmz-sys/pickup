import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSessionUser, safeNext } from '@/lib/session';
import { RISK_POINTS } from '@/lib/legal';
import { acceptTerms } from './actions';

export const metadata = { title: 'Welcome · Evanston Dinks' };

export default async function WelcomePage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  const next = safeNext(searchParams.next, '/games');
  const { supabase, user } = await getSessionUser();
  if (!user) redirect(`/auth/login?next=${encodeURIComponent(next)}`);

  const [{ data: settings }, { data: profile }] = await Promise.all([
    supabase.from('account_settings').select('terms_accepted_at').eq('user_id', user.id).maybeSingle(),
    supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle(),
  ]);
  if (settings?.terms_accepted_at) redirect(next);

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-2xl font-bold">Welcome to Evanston Dinks 👋</h1>
      <p className="mt-1 text-gray-600">One quick step before you join or host games.</p>

      <form action={acceptTerms} className="mt-6 space-y-5">
        <input type="hidden" name="next" value={next} />
        <label className="block">
          <span className="text-sm font-semibold text-gray-800">What should other players call you?</span>
          <input
            name="display_name"
            required
            maxLength={40}
            defaultValue={profile?.display_name ?? ''}
            className="mt-1 block min-h-[48px] w-full rounded-lg border border-gray-300 px-3 text-base"
            placeholder="First name or nickname"
          />
          <span className="mt-1 block text-xs text-gray-500">Shown on games you host or join. Your email is never shown.</span>
        </label>

        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="font-semibold">Participant / Activity Risk Acknowledgment</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
            {RISK_POINTS.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>

        <label className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 text-sm">
          <input type="checkbox" name="agree" required className="mt-0.5 h-5 w-5 shrink-0" />
          <span>
            I have read and agree to the{' '}
            <Link href="/terms" target="_blank" className="font-semibold text-blue-700 underline">Terms of Use</Link>,{' '}
            <Link href="/privacy" target="_blank" className="font-semibold text-blue-700 underline">Privacy Policy</Link>,{' '}
            <Link href="/guidelines" target="_blank" className="font-semibold text-blue-700 underline">Community Guidelines</Link>, and the
            Participant Risk Acknowledgment above.
          </span>
        </label>

        {searchParams.error && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
            Please enter a name and check the box to continue.
          </p>
        )}

        <button className="min-h-[52px] w-full rounded-lg bg-blue-600 px-4 text-base font-semibold text-white hover:bg-blue-700">
          Agree and continue
        </button>
      </form>
    </main>
  );
}
