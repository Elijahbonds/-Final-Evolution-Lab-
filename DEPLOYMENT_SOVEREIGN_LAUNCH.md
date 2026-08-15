# Final Evolution Lab — Sovereign Launch Deployment Guide

## 1. The 'Gold Master' Downloadable (Mac/PC)
- **Build Process:** Package Unreal/Unity into `.dmg` (Mac) and `.zip` (PC).
- **Upload Script:** Use `scripts/upload_to_supabase_storage.sh` to host binaries in the `sovereign-assets` bucket.
- **Wix 'Thank You' Page Logic:**
  ```javascript
  // Wix Velo code for the Thank You page
  import wixLocation from 'wix-location';
  import { getOrder } from 'wix-stores-backend';

  $w.onReady(async function () {
    const orderId = wixLocation.query.orderId;
    const order = await getOrder(orderId);
    
    // Check if the order contains the 'Gold Master' product
    if (order.lineItems.some(item => item.sku === 'GOLD_MASTER')) {
      $w('#downloadButton').show();
      $w('#downloadButton').link = "https://YOUR_SUPABASE_URL/storage/v1/object/public/sovereign-assets/v1.0.0/mac/FinalEvolution.dmg";
    }
  });
  ```

## 2. The Wix-to-App Economy Bridge (Shards)
- **Wix Velo:** `wix/velo/backend/http-functions.js` listens for `Order Paid`.
- **Supabase RPC:** The `wix-order-completed` Edge Function calls the `fel_apply_shard_credit` RPC.
- **RPC Definition (SQL):**
  ```sql
  CREATE OR REPLACE FUNCTION fel_apply_shard_credit(athlete_id UUID, shard_delta INT)
  RETURNS VOID AS $$
  BEGIN
    UPDATE user_balances
    SET shard_balance = shard_balance + shard_delta
    WHERE user_id = athlete_id;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
  ```

## 3. The PWA /play/ Gateway
- **Emulator Shell:** `web/play/index.html` (WebGPU/WASM).
- **Manifest:** `web/play/manifest.json` (GBA4iOS style 'Add to Home Screen').
- **Sovereign Wallet:** Cross-platform sync via Supabase Auth and Realtime.
- **Sync Logic:** The `user_balances` table is subscribed to via Supabase Realtime for 16.6ms (60fps) balance updates.
