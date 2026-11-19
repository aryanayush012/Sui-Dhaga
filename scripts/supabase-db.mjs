// Runs `supabase <args> --db-url $SUPABASE_DB_URL` (env from `node --env-file=.env.local`).
// Spawns the CLI directly (no shell) so the URL is never shell-parsed or echoed.
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'

const cli = createRequire(import.meta.url).resolve('supabase/dist/supabase.js')
const url = process.env.SUPABASE_DB_URL
if (!url) throw new Error('SUPABASE_DB_URL missing from .env.local')
// `db reset` wipes the database: only allowed against the dev DB named by SUPABASE_DEV_HOST, which is
// `<user>@<host>` of the dev SUPABASE_DB_URL. The user is included because Supabase pooler hosts are shared
// by every project in a region (the project ref lives in the `postgres.<ref>` user).
if (process.argv.includes('reset')) {
  let target = ''
  try { const u = new URL(url); target = `${decodeURIComponent(u.username)}@${u.hostname}` } catch {}
  if (!process.env.SUPABASE_DEV_HOST || target !== process.env.SUPABASE_DEV_HOST) {
    console.error('Refusing to reset: SUPABASE_DB_URL does not match SUPABASE_DEV_HOST (the <user>@<host> of your dev database) in .env.local.')
    process.exit(1)
  }
}
const r = spawnSync(process.execPath, [cli, ...process.argv.slice(2), '--db-url', url], { stdio: 'inherit' })
process.exit(r.status ?? 1)
