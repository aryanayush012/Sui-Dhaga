import type { CommKind } from './types'

type Data = { shopName: string; slipNo: number; customerName: string; garmentSummary: string;
  dueDate: string; paid: number; balance: number | null; trackingUrl: string }

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
// ponytail: same "22 Nov" form for hi and en
export const fmtDate = (s: string) => { const [, m, d] = s.split('-').map(Number); return `${d} ${MONTHS[m - 1]}` }

export function whatsappMessage(kind: CommKind, lang: 'hi' | 'en', d: Data): string {
  const due = fmtDate(d.dueDate)
  // ponytail: whole rupees; remaining shown only when a total is set
  const money = d.balance !== null
    ? (lang === 'hi' ? ` जमा ₹${d.paid}, बाकी ₹${d.balance}।` : ` Paid ₹${d.paid}, remaining ₹${d.balance}.`)
    : d.paid > 0 ? (lang === 'hi' ? ` जमा ₹${d.paid}।` : ` Paid ₹${d.paid}.`) : ''
  if (lang === 'hi') {
    if (kind === 'created')
      return `नमस्ते ${d.customerName}! ${d.shopName}: आपका ऑर्डर #${d.slipNo} (${d.garmentSummary}) बुक हो गया है। ${due} तक तैयार होगा।${money} ट्रैक करें: ${d.trackingUrl}`
    if (kind === 'date_changed')
      return `${d.shopName}: ऑर्डर #${d.slipNo} अब ${due} को तैयार होगा। देरी के लिए माफ़ करें।${money} ट्रैक करें: ${d.trackingUrl}`
    return `${d.shopName}: आपका ऑर्डर #${d.slipNo} लेने के लिए तैयार है।${money} ट्रैक करें: ${d.trackingUrl}`
  }
  if (kind === 'created')
    return `Namaste ${d.customerName}! ${d.shopName}: your order #${d.slipNo} (${d.garmentSummary}) is booked. Expected on ${due}.${money} Track: ${d.trackingUrl}`
  if (kind === 'date_changed')
    return `${d.shopName}: order #${d.slipNo} will now be ready on ${due}. Sorry for the delay.${money} Track: ${d.trackingUrl}`
  return `${d.shopName}: your order #${d.slipNo} is ready for collection.${money} Track: ${d.trackingUrl}`
}

export const whatsappLink = (mobile: string, text: string) =>
  `https://wa.me/91${mobile}?text=${encodeURIComponent(text)}`
