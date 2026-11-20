'use client'
import type { MouseEvent } from 'react'
import { useT } from '@/lib/i18n'

// WhatsApp logo; a ✓ badge once the current status has been messaged. Tapping always opens WhatsApp.
export function WhatsAppButton({ href, sent, onClick }: { href: string; sent: boolean; onClick: (e: MouseEvent<HTMLAnchorElement>) => void }) {
  const { t } = useT()
  const label = t(sent ? 'order.whatsapp_sent' : 'order.whatsapp')
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label} onClick={onClick}
      className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-[#E3FCEF] text-[#00875A]">
      <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5 13.6c-.2.6-1.2 1.2-1.7 1.2-.4.1-1 .1-3.1-.8a10.5 10.5 0 0 1-4.3-3.8c-.3-.4-1-1.4-1-2.6s.6-1.8.9-2.1c.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.4.6-.3.4c-.1.1-.2.3 0 .5.2.3.7 1.2 1.6 1.9 1 .9 1.9 1.2 2.2 1.3.2.1.4.1.5-.1l.7-.9c.2-.2.4-.2.6-.1l1.9.9c.3.1.4.2.5.3.1.2.1.6-.1 1.2Z" /></svg>
      {sent && <span aria-hidden className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-[#00875A] text-[10px] font-bold text-white">✓</span>}
    </a>
  )
}
