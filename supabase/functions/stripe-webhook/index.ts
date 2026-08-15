import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2"
import Stripe from "npm:stripe@12.0.0"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return new Response('No signature', { status: 400 })
  }

  try {
    const body = await req.text()
    const event = stripe.webhooks.constructEvent(body, signature, endpointSecret)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const metadata = session.metadata
      const userId = session.client_reference_id || metadata?.user_id

      if (!userId) {
        console.error('No user ID found in session')
        return new Response('No user ID', { status: 400 })
      }

      const productType = metadata?.product_type

      console.log(`Processing ${productType} for user ${userId}`)

      if (productType === 'shards') {
        const amount = parseInt(metadata?.amount || '0')
        // Execute the credit_shards RPC
        const { error } = await supabase.rpc('credit_shards', { 
          p_user_id: userId, 
          p_amount: amount 
        })
        
        if (error) throw error
        console.log(`Successfully credited ${amount} shards to ${userId}`)
      } 
      else if (productType === 'academy') {
        // Update the vva_access table
        const { error } = await supabase
          .from('vva_access')
          .upsert({ 
            user_id: userId, 
            has_academy_access: true,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' })
        
        if (error) throw error
        console.log(`Successfully granted Academy access to ${userId}`)
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }
})
