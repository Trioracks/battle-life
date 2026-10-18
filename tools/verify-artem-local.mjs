import assert from 'node:assert/strict';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {decodePcm16,pcmStatistics} from './audio/source-loop.mjs';
import {npcVocalById,normalizeNpcVoices} from '../src/npc-vocal-catalog.js';
import {beginnerById} from '../src/beat-beginner-bank.js';
import {SOURCE_GAINS_DB} from '../src/source-levels.js';
const json=async p=>JSON.parse(await readFile(p,'utf8')),hash=b=>createHash('sha256').update(b).digest('hex');
const archive=await json('stems/source-library/manifest.json'),voice=await json('assets/audio/ft/npc-artem-v1/manifest.json'),parts=await json('assets/audio/ft/jura-experimental-v2/manifest.json');
assert.equal(archive.originals.length,113);assert.equal(new Set(archive.originals.map(p=>p.oldPath)).size,113);assert.equal(new Set(archive.originals.map(p=>p.newPath)).size,113);
for(const p of archive.originals){assert.ok(p.oldPath.startsWith(archive.intakeRoot+'/'));assert.ok(p.newPath.startsWith(archive.archiveRoot+'/'));const bytes=await readFile(p.newPath);assert.equal(bytes.length,p.bytes);assert.equal(hash(bytes),p.sha256);}
assert.deepEqual(await readdir(archive.intakeRoot),[]);assert.equal(voice.parts.length,52);assert.equal(parts.parts.length,6);
const loopEvidence=[];
for(const p of [...voice.parts,...parts.parts]){
 const bytes=await readFile(p.path),original=await readFile(p.source);assert.equal(hash(bytes),p.sha256);assert.equal(hash(original),p.sourceHash);const pcm=decodePcm16(bytes),stats=pcmStatistics(pcm.channels);assert.ok(stats.rms>.0001&&stats.peak<1);
 if(p.voiceId){assert.deepEqual(bytes,original);assert.equal(npcVocalById(p.id).voiceId,'npc-voice:artem-20261018');assert.equal(pcm.sampleRate,48000);assert.ok(Number.isFinite(p.sourceGainDb));}
 else {assert.equal(pcm.sampleRate,44100);assert.equal(pcm.channels[0].length,470400);assert.equal(p.cycleBars,2);assert.equal(beginnerById(p.id).kind,p.kind);assert.equal(SOURCE_GAINS_DB[p.id],p.calibration.gainDb);assert.ok(p.calibration.after.truePeak<=-9.95);if(Math.abs(p.calibration.after.lufs-p.calibration.targetLufs)>=.15){assert.ok(p.calibration.after.lufs<p.calibration.targetLufs);assert.ok(p.calibration.after.truePeak>=-10.05,'peak-limited part retains headroom instead of chasing loudness');}
  const barRms=Array.from({length:4},(_,i)=>pcmStatistics(pcm.channels.map(c=>c.subarray(i*117600,(i+1)*117600))).rms);assert.ok(barRms.every(x=>x>.0001));for(const c of pcm.channels){assert.equal(c[0],0);assert.equal(c.at(-1),0);assert.ok(Math.abs(c[235200]-c[235199])<.001);}loopEvidence.push({id:p.id,...stats,barRms,cycleBars:p.cycleBars,calibration:p.calibration});
 }
}
const frozen=await json('test/fixtures/npc-jura-frozen-voice.json');assert.deepEqual(normalizeNpcVoices(frozen),frozen);
// Optional full local baseline proof; the portable archive checks above are mandatory.
let preserved=null;try{const baseline=await json('artifacts/artem-local-session/baseline.json');for(const p of baseline.existing){const bytes=await readFile(p.path);assert.equal(bytes.length,p.bytes);assert.equal(hash(bytes),p.sha256,p.path);}preserved={count:baseline.existing.length,aggregate:baseline.existingAggregate};}catch(e){if(e.code!=='ENOENT')throw e;}
const evidence={archiveCount:archive.originals.length,archiveBytes:archive.originals.reduce((n,p)=>n+p.bytes,0),intakeEntries:0,artemVoiceCount:voice.parts.length,artemByteIdentical:true,loopEvidence,preserved};
await writeFile('artifacts/artem-local-session/preservation-and-loops.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
