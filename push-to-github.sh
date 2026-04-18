#!/usr/bin/env bash 
# =============================================================================
#  push-to-github.sh
#  Push Data Warehouse project to GitHub repo: DW-SALES
#
#  USAGE:
#    chmod +x push-to-github.sh        # (first time only)
#    ./push-to-github.sh               # push with default commit message
#    ./push-to-github.sh "my message"  # push with custom commit message
#
#  SETUP (fill in your credentials before running):
#    GITHUB_USERNAME  — your GitHub username
#    GITHUB_TOKEN     — your GitHub Personal Access Token (PAT)
#                       Generate at: https://github.com/settings/tokens
#                       Required scopes: repo (Full control of private repositories)
# =============================================================================

set -euo pipefail   # exit on error, unset variable, or pipe failure

# ─── LOAD .env FILE (if present) ──────────────────────────────────────────────
SCRIPT_DIR_ENV="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "${SCRIPT_DIR_ENV}/.env" ]; then
    export $(grep -v '^#' "${SCRIPT_DIR_ENV}/.env" | xargs)
fi

# ─── CONFIG ───────────────────────────────────────────────────────────────────
GITHUB_USERNAME="drfawzyofficial"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
REPO_NAME="DW-SALES"
BRANCH="main"
REMOTE_URL="https://${GITHUB_USERNAME}:${GITHUB_TOKEN}@github.com/${GITHUB_USERNAME}/${REPO_NAME}.git"

# ─── COMMIT MESSAGE ───────────────────────────────────────────────────────────
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
COMMIT_MSG="${1:-"chore: update DW-SALES project — ${TIMESTAMP}"}"

# ─── SAFETY CHECK ─────────────────────────────────────────────────────────────
if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌  ERROR: GITHUB_TOKEN is empty."
    echo "    Open this script and set GITHUB_TOKEN to your GitHub Personal Access Token."
    exit 1
fi

# ─── RESOLVE SCRIPT DIRECTORY (project root) ──────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
echo "📂  Working directory: $(pwd)"

# ─── INITIALIZE GIT IF NEEDED ─────────────────────────────────────────────────
if [ ! -d ".git" ]; then
    echo "🔧  Initializing git repository..."
    git init
    git branch -M "$BRANCH"
fi

# ─── SET / UPDATE REMOTE ──────────────────────────────────────────────────────
if git remote get-url origin &>/dev/null; then
    git remote set-url origin "$REMOTE_URL"
    echo "🔗  Remote 'origin' updated."
else
    git remote add origin "$REMOTE_URL"
    echo "🔗  Remote 'origin' added."
fi

# ─── GIT IDENTITY (required for commits) ──────────────────────────────────────
git config user.name  "drfawzyofficial"
git config user.email "drfawzyofficial@github.com"

# ─── STAGE → COMMIT → PUSH ────────────────────────────────────────────────────
echo "📦  Staging all changes..."
git add -A

# Only commit if there is something to commit
if git diff --cached --quiet; then
    echo "✅  Nothing to commit — working tree is clean."
else
    echo "💾  Committing: \"${COMMIT_MSG}\""
    git commit -m "$COMMIT_MSG"
fi

echo "🚀  Pushing to ${GITHUB_USERNAME}/${REPO_NAME} (${BRANCH})..."
git push -u origin "$BRANCH" --force-with-lease 2>&1 | sed "s/${GITHUB_TOKEN}/***HIDDEN***/g"

echo ""
echo "✅  Done! View your repo at:"
echo "    https://github.com/${GITHUB_USERNAME}/${REPO_NAME}"
