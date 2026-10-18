import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile,mkdtemp,symlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import * as voices from '../../src/npc-vocal-catalog.js';
import {chooseBeginnerParts,beginnerById} from '../../src/beat-beginner-bank.js';
import {ensureNpcRoundTrack} from '../../src/battle-npc.js';
import {createVirtualPcState} from '../../src/virtual-pc-state.js';
import {npcPlaybackDescriptor} from '../../src/battle-npc-audio.js';
import {playTrackVersion} from '../../src/track-version-audio.js';
const jura='npc-voice:jura-20261018',artem='npc-voice:artem-20261018';

test('archival validates the entire inventory before moving and preserves original bytes without overwriting',async()=>{
 const root=await mkdtemp(join(tmpdir(),'artem-local-session-archive-test-')),intake=root+'/Новая папка/beats 90 bpm',library=root+'/stems/source-library';await mkdir(intake+'/Artem Voice (10-65 skill)',{recursive:true});
 const bytes=Buffer.from('unchanged original'),path='Artem Voice (10-65 skill)/Артём - REC.wav',sha256=createHash('sha256').update(bytes).digest('hex');await writeFile(intake+'/'+path,bytes);
 const baseline=root+'/baseline.json';await writeFile(baseline,JSON.stringify({intakeRoot:'Новая папка/beats 90 bpm',intake:[{path,bytes:bytes.length,sha256}]}));
 const run=()=>spawnSync('pwsh',['-NoProfile','-File','tools/archive-local-sources.ps1','-WorkspaceRoot',root,'-BaselinePath',baseline,'-Apply'],{encoding:'utf8',windowsHide:true});
 await writeFile(intake+'/'+path,'changed');assert.notEqual(run().status,0);assert.equal(await readFile(intake+'/'+path,'utf8'),'changed');
 await writeFile(intake+'/'+path,bytes);await mkdir(library+'/voices/artem',{recursive:true});await writeFile(library+'/voices/artem/Артём - REC.wav','unrelated');assert.notEqual(run().status,0);assert.deepEqual(await readFile(intake+'/'+path),bytes);
 const {unlink}=await import('node:fs/promises');await unlink(library+'/voices/artem/Артём - REC.wav');await writeFile(intake+'/arrived-later.mp3','later');const done=run();assert.equal(done.status,0,done.stderr);assert.deepEqual(await readFile(library+'/voices/artem/Артём - REC.wav'),bytes);assert.equal(run().status,0,'verified re-run is idempotent');
 const manifest=JSON.parse(await readFile(library+'/manifest.json','utf8'));assert.deepEqual(manifest.originals,[{oldPath:'Новая папка/beats 90 bpm/'+path,newPath:'stems/source-library/voices/artem/Артём - REC.wav',bytes:bytes.length,sha256}]);assert.equal(await readFile(intake+'/arrived-later.mp3','utf8'),'later');assert.deepEqual(manifest.remainingIntakeFiles,[resolve(intake+'/arrived-later.mp3')]);
});
test('archival rejects an unrelated library manifest before moving an original',async()=>{
 const root=await mkdtemp(join(tmpdir(),'artem-local-session-archive-manifest-test-')),intake=root+'/Новая папка/beats 90 bpm',library=root+'/stems/source-library';await mkdir(intake,{recursive:true});await mkdir(library,{recursive:true});
 const bytes=Buffer.from('original mp3 fixture'),sha256=createHash('sha256').update(bytes).digest('hex');await writeFile(intake+'/bass.mp3',bytes);await writeFile(library+'/manifest.json','unrelated');const baseline=root+'/baseline.json';await writeFile(baseline,JSON.stringify({intakeRoot:'Новая папка/beats 90 bpm',intake:[{path:'bass.mp3',bytes:bytes.length,sha256}]}));
 const result=spawnSync('pwsh',['-NoProfile','-File','tools/archive-local-sources.ps1','-WorkspaceRoot',root,'-BaselinePath',baseline,'-Apply'],{encoding:'utf8',windowsHide:true});assert.notEqual(result.status,0);assert.deepEqual(await readFile(intake+'/bass.mp3'),bytes);assert.equal(await readFile(library+'/manifest.json','utf8'),'unrelated');
});
test('archival rejects a reparse source ancestor and an inventory path escaping the intake',async()=>{
 const root=await mkdtemp(join(tmpdir(),'artem-local-session-archive-path-test-')),intake=root+'/Новая папка/beats 90 bpm',outside=root+'/outside';await mkdir(intake,{recursive:true});await mkdir(outside,{recursive:true});const bytes=Buffer.from('unchanged external source'),sha256=createHash('sha256').update(bytes).digest('hex');await writeFile(outside+'/Артём - REC.wav',bytes);
 await symlink(resolve(outside),resolve(intake+'/Artem Voice (10-65 skill)'),'junction');const baseline=root+'/baseline.json';
 for(const path of ['Artem Voice (10-65 skill)/Артём - REC.wav','../../outside/Артём - REC.wav']){
  await writeFile(baseline,JSON.stringify({intakeRoot:'Новая папка/beats 90 bpm',intake:[{path,bytes:bytes.length,sha256}]}));const result=spawnSync('pwsh',['-NoProfile','-File','tools/archive-local-sources.ps1','-WorkspaceRoot',root,'-BaselinePath',baseline,'-Apply'],{encoding:'utf8',windowsHide:true});assert.notEqual(result.status,0);assert.deepEqual(await readFile(outside+'/Артём - REC.wav'),bytes);
 }
});
