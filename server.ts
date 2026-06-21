import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Simple Proxy for Mercado Pago
  app.post("/api/checkout/mp", async (req, res) => {
    try {
      const { paymentMethod, total, name, email, storeName, mpAccessToken } = req.body;
      
      if (!mpAccessToken) {
        return res.status(400).json({ error: "Access token is missing" });
      }

      if (paymentMethod === "Pix") {
        const names = (name || "").trim().split(" ");
        const response = await fetch("https://api.mercadopago.com/v1/payments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${mpAccessToken}`,
            "X-Idempotency-Key": "enki-" + Date.now() + "-" + Math.floor(Math.random() * 1000)
          },
          body: JSON.stringify({
            transaction_amount: Number(Number(total).toFixed(2)),
            description: `Compra - ${storeName || "Enki Burger"}`,
            payment_method_id: "pix",
            payer: {
              email: "compras@enkiburger.com.br",
              first_name: names[0] || "Cliente",
              last_name: names.slice(1).join(" ") || "Enki"
            }
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          return res.status(response.status).json({ error: "Erro MP: " + errText });
        }

        const data = await response.json();
        return res.json({
          paymentId: data.id,
          pixKey: data.point_of_interaction?.transaction_data?.qr_code,
          isSimulation: false
        });
      } else {
        // Cartão / Preferences
        const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
          method: "POST",
          headers: {
             "Content-Type": "application/json",
             "Authorization": `Bearer ${mpAccessToken}`
          },
          body: JSON.stringify({
            items: [
              {
                title: `Pedido - ${storeName || "Enki Burger"}`,
                quantity: 1,
                unit_price: Number(Number(total).toFixed(2)),
                currency_id: "BRL"
              }
            ],
            payer: {
              email: "compras@enkiburger.com.br",
              name: name
            }
          })
        });

        if (!response.ok) {
           const errText = await response.text();
           return res.status(response.status).json({ error: "Erro MP: " + errText });
        }

        const data = await response.json();
        return res.json({
          paymentId: data.id,
          initPoint: data.init_point,
          isSimulation: false
        });
      }
    } catch (e: any) {
      console.error(e);
      return res.status(500).json({ error: e.message });
    }
  });

  // Proxy status polling
  app.get("/api/checkout/mp/status/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { token } = req.query; // receive token via query param
      
      if (!token) {
        return res.status(400).json({ error: "Token missed" });
      }

      const response = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      return res.json(data);
    } catch(e: any) {
      return res.status(500).json({ error: e.message });
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
    if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
        app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
        });
    } else {
        app.get('*', (req, res) => res.send("Production build not found."));
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
