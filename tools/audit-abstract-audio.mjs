import assert from 'node:assert/strict';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {BEGINNER_BANK,USER_DRUM_BANK} from '../src/beat-beginner-bank.js';
import {USER_EXPERIMENTAL_BANK} from '../src/beat-user-experimental-bank.js';
import {JURA_EXPERIMENTAL_BANK} from '../src/beat-jura-experimental-bank.js';
import {ABSTRACT_BANK,ABSTRACT_RECIPES} from '../src/beat-abstract-bank.js';
import {EXPERIMENTAL_LEAD_BANK,EXPERIMENTAL_LEAD_RECIPES} from '../src/beat-experimental-leads-bank.js';
import {ALL_VOCALS,VOICE_PACKS} from '../src/vocal-catalog.js';
const root=new URL('../',import.meta.url),sha=b=>createHash('sha256').update(b).digest('hex'),read=p=>readFile(new URL(p.replace(/^\.\//,''),root));
const intakePath='stems/source-library/batches/abstract-20261020-v1.json',intakeBytes=await read(intakePath),intake=JSON.parse(intakeBytes),hashes=JSON.parse(await read('artifacts/abstract-20261020/hashes.json'));
assert.equal(intake.sources.length,255);let originals=0,copies=0,exclusions=0;
for(const row of intake.sources){for(const file of [row.source,row.destination]){const bytes=await readFile(file);assert.equal(bytes.length,row.bytes,file);assert.equal(sha(bytes),row.sha256,file);}originals++;copies++;}
for(const row of intake.excluded){const bytes=await readFile(row.path);assert.equal(bytes.length,row.bytes,row.path);assert.equal(sha(bytes),row.sha256,row.path);exclusions++;}
for(const row of [...hashes.sources,...hashes.outputs]){const bytes=await read(row.path);assert.equal(sha(bytes),row.sha256,row.path);if(row.bytes!==undefined)assert.equal(bytes.length,row.bytes,row.path);}
const manifests=[],expected=new Map();let manifestParts=0;
for(const folder of await readdir(new URL('assets/audio/ft/',root))){
 const path='assets/audio/ft/'+folder+'/manifest.json',bytes=await read(path).catch(e=>{if(e.code==='ENOENT')return null;throw e;});if(!bytes)continue;
 const m=JSON.parse(bytes);manifests.push({path,sha256:sha(bytes),parts:m.parts?.length??0});
 for(const p of m.parts??[]){if(!p.path)continue;const normalized=p.path.replace(/^\.\//,''),digest=p.sha256??p.hash;if(digest){const actual=sha(await read(normalized));assert.equal(actual,digest,p.id);if(expected.has(normalized))assert.equal(expected.get(normalized),digest);expected.set(normalized,digest);manifestParts++;}}
}
const catalog=[...BEGINNER_BANK,...USER_DRUM_BANK,...USER_EXPERIMENTAL_BANK,...JURA_EXPERIMENTAL_BANK,...ABSTRACT_BANK,...EXPERIMENTAL_LEAD_BANK,...ALL_VOCALS];
for(const asset of catalog){const p=asset.path.replace(/^\.\//,'');assert.ok(expected.has(p),'missing manifest hash '+asset.id);assert.equal(sha(await read(p)),expected.get(p),asset.id);}
assert.equal(ABSTRACT_RECIPES.length,43);assert.equal(EXPERIMENTAL_LEAD_RECIPES.length,13);
assert.equal(VOICE_PACKS.find(v=>v.id==='npc-voice:daniel-20261020').parts.length,51);assert.equal(VOICE_PACKS.find(v=>v.id==='npc-voice:kapa-20261018').parts.length,48);
const audit={version:1,batch:intake.batch,intakeManifestSha256:sha(intakeBytes),originals,copies,exclusions,preparationSourceHashes:hashes.sources.length,preparationOutputHashes:hashes.outputs.length,manifests,manifestParts,reachableCatalogSources:catalog.length,abstractRecipes:43,experimentalLeads:13,danielUsable:51,kapaUsable:48,browserPassed:false,sourceRemoval:'Root-owned, pending. All 255 originals present at audit.'};
await writeFile(new URL('artifacts/abstract-20261020/integration-audit.json',root),JSON.stringify(audit,null,2)+'\n');console.log(JSON.stringify(audit,null,2));
