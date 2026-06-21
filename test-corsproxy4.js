async function test() {
  try {
    const res = await fetch("https://proxy.cors.sh/https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    console.log(res.status);
    console.log(await res.text());
  } catch (e) {
    console.log("Error:", e);
  }
}
test();
