async function run() {
  const url = "https://thingproxy.freeboard.io/fetch/https://api.mercadopago.com/checkout/preferences";
  try {
    const res = await fetch(url, { method: "POST" });
    const data = await res.text();
    console.log("Status:", res.status);
    console.log("Success?", data);
  } catch(e) {
    console.error("Fail", e);
  }
}
run();
