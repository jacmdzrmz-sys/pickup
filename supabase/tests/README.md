# Database behavior tests

These run against a plain local Postgres 15+ with a minimal stand-in for
Supabase's `auth` schema.

```bash
createdb dinks_test
psql -d dinks_test -f supabase/tests/auth_stub.sql
psql -d dinks_test -f supabase/migrations/20261117000000_evanston_dinks_community.sql
psql -d dinks_test -f supabase/tests/community_games_test.sql
```

Each output line is one scenario, for example
`02 non-lighted 8-9:30pm -> ERR: That time is outside the current playing hours…`.
Scenarios marked OK are expected to succeed; ERR lines are expected refusals.
