#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# scripts/push-to-github.sh
#
# Creates a new GitHub repo from this local portfolio project and pushes
# the clean 7-commit history to it.
#
# Usage:
#   GH_TOKEN=ghp_xxx  bash scripts/push-to-github.sh
#
# Optional env vars (with defaults):
#   REPO_NAME=teamflow
#   REPO_VISIBILITY=public        # public | private
#   REPO_DESCRIPTION="Multi-tenant SaaS workspace platform — Next.js 16, Prisma, Socket.IO, RBAC, real-time Kanban, audit logs, analytics."
#
# The token is NEVER written to disk, NEVER echoed, NEVER committed.
# It is read from the GH_TOKEN environment variable only.
#
# After a successful push, the script prints the repo URL.
#
# To create a fresh PAT:  https://github.com/settings/tokens/new
#   - Scope: repo (Full control of private repositories)
#   - Expiration: 90 days (or shorter)
#   - DO NOT paste the token in any chat — GitHub secret-scanner will revoke it
# ---------------------------------------------------------------------------
set -euo pipefail

# --- 1. Validate env ------------------------------------------------------
if [[ -z "${GH_TOKEN:-}" ]]; then
  echo "ERROR: GH_TOKEN environment variable is not set." >&2
  echo "Create a PAT at https://github.com/settings/tokens/new (scope: repo)" >&2
  echo "Then run:  GH_TOKEN=ghp_xxx bash scripts/push-to-github.sh" >&2
  exit 1
fi

REPO_NAME="${REPO_NAME:-teamflow}"
REPO_VISIBILITY="${REPO_VISIBILITY:-public}"
REPO_DESCRIPTION="${REPO_DESCRIPTION:-Multi-tenant SaaS workspace platform — Next.js 16, Prisma, Socket.IO, RBAC, real-time Kanban, audit logs, analytics.}"

if [[ "$REPO_VISIBILITY" != "public" && "$REPO_VISIBILITY" != "private" ]]; then
  echo "ERROR: REPO_VISIBILITY must be 'public' or 'private'" >&2
  exit 1
fi

# --- 2. Identify the GitHub user from the token ---------------------------
echo "→ Identifying GitHub user from token..."
USER_JSON=$(curl -sS \
  -H "Authorization: Bearer ${GH_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/user)

LOGIN=$(echo "$USER_JSON" | grep -m1 '"login"' | sed -E 's/.*"login"\s*:\s*"([^"]+)".*/\1/')
if [[ -z "$LOGIN" || "$LOGIN" == *"Bad credentials"* || "$USER_JSON" == *"Bad credentials"* ]]; then
  echo "ERROR: GitHub rejected the token (Bad credentials)." >&2
  echo "Likely causes:" >&2
  echo "  - Token already expired or revoked (GitHub auto-revokes tokens exposed in chat/commits)" >&2
  echo "  - Token missing 'repo' scope" >&2
  echo "Create a new one at https://github.com/settings/tokens/new" >&2
  exit 1
fi
echo "  Authenticated as: $LOGIN"

# --- 3. Check if repo already exists; create if not -----------------------
echo "→ Checking if '$LOGIN/$REPO_NAME' exists..."
EXISTING=$(curl -sS -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer ${GH_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$LOGIN/$REPO_NAME")

if [[ "$EXISTING" == "200" ]]; then
  echo "  Repo already exists — will push to it (force-with-lease)."
elif [[ "$EXISTING" == "404" ]]; then
  echo "→ Creating new $REPO_VISIBILITY repo '$LOGIN/$REPO_NAME'..."
  CREATE_RESP=$(curl -sS -X POST \
    -H "Authorization: Bearer ${GH_TOKEN}" \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    https://api.github.com/user/repos \
    -d "$(cat <<EOF
{
  "name": "$REPO_NAME",
  "description": "$REPO_DESCRIPTION",
  "private": $([ "$REPO_VISIBILITY" = "private" ] && echo "true" || echo "false"),
  "has_issues": true,
  "has_projects": false,
  "has_wiki": false,
  "has_discussions": false,
  "auto_init": false,
  "homepage": "",
  "license_template": "MIT"
}
EOF
)")
  HTML_URL=$(echo "$CREATE_RESP" | grep -m1 '"html_url"' | sed -E 's/.*"html_url"\s*:\s*"([^"]+)".*/\1/')
  if [[ -z "$HTML_URL" ]]; then
    echo "ERROR: Failed to create repo. API response:" >&2
    echo "$CREATE_RESP" >&2
    exit 1
  fi
  echo "  Created: $HTML_URL"
else
  echo "ERROR: Unexpected response from GitHub (HTTP $EXISTING)" >&2
  exit 1
fi

# --- 4. Configure git remote ---------------------------------------------
REMOTE_URL="https://x-access-token:${GH_TOKEN}@github.com/${LOGIN}/${REPO_NAME}.git"

# Remove any existing origin (idempotent)
git remote remove origin 2>/dev/null || true

# Add origin with token embedded (will be rewritten to a clean URL after push)
git remote add origin "$REMOTE_URL"
# Also set the public-facing URL so it doesn't leak the token in `git remote -v`
git remote set-url --push origin "$REMOTE_URL"
git remote set-url origin "https://github.com/${LOGIN}/${REPO_NAME}.git"

echo "→ Pushing main to origin..."
git push -u origin main

# --- 5. Clean up token from git config -----------------------------------
# Replace the push URL with the public URL (token no longer needed after push)
git remote set-url --push origin "https://github.com/${LOGIN}/${REPO_NAME}.git"

# --- 6. Done --------------------------------------------------------------
echo ""
echo "✓ Push complete."
echo ""
echo "  Repo:    https://github.com/$LOGIN/$REPO_NAME"
echo "  Branch:  main"
echo "  Commits: $(git rev-list --count HEAD)"
echo ""
echo "Next steps:"
echo "  1. Open the repo and add topics: nextjs, react, typescript, prisma,"
echo "     saas, multi-tenant, rbac, kanban, socket-io, portfolio"
echo "  2. Add a social preview image (use screenshots/08-landing.png)"
echo "  3. Pin the repo to your GitHub profile"
echo "  4. Add the repo URL + live demo URL to the README header table"
echo "  5. REVOKE the PAT at https://github.com/settings/tokens when done"
