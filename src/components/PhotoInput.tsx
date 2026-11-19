'use client'
import { useEffect, useRef, useState } from 'react'
import { useSession } from '@/lib/session'
import { useT } from '@/lib/i18n'
import { compressImage, uploadPhoto } from '@/lib/image'

type Props = { label: string; value: string | null; onChange: (path: string | null) => void; onBusy?: (busy: boolean) => void }

export function PhotoInput({ label, value, onChange, onBusy }: Props) {
  const { supabase, shop } = useSession()
  const { t } = useT()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let live = true
    if (!value) { setUrl(null); return }
    supabase.storage.from('photos').createSignedUrl(value, 3600).then(({ data }) => { if (live) setUrl(data?.signedUrl ?? null) })
    return () => { live = false }
  }, [value, supabase])

  async function pick(file: File | undefined) {
    if (!file) return
    setBusy(true); onBusy?.(true); setErr(false)
    try {
      onChange(await uploadPhoto(supabase, shop.id, await compressImage(file)))
    } catch { setErr(true) } finally { setBusy(false); onBusy?.(false); if (ref.current) ref.current.value = '' }
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-muted">{label}</span>
      <div className="flex items-center gap-3">
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} className="h-16 w-16 rounded-lg object-cover" />
        )}
        <button type="button" disabled={busy} onClick={() => ref.current?.click()}
          className="min-h-12 rounded-lg border border-line bg-white px-4 text-lg disabled:opacity-50">
          {busy ? t('photo.uploading') : value ? t('photo.change') : t('photo.add')}
        </button>
        {value && !busy && (
          <button type="button" onClick={() => onChange(null)} className="min-h-12 px-2 text-muted underline">{t('photo.remove')}</button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" capture="environment" hidden onChange={(e) => pick(e.target.files?.[0])} />
      {err && <p role="alert" className="text-sm text-red-600">{t('photo.failed')}</p>}
    </div>
  )
}
