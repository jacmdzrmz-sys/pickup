import Link from 'next/link';
import LegalPage from '@/components/LegalPage';

export const metadata = { title: 'Terms of Use · Evanston Dinks' };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" updated="November 17, 2026">
      <p>
        Welcome to Evanston Dinks, a community website that helps people in and around Evanston, Illinois find each other to
        play pickleball. By creating an account or using the site, you agree to these terms.
      </p>

      <h2>What Evanston Dinks is — and isn’t</h2>
      <ul>
        <li>Evanston Dinks is a community platform. It is <strong>not</strong> the City of Evanston or Evanston Parks &amp; Recreation, and it is not affiliated with or endorsed by the City.</li>
        <li>We do not own, operate, maintain or control any court or facility.</li>
        <li>A game listed on Evanston Dinks is a community meetup. It is <strong>not</strong> a court reservation or permit, unless the host separately got one from the City or facility.</li>
        <li>We do not guarantee that any court, facility, time slot or game will be available, safe, or happen as listed.</li>
        <li>City information on this site is a convenience summary. The City’s official website, posted signs and staff decisions control.</li>
      </ul>

      <h2>Your account</h2>
      <ul>
        <li>Give accurate information and keep your sign-in secure.</li>
        <li>One person per account. Don’t impersonate anyone.</li>
        <li>You can delete your account at any time from your Profile page.</li>
      </ul>

      <h2>Hosting and joining games</h2>
      <ul>
        <li>Hosts must choose an accurate court status. Only mark a game “Court Reserved” if you have obtained, or will obtain, a valid reservation or permit.</li>
        <li>Everyone must follow City of Evanston rules and ordinances, park rules, posted court rules and facility policies, including playing hours, priority for City programs, and limits on instruction.</li>
        <li>Don’t schedule or play when a court or facility is closed or conditions are unsafe.</li>
        <li>If you can’t make it, leave the game. Hosts should cancel games that won’t happen.</li>
        <li>Fees listed on a game are between players and the facility or host. Evanston Dinks does not process payments.</li>
      </ul>

      <h2>Community rules</h2>
      <p>
        Follow the <Link href="/guidelines">Community Guidelines</Link>. We may remove content, cancel listings, or suspend
        accounts that break these terms or put others at risk.
      </p>

      <h2>Risk</h2>
      <p>
        Pickleball is a physical activity. You participate voluntarily and at your own risk, as described in the{' '}
        <Link href="/safety#risk">Participant Risk Acknowledgment</Link>. You are responsible for deciding whether you are
        physically able to play.
      </p>

      <h2>No warranties; limits on our responsibility</h2>
      <p>
        The site is provided “as is.” To the extent allowed by law, Evanston Dinks and its volunteers are not responsible for
        injuries, losses, disputes between users, court availability, or the accuracy of third-party information. Nothing in
        these terms limits rights you have that cannot be limited under Illinois law.
      </p>

      <h2>Changes</h2>
      <p>We may update these terms. If we make important changes, we’ll ask you to review them again.</p>

      <h2>Contact</h2>
      <p>Questions about these terms? Use the report tools in the app or contact the site administrator.</p>
    </LegalPage>
  );
}
