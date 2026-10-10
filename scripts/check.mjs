import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const files=[];
async function walk(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())await walk(file);else files.push(file);}}
await walk(dist);const errors=[];let links=0,pages=0;
for(const file of files.filter(f=>f.endsWith('.html'))){
  const html=await fs.readFile(file,'utf8');pages++;
  if(!html.includes('<title>')||!html.includes('name="viewport"'))errors.push(`Missing page metadata: ${file}`);
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  if(new Set(ids).size!==ids.length)errors.push(`Duplicate IDs: ${file}`);
  for(const m of html.matchAll(/\b(?:href|src)="([^"]+)"/g)){
    const url=m[1];if(/^(https?:|mailto:|data:|tel:)/.test(url))continue;links++;
    const [raw,hash]=url.split('#');
    if(!raw){if(hash&&!ids.includes(hash))errors.push(`Broken anchor ${url}: ${file}`);continue;}
    let target=raw.startsWith('/')?path.join(dist,decodeURIComponent(raw)):path.resolve(path.dirname(file),decodeURIComponent(raw));
    if(target!==dist&&!target.startsWith(dist+path.sep)){errors.push(`Path escapes output: ${url}`);continue;}
    try{const stat=await fs.stat(target);if(stat.isDirectory())target=path.join(target,'index.html');await fs.access(target);
      if(hash&&target.endsWith('.html')){const destination=await fs.readFile(target,'utf8');if(!destination.includes(`id="${hash}"`))errors.push(`Broken destination anchor: ${url}`);}
    }catch{errors.push(`Missing ${url}: ${path.relative(dist,file)}`);}
  }
  if(html.includes('katex-error'))errors.push(`Invalid equation: ${file}`);
}
for(const lang of ['zh','en']){const feed=await fs.readFile(path.join(dist,lang,'feed.xml'),'utf8');if(!feed.includes('<channel>')||!feed.includes('<title>'))errors.push(`Invalid feed: ${lang}`);}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log(`Checked ${pages} pages, ${links} local links, anchors, example equations, and both feeds.`);
