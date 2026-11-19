'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from '@/lib/session'
import { useT, type Key } from '@/lib/i18n'

const OWNER: [string, Key][] = [['/', 'nav.board'], ['/orders/new', 'nav.new'], ['/employees', 'nav.employees'], ['/settings', 'nav.settings']]
const EMPLOYEE: [string, Key][] = [['/', 'nav.board'], ['/settings', 'nav.settings']]

export function BottomNav() {
  const { member } = useSession()
  const { t } = useT()
  const path = usePathname()
  const items = member.role === 'owner' ? OWNER : EMPLOYEE
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-line bg-white pb-[env(safe-area-inset-bottom)]">
      {items.map(([href, key]) => {
        const on = href === '/' ? path === '/' : path.startsWith(href)
        return (
          <Link key={href} href={href} aria-current={on ? 'page' : undefined}
            className={`flex min-h-14 flex-1 items-center justify-center px-1 text-center text-base ${on ? 'font-bold text-accent' : 'text-muted'}`}>
            {t(key)}
          </Link>
        )
      })}
    </nav>
  )
}
