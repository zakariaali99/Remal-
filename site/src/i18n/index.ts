// Language metadata only. Dictionaries are NOT imported here, so the browser bundle stays language-free:
// each pre-rendered page embeds just its own dictionary (see scripts/prerender.mjs and main.tsx).
export type Dict = typeof import('./en.json')
export type Key = { [K in keyof Dict]: Dict[K] extends string ? K : never }[keyof Dict]

export const LANGS = {
  ar: { dir: 'rtl', native: 'العربية', path: '/' },
  en: { dir: 'ltr', native: 'English', path: '/en/' },
  fr: { dir: 'ltr', native: 'Français', path: '/fr/' },
  zh: { dir: 'ltr', native: '中文', path: '/zh/' },
  ja: { dir: 'ltr', native: '日本語', path: '/ja/' },
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

export function makeT(dict: Dict) {
  const d = dict as Record<string, unknown>
  return (k: Key) => (d[k] as string) ?? k
}
