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

## Deploy: GitHub Actions → Libyan Spider (automatic)
Every push to `main` builds the site on GitHub (`.github/workflows/deploy.yml`) and syncs `site/dist/` into
`/home/remalper/public_html` over SSH with rsync. No Node or React server is needed on the host: the output is
plain HTML/CSS/JS, and the only server code is `api/contact.php`, which runs on cPanel's PHP.

### One-time setup
1. **Server: authorise the deploy key.** In the cPanel Terminal (user `remalper`):
   ```bash
   mkdir -p ~/.ssh && chmod 700 ~/.ssh
   echo "<contents of ~/.ssh/remal_github_deploy.pub on Zakaria's Mac>" >> ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   which rsync && hostname
   ```
2. **SSH details:** ask Libyan Spider (or check cPanel → *SSH Access*) for the SSH **hostname** and **port**, and make sure external SSH is enabled for the account.
3. **GitHub secrets** (repo → Settings → Secrets and variables → Actions → *New repository secret*):
   | Secret | Value |
   |---|---|
   | `SSH_HOST` | server hostname, e.g. `ls55.…` |
   | `SSH_PORT` | the SSH port |
   | `SSH_USER` | `remalper` |
   | `SSH_KEY` | the **private** key: run `pbcopy < ~/.ssh/remal_github_deploy` on the Mac, then paste |
   No SSH? Set `FTP_SERVER`, `FTP_USERNAME` and `FTP_PASSWORD` instead (an FTP account rooted at `public_html`). The workflow falls back to FTP.
4. **cPanel once:** run AutoSSL (SSL/TLS Status), create `info@` and `no-reply@remalperfumes.ly` (Email Accounts), set PHP 8.1+ (MultiPHP Manager).
5. **Form config on the server, once:**
   ```bash
   cp ~/public_html/api/config.example.php ~/public_html/api/config.php
   ```
   Deploys never overwrite or delete `api/config.php` or `.well-known/`.
6. Push to `main` (or Actions → *Build & deploy* → *Run workflow*), open the site, and send one test enquiry.

**Deploy from the Mac instead** (no GitHub Actions needed): create `.deploy.env` with `SSH_HOST`, `SSH_PORT` and `SSH_USER=remalper`, then run `./deploy.sh`.

Without secrets, each run still builds the site and attaches it as an artifact (`remal-site-<sha>`) for manual upload through File Manager.

If the final domain is not `remalperfumes.ly`, update `SITE` in `site/src/entry-server.tsx` (it's used for canonical, hreflang, og and the sitemap) and `public/robots.txt`, then rebuild.

## Open items
- Client to confirm: positioning (distributor only, or also its own perfume line?), represented brands, official email/phone/WhatsApp, address.
- Hero image is the client's branded bottle mockup and implies an own-label perfume. Replace it once positioning is confirmed.
- Fonts are web stand-ins (Alexandria, IBM Plex Sans Arabic, Cormorant Garamond, Jost, Noto SC/JP). The brand fonts (beIN Arabic, Cike) need web licences.
- The French, Chinese and Japanese copy was written by Claude. Have a native speaker review it, especially zh/ja, before promoting those pages.
- Phase B (after Dubai): admin panel for brands, products, distributors and news (Django API), with records looked up by id.
