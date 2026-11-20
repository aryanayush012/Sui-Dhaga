'use client'
import type { BoardOrder } from '@/lib/types'
import type { Stage } from '@/lib/board'
import { OrderCard } from './OrderCard'

// The list view shows the same pieces as a board card, in a flat row.
export function ListRow(p: { o: BoardOrder; today: string; isOwner: boolean; stages: Stage[]; onChanged: () => unknown }) {
  return <OrderCard {...p} row />
}
