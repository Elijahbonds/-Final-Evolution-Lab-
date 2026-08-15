import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const PAYPAL_CLIENT_ID = Deno.env.get('PAYPAL_CLIENT_ID') ?? ''
const PAYPAL_CLIENT_SECRET = Deno.env.get('PAYPAL_CLIENT_SECRET') ?? ''
const PAYPAL_API_URL = Deno.env.get('PAYPAL_API_URL') || 'https://api-m.sandbox.paypal.com' // Default to sandbox

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function getPayPalAccessToken() {
  const auth = btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`)
  const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
    method: 'POST',
    body: 'grant_type=client_credentials',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })

  const data = await response.json()
  return data.access_token
}

async function verifyPayPalOrder(orderId: string, accessToken: string) {
  const response = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders/${orderId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  return await response.json()
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { orderID, user_id } = await req.json()

    if (!orderID || !user_id) {
      throw new Error('Missing orderID or user_id')
    }

    // 1. Get PayPal Access Token
    const accessToken = await getPayPalAccessToken()

    // 2. Verify Order Status
    const orderData = await verifyPayPalOrder(orderID, accessToken)

    if (orderData.status !== 'COMPLETED') {
      console.error(`Order ${orderID} status is ${orderData.status}`)
      return new Response(
        JSON.stringify({ error: `Order status is ${orderData.status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Extract Amount and Map to Shards
    const amountValue = parseFloat(orderData.purchase_units[0].amount.value)
    
    // Mapping Logic (based on Sovereign Bank UI)
    // $4.99 -> 500
    // $9.99 -> 1000
    // $39.99 -> 5000
    let shardCount = 0
    if (amountValue >= 39.0) shardCount = 5000
    else if (amountValue >= 9.0) shardCount = 1000
    else if (amountValue >= 4.0) shardCount = 500
    else {
      // Fallback for custom amounts or user example ($49 = 500)
      shardCount = Math.floor(amountValue * 10) 
    }

    console.log(`Verified Order ${orderID}: $${amountValue} -> ${shardCount} Shards for User ${user_id}`)

    // 4. Credit Shards via RPC
    const { error: rpcError } = await supabase.rpc('credit_shards', {
      p_user_id: user_id,
      p_amount: shardCount
    })

    if (rpcError) throw rpcError

    return new Response(
      JSON.stringify({ 
        success: true, 
        shards_credited: shardCount,
        order_id: orderID 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error(`PayPal Verification Error: ${err.message}`)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
