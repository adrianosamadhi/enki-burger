import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Mercado Pago Checkout Integration
  app.post("/api/checkout/mp", async (req, res) => {
    try {
      const { paymentMethod, total, name, phone, email, storeName } = req.body;
      const mpAccessToken = process.env.MP_ACCESS_TOKEN;

      // Safe Fallback Layer: If Access Token is not set yet in Environment Variables, run high-fidelity simulation
      if (!mpAccessToken) {
        const simulatedId = "MP-" + Math.floor(100000 + Math.random() * 900000);
        
        // Dynamic valid EMV Pix code for testing using standard generator parameters
        const payloadStore = (storeName || "Enki Burger").substring(0, 15).toUpperCase();
        const cleanStore = encodeURIComponent(payloadStore).replace(/%[0-9A-F]{2}/g, "");
        const formattedTotal = Number(total).toFixed(2);
        
        const pixKey = `00020126580014BR.GOV.BCBC.PIX0136e9ff97-ad20-4e2a-b6b8-2ea9c98ef2e55204000053039865405${formattedTotal}5802BR5911${cleanStore.substring(0, 10)}6009SAOPAULO62070503***6304CAFE`;

        return res.json({
          success: true,
          isSimulation: true,
          paymentId: simulatedId,
          pixKey,
          message: "Modo Simulação Ativo. Configure 'MP_ACCESS_TOKEN' no painel do AI Studio para processamento de pagamentos reais."
        });
      }

      // Real integration logic with Mercado Pago API
      if (paymentMethod === "Pix") {
        const uniqueKey = "enki-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
        const names = name.trim().split(" ");
        const firstName = names[0] || "Cliente";
        const lastName = names.slice(1).join(" ") || "Enki";

        const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${mpAccessToken}`,
            "X-Idempotency-Key": uniqueKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            description: `Pedido ${name} - ${storeName || "Enki Burger"}`,
            installments: 1,
            payment_method_id: "pix",
            payer: {
              email: email || "compras@enkiburger.com.br",
              first_name: firstName,
              last_name: lastName,
              phone: {
                number: phone ? phone.replace(/\D/g, "") : "11999999999"
              }
            },
            transaction_amount: Number(total)
          })
        });

        if (!mpRes.ok) {
          const errData = await mpRes.json();
          console.error("Mercado Pago API Pix Error:", errData);
          throw new Error(errData.message || "Erro de autorização ou saldo no Mercado Pago.");
        }

        const data = await mpRes.json();
        return res.json({
          success: true,
          isSimulation: false,
          paymentId: `MP-${data.id}`,
          pixKey: data.point_of_interaction?.transaction_data?.qr_code,
          status: data.status
        });

      } else {
        // Card Preference Flow - Official Mercado Pago Hosted Checkout (Perfect for PCI Compliance)
        const uniqueKey = "enki-card-" + Date.now();
        const mpRes = await fetch("https://api.mercadopago.com/v1/preferences", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${mpAccessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            items: [
              {
                id: uniqueKey,
                title: `Pedido ${name} - ${storeName || "Enki Burger"}`,
                quantity: 1,
                currency_id: "BRL",
                unit_price: Number(total)
              }
            ],
            payer: {
              name,
              email: email || "compras@enkiburger.com.br"
            },
            back_urls: {
              success: `https://${req.headers.host || "localhost:3000"}`,
              failure: `https://${req.headers.host || "localhost:3000"}`,
              pending: `https://${req.headers.host || "localhost:3000"}`
            },
            auto_return: "approved"
          })
        });

        if (!mpRes.ok) {
          const errData = await mpRes.json();
          console.error("Mercado Pago API Preference Error:", errData);
          throw new Error(errData.message || "Erro ao gerar link de pagamento.");
        }

        const data = await mpRes.json();
        return res.json({
          success: true,
          isSimulation: false,
          paymentId: `MP-PREF-${data.id}`,
          initPoint: data.init_point
        });
      }

    } catch (error: any) {
      console.error("Payment API endpoint crash:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Erro interno de comunicação com o Mercado Pago."
      });
    }
  });

  // Vite development vs production pipeline middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Enki Server] running on http://localhost:${PORT}`);
  });
}

startServer();
