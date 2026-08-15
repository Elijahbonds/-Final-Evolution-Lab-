import { ok, badRequest, serverError } from 'wix-http-functions';
import { getSecret } from 'wix-secrets-backend';
import { relayOrderToSupabase } from './velo-relay.jsw';

/**
 * Final Evolution Lab — Wix-to-Sovereign Bank Relay
 * Listens for 'Order Paid' events from Wix Automations.
 * 
 * Endpoint: https://your-site.com/_functions/felWixOrderPaidFromAutomation
 */
export async function post_felWixOrderPaidFromAutomation(request) {
  const options = {
    headers: {
      "Content-Type": "application/json"
    }
  };

  try {
    const body = await request.body.json();
    const order = body.order;

    if (!order) {
      return badRequest({ body: { error: "Order data is missing." }, ...options });
    }

    // 1. Verify the X-FEL-Wix-Secret for forensic authentication
    const wixSecret = await getSecret('X-FEL-Wix-Secret');
    const incomingSecret = request.headers["x-fel-wix-secret"] || request.headers["X-FEL-Wix-Secret"];

    if (incomingSecret !== wixSecret) {
      console.error('Forensic Authentication Failed: Secret mismatch');
      return badRequest({ body: { error: "Forensic authentication failed." }, ...options });
    }

    // 2. Resolve the Athlete ID (Supabase UID) from metadata
    const metadata = order.customFields || order.metadata || {};
    const athleteId = metadata.athlete_id || order.customField1;
    const supabaseUserId = metadata.supabase_user_id || athleteId;

    if (!supabaseUserId) {
      console.warn(`Missing athlete_id or supabase_user_id metadata for order ${order.number}. Falling back to buyer ID.`);
    }

    const finalSupabaseUserId = supabaseUserId || order.buyerInfo?.id;
    const finalAthleteId = athleteId || order.buyerInfo?.id;

    // 3. Calculate Shard Delta based on SKU
    let shardDelta = 0;
    order.lineItems.forEach(item => {
      const sku = item.sku || "";
      if (sku.includes('SHARD_500')) shardDelta += (500 * item.quantity);
      if (sku.includes('SHARD_1000')) shardDelta += (1000 * item.quantity);
      if (sku.includes('SHARD_5000')) shardDelta += (5000 * item.quantity);
    });

    if (shardDelta === 0) {
      console.log(`Order ${order.number} contains no Shard products. Skipping relay.`);
      return ok({ body: { message: "No Shard products found in order." }, ...options });
    }

    console.log(`Processing Order ${order.number} for Athlete ${finalAthleteId}. Shard Delta: ${shardDelta}`);

    // 4. Relay to Supabase via the JSW backend
    const relayResult = await relayOrderToSupabase(order, finalSupabaseUserId, finalAthleteId, shardDelta);

    if (relayResult.success) {
      return ok({ body: { message: "Sovereign Bank relay successful.", order_id: order._id, shard_delta: shardDelta }, ...options });
    } else {
      return serverError({ body: { error: "Supabase relay failed.", details: relayResult.error }, ...options });
    }

  } catch (err) {
    console.error('Wix Bridge Error:', err);
    return serverError({ body: { error: err.message }, ...options });
  }
}
