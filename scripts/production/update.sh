#!/bin/sh
# Run on the Libyan Spider server (cPanel Terminal) to publish the latest site:
#   ~/remal-site/update.sh
# Pulls the ready-built site from GitHub (branch "production") and copies it into ~/public_html.
# Server-only files (api/config.php, .well-known/, cgi-bin/) are never touched.
set -eu
cd "$(dirname "$0")"
git pull --ff-only origin production
DEST="$HOME/public_html"
rm -rf "$DEST/assets"   # old hashed CSS/JS bundles
for item in assets img en fr zh ja api index.html og.jpg robots.txt sitemap.xml .htaccess; do
  cp -R "$item" "$DEST/"
done
echo "Published $(git log -1 --format='%h %s') to $DEST"
