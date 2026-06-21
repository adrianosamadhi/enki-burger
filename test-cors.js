async function check() {
  try {
    const res = await fetch("https://api.allorigins.win/raw?url=https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({})
    });
    console.log(res.status);
    console.log(await res.text());
  } catch (e) {
    console.log(e);
  }
}
check();
