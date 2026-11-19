import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { SessionProvider } from '@/lib/session'
import { I18nProvider } from '@/lib/i18n'
import { BottomNav } from '@/components/BottomNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // RLS returns no row for an inactive member.
  const { data: member } = await supabase.from('members').select('id, name, role, shop_id').eq('id', user.id).maybeSingle()
  const { data: shop } = member
    ? await supabase.from('shops').select('id, name, address, logo_url, language').eq('id', member.shop_id).maybeSingle()
    : { data: null }
  if (!member || !shop) redirect('/login?inactive=1')

  return (
    <SessionProvider value={{ member: { id: member.id, name: member.name, role: member.role as 'owner' | 'employee' }, shop }}>
      <I18nProvider defaultLang={shop.language}>
        <div className="mx-auto min-h-dvh max-w-2xl px-4 pb-24 pt-4">{children}</div>
        <BottomNav />
      </I18nProvider>
    </SessionProvider>
  )
}
