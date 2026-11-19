import { en } from './en'
import { hi } from './hi'

export type Lang = 'en' | 'hi'
export type Key = keyof typeof en
export type Vars = Record<string, string | number>

const dict: Record<Lang, Record<Key, string>> = { en, hi }

export function translate(lang: Lang, key: Key, vars?: Vars): string {
  const s = dict[lang][key] ?? en[key]
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s
}

const STAGES: Record<string, Key> = {
  Cutting: 'stage.cutting', Stitching: 'stage.stitching', Ironing: 'stage.ironing', Ready: 'stage.ready',
}
export const stageLabel = (name: string, t: (k: Key) => string) => (STAGES[name] ? t(STAGES[name]) : name)
