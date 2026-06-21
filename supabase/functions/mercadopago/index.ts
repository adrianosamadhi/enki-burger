import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Configuração rápida de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const jsonBody = await req.json();
    const { action, mpAccessToken, ...payload } = jsonBody;

    if (!mpAccessToken) {
      return new Response(JSON.stringify({ error: "Access token is missing" }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
      });
    }

    let url = '';
    let apiRes = null;

    if (action === "create_pix") {
      url = 'https://api.mercadopago.com/v1/payments';
      apiRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mpAccessToken}`,
          'X-Idempotency-Key': `enki-${Date.now()}-${Math.floor(Math.random() * 1000)}`
        },
        body: JSON.stringify({
          ...payload,
          payment_method_id: 'pix'
        })
      });
    } else if (action === "create_preference") {
      url = 'https://api.mercadopago.com/checkout/preferences';
      apiRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mpAccessToken}`
        },
        body: JSON.stringify(payload)
      });
    } else if (action === "status") {
      url = `https://api.mercadopago.com/v1/payments/${payload.payment_id}`;
      apiRes = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${mpAccessToken}`
        }
      });
    } else {
       return new Response(JSON.stringify({ error: "Invalid action" }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
      });
    }

    const data = await apiRes.json();
    
    if (!apiRes.ok) {
       console.error("MercadoPago API Error:", data);
       return new Response(JSON.stringify({ error: data.message || "Erro no Mercado Pago", detail: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
       });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
    
  } catch (error) {
    console.error("Function exception:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})
