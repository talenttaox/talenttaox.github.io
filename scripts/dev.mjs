import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
execFileSync(process.execPath,[path.join(root,'scripts/build.mjs')],{stdio:'inherit'});
const base=path.join(root,'dist');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.json':'application/json','.xml':'application/xml; charset=utf-8','.md':'text/plain; charset=utf-8','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.png':'image/png','.jpg':'image/jpeg','.pdf':'application/pdf'};
http.createServer(async(req,res)=>{
  try{
    let urlPath=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const target=path.resolve(base,'.'+urlPath);
    if(target!==base&&!target.startsWith(base+path.sep)){res.writeHead(403);res.end();return;}
    let file=target;
    try{if((await fs.stat(file)).isDirectory())file=path.join(file,'index.html');}catch{}
    let data,status=200;
    try{data=await fs.readFile(file);}catch{data=await fs.readFile(path.join(base,'404.html'));file='404.html';status=404;}
    res.writeHead(status,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);
  }catch{res.writeHead(400);res.end('Bad request');}
}).listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'));
