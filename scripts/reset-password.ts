// Usage: npx tsx scripts/reset-password.ts <mobile> <newPassword> [--env <file>]   (default .env.local; production: --env .env.prod, a name Next.js never auto-loads)
import { createAdminClient } from '../src/lib/supabase/server'
import { resetPassword } from '../src/lib/admin/members'

const args = process.argv.slice(2)
const e = args.indexOf('--env')
const envFile = e >= 0 ? args.splice(e, 2)[1] : '.env.local'
if (!envFile) throw new Error('--env needs a file')
process.loadEnvFile(envFile)
const [mobile, password] = args
if (!password) {
  console.error('Usage: npx tsx scripts/reset-password.ts <mobile> <newPassword> [--env <file>]')
  process.exit(1)
}
resetPassword(createAdminClient(), { mobile, password })
  .then(() => console.log('ok'))
  .catch((e: Error) => {
    console.error(e.message)
    process.exitCode = 1
  })
