const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, 'public');
const routes = new Map([
  ['/', ['index.html', 'text/html']],
  ['/styles.css', ['styles.css', 'text/css']],
  ['/app.mjs', ['app.mjs', 'text/javascript']],
  ['/selection.mjs', ['selection.mjs', 'text/javascript']],
  ['/guidance.mjs', ['guidance.mjs', 'text/javascript']],
  ['/special.mjs', ['special.mjs', 'text/javascript']],
  ['/economics.mjs', ['economics.mjs', 'text/javascript']]
]);
const host = '127.0.0.1';
const port = 8765;
for (const [url,[file,type]] of routes) {
  routes.set(url, {body:fs.readFileSync(path.join(root,file)),type});
}
http.createServer((req,res)=>{
  res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; frame-ancestors 'none'; form-action 'none'; base-uri 'none'");
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Cache-Control','no-store');
  if (req.headers.host !== host+':'+port) return res.writeHead(403).end();
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.writeHead(405,{Allow:'GET, HEAD'}).end();
  if (!routes.has(req.url)) return res.writeHead(404).end();
  const {body,type}=routes.get(req.url);
  res.writeHead(200,{'Content-Type':type+'; charset=utf-8'});
  res.end(req.method==='HEAD'?undefined:body);
}).on('error',error=>{
  console.error(error.code==='EADDRINUSE' ? 'Порт 8765 занят. Остановите предыдущий сервер и повторите.' : error.message);
  process.exitCode=1;
}).listen(port,host,()=>console.log('http://'+host+':'+port));
