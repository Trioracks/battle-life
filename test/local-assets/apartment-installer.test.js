import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {validateApartmentBundle} from '../../tools/validate-apartment-v3.mjs';
import {assetPath} from '../helpers/apartment-assets.js';
import {localAssetPath} from '../helpers/local-assets.js';

// Selected explicitly only on Windows; runner reports the platform exclusion elsewhere.
test('installer dry-run validates paths and never changes the live manifest',()=>{
 const installed=localAssetPath('assets/apartment/v3/scene.json');
 const hash=()=>createHash('sha256').update(fs.readFileSync(installed)).digest('hex'),before=hash();
 const scratch=path.resolve('D:/Codex/Builds/Battle');
 fs.mkdirSync(scratch,{recursive:true});
 const fixture=fs.mkdtempSync(path.join(scratch,'installer-test-')),bundle=path.join(fixture,'assets'),source=path.join(fixture,'source');
 try{
  fs.mkdirSync(bundle);fs.mkdirSync(source);
  for(const file of validateApartmentBundle(assetPath()).files)fs.copyFileSync(assetPath(file),path.join(bundle,file));
  for(const file of ['apartment-cutaway-v3.blend','mannequin-v3.blend'])fs.copyFileSync(localAssetPath('assets/source/'+file),path.join(source,file));
  const backup=path.join(scratch,'dry-run-'+path.basename(fixture));
  const run=args=>spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File','tools/install-apartment-v3.ps1','-Bundle',bundle,'-Backup',backup,'-WhatIf',...args],{encoding:'utf8',windowsHide:true});
  const invalid=run(['-Project','D:/Project/Unexpected']);assert.notEqual(invalid.status,0);assert.match(invalid.stderr,/Unexpected project/);
  const valid=run([]);assert.equal(valid.status,0,valid.stderr);assert.match(valid.stdout,/What\s*if|Что если/i);
  assert.equal(fs.existsSync(backup),false);assert.equal(hash(),before);
 }finally{assert.equal(path.dirname(fixture),scratch);assert.ok(path.basename(fixture).startsWith('installer-test-'));fs.rmSync(fixture,{recursive:true});}
});
