import type { CommKind } from './types'

type Data = { shopName: string; slipNo: number; customerName: string; garmentSummary: string;
  dueDate: string; balance: number | null; trackingUrl: string }

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
// ponytail: same "22 Nov" form for hi and en
const fmtDate = (s: string) => { const [, m, d] = s.split('-').map(Number); return `${d} ${MONTHS[m - 1]}` }

export function whatsappMessage(kind: CommKind, lang: 'hi' | 'en', d: Data): string {
  const due = fmtDate(d.dueDate)
  const bal = d.balance !== null && d.balance > 0 ? d.balance : 0
  if (lang === 'hi') {
    if (kind === 'created')
      return `नमस्ते ${d.customerName}! ${d.shopName}: आपका ऑर्डर #${d.slipNo} (${d.garmentSummary}) बुक हो गया है। ${due} तक तैयार होगा। ट्रैक करें: ${d.trackingUrl}`
    if (kind === 'date_changed')
      return `${d.shopName}: ऑर्डर #${d.slipNo} अब ${due} को तैयार होगा। देरी के लिए माफ़ करें। ट्रैक करें: ${d.trackingUrl}`
    return `${d.shopName}: आपका ऑर्डर #${d.slipNo} लेने के लिए तैयार है।${bal ? ` बकाया: ₹${bal}।` : ''} ट्रैक करें: ${d.trackingUrl}`
  }
  if (kind === 'created')
    return `Namaste ${d.customerName}! ${d.shopName}: your order #${d.slipNo} (${d.garmentSummary}) is booked. Expected on ${due}. Track: ${d.trackingUrl}`
  if (kind === 'date_changed')
    return `${d.shopName}: order #${d.slipNo} will now be ready on ${due}. Sorry for the delay. Track: ${d.trackingUrl}`
  return `${d.shopName}: your order #${d.slipNo} is ready for collection.${bal ? ` Balance due: ₹${bal}.` : ''} Track: ${d.trackingUrl}`
}

export const whatsappLink = (mobile: string, text: string) =>
  `https://wa.me/91${mobile}?text=${encodeURIComponent(text)}`
