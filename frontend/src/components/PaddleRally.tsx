'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * A short welcome rally: two pink paddles tap a ball back and forth under the
 * top bar for about 3 seconds, then it fades away. Plays once per visit.
 * Soft "pock" sounds play along when the browser allows sound (most browsers
 * only allow it after you tap the page). Tapping the rally replays it with sound.
 * Skipped for people who prefer reduced motion. Sound can be turned off.
 */
const SEEN_KEY = 'dinks-rally-seen';
const SOUND_KEY = 'dinks-sound';
const HIT_MS = 600; // ball travel time between paddles
const HITS = 5;

function read(store: 'local' | 'session', key: string) {
  try {
    return (store === 'local' ? window.localStorage : window.sessionStorage).getItem(key);
  } catch {
    return null;
  }
}
function write(store: 'local' | 'session', key: string, value: string) {
  try {
    (store === 'local' ? window.localStorage : window.sessionStorage).setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

/** A soft paddle "pock": a quick, low-volume tone with a tiny click. */
function pock(ctx: AudioContext, when: number, pan: number) {
  const out = ctx.createGain();
  out.gain.value = 0.18;
  const panner = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : null;
  if (panner) {
    panner.pan.value = pan;
    out.connect(panner).connect(ctx.destination);
  } else {
    out.connect(ctx.destination);
  }

  const osc = ctx.createOscillator();
  const og = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1150, when);
  osc.frequency.exponentialRampToValueAtTime(520, when + 0.07);
  og.gain.setValueAtTime(0.0001, when);
  og.gain.exponentialRampToValueAtTime(0.35, when + 0.004);
  og.gain.exponentialRampToValueAtTime(0.0001, when + 0.09);
  osc.connect(og).connect(out);
  osc.start(when);
  osc.stop(when + 0.1);

  const len = Math.floor(ctx.sampleRate * 0.02);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 2400;
  bp.Q.value = 1.2;
  const ng = ctx.createGain();
  ng.gain.value = 0.25;
  noise.connect(bp).connect(ng).connect(out);
  noise.start(when);
}

export default function PaddleRally() {
  const [run, setRun] = useState(0); // increments to (re)start a rally
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const ctxRef = useRef<AudioContext | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    setSoundOn(read('local', SOUND_KEY) !== 'off');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || read('session', SEEN_KEY)) return;
    write('session', SEEN_KEY, '1');
    setRun(1);
  }, []);

  useEffect(() => {
    if (!run) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setVisible(true);
    setFading(false);

    const sound = read('local', SOUND_KEY) !== 'off';
    if (sound) {
      try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AC) {
          ctxRef.current = ctxRef.current ?? new AC();
          const ctx = ctxRef.current;
          const schedule = () => {
            if (ctx.state !== 'running') return; // browser hasn't allowed sound yet
            const start = ctx.currentTime + 0.05;
            for (let i = 0; i < HITS; i++) pock(ctx, start + (i * HIT_MS) / 1000, i % 2 === 0 ? -0.5 : 0.5);
          };
          if (ctx.state === 'running') schedule();
          else ctx.resume().then(schedule).catch(() => undefined);
        }
      } catch {
        /* no sound available */
      }
    }

    const total = HIT_MS * (HITS - 1) + 300;
    timers.current.push(window.setTimeout(() => setFading(true), total));
    timers.current.push(window.setTimeout(() => setVisible(false), total + 500));
    return () => timers.current.forEach(clearTimeout);
  }, [run]);

  if (!visible) return null;

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 top-14 z-20 flex justify-center transition-opacity duration-500 ${fading ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className="pointer-events-auto relative mt-1 flex h-11 w-64 items-center rounded-full border border-dink-pink/20 bg-white/95 px-2 shadow-md sm:w-80">
        <button
          type="button"
          aria-label="Replay the rally"
          onClick={() => {
            // Unlock sound inside the tap itself (required on iPhone), then replay.
            if (read('local', SOUND_KEY) !== 'off') {
              try {
                const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
                if (AC) {
                  ctxRef.current = ctxRef.current ?? new AC();
                  ctxRef.current.resume().catch(() => undefined);
                }
              } catch {
                /* no sound available */
              }
            }
            setRun((n) => n + 1);
          }}
          className="relative h-full flex-1"
        >
          <Paddle side="left" key={`l${run}`} />
          <span key={`b${run}`} className="dink-ball-x absolute top-0 h-full" aria-hidden>
            <span className="dink-ball-y block h-3 w-3 rounded-full bg-[#d7f24a] ring-1 ring-lime-600/60" />
          </span>
          <Paddle side="right" key={`r${run}`} />
        </button>
        <button
          type="button"
          onClick={() => {
            const next = !soundOn;
            setSoundOn(next);
            write('local', SOUND_KEY, next ? 'on' : 'off');
            if (!next) ctxRef.current?.suspend().catch(() => undefined);
          }}
          aria-label={soundOn ? 'Turn welcome sound off' : 'Turn welcome sound on'}
          title={soundOn ? 'Sound on' : 'Sound off'}
          className="ml-1 flex h-8 w-8 items-center justify-center rounded-full text-sm text-slate-500 hover:bg-slate-100"
        >
          {soundOn ? '🔈' : '🔇'}
        </button>
      </div>
      <style>{`
        @keyframes dink-ball-x { 0% { left: 14%; } 50% { left: calc(86% - 12px); } 100% { left: 14%; } }
        @keyframes dink-ball-y { 0%, 100% { transform: translateY(15px); } 50% { transform: translateY(2px); } }
        @keyframes dink-swing-l { 0%, 100% { transform: rotate(-20deg); } 8% { transform: rotate(8deg); } 20% { transform: rotate(-20deg); } }
        @keyframes dink-swing-r { 0%, 100% { transform: scaleX(-1) rotate(-20deg); } 8% { transform: scaleX(-1) rotate(8deg); } 20% { transform: scaleX(-1) rotate(-20deg); } }
        .dink-ball-x { animation: dink-ball-x ${(HIT_MS * 2) / 1000}s ease-in-out ${(HITS - 1) / 2} both; }
        .dink-ball-y { animation: dink-ball-y ${HIT_MS / 1000}s ease-in-out ${HITS - 1} both; }
        .dink-paddle-l { animation: dink-swing-l ${(HIT_MS * 2) / 1000}s ease-out ${Math.ceil(HITS / 2)}; transform: rotate(-20deg); }
        .dink-paddle-r { animation: dink-swing-r ${(HIT_MS * 2) / 1000}s ease-out ${(HIT_MS) / 1000}s ${Math.floor(HITS / 2)}; transform: scaleX(-1) rotate(-20deg); }
      `}</style>
    </div>
  );
}

function Paddle({ side }: { side: 'left' | 'right' }) {
  return (
    <span
      aria-hidden
      className={`absolute top-1/2 -mt-4 h-8 w-6 origin-bottom ${side === 'left' ? 'left-1 dink-paddle-l' : 'right-1 dink-paddle-r'}`}
    >
      <svg viewBox="0 0 24 32" className="h-full w-full">
        <rect x="10" y="20" width="4" height="11" rx="2" fill="#530a47" />
        <rect x="2" y="1" width="20" height="22" rx="9" fill="#ec1476" />
        <circle cx="8" cy="8" r="1.3" fill="#fff" opacity=".7" />
        <circle cx="14" cy="11" r="1.3" fill="#fff" opacity=".7" />
        <circle cx="10" cy="15" r="1.3" fill="#fff" opacity=".7" />
      </svg>
    </span>
  );
}
