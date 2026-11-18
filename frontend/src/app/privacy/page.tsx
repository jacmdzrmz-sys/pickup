import LegalPage from '@/components/LegalPage';

export const metadata = { title: 'Privacy Policy · Evanston Dinks' };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="November 18, 2026">
      <p>We collect as little as we can, and we never sell your information.</p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Sign-in information:</strong> your email address, and — if you use Google — your name and profile photo from Google. If you use a password, it is stored only as a secure hash by our authentication provider (Supabase); we never see or store it in plain text.</li>
        <li><strong>Profile you choose to add:</strong> display name, photo, skill level, preferred play type, optional neighborhood, and optional short bio.</li>
        <li><strong>Activity:</strong> games you host or join, players you block, reports you send, and in-app notifications.</li>
        <li><strong>Competitions (optional):</strong> scores you report or confirm, round robins and ladders you join, and the rating calculated from your confirmed games.</li>
        <li><strong>Consent records:</strong> when you accepted the terms, whether you opted in to emails, and whether you confirmed you’re 18+ for competitions.</li>
        <li><strong>Basic technical data</strong> our hosting providers log to keep the site secure and working (such as IP address and browser type).</li>
      </ul>
      <p>We don’t ask for your phone number, home address, or date of birth.</p>

      <h2>What other people can see</h2>
      <p>
        Your display name, photo, skill level, play type, neighborhood and bio, plus the games you host or join. We never show
        your email address, password, sign-in tokens, reports you’ve made, or who you’ve blocked.
      </p>
      <p>
        Competitions: round robin and ladder standings show everyone who joins them. Pickup scores you report are seen only by
        the players in that game. You appear on Top Players, Most Active and Champion of the Month only if you turn that on,
        and you can turn it off any time on your Profile page.
      </p>

      <h2>How we use it</h2>
      <ul>
        <li>To run the site: sign-in, game listings, joining and notifications.</li>
        <li>To keep the community safe: reviewing reports and enforcing the guidelines.</li>
        <li>To email you about your games — only if you opt in on your Profile page.</li>
      </ul>

      <h2>Who we share it with</h2>
      <p>
        Service providers that host the site and database (Vercel and Supabase) and Google if you choose Google sign-in. We may
        disclose information if required by law or to protect someone’s safety. We do not sell or rent personal information
        and do not use it for advertising.
      </p>

      <h2>Deleting your account</h2>
      <p>
        You can delete your account any time from your Profile page. This deletes your account, profile, photo, game sign-ups
        and notifications, and cancels upcoming games you host. Safety reports involving you may be kept without your account
        attached so moderators can address safety concerns, and limited records may be kept where the law requires.
      </p>

      <h2>Children</h2>
      <p>Evanston Dinks is meant for adults. Don’t create an account if you are under 18.</p>

      <h2>Security</h2>
      <p>
        We use secure sign-in, encrypted connections (HTTPS), and database rules that limit each person to their own private
        data. No system is perfectly secure; please use a strong password or sign in with Google.
      </p>

      <h2>Changes and contact</h2>
      <p>We’ll update this page if our practices change. Questions? Contact the site administrator.</p>
    </LegalPage>
  );
}
