import { describe, expect, it } from 'vitest'
import { newEmployee, newShop } from './fixtures'

const blob = () => new Blob(['x'], { type: 'image/jpeg' })
const opts = { contentType: 'image/jpeg' }
const p = (shopId: string) => `${shopId}/${crypto.randomUUID()}.jpg`

describe('photos bucket', () => {
  it('owner uploads to own shop folder, other shop cannot read it', async () => {
    const a = await newShop(); const b = await newShop()
    const path = p(a.shopId)
    expect((await a.owner.client.storage.from('photos').upload(path, blob(), opts)).error).toBeNull()
    expect((await a.owner.client.storage.from('photos').download(path)).error).toBeNull()
    expect((await b.owner.client.storage.from('photos').download(path)).error).not.toBeNull()
  })
  it('cannot upload into another shop folder', async () => {
    const a = await newShop(); const b = await newShop()
    expect((await a.owner.client.storage.from('photos').upload(p(b.shopId), blob(), opts)).error).not.toBeNull()
  })
  it('employee can read but not upload', async () => {
    const a = await newShop(); const e = await newEmployee(a.shopId)
    const path = p(a.shopId)
    expect((await a.owner.client.storage.from('photos').upload(path, blob(), opts)).error).toBeNull()
    expect((await e.client.storage.from('photos').download(path)).error).toBeNull()
    expect((await e.client.storage.from('photos').upload(p(a.shopId), blob(), opts)).error).not.toBeNull()
  })
})
