import { renderToString } from 'react-dom/server'
import App, { type PageName } from './App'
import { FONT_URL, LANGS, LANG_CODES, type Lang } from './i18n'
import { DICTS } from './i18n/all'
import { MARK_SVG_STRING } from './lib/brand'

export { LANG_CODES }

export const SITE = 'https://remalperfumes.ly' // update if the final domain differs

export const PAGES: { name: PageName; sub: string }[] = [{ name: 'home', sub: '' }, { name: 'products', sub: 'products/' }]

export function render(lang: Lang, page: PageName = 'home') {
  const { dir } = LANGS[lang]
  const sub = PAGES.find((p) => p.name === page)!.sub
  const path = LANGS[lang].path + sub
  const dict = DICTS[lang]
  const title = page === 'products' ? dict['meta.products.title'] : dict['meta.title']
  const desc = page === 'products' ? dict['meta.products.desc'] : dict['meta.desc']
  const html = renderToString(<App lang={lang} dict={dict} page={page} />)
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
  const alternates = LANG_CODES.map((c) => `<link rel="alternate" hreflang="${c}" href="${SITE}${LANGS[c].path}${sub}">`).join('\n')
  const head = `<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#F8F3EC">
<link rel="canonical" href="${SITE}${path}">
${alternates}
<link rel="alternate" hreflang="x-default" href="${SITE}/${sub}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="REMAL Perfumes · رمال للعطور">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}${path}">
<meta property="og:image" content="${SITE}/og.jpg">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:locale" content="${{ ar: 'ar_LY', en: 'en_US', fr: 'fr_FR', zh: 'zh_CN', ja: 'ja_JP' }[lang]}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,${encodeURIComponent(MARK_SVG_STRING)}">
<link rel="stylesheet" href="${FONT_URL[lang]}">`
  // the page's own dictionary, embedded for hydration (escaped so it can't close the script tag)
  const dictJson = JSON.stringify(dict).replace(/</g, '\\u003c')
  return { html, head, lang, dir, dictJson, path }
}
