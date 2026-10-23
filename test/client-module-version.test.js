import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {clientGraph,changedModules} from '../tools/abstract-client-revision.mjs';
import {goblinClientGraph} from '../tools/goblin-client-revision.mjs';

test('abstract release invalidates changed modules and importer closure with one canonical browser URL',async()=>{
 const {graph,affected}=await clientGraph(),latest=await goblinClientGraph(),canonical=new Map();
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/apartment-app\.js\?rev=57/);assert.ok(html.includes('test-skills.css?rev=49'));
 assert.ok(html.includes('creator-v12.css?rev=48'));
 for(const style of ['apartment-v3','desktop-apps','rap-notebook','virtual-pc','phone-hud'])assert.ok(html.includes(style+'.css?rev=43'));
 for(const style of ['social-network','social-dialogs','social-community','rap-notebook-shell'])assert.ok(html.includes(style+'.css?rev=57'));
 for(const [file,{source,imports}]of graph){
  assert.doesNotMatch(source,/(?:from\s*|import\s*\()\s*['"](?:node:|fs['"]|child_process['"])/,'no Node-only dependency in '+file);
  for(const d of imports){
   if(!d.file.startsWith('src/'))continue;
   if(latest.affected.has(d.file))assert.equal(d.query,'rev=57',file+' invalidates latest '+d.file);
   else if(affected.has(d.file))assert.equal(d.query,'rev=49',file+' retains Abstract '+d.file);
   else assert.match(d.query,/^rev=(43|45|46|47|48|50|51|52|53|54|55|56)$/,file+' retains released '+d.file);
   if(canonical.has(d.file))assert.equal(d.query,canonical.get(d.file),'one canonical URL: '+d.file);canonical.set(d.file,d.query);
  }
 }
 for(const file of changedModules)assert.ok(graph.has(file),file+' reachable');
 assert.ok(canonical.size>=120);
 for(const file of ['src/audio-levels.js','src/beat-jura-experimental-bank.js','src/source-levels-user-experimental-v1.js'])assert.notEqual(canonical.get(file),'rev=49',file+' unchanged');
});

test('legacy campaign remains accessible beside the current apartment entry',async()=>{
 await access(new URL('../src/apartment-app.js',import.meta.url));
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');assert.match(html,/<section id="virtual-pc" hidden/);
 const legacy=await readFile(new URL('../legacy.html',import.meta.url),'utf8');assert.match(legacy,/id="creator-modal"/);assert.match(legacy,/src="\.\/src\/main\.js\?rev=[^"]+"/);
});
