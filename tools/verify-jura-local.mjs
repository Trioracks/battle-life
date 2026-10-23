import assert from 'node:assert/strict';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {decodePcm16,pcmStatistics} from './audio/source-loop.mjs';
import {beginnerById} from '../src/beat-beginner-bank.js';
import {SOURCE_GAINS_DB} from '../src/source-levels.js';
const hash=b=>createHash('sha256').update(b).digest('hex'),read=async p=>JSON.parse(await readFile(p,'utf8'));
const m=await read('assets/audio/ft/jura-experimental-v1/manifest.json'),v=await read('assets/audio/ft/npc-jura-v1/manifest.json');
assert.equal(m.parts.length,6);assert.equal(v.parts.length,49);
for(const p of [...m.parts,...v.parts]){assert.equal(hash(await readFile(p.source)),p.sourceHash);assert.equal(hash(await readFile(p.path)),p.sha256);}
const loops=[];
for(const p of m.parts){const pcm=decodePcm16(await readFile(p.path)),stats=pcmStatistics(pcm.channels);assert.equal(pcm.sampleRate,44100);assert.equal(pcm.channels[0].length,470400);assert.ok(stats.peak<1&&stats.rms>.0001);assert.equal(beginnerById(p.id).kind,p.kind);assert.equal(SOURCE_GAINS_DB[p.id],p.calibration.gainDb);
 const barRms=Array.from({length:4},(_,i)=>pcmStatistics(pcm.channels.map(c=>c.subarray(i*117600,(i+1)*117600))).rms);assert.ok(barRms.every(x=>x>.0001));
 for(const c of pcm.channels){assert.equal(c[0],0);assert.equal(c.at(-1),0);const cycle=Math.round(117600*p.cycleBars);for(let i=cycle;i<c.length;i+=cycle)assert.ok(Math.abs(c[i]-c[i-1])<.001);}
 loops.push({id:p.id,...stats,barRms,cycleBars:p.cycleBars});
}
async function walk(dir,prefix=''){const found=[];for(const entry of await readdir(dir,{withFileTypes:true})){const relative=prefix+entry.name,path=dir+'/'+entry.name;if(entry.isDirectory())found.push(...await walk(path,relative+'/'));else{const bytes=await readFile(path);found.push([relative,bytes.length,hash(bytes)]);}}return found;}
const archive=await read('stems/source-library/manifest.json'),intake=[];
for(const entry of archive.originals){const bytes=await readFile(entry.newPath);assert.equal(bytes.length,entry.bytes);assert.equal(hash(bytes),entry.sha256);if(m.originals.some(p=>p.path===entry.newPath))intake.push([entry.oldPath.slice(archive.intakeRoot.length+1),bytes.length,hash(bytes)]);}
intake.sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);const intakeHash=hash(JSON.stringify(intake));
assert.equal((await walk('Новая папка/beats 90 bpm')).length,0,'all inventoried originals are archived');
const trackedNames=execFileSync('git',['ls-tree','-r','--name-only','-z','b773a928a5de456b5edf3e0521d8c5223cc352ad','--','assets/audio','stems'],{windowsHide:true}).toString().split('\0').filter(Boolean).sort(),tracked=[];
for(const path of trackedNames){const bytes=await readFile(path);tracked.push([path,bytes.length,hash(bytes)]);}
const trackedHash=hash(tracked.map(x=>JSON.stringify(x)+'\n').join(''));
const evidence={intake:{count:intake.length,bytes:intake.reduce((n,p)=>n+p[1],0),sha256:intakeHash,expected:'ed73d67e7a0d85b631694c499135689f4fdedb668e8c036f98efa70857cc8b11'},trackedOriginals:{count:tracked.length,bytes:tracked.reduce((n,p)=>n+p[1],0),sha256:trackedHash,expected:'88e054103b05a58b189c0ecc424f9eb1bbe683fc9d7d8d8ac3a5814630f7607e'},loops,voiceCount:v.parts.length};
assert.equal(intakeHash,evidence.intake.expected);assert.equal(trackedHash,evidence.trackedOriginals.expected);
await writeFile('artifacts/jura-local-session/preservation-and-loops.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
