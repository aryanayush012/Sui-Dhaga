// Usage: npx tsx scripts/reset-password.ts <mobile> <newPassword>
import { createAdminClient } from '../src/lib/supabase/server'
import { resetPassword } from '../src/lib/admin/members'

process.loadEnvFile('.env.local')
const [mobile, password] = process.argv.slice(2)
if (!password) {
  console.error('Usage: npx tsx scripts/reset-password.ts <mobile> <newPassword>')
  process.exit(1)
}
resetPassword(createAdminClient(), { mobile, password })
  .then(() => console.log('ok'))
  .catch((e: Error) => {
    console.error(e.message)
    process.exitCode = 1
  })
