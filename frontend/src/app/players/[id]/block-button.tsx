'use client';

import { useAsync } from '@/lib/use-async';
import { useRouter } from 'next/navigation';
import {useState} from 'react';
import { blockUser, unblockUser } from '@/app/profile/actions';

export default function BlockButton({ userId, blocked, signedIn }: { userId: string; blocked: boolean; signedIn: boolean }) {
  const router = useRouter();
  const [pending, start] = useAsync();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!signedIn) {
            window.location.assign(`/auth/login?next=${encodeURIComponent(window.location.pathname)}`);
            return;
          }
          if (!blocked && !window.confirm('Block this player?')) return;
          start(async () => {
            if (blocked) await unblockUser(userId);
            else {
              const res = await blockUser(userId);
              if (!res.ok) setError(res.error);
            }
            router.refresh();
          });
        }}
        className="min-h-[44px] rounded-lg border border-gray-300 px-4 text-sm font-semibold"
      >
        {blocked ? 'Unblock player' : '⛔ Block player'}
      </button>
      {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}
