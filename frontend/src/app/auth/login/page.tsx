import { redirect } from 'next/navigation';
import { getSessionUser, safeNext } from '@/lib/session';
import LoginForm from './login-form';

export const metadata = { title: 'Sign in · Evanston Dinks' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  const next = safeNext(searchParams.next, '/games');
  const { user } = await getSessionUser();
  if (user) redirect(next);

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Sign in to Evanston Dinks</h1>
      <p className="mt-1 text-gray-600">
        You can browse games and courts without an account. Sign in to join, host, or manage your profile.
      </p>
      {searchParams.error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {searchParams.error === 'link'
            ? 'That sign-in link is invalid or has expired. Please try again.'
            : 'Something went wrong signing you in. Please try again.'}
        </p>
      )}
      <LoginForm next={next} />
    </main>
  );
}
