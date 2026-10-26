#!/bin/sh
# Run on the Libyan Spider server (cPanel Terminal) to deploy the latest backend (/api/ and /dashboard/):
#   ~/remal-src/backend/update.sh
# Pulls main from GitHub, installs requirements, migrates the database, collects static files, restarts the app.
set -eu
cd "$(dirname "$0")"
[ -f .env ] || { echo "Missing backend/.env (copy .env.example and fill it in)."; exit 1; }
git pull --ff-only origin main
# the virtualenv cPanel created for this app ("Setup Python App"): ~/virtualenv/<app root>/<version>
VENV=$(ls -d "$HOME"/virtualenv/remal-src/backend/*/ 2>/dev/null | sort -V | tail -1)
[ -n "$VENV" ] || { echo "Python app not found. Create it in cPanel > Setup Python App (root: remal-src/backend)."; exit 1; }
. "$VENV/bin/activate"
pip install -q -r requirements.txt
python manage.py migrate --noinput
python manage.py collectstatic --noinput -v0
python manage.py check --deploy --fail-level ERROR
# uploaded images are only ever served as files, never run
MEDIA=$(python manage.py shell -v0 -c "from django.conf import settings; print(settings.MEDIA_ROOT)")
if [ -n "$MEDIA" ]; then
  mkdir -p "$MEDIA"
  printf '%s\n' 'Options -ExecCGI -Indexes' '<FilesMatch "\.(?i:php\d?|phtml|phar|py|pl|cgi|sh)$">' '  Require all denied' '</FilesMatch>' > "$MEDIA/.htaccess"
fi
mkdir -p tmp && touch tmp/restart.txt
echo "Backend updated to $(git log -1 --format='%h %s')"
