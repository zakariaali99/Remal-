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

// Web fonts are only a fallback for devices without Apple's system fonts (see styles.css):
// Cairo for Arabic, Inter for Latin. Chinese and Japanese always use the device's own fonts, so nothing is downloaded.
const INTER = 'family=Inter:wght@200;300;400;500'
export const FONT_URL: Record<Lang, string> = {
  ar: `https://fonts.googleapis.com/css2?family=Cairo:wght@200;300;400;500&${INTER}&display=swap`,
  en: `https://fonts.googleapis.com/css2?${INTER}&display=swap`,
  fr: `https://fonts.googleapis.com/css2?${INTER}&display=swap`,
  zh: `https://fonts.googleapis.com/css2?${INTER}&display=swap`,
  ja: `https://fonts.googleapis.com/css2?${INTER}&display=swap`,
}

export function makeT(dict: Dict) {
  const d = dict as Record<string, unknown>
  return (k: Key) => (d[k] as string) ?? k
}
