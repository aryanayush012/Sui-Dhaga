// Usage: npx tsx scripts/create-shop.ts "<shop name>" "<owner name>" <mobile> <password> [--env <file>]   (default .env.local; production: --env .env.prod, a name Next.js never auto-loads)
import { createAdminClient } from '../src/lib/supabase/server'
import { createShop } from '../src/lib/admin/shops'

const args = process.argv.slice(2)
const e = args.indexOf('--env')
const envFile = e >= 0 ? args.splice(e, 2)[1] : '.env.local'
if (!envFile) throw new Error('--env needs a file')
process.loadEnvFile(envFile)
const [name, ownerName, mobile, password] = args
if (!password) {
  console.error('Usage: npx tsx scripts/create-shop.ts "<shop name>" "<owner name>" <mobile> <password> [--env <file>]')
  process.exit(1)
}
createShop(createAdminClient(), { name, ownerName, mobile, password })
  .then(({ shopId }) => console.log(shopId))
  .catch((e: Error) => {
    console.error(e.message)
    process.exitCode = 1
  })
