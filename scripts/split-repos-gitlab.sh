#!/usr/bin/env bash
# ============================================================
#  QuickHire — Split monorepo into two GitLab repos
#
#  Run this ONCE from the repo root after cloning.
#
#  What it does:
#    1. Creates a standalone git repo for the backend
#    2. Creates a standalone git repo for the frontend
#    3. Adds your GitLab remotes (edit GITLAB_* vars below)
#
#  Usage:
#    GITLAB_BACKEND=git@gitlab.com:yourorg/quickhire-backend.git \
#    GITLAB_FRONTEND=git@gitlab.com:yourorg/quickhire-frontend.git \
#    bash scripts/split-repos-gitlab.sh
# ============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GITLAB_BACKEND="${GITLAB_BACKEND:-git@gitlab.com:yourorg/quickhire-backend.git}"
GITLAB_FRONTEND="${GITLAB_FRONTEND:-git@gitlab.com:yourorg/quickhire-frontend.git}"

echo "=== QuickHire repo split ==="
echo "Backend  → $GITLAB_BACKEND"
echo "Frontend → $GITLAB_FRONTEND"
echo ""

# ── BACKEND ────────────────────────────────────────────────────────────────
BACKEND_DIR="$ROOT/Backend/backend"
echo "[1/2] Setting up backend repo at $BACKEND_DIR"

cd "$BACKEND_DIR"
if [ ! -d ".git" ]; then
  git init
  git add -A
  git commit -m "chore: initial commit — QuickHire backend"
fi
git remote remove origin 2>/dev/null || true
git remote add origin "$GITLAB_BACKEND"
echo "  ✓ Backend ready. Push with: cd Backend/backend && git push -u origin main"

# ── FRONTEND ───────────────────────────────────────────────────────────────
FRONTEND_DIR="$ROOT/frontend"
echo "[2/2] Setting up frontend repo at $FRONTEND_DIR"

cd "$FRONTEND_DIR"
if [ ! -d ".git" ]; then
  git init
  git add -A
  git commit -m "chore: initial commit — QuickHire frontend"
fi
git remote remove origin 2>/dev/null || true
git remote add origin "$GITLAB_FRONTEND"
echo "  ✓ Frontend ready. Push with: cd frontend && git push -u origin main"

echo ""
echo "=== Next steps ==="
echo "1. cd Backend/backend && git push -u origin main"
echo "2. cd frontend && git push -u origin main"
echo "3. Set CI/CD env vars in each GitLab repo (see .env.example files)"
