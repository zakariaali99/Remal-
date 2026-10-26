# REMAL API (Django)

Products catalogue, the dashboard to manage it, and the partnership form.
It runs at **https://api.remalperfumes.ly** on Libyan Spider cPanel ("Setup Python App", Passenger). The site itself stays static.

| Path | What |
|---|---|
| `/admin/` | Dashboard in Arabic: brands, categories, products and their photos, partnership enquiries |
| `GET /products/?lang=&brand=<id>&category=<id>&page=` | Visible products, 24 per page |
| `GET /products/<id>/?lang=` | One product with all its photos |
| `GET /brands/?lang=` · `GET /categories/?lang=` | Filters for the gallery |
| `POST /contact/` | The partnership form (saved to the dashboard, then emailed to `CONTACT_TO`) |
| `GET /sitemap.xml` | Product pages on the public site, linked from the site's `robots.txt` |

Paths never carry a version prefix. Every record is looked up by its UUID `id`.
`lang` is one of `ar en fr zh ja`. French, Chinese and Japanese text is optional and falls back to English.
Uploaded photos are decoded, resized and re-encoded as WebP (a 2000px image and a 720px thumbnail).

## Develop
```bash
cd backend
uv venv -p 3.10 .venv && uv pip install -p .venv/bin/python -r requirements.txt
printf 'DEBUG=1\nSITE_URL=http://localhost:5173\n' > .env
.venv/bin/python manage.py migrate
.venv/bin/python manage.py seed_demo          # local-only demo products
.venv/bin/python manage.py createsuperuser
.venv/bin/python manage.py runserver 127.0.0.1:8011
.venv/bin/python manage.py test
```
The site reads the API address from `VITE_API` (`site/.env.development` points at `http://127.0.0.1:8011`).

## Server setup (once)
1. **cPanel → Domains:** create `api.remalperfumes.ly` (document root `api.remalperfumes.ly`). Run AutoSSL so it gets HTTPS.
2. **cPanel → MySQL Databases:** create database `remalper_api`, user `remalper_api` with a strong password, and add the user to the database with ALL PRIVILEGES.
3. **cPanel → Email Accounts:** make sure `no-reply@remalperfumes.ly` exists (the API signs in to it to send mail) and `contact@` receives.
4. **cPanel → Terminal:**
   ```bash
   git clone https://github.com/zakariaali99/Remal-.git ~/remal-src
   cp ~/remal-src/backend/.env.example ~/remal-src/backend/.env
   python3 -c "import secrets; print(secrets.token_urlsafe(50))"   # paste as SECRET_KEY
   nano ~/remal-src/backend/.env                                   # SECRET_KEY, DB_PASSWORD, EMAIL_HOST_PASSWORD
   ```
5. **cPanel → Setup Python App → Create:** Python 3.10 or newer (pick the highest), Application root `remal-src/backend`,
   Application URL `api.remalperfumes.ly`, Startup file `passenger_wsgi.py`, Entry point `application`.
6. **Terminal:**
   ```bash
   ~/remal-src/backend/update.sh
   source ~/virtualenv/remal-src/backend/*/bin/activate && cd ~/remal-src/backend && python manage.py createsuperuser
   ```
7. Open https://api.remalperfumes.ly/admin/ and sign in.

## Every update
```bash
~/remal-src/backend/update.sh
```
It pulls `main`, installs requirements, migrates, collects static files and restarts the app. `.env` and uploaded photos are never touched.

## Backups
The data lives in the MySQL database `remalper_api` and the photos in `~/api.remalperfumes.ly/media/`. Both are included in cPanel's full-account backup.
