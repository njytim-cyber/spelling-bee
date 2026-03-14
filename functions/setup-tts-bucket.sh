#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────────
# TTS Cache Bucket Setup — spelling-bee-prod-tts
#
# Run once to configure the Cloud Storage bucket for public MP3 serving.
# Requires: gcloud CLI authenticated with project owner/editor permissions.
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

PROJECT="spelling-bee-prod"
BUCKET="spelling-bee-prod-tts"

echo "=== TTS Bucket Setup for $BUCKET ==="

# 1. Create the bucket (if it doesn't exist)
echo "1. Creating bucket (if needed)..."
gsutil ls -b "gs://$BUCKET" 2>/dev/null || \
  gsutil mb -p "$PROJECT" -l us-central1 -b on "gs://$BUCKET"

# 2. Enable uniform bucket-level access (required for public: true in Cloud Functions)
echo "2. Enabling uniform bucket-level access..."
gsutil uniformbucketlevelaccess set on "gs://$BUCKET"

# 3. Make the tts-cache/ prefix publicly readable
#    This allows the client to fetch MP3s directly from the public URL
echo "3. Granting public read access to tts-cache/ prefix..."
gsutil iam ch allUsers:objectViewer "gs://$BUCKET"

# 4. Set CORS policy (allows browser fetch from app origins)
echo "4. Applying CORS policy..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
gsutil cors set "$SCRIPT_DIR/tts-bucket-cors.json" "gs://$BUCKET"

# 5. Set lifecycle policy (auto-delete MP3s older than 365 days)
echo "5. Applying lifecycle policy..."
gsutil lifecycle set "$SCRIPT_DIR/tts-bucket-lifecycle.json" "gs://$BUCKET"

# 6. Set default Cache-Control header for new objects
#    (individual objects set Cache-Control via Cloud Function metadata,
#     but this ensures any manual uploads also get cached)
echo "6. Setting default Cache-Control metadata..."
gsutil setmeta -r -h "Cache-Control:public, max-age=2592000" "gs://$BUCKET/tts-cache/" 2>/dev/null || true

echo ""
echo "=== Setup complete ==="
echo ""
echo "Verify with:"
echo "  gsutil cors get gs://$BUCKET"
echo "  gsutil lifecycle get gs://$BUCKET"
echo "  gsutil iam get gs://$BUCKET"
echo ""
echo "Storage cost estimate (4 voices, 50K words, ~20KB avg):"
echo "  Max size: ~4 GB"
echo "  Monthly cost: ~\$0.10 (Standard storage) + ~\$0.00/GB egress (free tier)"
echo "  With CDN cache hits: near-zero egress after warmup"
