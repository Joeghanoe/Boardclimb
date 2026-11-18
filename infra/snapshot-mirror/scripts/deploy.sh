#!/usr/bin/env bash
# Provision and deploy the snapshot mirror (ADR-0006). Safe to re-run: existing resources are kept.
#   scripts/deploy.sh --dry-run   bundle only, no Cloudflare credentials needed (pull requests)
#   scripts/deploy.sh             create the R2 bucket and its custom domain if missing, then deploy the Worker
# Needs CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, MIRROR_DOMAIN and CLOUDFLARE_ZONE_ID for a real deploy.
set -euo pipefail
cd "$(dirname "$0")/.."

WRANGLER=(bunx wrangler@4.158.0)
BUCKET=$(sed -n 's/^bucket_name = "\(.*\)"$/\1/p' wrangler.toml)
[[ -n "$BUCKET" ]] || { echo "No bucket_name in wrangler.toml" >&2; exit 1; }

if [[ "${1:-}" == "--dry-run" ]]; then
  "${WRANGLER[@]}" deploy --dry-run --outdir "$(mktemp -d)" --var PUBLIC_BASE_URL:https://catalog.example.org
  exit 0
fi

for name in CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID MIRROR_DOMAIN CLOUDFLARE_ZONE_ID; do
  [[ -n "${!name:-}" ]] || { echo "$name is not set" >&2; exit 1; }
done
[[ "$MIRROR_DOMAIN" =~ ^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$ ]] ||
  { echo "MIRROR_DOMAIN must be a bare host name, for example catalog.example.org" >&2; exit 1; }

if "${WRANGLER[@]}" r2 bucket info "$BUCKET" >/dev/null 2>&1; then
  echo "R2 bucket $BUCKET exists"
else
  "${WRANGLER[@]}" r2 bucket create "$BUCKET"
fi

if "${WRANGLER[@]}" r2 bucket domain list "$BUCKET" 2>/dev/null | grep -qF "$MIRROR_DOMAIN"; then
  echo "Custom domain $MIRROR_DOMAIN is connected"
else
  "${WRANGLER[@]}" r2 bucket domain add "$BUCKET" --domain "$MIRROR_DOMAIN" --zone-id "$CLOUDFLARE_ZONE_ID" \
    --min-tls 1.2 --force
fi

"${WRANGLER[@]}" deploy --var "PUBLIC_BASE_URL:https://$MIRROR_DOMAIN"
