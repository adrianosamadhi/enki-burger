import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = 'https://amylompetctxeaeyioig.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFteWxvbXBldGN0eGVhZXlpb2lnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5MDc1ODAsImV4cCI6MjA5NTQ4MzU4MH0.KhQEC-EcfMQXiJ0KBg0nHM-1U1etJUHjIy524cVpKU4';
const supabaseClient = createClient(supabaseUrl, supabaseKey);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use JSON middleware with reasonable limits
  app.use(express.json());

  // API Route for creating Pix payments or Preference links
  app.post("/api/checkout/mp", async (req, res) => {
    try {
      const { paymentMethod, total, name, phone, email, storeName, mpAccessToken, orderId, notificationUrl } = req.body;
      
      const token = mpAccessToken?.trim();
      if (!token) {
        return res.status(400).json({ error: "Token Mercado Pago ausente" });
      }

      const generatedNotificationUrl = notificationUrl || `https://${req.get('host')}/webhook/mercadopago`;

      if (paymentMethod === "Pix") {
        const names = (name || "").trim().split(" ");
        const firstName = names[0] || "Cliente";
        const lastName = names.slice(1).join(" ") || "Enki";
        
        const response = await fetch("https://api.mercadopago.com/v1/payments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            "X-Idempotency-Key": `enki-${Date.now()}-${Math.floor(Math.random() * 1000)}`
          },
          body: JSON.stringify({
            transaction_amount: Number(Number(total).toFixed(2)),
            description: `Compra - ${storeName || "Enki Burger"}`,
            payment_method_id: "pix",
            payer: {
              email: email || "compras@enkiburger.com.br",
              first_name: firstName,
              last_name: lastName
            },
            notification_url: generatedNotificationUrl,
            external_reference: orderId
          })
        });

        if (!response.ok) {
          let errorMsg = "Erro do Mercado Pago";
          try {
            const errData = await response.json();
            console.error("MP Error (Pix) Detail:", errData);
            if (errData.message) {
              errorMsg = errData.message;
            } else if (errData.error) {
              errorMsg = errData.error;
            }
            if (errData.cause && Array.isArray(errData.cause)) {
              const details = errData.cause.map((c: any) => c.description || c.code || JSON.stringify(c)).join("; ");
              if (details) {
                errorMsg += ` - Detalhes: ${details}`;
              }
            }
          } catch (jsonErr) {
            try {
              const text = await response.text();
              console.error("MP Error (Pix) Text:", text);
              errorMsg += `: ${text}`;
            } catch (txtErr) {
              errorMsg += `: Status ${response.status}`;
            }
          }
          return res.status(response.status).json({ error: errorMsg });
        }

        const data = await response.json();
        return res.json({
          paymentId: data.id,
          pixKey: data.point_of_interaction?.transaction_data?.qr_code,
          isSimulation: false
        });
      } else {
        // Preference / Card
        const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            items: [
              {
                title: `Compra - ${storeName || "Enki Burger"}`,
                description: "Pedido online",
                quantity: 1,
                currency_id: "BRL",
                unit_price: Number(Number(total).toFixed(2))
              }
            ],
            payer: {
              email: email || "compras@enkiburger.com.br",
              name: name || "Cliente"
            },
            notification_url: generatedNotificationUrl,
            external_reference: orderId
          })
        });

        if (!response.ok) {
          let errorMsg = "Erro do Mercado Pago";
          try {
            const errData = await response.json();
            console.error("MP Error (Preference) Detail:", errData);
            if (errData.message) {
              errorMsg = errData.message;
            } else if (errData.error) {
              errorMsg = errData.error;
            }
            if (errData.cause && Array.isArray(errData.cause)) {
              const details = errData.cause.map((c: any) => c.description || c.code || JSON.stringify(c)).join("; ");
              if (details) {
                errorMsg += ` - Detalhes: ${details}`;
              }
            }
          } catch (jsonErr) {
            try {
              const text = await response.text();
              console.error("MP Error (Preference) Text:", text);
              errorMsg += `: ${text}`;
            } catch (txtErr) {
              errorMsg += `: Status ${response.status}`;
            }
          }
          return res.status(response.status).json({ error: errorMsg });
        }

        const data = await response.json();
        return res.json({
          paymentId: data.id,
          initPoint: data.init_point,
          isSimulation: false
        });
      }
    } catch (err: any) {
      console.error("Backend Error:", err);
      return res.status(500).json({ error: err.message || "Erro interno do servidor." });
    }
  });

  // API Route for polling payment status securely
  app.get("/api/checkout/mp/status/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { token } = req.query;

      if (!token) {
        return res.status(400).json({ error: "Token Mercado Pago ausente" });
      }

      const response = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        return res.status(response.status).json({
          error: errData.message || errData.error || "Erro ao consultar status."
        });
      }

      const data = await response.json();
      return res.json({ status: data.status });
    } catch (err: any) {
      console.error("Polling status error:", err);
      return res.status(500).json({ error: err.message || "Erro ao consultar status." });
    }
  });

  // POST Webhook endpoint for Mercado Pago automatic notifications (IPN)
  app.post("/webhook/mercadopago", async (req, res) => {
    try {
      console.log("Mercado Pago Webhook payload:", JSON.stringify(req.body), JSON.stringify(req.query));

      // Retrieve payment ID from webhook payload or query params
      const paymentId = req.body.data?.id || req.body.id || req.query.id;
      const type = req.body.type || req.body.action || req.query.topic;

      // Ignore if no payment ID is present
      if (!paymentId) {
        return res.status(200).send("OK");
      }

      // We need the MP token to fetch payment details. Get it from the database 'loja_config'
      const { data: configData, error: configError } = await supabaseClient
        .from("loja_config")
        .select("mp_access_token")
        .eq("id", 1)
        .maybeSingle();

      const mpAccessToken = configData?.mp_access_token?.trim();
      if (!mpAccessToken) {
        console.error("Webhook Error: mp_access_token is missing in loja_config.");
        return res.status(200).send("OK");
      }

      // Fetch payment details securely from Mercado Pago
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          "Authorization": `Bearer ${mpAccessToken}`
        }
      });

      if (!mpResponse.ok) {
        console.error(`Webhook Error: Failed to fetch MP details for payment ${paymentId}: ${mpResponse.status}`);
        return res.status(200).send("OK");
      }

      const payment = await mpResponse.json();
      const externalReference = payment.external_reference;
      const status = payment.status;

      console.log(`Webhook MP payment status for ID ${paymentId}: ${status}. Reference: ${externalReference}`);

      if (externalReference && (status === "approved" || status === "authorized")) {
        // Safe update in Supabase
        const { error: updateError } = await supabaseClient
          .from("clientes_pedidos")
          .update({ gateway_status: "Aprovado" })
          .eq("gateway_id", externalReference);

        if (updateError) {
          console.error(`Webhook Error updating order ${externalReference} status:`, updateError);
        } else {
          console.log(`Webhook Success: Order ${externalReference} successfully updated to Aprovado in Supabase.`);
        }
      }

      return res.status(200).send("OK");
    } catch (err: any) {
      console.error("Webhook unexpected error:", err);
      return res.status(200).send("OK");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
