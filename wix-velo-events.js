/**
 * Wix Velo Backend Code (events.js)
 * 
 * This code should be placed in the 'Backend' section of your Wix site
 * in a file named 'events.js'. It listens for completed orders and
 * relays the data to your Supabase function.
 */

import { fetch } from 'wix-fetch';

export async function wixStores_onOrderCompleted(event) {
    const orderId = event.orderId;
    const buyerInfo = event.buyerInfo;
    const lineItems = event.lineItems;
    
    // Extract metadata passed from the checkout/automation
    // Note: Wix Automations can trigger this, or you can use the order object
    const supabaseUserId = event.customField1 || ""; // Map your custom fields
    const athleteId = event.customField2 || "";
    
    const payload = {
        orderId: orderId,
        email: buyerInfo.email,
        items: lineItems.map(item => ({
            productId: item.productId,
            name: item.name,
            quantity: item.quantity
        })),
        metadata: {
            supabase_user_id: supabaseUserId,
            athlete_id: athleteId
        },
        timestamp: new Date().toISOString()
    };

    try {
        const response = await fetch('https://YOUR_SUPABASE_PROJECT_URL.supabase.co/functions/v1/felRelayWixOrder', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer YOUR_SUPABASE_ANON_KEY'
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            console.log(`Order ${orderId} successfully relayed to Supabase.`);
        } else {
            const errorText = await response.text();
            console.error(`Failed to relay order ${orderId}: ${errorText}`);
        }
    } catch (error) {
        console.error(`Error relaying order ${orderId}:`, error);
    }
}

/**
 * Wix Velo Page Code (Home/Hero Section)
 * 
 * Aesthetic: Dark Clinical
 * Primary Action: OPEN LAB
 */

/*
$w.onReady(function () {
    // Styling the 'OPEN LAB' button via code if needed, 
    // though Wix Editor is preferred for base styles.
    $w('#openLabButton').style.backgroundColor = "#00F2FF"; // Neon Cyan
    $w('#openLabButton').style.color = "#050505"; // Deep Black
    
    $w('#openLabButton').onClick(() => {
        wixLocation.to("/lab"); // Or your app URL
    });
});
*/
