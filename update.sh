#!/bin/sh
# Run on the Libyan Spider server (cPanel Terminal) to publish the latest site:
#   ~/remal-site/update.sh
# Pulls the ready-built site from GitHub (branch "production") and copies it into ~/public_html.
# Server-only files (.well-known/, cgi-bin/) and the backend's folders (media/, static/) are never touched.
# The Python app (cPanel "Setup Python App") adds Passenger lines to ~/public_html/.htaccess; they are kept.
set -eu
cd "$(dirname "$0")"
git pull --ff-only origin production
DEST="$HOME/public_html"
PASSENGER=$(sed -n '/PASSENGER CONFIGURATION BEGIN/,/PASSENGER CONFIGURATION END/p' "$DEST/.htaccess" 2>/dev/null || true)
rm -rf "$DEST/assets"   # old hashed CSS/JS bundles
rm -rf "$DEST/products" "$DEST/en/products" "$DEST/fr/products" "$DEST/zh/products" "$DEST/ja/products"
for item in assets img products en fr zh ja index.html og.jpg robots.txt sitemap.xml; do
  [ -e "$item" ] && cp -R "$item" "$DEST/"
done
{ [ -n "$PASSENGER" ] && printf '%s\n\n' "$PASSENGER"; cat .htaccess; } > "$DEST/.htaccess"
echo "Published $(git log -1 --format='%h %s') to $DEST"
