#!/bin/sh
# Run on the Libyan Spider server (cPanel Terminal) to publish the latest site:
#   ~/remal-site/update.sh
# Pulls the ready-built site from GitHub (branch "production") and copies it into ~/public_html.
# Server-only files (.well-known/, cgi-bin/) are never touched. The API lives separately (~/remal-src/backend).
set -eu
cd "$(dirname "$0")"
git pull --ff-only origin production
DEST="$HOME/public_html"
rm -rf "$DEST/assets"   # old hashed CSS/JS bundles
rm -rf "$DEST/products" "$DEST/en/products" "$DEST/fr/products" "$DEST/zh/products" "$DEST/ja/products"
for item in assets img products en fr zh ja index.html og.jpg robots.txt sitemap.xml .htaccess; do
  [ -e "$item" ] && cp -R "$item" "$DEST/"
done
echo "Published $(git log -1 --format='%h %s') to $DEST"
