// Mechanical cache invalidation for the changed audio modules and their importers.
import {readdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const revision='45',files=(await readdir('src')).filter(f=>f.endsWith('.js')).map(f=>'src/'+f),texts=new Map(await Promise.all(files.map(async f=>[f,await readFile(f,'utf8')])));
const pattern=/(?:from\s*|import\s*\(\s*|new URL\(\s*)['"](\.\.?\/[^'"]+\.js(?:\?[^'"]*)?)['"]/g;
const imports=new Map([...texts].map(([f,t])=>[f,[...t.matchAll(pattern)].map(m=>({url:m[1],target:path.posix.normalize(path.posix.join(path.posix.dirname(f),m[1].split('?')[0]))}))]));
const changed=new Set(['src/battle-npc.js','src/battle-npc-audio.js','src/beat-audio.js','src/beat-beginner-bank.js','src/npc-vocal-catalog.js','src/source-levels.js','src/track-version-audio.js','src/beat-jura-experimental-bank.js']);
let count;do{count=changed.size;for(const [f,deps]of imports)if(deps.some(d=>changed.has(d.target)))changed.add(f);}while(count!==changed.size);
const updates=[];
for(const [f,deps]of imports){let t=texts.get(f);for(const d of deps)if(changed.has(d.target))t=t.replaceAll(d.url,d.url.split('?')[0]+'?rev='+revision);if(t!==texts.get(f)){updates.push(f);if(process.argv.includes('--write'))await writeFile(f,t);}}
const html=await readFile('index.html','utf8'),next=html.replace(/apartment-app\.js\?rev=\d+/,'apartment-app.js?rev='+revision);
if(html!==next){updates.push('index.html');if(process.argv.includes('--write'))await writeFile('index.html',next);}
console.log(JSON.stringify({revision,changed:[...changed],updates},null,2));
