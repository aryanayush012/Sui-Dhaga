export const TONES = {
  todo: 'bg-[#DFE1E6] text-[#42526E]',
  progress: 'bg-[#DEEBFF] text-[#0747A6]',
  ready: 'bg-[#E3FCEF] text-[#006644]',
  delivered: 'bg-white text-[#006644] border border-[#57D9A3]',
  rejected: 'bg-[#FFEBE6] text-[#BF2600]',
} as const
export type Tone = keyof typeof TONES

const AVATAR_COLORS = ['#0052CC', '#00875A', '#DE350B', '#6554C0', '#FF8B00', '#008DA6', '#403294', '#5E6C84']

// Stable colour per name; initial is the first letter, uppercased.
export function avatarStyle(name: string) {
  const n = name.trim()
  let h = 0
  for (const ch of n) h = (h * 31 + ch.codePointAt(0)!) >>> 0
  return { initial: (Array.from(n)[0] ?? '?').toUpperCase(), color: AVATAR_COLORS[h % AVATAR_COLORS.length] }
}

// Known error code -> its message key, else the generic one.
export const errorKey = (code: string, known: object) => (`error.${code}` in known ? `error.${code}` : 'error.generic')
