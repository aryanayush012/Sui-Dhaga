// Runs `supabase <args> --db-url $SUPABASE_DB_URL` (env from `node --env-file=.env.local`).
// Spawns the CLI directly (no shell) so the URL is never shell-parsed or echoed.
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'

const cli = createRequire(import.meta.url).resolve('supabase/dist/supabase.js')
const url = process.env.SUPABASE_DB_URL
if (!url) throw new Error('SUPABASE_DB_URL missing from .env.local')
const r = spawnSync(process.execPath, [cli, ...process.argv.slice(2), '--db-url', url], { stdio: 'inherit' })
process.exit(r.status ?? 1)
