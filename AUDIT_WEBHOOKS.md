# Audit: Webhook Flow & Sovereign Economy

## 1. Flow Overview
Final Evolution Lab uses a dual-gateway economy to support both physical/digital goods (Wix) and recurring subscriptions (Stripe).

### Wix Gateway (Digital Vault / One-Time Analysis)
1. **Trigger:** Athlete completes a purchase on the Wix site.
2. **Relay:** `wix-velo-events.js` (Backend) catches `onOrderCompleted`.
3. **Authentication:** Request includes the `X-FEL-Wix-Secret` header.
4. **Edge Function:** `wix-order-completed` validates the secret and maps `customField1` (Supabase UID) to the order.
5. **Database:** Increments `credits` in the `user_balances` table.

### Stripe Gateway (Pro Athlete Subscriptions)
1. **Trigger:** Athlete subscribes via the app or direct link.
2. **Relay:** Stripe Webhook sends `checkout.session.completed` or `customer.subscription.updated`.
3. **Authentication:** Validated via `STRIPE_WEBHOOK_SECRET`.
4. **Edge Function:** `stripe-webhook-handler` maps the Stripe Customer ID to the Supabase UID.
5. **Database:** Updates `subscription_tier` and `expiry_date` in `user_balances`.

## 2. Reconciliation Strategy
- **Unified Table:** `user_balances` acts as the source of truth for all entitlements.
- **Conflict Resolution:** Subscription status (Stripe) overrides credit requirements for standard scans. Credits (Wix) are consumed for premium "Digital Vault" deep-dives.
- **Audit Log:** All webhook events are logged to the `transaction_history` table for forensic accounting.

## 3. Risks & Mitigations
- **Risk:** Mismatched UIDs between Wix and Supabase.
- **Mitigation:** Wix checkout form requires the athlete to be logged in, passing the Supabase UID as a hidden custom field.
- **Risk:** Webhook delivery failure.
- **Mitigation:** Implement idempotent processing in Edge Functions and a "Sync Entitlements" button in the app settings.
