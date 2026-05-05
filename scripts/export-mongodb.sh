#!/usr/bin/env bash
# ============================================================
#  QuickHire — MongoDB full export
#  Give the output archive to the DevOps team.
#
#  Usage:
#    MONGO_URI="mongodb+srv://user:pass@cluster.mongodb.net" \
#    MONGO_DB="quickhire" \
#    bash export-mongodb.sh
#
#  Or edit the defaults below.
# ============================================================
set -euo pipefail

MONGO_URI="${MONGO_URI:-mongodb://localhost:27017}"
MONGO_DB="${MONGO_DB:-quickhire}"
OUT_DIR="./mongodb-export-$(date +%Y%m%d-%H%M%S)"
ARCHIVE="${OUT_DIR}.tar.gz"

echo ">>> Exporting database: $MONGO_DB"
echo ">>> Output: $ARCHIVE"
echo ""

# -- Full binary dump (restoreable with mongorestore) -----------
mongodump \
  --uri="$MONGO_URI" \
  --db="$MONGO_DB" \
  --out="$OUT_DIR" \
  --gzip

# -- Also export each collection as JSON (human-readable) -------
JSON_DIR="$OUT_DIR/json"
mkdir -p "$JSON_DIR"

COLLECTIONS=(
  affiliate_commissions audit_logs blog_categories blog_posts
  booking_histories bookings carts chat chatbot_logs
  cms_articles cms_banners cms_content cms_pages contact_submissions
  countries currencies fcm_tokens feature_flags fx_rates geo_pricing
  idempotency jobs kyc_documents legal_acceptances legal_documents
  messages notification_templates notifications payments payouts
  promo_codes promo_redemptions refunds reschedule_history
  resource_deliverables resource_time_logs resource_work_updates
  reviews seo_global seo_pages seo_redirects services sessions
  staff_leaves system_config ticket_messages tickets tips
  translations users
)

for col in "${COLLECTIONS[@]}"; do
  echo "  exporting $col..."
  mongoexport \
    --uri="$MONGO_URI" \
    --db="$MONGO_DB" \
    --collection="$col" \
    --out="$JSON_DIR/$col.json" \
    2>/dev/null || echo "  [skip] $col (empty or not found)"
done

# -- Pack everything --------------------------------------------
tar -czf "$ARCHIVE" "$OUT_DIR"
rm -rf "$OUT_DIR"

echo ""
echo "=== Done ==="
echo "Archive: $ARCHIVE"
echo "Hand this file to the DevOps team."
echo "Restore command:"
echo "  mongorestore --uri=<NEW_MONGO_URI> --db=quickhire --gzip $OUT_DIR"
