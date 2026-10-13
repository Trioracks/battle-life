// Mechanical cache-key update; vendor/import-map URLs deliberately remain untouched.
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const revision='41',visited=new Set(),updates=[];
async function visit(file){
 if(visited.has(file)||!file.startsWith('src/'))return;visited.add(file);
 const original=await readFile(file,'utf8'),imports=[...original.matchAll(/(?:from\s*|import\s*\(\s*)['"](\.\.?\/[^'"]+\.js(?:\?[^'"]*)?)['"]/g)];
 let content=original;
 for(const match of imports){const relative=match[1].split('?')[0],target=path.posix.normalize(path.posix.join(path.posix.dirname(file),relative));if(!target.startsWith('src/'))continue;content=content.replaceAll(match[1],relative+'?rev='+revision);await visit(target);}
 if(content!==original){updates.push(file);if(process.argv.includes('--write'))await writeFile(file,content);}
}
await visit('src/apartment-app.js');
await visit('src/social-worker.js');
await visit('src/beat-pcm-worker.js');
for(const file of ['index.html','desktop-apps.css']){
 const original=await readFile(file,'utf8'),content=original.replace(/((?:apartment-app\.js|[\w-]+\.css)\?rev=)\d+/g,'$1'+revision);
 if(content!==original){updates.push(file);if(process.argv.includes('--write'))await writeFile(file,content);}
}
console.log(JSON.stringify({revision,visited:visited.size,updates},null,2));
// These native checks exercise this package, not an old entry point.
for(const name of ['retired-drums','track-version','social-shell','social-submission','phone-hud']){
 const file='tools/verify-'+name+'.mjs',original=await readFile(file,'utf8'),content=original.replace(/\?rev=\d+/g,'?rev='+revision);
 if(content!==original&&process.argv.includes('--write'))await writeFile(file,content);
}
