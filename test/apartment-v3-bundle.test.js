import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {validateApartmentBundle} from '../tools/validate-apartment-v3.mjs';
import {assetPath} from './helpers/apartment-assets.js';

test('installer dry-run validates paths and never changes the live manifest',()=>{
 const installed='D:/Project/Battle/assets/apartment/v3/scene.json';
 const hash=()=>createHash('sha256').update(fs.readFileSync(installed)).digest('hex'),before=hash();
 const fixture=fs.mkdtempSync('D:/Codex/Builds/Battle/installer-test-'),bundle=path.join(fixture,'assets'),source=path.join(fixture,'source');
 fs.mkdirSync(bundle);fs.mkdirSync(source);
 for(const file of validateApartmentBundle(assetPath()).files)fs.linkSync(assetPath(file),path.join(bundle,file));
 for(const file of ['apartment-cutaway-v3.blend','mannequin-v3.blend'])fs.linkSync(path.resolve('assets/source',file),path.join(source,file));
 try{
 const backup='D:/Codex/Builds/Battle/dry-run-'+Date.now();
 const run=(args)=>spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File','tools/install-apartment-v3.ps1','-Bundle',bundle,'-Backup',backup,'-WhatIf',...args],{encoding:'utf8'});
 const invalid=run(['-Project','D:/Project/Unexpected']);assert.notEqual(invalid.status,0);assert.match(invalid.stderr,/Unexpected project/);
 const valid=run([]);assert.equal(valid.status,0,valid.stderr);assert.match(valid.stdout,/What if|Что если/i);
 assert.equal(fs.existsSync(backup),false);assert.equal(hash(),before);
 }finally{assert.ok(path.resolve(fixture).startsWith('D:\\Codex\\Builds\\Battle\\installer-test-'));fs.rmSync(fixture,{recursive:true});}
});

test('the actual delivery bundle is complete and contains the eating rig',()=>{
 const result=validateApartmentBundle(assetPath());assert.deepEqual(result.errors,[]);assert.equal(result.ok,true);
 assert.ok(result.files.includes('exterior.glb'));assert.ok(result.files.includes('mannequin.glb'));
});
test('validator rejects missing, truncated, unsafe and mismatched bundle references without writes',()=>{
 const dir=fs.mkdtempSync('D:/Codex/Temp/battle-bundle-test-');
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
 }finally{assert.ok(path.resolve(dir).startsWith('D:\\Codex\\Temp\\battle-bundle-test-'));fs.rmSync(dir,{recursive:true});}
});
