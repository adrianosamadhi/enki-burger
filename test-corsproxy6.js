async function test() {
  try {
    const res = await fetch("https://corsproxy.io/?https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    console.log(res.status);
  } catch(e) {}
}
test();
