async function test() {
  try {
    const res = await fetch("https://cors.lol/?url=https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    console.log("lol:", res.status);
  } catch(e) {}
  
  try {
    const res2 = await fetch("https://corsfix.com/?https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    console.log("fix:", res2.status);
  } catch(e) {}
}
test();
