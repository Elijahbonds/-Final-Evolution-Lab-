#!/bin/bash
# Final Evolution Lab — Sovereign Assets Upload Script
# Usage: ./upload_to_supabase_storage.sh [version] [platform] [file_path]

VERSION=${1:-"1.0.0"}
PLATFORM=${2:-"mac"} # mac or pc
FILE_PATH=${3}

# Supabase Configuration (Set these in your environment)
# SUPABASE_URL="https://your-project.supabase.co"
# SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

if [ -z "$FILE_PATH" ]; then
  echo "Error: No file path provided."
  exit 1
fi

BUCKET="sovereign-assets"
FILENAME=$(basename "$FILE_PATH")
DESTINATION="v${VERSION}/${PLATFORM}/${FILENAME}"

echo "🚀 Uploading Final Evolution ${VERSION} (${PLATFORM}) to Supabase Storage..."

curl -X POST "${SUPABASE_URL}/storage/v1/object/${BUCKET}/${DESTINATION}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @"${FILE_PATH}"

echo "✅ Upload complete: ${DESTINATION}"
echo "🔗 Direct URL: ${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${DESTINATION}"
