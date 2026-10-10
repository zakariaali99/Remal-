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

// Web fonts are used only on non-Apple devices (see styles.css): Vazirmatn for Arabic, Inter for Latin.
// Chinese and Japanese always use the device's own fonts.
const INTER = 'https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400;500&display=swap'
export const FONT_URL: Record<Lang, string> = {
  ar: 'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@200;300;400;500&display=swap',
  en: INTER, fr: INTER, zh: INTER, ja: INTER,
}

export function makeT(dict: Dict) {
  const d = dict as Record<string, unknown>
  return (k: Key) => (d[k] as string) ?? k
}
