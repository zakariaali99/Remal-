#!/bin/sh
# Build the site and push it to the "production" branch (ready-built files only).
# The server then publishes it with:  ~/remal-site/update.sh
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
(cd site && npm run typecheck && npm run build)
for f in index.html en/index.html fr/index.html zh/index.html ja/index.html api/contact.php .htaccess; do
  [ -f "site/dist/$f" ] || { echo "missing site/dist/$f"; exit 1; }
done

WT="$ROOT/.production"
git fetch -q origin production 2>/dev/null || true
if [ ! -d "$WT" ]; then
  if git show-ref -q --verify refs/remotes/origin/production; then
    git worktree add -q "$WT" -B production origin/production
  else
    git worktree add -q --orphan -b production "$WT"
  fi
fi
cd "$WT"
git rm -rq --ignore-unmatch . >/dev/null 2>&1 || true
find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -R "$ROOT/site/dist/." .
cp "$ROOT/scripts/production/update.sh" "$ROOT/scripts/production/.cpanel.yml" "$ROOT/scripts/production/README.md" .
chmod +x update.sh
rm -f .DS_Store
git add -A
SRC=$(git -C "$ROOT" rev-parse --short HEAD)
git -c user.name="zakaria_ali" -c user.email="zakaria.ali.sweasi@gmail.com" commit -qm "Build from main@$SRC" || { echo "No changes to publish."; exit 0; }
git push -q -u origin production
echo "Pushed production build of main@$SRC"
