# Final Evolution Lab — Production Configuration

## 1. Supabase Infrastructure
- **Project URL:** `https://YOUR_SUPABASE_PROJECT_URL.supabase.co`
- **Anon Key:** `YOUR_SUPABASE_ANON_KEY`
- **Database Tables:**
  - `user_balances`: Tracks athlete credits and subscription status.
  - `athlete_profiles`: Biomechanical scan history (PRQ, Stiffness).
  - `vva_vault`: Metadata for Virtual Visual Analysis JSON files.

## 2. Edge Functions
- `stripe-webhook-handler`:
  - **Purpose:** Processes Stripe direct payments and subscription updates.
  - **Secrets:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
- `wix-order-completed`:
  - **Purpose:** Relays order data from Wix Velo to Supabase.
  - **Header:** `X-FEL-Wix-Secret` (required for authentication).
  - **Secrets:** `WIX_RELAY_SECRET`.

## 3. Web & Distribution
- **Netlify:** Root `web/` directory.
- **PWA Path:** `/play/` (requires COOP/COEP headers).
- **DMG Distribution:** Hosted in Supabase Storage bucket `dist-macos`.
- **TestFlight:** [https://testflight.apple.com/join/finalevolution](https://testflight.apple.com/join/finalevolution)

## 4. Security
- **Stripe Keys:** Never store live keys in the codebase. Use Supabase Vault.
- **Wix Relay:** Authenticate all requests with the `X-FEL-Wix-Secret` header.
- **Web Headers:** Enforce `same-origin` and `require-corp` on `/play/*`.
