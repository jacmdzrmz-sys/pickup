'use client';

import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/** Registers the service worker once per page load. */
export function RegisterServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);
  return null;
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS() {
  const ua = window.navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && 'ontouchend' in document);
}

/**
 * "Get the app" card. Android/desktop Chrome: one-tap install.
 * iPhone/iPad: short Share → Add to Home Screen instructions.
 * Hidden when already installed or after the user dismisses it.
 */
export default function InstallApp() {
  const [mode, setMode] = useState<'hidden' | 'prompt' | 'ios'>('hidden');
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showSteps, setShowSteps] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    try {
      if (localStorage.getItem('dinks-install-dismissed') === '1') return;
    } catch {
      /* storage unavailable */
    }
    if (isIOS()) setMode('ios');
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setMode('prompt');
    };
    const onInstalled = () => setMode('hidden');
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (mode === 'hidden') return null;

  const dismiss = () => {
    try {
      localStorage.setItem('dinks-install-dismissed', '1');
    } catch {
      /* ignore */
    }
    setMode('hidden');
  };

  return (
    <section className="relative rounded-2xl border border-blue-200 bg-white p-4 shadow-sm">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
      >
        ✕
      </button>
      <div className="flex items-center gap-3 pr-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" className="h-14 w-14 shrink-0 rounded-2xl" />
        <div className="text-left">
          <h2 className="font-bold text-gray-900">Get the Evanston Dinks app</h2>
          <p className="text-sm text-gray-600">Free. Opens from your home screen like any app — no app store needed.</p>
        </div>
      </div>

      {mode === 'prompt' && deferred && (
        <button
          type="button"
          onClick={async () => {
            await deferred.prompt();
            const { outcome } = await deferred.userChoice;
            if (outcome === 'accepted') setMode('hidden');
            setDeferred(null);
          }}
          className="mt-3 min-h-[48px] w-full rounded-lg bg-blue-600 px-4 font-semibold text-white hover:bg-blue-700"
        >
          📲 Install app
        </button>
      )}

      {mode === 'ios' && (
        <>
          {!showSteps ? (
            <button
              type="button"
              onClick={() => setShowSteps(true)}
              className="mt-3 min-h-[48px] w-full rounded-lg bg-blue-600 px-4 font-semibold text-white hover:bg-blue-700"
            >
              📲 Add to Home Screen
            </button>
          ) : (
            <ol className="mt-3 space-y-2 rounded-lg bg-blue-50 p-3 text-left text-sm text-blue-950">
              <li>
                <strong>1.</strong> Tap the <strong>Share</strong> button{' '}
                <span aria-hidden className="inline-block rounded border border-blue-300 bg-white px-1">⬆︎</span> at the bottom
                of Safari (or the ••• menu, then Share).
              </li>
              <li>
                <strong>2.</strong> Scroll down and tap <strong>Add to Home Screen</strong>.
              </li>
              <li>
                <strong>3.</strong> Tap <strong>Add</strong>. Look for the Dinks icon on your home screen.
              </li>
              <li className="text-xs text-blue-800">Using Chrome on iPhone? Tap Share in the address bar, then Add to Home Screen.</li>
            </ol>
          )}
        </>
      )}
    </section>
  );
}
