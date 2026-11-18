import type { LinkMap } from '@/lib/official';
import { FALLBACK_LINKS } from '@/lib/official';

export const RULES_NOTICE =
  'Please follow all City of Evanston rules, park rules, posted court rules, facility policies, and applicable local ordinances. Court availability and playing hours may change. A game listed on Evanston Dinks does not reserve a public court unless the host has separately obtained a valid reservation or permit. Play at your own risk.';

export const GAME_DISCLAIMER =
  'Evanston Dinks is a community platform, not the City of Evanston. Game listings do not reserve public courts. Players are responsible for following all applicable laws, ordinances, facility policies, posted rules, and reservation requirements. Play at your own risk.';

export const OUTDOOR_NOTICE = 'Check current City conditions, closures, and court availability before playing.';

export function RulesNotice({ links, compact = false }: { links?: LinkMap; compact?: boolean }) {
  const rules = links?.court_rules ?? FALLBACK_LINKS.court_rules;
  const schedule = links?.tennis_pickleball ?? FALLBACK_LINKS.tennis_pickleball;
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <p>{RULES_NOTICE}</p>
      <p className="mt-2 font-semibold">Check the official City schedule before you play.</p>
      <div className={compact ? 'mt-3 flex flex-wrap gap-2' : 'mt-3 flex flex-col gap-2 sm:flex-row'}>
        <a
          href={rules.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-amber-300 bg-white px-4 font-semibold text-amber-900 hover:bg-amber-100"
        >
          View Evanston Court Rules ↗
        </a>
        <a
          href={schedule.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg px-4 font-semibold text-amber-900 underline"
        >
          Official City information ↗
        </a>
      </div>
    </div>
  );
}

export function GameDisclaimer() {
  return <p className="text-xs leading-relaxed text-gray-500">{GAME_DISCLAIMER}</p>;
}

export function OutdoorNotice() {
  return (
    <p className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-900">
      <span aria-hidden>🌤️ </span>
      {OUTDOOR_NOTICE}
    </p>
  );
}

export function EmergencyNotice() {
  return (
    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
      For emergencies or immediate danger, call 911.
    </p>
  );
}
