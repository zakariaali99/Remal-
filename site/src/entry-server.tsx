import { renderToString } from 'react-dom/server'
import App from './App'
import { FONT_URL, LANGS, LANG_CODES, type Lang } from './i18n'
import { MARK_SVG_STRING } from './lib/brand'

export { LANG_CODES }

export const SITE = 'https://remalperfumes.ly' // update if the final domain differs

export function render(lang: Lang) {
  const { dict, dir, path } = LANGS[lang]
  const html = renderToString(<App lang={lang} />)
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
  const alternates = LANG_CODES.map((c) => `<link rel="alternate" hreflang="${c}" href="${SITE}${LANGS[c].path}">`).join('\n')
  const head = `<title>${esc(dict['meta.title'])}</title>
<meta name="description" content="${esc(dict['meta.desc'])}">
<meta name="theme-color" content="#F8F3EC">
<link rel="canonical" href="${SITE}${path}">
${alternates}
<link rel="alternate" hreflang="x-default" href="${SITE}/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="REMAL Perfumes · رمال للعطور">
<meta property="og:title" content="${esc(dict['meta.title'])}">
<meta property="og:description" content="${esc(dict['meta.desc'])}">
<meta property="og:url" content="${SITE}${path}">
<meta property="og:image" content="${SITE}/og.jpg">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:locale" content="${{ ar: 'ar_LY', en: 'en_US', fr: 'fr_FR', zh: 'zh_CN', ja: 'ja_JP' }[lang]}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,${encodeURIComponent(MARK_SVG_STRING)}">
<link rel="stylesheet" href="${FONT_URL[lang]}">`
  return { html, head, lang, dir }
}
