import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));

// Catches arbitrary paths/origins, unbounded or non-JPEG upload and unsafe overwrite.
test('local demo sink saves only bounded same-origin approved evidence without overwrite',async()=>{
 const api=await import('../tools/serve-abstract-demos.mjs');
 assert.equal(typeof api.createDemoServer,'function');
 // A fresh checkout does not contain this ignored scratch parent.
 await mkdir(path.join(root,'artifacts/test-temp'),{recursive:true});
 const sandbox=await mkdtemp(path.join(root,'artifacts/test-temp/abstract-demo-sink-')),out=path.join(sandbox,'artifacts/abstract-20261020/demos');await mkdir(out,{recursive:true});
 await writeFile(path.join(out,'fixtures.json'),JSON.stringify({examples:[{label:'track-01-daniel'}]}));
 const server=await api.createDemoServer({root:sandbox,port:0});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
  const origin='http://127.0.0.1:'+server.address().port,post=(name,bytes,from=origin)=>fetch(origin+'/__abstract-demo-output/'+name,{method:'POST',headers:{Origin:from},body:bytes});
  const jpeg=await readFile(path.join(root,'assets/npc-photos/mak-npc-07-street.jpg'));
  assert.equal((await post('qa-screenshot.jpg',jpeg,'http://example.invalid')).status,400);
  assert.equal((await post('arbitrary.jpg',jpeg)).status,400);
  assert.equal((await post('qa-screenshot.jpg',Buffer.from('not JPEG'))).status,400);
  assert.equal((await post('qa-screenshot.jpg',Buffer.alloc(2*1024*1024+1))).status,400);
  await assert.rejects(access(path.join(out,'qa-screenshot.jpg')));
  assert.equal((await post('qa-screenshot.jpg',jpeg)).status,200);
  assert.deepEqual(await readFile(path.join(out,'qa-screenshot.jpg')),jpeg);
  assert.equal((await post('qa-screenshot.jpg',jpeg)).status,200);
  const changed=Buffer.from(jpeg);changed[changed.length-5]^=1;
  assert.equal((await post('qa-screenshot.jpg',changed)).status,400);
  assert.deepEqual(await readFile(path.join(out,'qa-screenshot.jpg')),jpeg);
 }finally{await new Promise(r=>server.close(r));}
});
