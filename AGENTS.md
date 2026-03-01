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

### Creating Environment Files

Env files are gitignored and must be created on first setup. Supabase credentials come from `eas.json`:

```bash
node -e "
const eas = require('./eas.json');
const url = eas.build.development.env.EXPO_PUBLIC_SUPABASE_URL;
const key = eas.build.development.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const fs = require('fs');
let env = fs.readFileSync('.env.example', 'utf8');
env = env.replace('EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co', 'EXPO_PUBLIC_SUPABASE_URL=' + url);
env = env.replace('EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here', 'EXPO_PUBLIC_SUPABASE_ANON_KEY=' + key);
env = env.replace('EXPO_PUBLIC_API_BASE=https://your-project.supabase.co/functions/v1', 'EXPO_PUBLIC_API_BASE=' + url + '/functions/v1');
fs.writeFileSync('.env', env);
fs.writeFileSync('web/.env.local', 'NEXT_PUBLIC_SUPABASE_URL=' + url + '\nNEXT_PUBLIC_SUPABASE_ANON_KEY=' + key + '\n');
let soaEnv = fs.readFileSync('soa-web/.env.example', 'utf8');
soaEnv = soaEnv.replace('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here', 'NEXT_PUBLIC_SUPABASE_ANON_KEY=' + key);
fs.writeFileSync('soa-web/.env.local', soaEnv);
"
```

### Gotchas

- The `postinstall` script runs `patch-package` which applies patches from `/patches/`. If `npm install` fails, check that patches still apply cleanly.
- The Expo web build uses custom stubs in `lib/stubs/` for native-only modules (ads, biometrics, RevenueCat, etc.). If you see module resolution errors when running Expo web, check `metro.config.js` for the stub mappings.
- Auth session is stored in localStorage under key `edudash-auth-session`. For automated browser testing, you can authenticate via the Supabase API and inject the session JSON into localStorage.
- The `organization_members` table has no `status` column. Use `membership_status` for membership state or `seat_status` for seat-based access. Queries filtering on `status` will return 400.
- Database migrations can be applied via psql: `PGPASSWORD=hHFgMNhsfdUKUEkA psql -h aws-0-ap-southeast-1.pooler.supabase.com -p 6543 -U postgres.lvvvjywrmpcqrpvuptdi -d postgres -c "$(cat <migration_file>)"`
