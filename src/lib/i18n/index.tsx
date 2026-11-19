'use client'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { en } from './en'
import { hi } from './hi'

export type Lang = 'en' | 'hi'
export type Key = keyof typeof en
type Vars = Record<string, string | number>

const dict: Record<Lang, Record<Key, string>> = { en, hi }

export function translate(lang: Lang, key: Key, vars?: Vars): string {
  const s = dict[lang][key] ?? en[key]
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s
}

const STAGES: Record<string, Key> = {
  Cutting: 'stage.cutting', Stitching: 'stage.stitching', Ironing: 'stage.ironing', Ready: 'stage.ready',
}
export const stageLabel = (name: string, t: (k: Key) => string) => (STAGES[name] ? t(STAGES[name]) : name)

type Ctx = { t: (key: Key, vars?: Vars) => string; lang: Lang; setLang: (l: Lang) => void }
const I18nCtx = createContext<Ctx | null>(null)
const isLang = (v: unknown): v is Lang => v === 'en' || v === 'hi'

export function I18nProvider({ defaultLang, children }: { defaultLang: string; children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(isLang(defaultLang) ? defaultLang : 'hi')
  // Per device: read after mount so server and client first render match.
  useEffect(() => {
    try {
      const saved = localStorage.getItem('lang')
      if (isLang(saved)) setLangState(saved)
    } catch {}
  }, [])
  useEffect(() => { document.documentElement.lang = lang }, [lang])
  const setLang = (l: Lang) => {
    setLangState(l)
    try { localStorage.setItem('lang', l) } catch {}
  }
  return (
    <I18nCtx.Provider value={{ lang, setLang, t: (key, vars) => translate(lang, key, vars) }}>
      {children}
    </I18nCtx.Provider>
  )
}

export function useT(): Ctx {
  const c = useContext(I18nCtx)
  if (!c) throw new Error('useT outside I18nProvider')
  return c
}
