// Renders every language to static HTML so the site works on plain cPanel hosting (Libyan Spider)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const template = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')
const { render, LANG_CODES, SITE } = await import(pathToFileURL(path.join(root, 'dist-ssr/entry-server.js')).href)

const urls = []
for (const lang of LANG_CODES) {
  const { html, head, dir, dictJson } = render(lang)
  const page = template
    .replace('<html lang="ar" dir="rtl">', `<html lang="${lang}" dir="${dir}">`)
    .replace('<!--head-->', () => head)
    .replace('<!--app-->', () => html)
    .replace('<!--dict-->', () => `<script id="__dict" type="application/json">${dictJson}</script>`)
  const out = lang === 'ar' ? dist : path.join(dist, lang)
  fs.mkdirSync(out, { recursive: true })
  fs.writeFileSync(path.join(out, 'index.html'), page)
  urls.push(`${SITE}${lang === 'ar' ? '/' : `/${lang}/`}`)
  console.log('rendered', lang)
}
fs.writeFileSync(path.join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`)
fs.rmSync(path.join(root, 'dist-ssr'), { recursive: true, force: true })
