// Usage: npx tsx scripts/create-shop.ts "<shop name>" "<owner name>" <mobile> <password>
import { createAdminClient } from '../src/lib/supabase/server'
import { createShop } from '../src/lib/admin/shops'

process.loadEnvFile('.env.local')
const [name, ownerName, mobile, password] = process.argv.slice(2)
if (!password) {
  console.error('Usage: npx tsx scripts/create-shop.ts "<shop name>" "<owner name>" <mobile> <password>')
  process.exit(1)
}
createShop(createAdminClient(), { name, ownerName, mobile, password })
  .then(({ shopId }) => console.log(shopId))
  .catch((e: Error) => {
    console.error(e.message)
    process.exitCode = 1
  })
