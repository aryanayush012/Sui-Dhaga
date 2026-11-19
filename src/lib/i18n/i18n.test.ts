import { describe, it, expect } from 'vitest'
import { en } from './en'
import { hi } from './hi'
import { translate, stageLabel } from './index'

describe('i18n', () => {
  it('hi has every en key and t fills vars', () => {
    expect(Object.keys(hi).sort()).toEqual(Object.keys(en).sort())
    expect(translate('en', 'board.due', { date: '22 Nov' })).toBe(en['board.due'].replace('{date}', '22 Nov'))
  })
  it('stageLabel translates seeded stages only', () => {
    const t = (k: keyof typeof en) => translate('hi', k)
    expect(stageLabel('Cutting', t)).toBe(hi['stage.cutting'])
    expect(stageLabel('Packing', t)).toBe('Packing')
  })
})
