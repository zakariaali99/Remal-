# REMAL Perfumes — official website

The corporate website for **REMAL Company for Perfume Importation (شركة رمال لاستيراد العطور)**, Misrata, Libya.
It is Arabic-first and also comes in English, French, Chinese and Japanese. The site is static and is hosted on **Libyan Spider** (cPanel).

```
remal/
├── brand/            official logo extracted as SVG + brand images (source: logo PDF from the client)
└── site/             the website (Vite + React + Tailwind, pre-rendered to static HTML)
    ├── src/
    │   ├── App.tsx               page structure (all sections)
    │   ├── components/           LangMenu, PartnerForm, ui helpers
    │   ├── i18n/{ar,en,fr,zh,ja}.json   ALL site text, one file per language
    │   ├── lib/brand.tsx         logo components (generated from brand/*.svg)
    │   ├── lib/libya.ts          map outline + Misrata pin
    │   ├── motion.ts             sand intro + scroll animation (GSAP, Lenis)
    │   └── styles.css            brand tokens + styles
    ├── public/
    │   ├── api/contact.php       partnership form → email + CSV backup
    │   ├── api/config.example.php
    │   └── .htaccess             HTTPS, caching, security headers
    └── scripts/prerender.mjs     renders each language to static HTML
```

## Editing text
All text lives in `site/src/i18n/*.json`. Change it there, then rebuild. Keep the same keys in all five files.
Arabic is the default page (`/`). The other languages live under `/en/`, `/fr/`, `/zh/` and `/ja/`.

## Develop and build
```bash
cd site
npm install
npm run dev        # http://localhost:5173 (the form is stubbed locally because PHP isn't installed)
npm run build      # outputs site/dist (all 5 languages + sitemap.xml)
npm run typecheck
```
QA URL flags: `?nointro` skips the opening animation. `?stay` disables the language redirect.
- **Opening:** plays on every page load, with no skip button. It is skipped only right after a language switch, or when the visitor's device asks for reduced motion.
- **Language:** on arrival, visitors are sent to the page in their device language (ar/en/fr/zh/ja; any other language goes to English). A language picked from the globe menu is remembered (`localStorage`) and always wins. Search bots and link-preview crawlers are never redirected.
- **Weight:** the JS bundle carries no text. Each pre-rendered page embeds only its own dictionary (`<script id="__dict">`).

## Deploy to Libyan Spider (cPanel)
1. **Domain:** register `remalperfumes.ly` with Libyan Spider (it was available on 2026-09-29) and point it to the hosting package.
2. **SSL:** cPanel → *SSL/TLS Status* → run AutoSSL. `.htaccess` forces HTTPS, so do this before uploading.
3. **Email:** cPanel → *Email Accounts* → create `info@remalperfumes.ly`, the inbox that receives enquiries, and `no-reply@remalperfumes.ly`, the sender.
4. **Upload:** run `npm run build`, then upload the **contents** of `site/dist/` into `public_html/`. Use cPanel *File Manager → Upload*, then *Extract* the zip. Make sure hidden files (`.htaccess`) are included.
5. **Form config:** in `public_html/api/`, copy `config.example.php` to `config.php` and fill in the `to` and `from` addresses and the `leads_csv` path (`/home/<cpanel-user>/remal-leads.csv`, outside `public_html`).
6. **PHP version:** cPanel → *MultiPHP Manager* → PHP 8.1 or newer.
7. **Test:** open the site, submit the form once, and check that the email arrived and that `remal-leads.csv` got a row.

If the final domain is not `remalperfumes.ly`, update `SITE` in `site/src/entry-server.tsx` (it's used for canonical, hreflang, og and the sitemap) and `public/robots.txt`, then rebuild.

## Open items
- Client to confirm: positioning (distributor only, or also its own perfume line?), represented brands, official email/phone/WhatsApp, address.
- Hero image is the client's branded bottle mockup and implies an own-label perfume. Replace it once positioning is confirmed.
- Fonts are web stand-ins (Alexandria, IBM Plex Sans Arabic, Cormorant Garamond, Jost, Noto SC/JP). The brand fonts (beIN Arabic, Cike) need web licences.
- The French, Chinese and Japanese copy was written by Claude. Have a native speaker review it, especially zh/ja, before promoting those pages.
- Phase B (after Dubai): admin panel for brands, products, distributors and news (Django API), with records looked up by id.
