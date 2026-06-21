const http = require('http');
const server = http.createServer((req, res) => {
  console.log(req.headers);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ headers: req.headers }));
});
server.listen(4000, () => {
  console.log("Server listening");
});
