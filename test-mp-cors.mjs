import https from 'https';

const options = {
  hostname: 'api.mercadopago.com',
  path: '/checkout/preferences',
  method: 'OPTIONS',
  headers: {
    'Origin': 'https://adrianosamadhi.github.io',
    'Access-Control-Request-Method': 'POST'
  }
};

const req = https.request(options, (res) => {
  console.log('Status: ' + res.statusCode);
  console.log('Headers: ' + JSON.stringify(res.headers, null, 2));
});
req.on('error', (e) => console.error(e));
req.end();
