import { describe, expect, it } from 'vitest'
import { addChip, attachPhoto, buildPayload, removeChip, type Row } from './newOrder'

describe('chips', () => {
  it('adds, increments, removes', () => {
    let r: Row[] = addChip([], 'pant', 'a')
    r = addChip(r, 'shirt', 'b')
    r = addChip(r, 'pant', 'c')
    expect(r.map((x) => [x.type, x.qty])).toEqual([['pant', 2], ['shirt', 1]])
    expect(removeChip(r, 'pant').map((x) => x.type)).toEqual(['shirt'])
  })
})
describe('attachPhoto', () => {
  it('creates an other garment when none', () => {
    expect(attachPhoto([], 'cloth_photo_path', 'p', 'k')).toMatchObject([{ type: 'other', qty: 1, cloth_photo_path: 'p' }])
    expect(attachPhoto([], 'cloth_photo_path', null)).toEqual([])
  })
  it('attaches to first', () => {
    const r = attachPhoto(addChip(addChip([], 'pant', 'a'), 'shirt', 'b'), 'measurement_photo_path', 'm')
    expect(r[0].measurement_photo_path).toBe('m')
    expect(r[1].measurement_photo_path).toBeUndefined()
  })
})
describe('buildPayload', () => {
  it('strips key, empty measurements; cash advance', () => {
    const p = buildPayload({ name: ' A ', mobile: '9876543210', due: '2026-11-27', rack: ' ', assignee: '', total: 500, advance: 100, notes: '',
      garments: [{ key: 'x', type: 'pant', qty: 1, measurements: { waist: '30', hip: ' ' } }] })
    expect(p.garments[0]).not.toHaveProperty('key')
    expect(p.garments[0].measurements).toEqual({ waist: '30' })
    expect(p).toMatchObject({ customer_name: 'A', rack: null, assignee_id: null, advance: { amount: 100, method: 'cash' } })
  })
})
