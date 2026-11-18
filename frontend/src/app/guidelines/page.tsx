import LegalPage from '@/components/LegalPage';

export const metadata = { title: 'Community Guidelines · Evanston Dinks' };

export default function GuidelinesPage() {
  return (
    <LegalPage title="Community Guidelines" updated="November 17, 2026">
      <p>Evanston Dinks works because neighbors treat each other well. Please:</p>
      <h2>Be welcoming</h2>
      <ul>
        <li>All skill levels are welcome. Be patient with new players.</li>
        <li>No harassment, threats, hate speech, or discrimination — on the court or in the app.</li>
      </ul>
      <h2>Be honest</h2>
      <ul>
        <li>List games accurately: real times, real locations, and the right court status.</li>
        <li>Never claim a court is reserved unless you have, or will get, a valid City or facility reservation.</li>
        <li>Report only real scores, and confirm scores fairly. Keep competition friendly; no trash talk.</li>
        <li>No spam, advertising, or fake accounts. Instruction on City courts requires City approval.</li>
      </ul>
      <h2>Be reliable</h2>
      <ul>
        <li>Leave a game if you can’t make it. Hosts: cancel early when plans change.</li>
      </ul>
      <h2>Share the courts</h2>
      <ul>
        <li>Follow City and posted court rules, including hours, rotation, and priority for City programs.</li>
        <li>An Evanston Dinks listing gives no special claim to a public court.</li>
      </ul>
      <h2>Keep it safe</h2>
      <ul>
        <li>Don’t post anyone’s personal information.</li>
        <li>Report unsafe behavior. For emergencies, call 911.</li>
      </ul>
      <p>Moderators may remove listings or suspend accounts that break these guidelines.</p>
    </LegalPage>
  );
}
