import Link from 'next/link';
import LegalPage from '@/components/LegalPage';
import { RISK_POINTS } from '@/lib/legal';

export const metadata = { title: 'Safety · Evanston Dinks' };

export default function SafetyPage() {
  return (
    <LegalPage title="Safety" updated="November 17, 2026">
      <p className="rounded-lg bg-red-50 p-4 text-lg font-bold text-red-800">For emergencies or immediate danger, call 911.</p>
      <p>The in-app report tools are not monitored around the clock and are not a substitute for emergency services.</p>

      <h2>Playing safely</h2>
      <ul>
        <li>Check the City’s court rules, posted signs and closures before you go. Don’t play when a court is closed or wet, or when lightning is near.</li>
        <li>Warm up, wear court shoes, bring water, and know your limits.</li>
        <li>Meet in public places and let someone know where you’re going.</li>
        <li>Respect other groups sharing the courts and follow the posted rotation rules.</li>
      </ul>

      <h2>If something goes wrong</h2>
      <ul>
        <li>Leave any situation that feels unsafe.</li>
        <li>Use <strong>Report</strong> on a game or a player’s profile, and <strong>Block</strong> to keep someone out of games you host.</li>
        <li>For court rule violations, the City’s court rules direct reports to the Evanston Police non-emergency line: <a href="tel:+18478665000">(847) 866-5000</a>.</li>
        <li>For City facility questions, call 311 or <a href="tel:+18474484311">(847) 448-4311</a>.</li>
      </ul>

      <h2 id="risk" className="scroll-mt-20">Participant / Activity Risk Acknowledgment</h2>
      <p>By using Evanston Dinks to join or host games, you acknowledge:</p>
      <ul>
        {RISK_POINTS.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <p>
        See also the <Link href="/terms">Terms of Use</Link> and <Link href="/guidelines">Community Guidelines</Link>.
      </p>
    </LegalPage>
  );
}
