# Evanston Dinks — community games setup

This adds Browse Games, Create Game, Find Courts, sign-in, profiles, safety tools
and an admin area to the Next.js frontend. It runs on **Supabase** (Auth,
Postgres, Storage) through the Supabase project already connected to the
Vercel project. The Express backend in `/backend` is untouched and not used by
these features.

## 1. Database (one time)

In the Supabase dashboard → SQL Editor, run these files in order:

1. `supabase/migrations/20261117000000_evanston_dinks_community.sql`
2. `supabase/migrations/20261117000100_avatars_storage.sql`
3. `supabase/migrations/20261117000200_harden_function_access.sql`

They create the tables, row-level security, validation triggers, and seed the
courts, playing hours and official City links (checked 2026-11-17).
Run each file once.

Then make yourself an admin (find your user id under Authentication → Users
after you sign in once):

```sql
insert into public.admins (user_id) values ('YOUR-USER-UUID');
```

## 2. Supabase Auth

Authentication → URL Configuration

- Site URL: `https://www.evanstondinks.app`
- Redirect URLs: `https://www.evanstondinks.app/auth/callback`,
  `https://evanstondinks.app/auth/callback`,
  `https://*-jalitico.vercel.app/auth/callback` (previews),
  `http://localhost:3000/auth/callback`

Authentication → Providers

- **Email**: enabled. Keep “Confirm email” on. Magic links use the same provider.
- **Google**: enable it, then paste a Google OAuth Client ID and secret.
  In Google Cloud Console → APIs & Services → Credentials, create an OAuth
  client (Web application) with the authorized redirect URI
  `https://hbnojkoygmumkzjqklvm.supabase.co/auth/v1/callback`.
  Set the OAuth consent screen app name to “Evanston Dinks”.

Recommended: set up custom SMTP (Authentication → Emails) so sign-in emails
aren't limited by Supabase's built-in sender, and update the email templates’
wording to “Evanston Dinks”.

## 3. Environment variables (Vercel)

Already present and required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

No service-role key is used by the app. Account deletion runs through a
database function limited to the signed-in user.

## 4. Keeping City information current

Everything about courts lives in the database and is editable at `/admin`:

- **Locations**: text, links, status (open / temporarily unavailable / closed),
  and whether games may be created there.
- **Playing hours (enforced)**: per-weekday windows. A game must fit inside one.
  Outdoor courts are seeded at 7 AM–10 PM (lighted) / 7 AM–9 PM (non-lighted)
  per the City court rules. Robert Crown, Levy and Prieto are seeded with
  building/office hours from their official pages. **Chandler-Newberger has no
  hours yet**, so games can't be created there until an admin adds them.
- **Closures**: one location, all outdoor, all indoor, or everything; whole day or
  a time window (holidays, weather, maintenance, seasonal closures).
- **Official links**: Amilia, Court Rules PDF, schedules, 311, and so on.

The City of Evanston is the source of truth. If anything differs, update the row.

## 5. Notifications

When a host cancels (or an admin removes) a game, every joined player gets an
in-app notification (red dot on Profile). Players can opt in to email updates on
their profile; the opt-in is stored, but **email sending is not wired up yet**.
To add it, connect an email provider (for example a Supabase Edge Function on
`notifications` inserts that sends only to users with `email_notifications = true`).

## 6. Tests

`supabase/tests/community_games_test.sql` exercises the rules (hours, closures,
terms gate, full games, blocks, tampering, cancellation notices, account
deletion) against Postgres with a stubbed `auth` schema. See
`supabase/tests/README.md`.
