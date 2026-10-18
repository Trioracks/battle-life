import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {localAssetPath} from '../helpers/local-assets.js';
import {VOICE_PACKS} from '../../src/vocal-catalog.js';

test('every eligible voice resolves to an actual WAV in the explicit local pack',async()=>{
 for(const pack of VOICE_PACKS)for(const asset of pack.parts){const bytes=await readFile(localAssetPath(asset.path));assert.equal(bytes.toString('ascii',0,4),'RIFF',asset.id);}
});

test('all NPC catalog records retain exact original and runtime bytes including silent takes',async()=>{
 for(const bank of ['jura','artem','gans','kapa']){
  const manifest=JSON.parse(await readFile(new URL('../../assets/audio/ft/npc-'+bank+'-v1/manifest.json',import.meta.url),'utf8'));
  for(const part of manifest.parts)for(const relative of [part.path,part.source])assert.equal(createHash('sha256').update(await readFile(localAssetPath(relative))).digest('hex'),part.sourceHash,relative);
 }
});
