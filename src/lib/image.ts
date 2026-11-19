import type { SupabaseClient } from '@supabase/supabase-js'

const MAX_SIDE = 1280

export async function compressImage(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height))
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale)
  if (typeof OffscreenCanvas !== 'undefined') {
    const c = new OffscreenCanvas(w, h)
    c.getContext('2d')!.drawImage(bmp, 0, 0, w, h)
    return c.convertToBlob({ type: 'image/jpeg', quality: 0.7 })
  }
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  c.getContext('2d')!.drawImage(bmp, 0, 0, w, h)
  return new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('compress_failed'))), 'image/jpeg', 0.7))
}

// Photos are viewed via createSignedUrl on the signed-in user's client (storage RLS applies).
export async function uploadPhoto(client: SupabaseClient, shopId: string, blob: Blob): Promise<string> {
  const path = `${shopId}/${crypto.randomUUID()}.jpg`
  const { error } = await client.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg' })
  if (error) throw new Error(error.message)
  return path
}
