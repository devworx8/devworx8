# AGENTS.md

## Cursor Cloud specific instructions

### Project Structure

This is a React Native/Expo mobile app with a cloud-hosted Supabase backend.

| Directory | Product | Port | Dev Command |
|-----------|---------|------|-------------|
| `/` (root) | React Native/Expo mobile app | 8081 (native) / 8082 (web mode) | `npm start` (native) or `npm run web:dev` (web mode) |

The `web/` and `soa-web/` directories were removed. Only the root Expo app remains.

### Node.js Version

Node.js 20 is required (`.nvmrc` and `package.json` engines field). The VM has nvm configured with `nvm use 20` in `~/.bashrc`.

### Running Services

- **Mobile app in web mode** can be tested in the cloud VM via `WEB_PORT=8082 npx expo start --web --port 8082` (runs on port 8082). First bundle takes ~30s for 5200+ modules. This renders the React Native app in the browser using `react-native-web`.
- **Mobile app on device** requires a physical device with an Expo dev client build (`npm start` runs Metro on port 8081).
- **Backend** is cloud-hosted Supabase (project ID: `lvvvjywrmpcqrpvuptdi`). No local database to manage.
- Supabase credentials (URL + anon key) are already in `eas.json` and used by `.env` files.

### Lint / Test / Typecheck

Standard commands from `package.json`:

- `npm run lint`, `npm test`, `npm run typecheck`

Root lint has a `--max-warnings 200` threshold (currently ~170 warnings). The `npm run lint` command first runs `validate:progress-bars` (which audits progress bar safety) then eslint.

Typecheck (`npm run typecheck`) requires 8 GB heap via `NODE_OPTIONS=--max-old-space-size=8192` (already set in the `typecheck` script). Running bare `npx tsc --noEmit` without the extra memory will OOM on this codebase.

### Environment Files

- Root: `.env` (copied from `.env.example`, Supabase creds filled from `eas.json`)

Gitignored. The Supabase anon key and URL are committed in `eas.json` as they are public (anon role only).

### Gotchas

- The `postinstall` script runs `patch-package` which applies patches from `/patches/`. If `npm install` fails, check that patches still apply cleanly.
- The Expo web build uses custom stubs in `lib/stubs/` for native-only modules (ads, biometrics, RevenueCat, etc.). If you see module resolution errors when running Expo web, check `metro.config.js` for the stub mappings.
- Auth session is stored in localStorage under key `edudash-auth-session`. For automated browser testing, you can authenticate via the Supabase API and inject the session JSON into localStorage.
- The `organization_members` table has no `status` column. Use `membership_status` for membership state or `seat_status` for seat-based access. Queries filtering on `status` will return 400.
- Database migrations can be applied via psql: `PGPASSWORD=hHFgMNhsfdUKUEkA psql -h aws-0-ap-southeast-1.pooler.supabase.com -p 6543 -U postgres.lvvvjywrmpcqrpvuptdi -d postgres -c "$(cat <migration_file>)"`
