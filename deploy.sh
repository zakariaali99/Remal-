#!/bin/sh
# Deploy from this Mac to Libyan Spider (same result as the GitHub Actions workflow).
# Needs a .deploy.env next to this script (gitignored) with:
#   SSH_HOST=...   SSH_PORT=...   SSH_USER=remalper
# and the public key ~/.ssh/remal_github_deploy.pub authorised on the server.
set -eu
cd "$(dirname "$0")"
[ -f .deploy.env ] || { echo "Create .deploy.env with SSH_HOST, SSH_PORT, SSH_USER first."; exit 1; }
. ./.deploy.env
: "${SSH_PORT:=22}" "${SSH_USER:=remalper}"

(cd site && npm run typecheck && npm run build)
for f in index.html en/index.html fr/index.html zh/index.html ja/index.html api/contact.php .htaccess; do
  [ -f "site/dist/$f" ] || { echo "missing site/dist/$f"; exit 1; }
done

rsync -az --delete \
  --exclude 'api/config.php' --exclude '.well-known/' --exclude 'cgi-bin/' \
  -e "ssh -i $HOME/.ssh/remal_github_deploy -p $SSH_PORT" \
  site/dist/ "$SSH_USER@$SSH_HOST:public_html/"
echo "Deployed $(git rev-parse --short HEAD) to $SSH_HOST:~/public_html"
