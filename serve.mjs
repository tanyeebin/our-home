import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)));
const port = Number(process.env.PORT || 8000);
const types = {
  '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8', '.jpg':'image/jpeg', '.jpeg':'image/jpeg',
  '.png':'image/png', '.svg':'image/svg+xml', '.mp3':'audio/mpeg'
};

createServer(async (req,res)=>{
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    const requested = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const file = resolve(root, `.${requested.replaceAll('/', sep)}`);
    if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403).end('Forbidden'); return; }
    if (!(await stat(file)).isFile()) { res.writeHead(404).end('Not found'); return; }
    const body = await readFile(file);
    res.writeHead(200, {'Content-Type':types[extname(file).toLowerCase()] || 'application/octet-stream','Cache-Control':'no-cache'});
    res.end(body);
  } catch {
    res.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'}).end('Not found');
  }
}).listen(port, '127.0.0.1', ()=>console.log(`Our Cozy Home is ready: http://localhost:${port}/`));
