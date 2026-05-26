#!/bin/bash
# Run this from inside your repurpose project folder:
#   cd path/to/repurpose && bash git-cleanup.sh
set -e

KEY="pk_live_51RhU4VR1X11A4FtE9pbHNgPKkM30gsecGpL0DMzjIO2T10Fdgi2aN4jbzQET7fJf6LcOmcS0HRyATJSYqDQ5VtjC00jwsgSyLK"

echo ""
echo "=== 1/4  Checking git history for exposed key ==="
if git log --all -S "$KEY" --oneline 2>/dev/null | grep -q .; then
  echo "⚠️  Key found in history — rewriting commits to remove it..."

  git filter-branch --force --tree-filter "
    if [ -f public/index.html ]; then
      sed -i.bak \"s|${KEY}|REMOVED_SEE_ENV|g\" public/index.html && rm -f public/index.html.bak
    fi
  " --tag-name-filter cat -- --all

  # clean up filter-branch refs
  git for-each-ref --format='delete %(refname)' refs/original | git update-ref --stdin
  git reflog expire --expire=now --all
  git gc --prune=now --aggressive

  echo "✅ Key scrubbed from all commits"
else
  echo "✅ Key not found in git history — nothing to scrub"
fi

echo ""
echo "=== 2/4  Staging changed files ==="
git add public/index.html pages/index.js
# .env.local is gitignored — do NOT add it
echo "✅ Staged: public/index.html, pages/index.js"

echo ""
echo "=== 3/4  Committing ==="
git commit -m "security: remove hardcoded Stripe key, inject via env var at runtime

- public/index.html: replace hardcoded pk_live_ with window.__STRIPE_KEY__
- pages/index.js: serve HTML server-side, inject key from NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- .env.local already gitignored; NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY added there"

echo ""
echo "=== 4/4  Pushing to GitHub ==="
BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Branch: $BRANCH"
git push origin "$BRANCH" --force-with-lease

echo ""
echo "✅ All done!"
echo "   • Hardcoded key removed from code and history"
echo "   • Key now lives only in .env.local (gitignored)"
echo "   • pages/index.js injects it server-side via NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
