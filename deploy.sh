#!/bin/sh
# Build and deploy from this Mac to Libyan Spider over FTPS.
# Needs .deploy.env next to this script (gitignored, created by you, never committed):
#   FTP_HOST=ftp.remalperfumes.ly
#   FTP_USER=<FTP account whose home is public_html, e.g. deploy@remalperfumes.ly>
#   FTP_PASS=<its password>
#   FTP_DIR=            (leave empty when the account's home is public_html)
set -eu
cd "$(dirname "$0")"
(cd site && npm run typecheck && npm run build)
for f in index.html en/index.html fr/index.html zh/index.html ja/index.html api/contact.php .htaccess; do
  [ -f "site/dist/$f" ] || { echo "missing site/dist/$f"; exit 1; }
done
python3 scripts/deploy_ftp.py
