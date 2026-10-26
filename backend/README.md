# REMAL backend (Django)

The products catalogue, the dashboard that manages it, and the partnership form.
It runs on **remalperfumes.ly itself** as a Libyan Spider cPanel Python app (Passenger). Apache keeps serving the
static site from `~/public_html`; Django answers only the paths below.

| Path | What |
|---|---|
| `/dashboard/` | The REMAL dashboard (Arabic): brands, categories, products and their photos, partnership enquiries |
| `GET /api/products/?lang=&brand=<id>&category=<id>&page=` | Visible products, 24 per page |
| `GET /api/products/<id>/?lang=` | One product with all its photos |
| `GET /api/brands/?lang=` · `GET /api/categories/?lang=` | Filters for the gallery |
| `POST /api/contact/` | The partnership form (saved to the dashboard, then emailed to `CONTACT_TO` through the server's own mail system) |
| `GET /api/sitemap.xml` | Product pages, linked from the site's `robots.txt` |

Paths never carry a version prefix. Every record is looked up by its UUID `id`.
`lang` is one of `ar en fr zh ja`. French, Chinese and Japanese text is optional and falls back to English.
Uploaded photos are decoded, resized and re-encoded as WebP (a 2000px image and a 720px thumbnail); the dashboard
also shrinks large phone photos in the browser before uploading them.

## Code
- `catalog/`: brands, categories, products, photos, and the public `/api/` views.
- `inquiries/`: the partnership form endpoint and its records.
- `dashboard/`: the dashboard. Plain Django views and templates, one stylesheet (`static/dashboard/dash.css`) and one
  small script (`static/dashboard/dash.js`) for tabs, the live preview, photo upload and drag-to-reorder. Every page works without the script.

## Develop
```bash
cd backend
uv venv -p 3.10 .venv && uv pip install -p .venv/bin/python -r requirements.txt
printf 'DEBUG=1\n' > .env
.venv/bin/python manage.py migrate
.venv/bin/python manage.py seed_demo          # local-only demo products
.venv/bin/python manage.py createsuperuser
.venv/bin/python manage.py runserver 127.0.0.1:8011
.venv/bin/python manage.py test
```
Then `npm run dev` in `site/`: Vite forwards `/api`, `/dashboard`, `/media` and `/static` to Django, as Apache does on the server.

## Server setup (once)
Do these in order. The site keeps working the whole time; only the products gallery and the form wait for step 3.

1. **cPanel → Terminal:**
   ```bash
   git clone https://github.com/zakariaali99/Remal-.git ~/remal-src
   cp ~/remal-src/backend/.env.example ~/remal-src/backend/.env
   python3 -c "import secrets; print(secrets.token_urlsafe(50))"   # paste as SECRET_KEY
   nano ~/remal-src/backend/.env
   ```
   Check that `MEDIA_ROOT` and `STATIC_ROOT` in `.env` use your cPanel user name (`/home/<user>/public_html/...`).
2. **cPanel → Setup Python App → Create:** Python 3.10 or newer (pick the highest), Application root `remal-src/backend`,
   Application URL `remalperfumes.ly` with the path box **empty** (the domain root), Startup file `passenger_wsgi.py`, Entry point `application`.
   cPanel adds a few Passenger lines to the top of `~/public_html/.htaccess`. Leave them there: the site's `update.sh` keeps them.
3. **Terminal:**
   ```bash
   ~/remal-src/backend/update.sh
   source ~/virtualenv/remal-src/backend/*/bin/activate && cd ~/remal-src/backend && python manage.py createsuperuser
   rm -rf ~/public_html/api        # the old PHP form; /api/ now belongs to Django
   ~/remal-site/update.sh          # publish the site build that reads /api/
   ```
4. **Check** in a browser:
   - https://remalperfumes.ly/ and https://remalperfumes.ly/en/ still show the site (Apache serves existing files; Passenger only gets the rest).
   - https://remalperfumes.ly/api/products/ returns JSON.
   - https://remalperfumes.ly/dashboard/ shows the REMAL sign-in page.
5. Sign in, add the brands, categories and products. They appear at https://remalperfumes.ly/products/ within a minute.

If step 4 shows the dashboard's 404 page instead of the home page, the host's Passenger is taking every request:
tell Libyan Spider support "Passenger at the domain root should let Apache serve existing files in public_html", or
ask them to map only `/api` and `/dashboard` to the app.

## Every update
```bash
~/remal-src/backend/update.sh
```
It pulls `main`, installs requirements, migrates, collects static files and restarts the app. `.env` and uploaded photos are never touched.

## Backups
The data lives in the SQLite file `~/remal-src/backend/db.sqlite3` and the photos in `~/public_html/media/`. Both are in the home folder, so cPanel's full-account backup includes them. `update.sh` (git pull) never touches the database file.
