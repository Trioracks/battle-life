import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {validateApartmentBundle} from '../tools/validate-apartment-v3.mjs';
import {assetPath} from './helpers/apartment-assets.js';
import {tmpdir} from 'node:os';

test('runtime bundle validates without generated geometry or walk QA reports',t=>{
 const scratch=tmpdir(),fixture=fs.mkdtempSync(path.join(scratch,'runtime-bundle-'));
 t.after(()=>{assert.equal(path.dirname(fixture),path.resolve(scratch));fs.rmSync(fixture,{recursive:true});});
 for(const file of validateApartmentBundle(assetPath()).files.filter(name=>!['geometry-audit.json','walk-audit.json'].includes(name)))fs.copyFileSync(assetPath(file),path.join(fixture,file));
 const result=validateApartmentBundle(fixture);assert.deepEqual(result.errors,[]);assert.equal(result.ok,true);
 assert.equal(result.files.some(name=>name.endsWith('-audit.json')),false);
});



test('the actual delivery bundle is complete and contains the eating rig',()=>{
 const result=validateApartmentBundle(assetPath());assert.deepEqual(result.errors,[]);assert.equal(result.ok,true);
 assert.ok(result.files.includes('exterior.glb'));assert.ok(result.files.includes('mannequin.glb'));
});
test('validator rejects missing, truncated, unsafe and mismatched bundle references without writes',()=>{
 const dir=fs.mkdtempSync(path.join(tmpdir(),'battle-bundle-test-'));
 try{
  assert.match(validateApartmentBundle(dir).errors.join('\n'),/scene.json/);
  const original=JSON.parse(fs.readFileSync(assetPath('scene.json')));
  fs.writeFileSync(path.join(dir,'scene.json'),JSON.stringify({...original,geometry:'../escape.glb'}));
  assert.match(validateApartmentBundle(dir).errors.join('\n'),/unsafe.*escape/);
  for(const filename of validateApartmentBundle(assetPath()).files)fs.copyFileSync(assetPath(filename),path.join(dir,filename));
  const badLighting=structuredClone(original);badLighting.lightingStates.both.night='missing-renderer-texture.png';
  fs.writeFileSync(path.join(dir,'scene.json'),JSON.stringify(badLighting));
  assert.equal(validateApartmentBundle(dir).ok,false,'renderer lighting references must be validated');
  assert.match(validateApartmentBundle(dir).errors.join('\n'),/missing-renderer-texture|lighting.*mismatch/);
  fs.writeFileSync(path.join(dir,'scene.json'),JSON.stringify(original));
  const json=JSON.parse(fs.readFileSync(path.join(dir,'scene.json')));json.liveRoots.push('nonexistent-root');
  fs.writeFileSync(path.join(dir,'scene.json'),JSON.stringify(json));
  assert.match(validateApartmentBundle(dir).errors.join('\n'),/nonexistent-root/);
  fs.writeFileSync(path.join(dir,'scene.json'),JSON.stringify(original));
  fs.writeFileSync(path.join(dir,'interaction.glb'),'glTF');
  assert.match(validateApartmentBundle(dir).errors.join('\n'),/interaction.glb/);
  fs.copyFileSync(assetPath('interaction.glb'),path.join(dir,'interaction.glb'));
  const rig=fs.readFileSync(path.join(dir,'mannequin.glb'));const count=rig.readUInt32LE(12);
  const jsonText=rig.subarray(20,20+count).toString().replace('"name":"eat"','"name":"zzz"');
  assert.equal(Buffer.byteLength(jsonText),count);rig.write(jsonText,20);fs.writeFileSync(path.join(dir,'mannequin.glb'),rig);
  assert.match(validateApartmentBundle(dir).errors.join('\n'),/eat/);
  fs.unlinkSync(path.join(dir,original.background));assert.match(validateApartmentBundle(dir).errors.join('\n'),/background.png/);
 }finally{assert.equal(path.dirname(dir),path.resolve(tmpdir()));fs.rmSync(dir,{recursive:true});}
});
