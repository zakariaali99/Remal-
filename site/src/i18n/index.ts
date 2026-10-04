import ar from './ar.json'
import en from './en.json'
import fr from './fr.json'
import zh from './zh.json'
import ja from './ja.json'

export type Dict = typeof en
export type Key = { [K in keyof Dict]: Dict[K] extends string ? K : never }[keyof Dict]

export const LANGS = {
  ar: { dict: ar as Dict, dir: 'rtl', native: 'العربية', path: '/' },
  en: { dict: en, dir: 'ltr', native: 'English', path: '/en/' },
  fr: { dict: fr as Dict, dir: 'ltr', native: 'Français', path: '/fr/' },
  zh: { dict: zh as Dict, dir: 'ltr', native: '中文', path: '/zh/' },
  ja: { dict: ja as Dict, dir: 'ltr', native: '日本語', path: '/ja/' },
} as const

export type Lang = keyof typeof LANGS
export const LANG_CODES = Object.keys(LANGS) as Lang[]

// Google Fonts per language: CJK fonts are heavy, so only those pages load them
const BASE_FONTS = 'family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Jost:wght@300;400;500'
export const FONT_URL: Record<Lang, string> = {
  ar: `https://fonts.googleapis.com/css2?family=Alexandria:wght@200;300;400&family=IBM+Plex+Sans+Arabic:wght@300;400;500&${BASE_FONTS}&display=swap`,
  en: `https://fonts.googleapis.com/css2?family=Alexandria:wght@200&${BASE_FONTS}&display=swap`,
  fr: `https://fonts.googleapis.com/css2?family=Alexandria:wght@200&${BASE_FONTS}&display=swap`,
  zh: `https://fonts.googleapis.com/css2?family=Alexandria:wght@200&family=Noto+Serif+SC:wght@300;400&family=Noto+Sans+SC:wght@300;400&${BASE_FONTS}&display=swap`,
  ja: `https://fonts.googleapis.com/css2?family=Alexandria:wght@200&family=Noto+Serif+JP:wght@300;400&family=Noto+Sans+JP:wght@300;400&${BASE_FONTS}&display=swap`,
}

export function makeT(lang: Lang) {
  const d = LANGS[lang].dict as Record<string, unknown>
  return (k: Key) => (d[k] as string) ?? k
}
