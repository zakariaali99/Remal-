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

## Deploy (current method): git pull on the server
The server can't build (no Node), so the ready-built site lives on the **`production`** branch:
- **On the Mac:** run `./scripts/publish.sh`. It builds, checks, and pushes `site/dist` (plus `update.sh` and `.cpanel.yml`) to `production`.
- **On the server, first time (cPanel Terminal):**
  ```bash
  cd ~ && git clone -b production https://github.com/zakariaali99/Remal-.git remal-site && ~/remal-site/update.sh
  cp ~/public_html/api/config.example.php ~/public_html/api/config.php
  ```
- **Every update:** run `~/remal-site/update.sh`. It pulls and copies into `~/public_html`, never touching `api/config.php`, `.well-known/` or `cgi-bin/`.
  You can also use cPanel → *Git Version Control* → *Deploy HEAD Commit*, which runs `.cpanel.yml`.

## Alternative: automatic deploys (GitHub Actions / FTPS)
Every push to `main` builds the site on GitHub (`.github/workflows/deploy.yml`) and syncs `site/dist/` into
`/home/remalper/public_html` over SSH with rsync. No Node or React server is needed on the host: the output is
plain HTML/CSS/JS, and the only server code is `api/contact.php`, which runs on cPanel's PHP.

### One-time setup (Libyan Spider: external SSH is closed and the server has no rsync, so we deploy over **FTPS**)
1. **cPanel → FTP Accounts:** create `deploy@remalperfumes.ly` with **Directory = `public_html`** and a strong password.
2. **cPanel once:** run AutoSSL (SSL/TLS Status), create `info@` and `no-reply@remalperfumes.ly` (Email Accounts), and set PHP 8.1+ (MultiPHP Manager).
3. **Deploy from the Mac:** create `remal/.deploy.env` (gitignored):
   ```
   FTP_HOST=ftp.remalperfumes.ly
   FTP_USER=deploy@remalperfumes.ly
   FTP_PASS=...
   ```
   then run `./deploy.sh`. It builds, checks, and mirrors `site/dist` over FTPS (TLS). It removes stale build files, but never touches `api/config.php`, `.well-known/` or `cgi-bin/`.
4. **Form config, once, after the first deploy** (cPanel Terminal):
   ```bash
   cp ~/public_html/api/config.example.php ~/public_html/api/config.php
   ```
5. **GitHub Actions (automatic deploys):** once the GitHub account's billing lock is lifted, add the repo secrets `FTP_SERVER=ftp.remalperfumes.ly`, `FTP_USERNAME` and `FTP_PASSWORD`. Every push to `main` then deploys automatically. The SSH path in the workflow only activates if `SSH_HOST` is set, which won't happen unless Libyan Spider opens SSH.

Without secrets, each run still builds the site and attaches it as an artifact (`remal-site-<sha>`) for manual upload through File Manager.

If the final domain is not `remalperfumes.ly`, update `SITE` in `site/src/entry-server.tsx` (it's used for canonical, hreflang, og and the sitemap) and `public/robots.txt`, then rebuild.

## Open items
- Client to confirm: positioning (distributor only, or also its own perfume line?), represented brands, official email/phone/WhatsApp, address.
- Hero image is the client's branded bottle mockup and implies an own-label perfume. Replace it once positioning is confirmed.
- Typography (client request, 2026-10-10): Apple devices use the system font (SF Pro / SF Arabic) with no download. All other devices get the closest free match: **Vazirmatn** for Arabic (chosen by side-by-side comparison with SF Arabic) and **Inter** for Latin. Chinese and Japanese use device fonts. Apple's fonts can't be shipped as web fonts. The logo keeps its own lettering.
- The French, Chinese and Japanese copy was written by Claude. Have a native speaker review it, especially zh/ja, before promoting those pages.
- Phase B (after Dubai): admin panel for brands, products, distributors and news (Django API), with records looked up by id.
