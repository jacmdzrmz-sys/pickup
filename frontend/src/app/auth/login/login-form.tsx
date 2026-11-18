'use client';

import Link from 'next/link';
import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

type Mode = 'link' | 'password';

export default function LoginForm({ next }: { next: string }) {
  const [agreed, setAgreed] = useState(false);
  const [mode, setMode] = useState<Mode>('link');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const callbackUrl = () => {
    const url = new URL('/auth/callback', window.location.origin);
    url.searchParams.set('next', next);
    url.searchParams.set('ack', '1');
    return url.toString();
  };

  const needAgree = () => {
    if (!agreed) {
      setError('Please check the box to agree before continuing.');
      return true;
    }
    return false;
  };

  async function google() {
    if (needAgree()) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl() },
    });
    if (error) {
      setError('Google sign-in is not available right now. Try the email option below.');
      setBusy(false);
    }
  }

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    if (needAgree()) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callbackUrl() },
    });
    setBusy(false);
    if (error) setError('We couldn’t send a link to that address. Check the email and try again.');
    else setMessage('Check your email for a sign-in link. You can close this tab.');
  }

  async function passwordAuth(kind: 'signin' | 'signup') {
    if (needAgree()) return;
    if (!email.trim() || password.length < 8) {
      setError('Enter your email and a password of at least 8 characters.');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    const supabase = createClient();
    if (kind === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        setBusy(false);
        setError('That email and password didn’t match. You can also use a sign-in link.');
        return;
      }
      window.location.assign(`/auth/finish?ack=1&next=${encodeURIComponent(next)}`);
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: callbackUrl() },
      });
      setBusy(false);
      if (error) {
        setError(error.message.includes('registered') ? 'That email already has an account. Try signing in.' : 'We couldn’t create the account. Please try again.');
        return;
      }
      if (data.session) {
        window.location.assign(`/auth/finish?ack=1&next=${encodeURIComponent(next)}`);
      } else {
        setMessage('Almost done! Check your email to confirm your account.');
      }
    }
  }

  return (
    <div className="mt-6 space-y-5">
      <label className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700">
        <input
          type="checkbox"
          className="mt-0.5 h-5 w-5 shrink-0"
          checked={agreed}
          onChange={(e) => {
            setAgreed(e.target.checked);
            setError(null);
          }}
        />
        <span>
          I agree to the{' '}
          <Link href="/terms" target="_blank" className="font-semibold text-blue-700 underline">Terms of Use</Link>,{' '}
          <Link href="/privacy" target="_blank" className="font-semibold text-blue-700 underline">Privacy Policy</Link>,{' '}
          <Link href="/guidelines" target="_blank" className="font-semibold text-blue-700 underline">Community Guidelines</Link>, and the{' '}
          <Link href="/safety#risk" target="_blank" className="font-semibold text-blue-700 underline">Participant Risk Acknowledgment</Link>.
          Pickleball is a physical activity and I play at my own risk.
        </span>
      </label>

      <button
        type="button"
        onClick={google}
        disabled={busy}
        className="flex min-h-[52px] w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 text-base font-semibold text-gray-900 shadow-sm hover:bg-gray-50 disabled:opacity-60"
      >
        <svg aria-hidden width="20" height="20" viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
        </svg>
        Continue with Google
      </button>

      <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-gray-400">
        <span className="h-px flex-1 bg-gray-200" /> or use email <span className="h-px flex-1 bg-gray-200" />
      </div>

      <div className="grid grid-cols-2 rounded-lg bg-gray-100 p-1 text-sm font-semibold">
        <button
          type="button"
          onClick={() => setMode('link')}
          className={`rounded-md py-2 ${mode === 'link' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
        >
          Email me a link
        </button>
        <button
          type="button"
          onClick={() => setMode('password')}
          className={`rounded-md py-2 ${mode === 'password' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
        >
          Email + password
        </button>
      </div>

      <form onSubmit={mode === 'link' ? sendLink : (e) => { e.preventDefault(); passwordAuth('signin'); }} className="space-y-3">
        <label className="block">
          <span className="text-sm font-semibold text-gray-800">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block min-h-[48px] w-full rounded-lg border border-gray-300 px-3 text-base"
            placeholder="you@example.com"
          />
        </label>
        {mode === 'password' && (
          <label className="block">
            <span className="text-sm font-semibold text-gray-800">Password</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block min-h-[48px] w-full rounded-lg border border-gray-300 px-3 text-base"
              placeholder="At least 8 characters"
            />
          </label>
        )}

        {mode === 'link' ? (
          <button
            type="submit"
            disabled={busy}
            className="min-h-[48px] w-full rounded-lg bg-blue-600 px-4 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            Send me a sign-in link
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="submit"
              disabled={busy}
              className="min-h-[48px] rounded-lg bg-blue-600 px-4 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              Sign in
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => passwordAuth('signup')}
              className="min-h-[48px] rounded-lg border border-blue-600 px-4 font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60"
            >
              Create account
            </button>
          </div>
        )}
      </form>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
          {message}
        </p>
      )}

      <p className="text-xs text-gray-500">
        We only use your email to sign you in. It is never shown on your profile.
        Forgot your password? Use “Email me a link” to sign in.
      </p>
    </div>
  );
}
