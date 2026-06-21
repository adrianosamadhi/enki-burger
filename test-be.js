async function test() {
  const req = await fetch("http://localhost:3000/api/checkout/mp", {
     method: "POST", headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ paymentMethod: "Pix", total: 10, mpAccessToken: "APP_USR-123" })
  });
  console.log(req.status);
  console.log(await req.text());
}
test();
