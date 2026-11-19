export function paymentSummary(total: number | null, paid: number):
  { status: 'unpaid' | 'partial' | 'paid' | null; balance: number | null } {
  if (total === null) return { status: null, balance: null }
  const balance = total - paid
  return { status: paid <= 0 ? 'unpaid' : balance <= 0 ? 'paid' : 'partial', balance: Math.max(balance, 0) }
}
