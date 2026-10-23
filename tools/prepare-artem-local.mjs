// Additive assets only. Originals and all released playback binaries are immutable.
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {decodeAudio,measureLoudness,signalEvidence} from './audio/experimental-analysis.mjs';
import {decodePcm16,encodePcm16,repeatDrumCycle,pcmStatistics} from './audio/source-loop.mjs';
import {JURA_EXPERIMENTAL_BANK} from '../src/beat-jura-experimental-bank.js';
const root=fileURLToPath(new URL('../',import.meta.url)),library='stems/source-library',voiceOutput='assets/audio/ft/npc-artem-v1',output='assets/audio/ft/jura-experimental-v2';
const hash=b=>createHash('sha256').update(b).digest('hex');
async function read(path){try{return await readFile(resolve(root,path));}catch(e){if(e.code==='ENOENT')return null;throw e;}}
async function owned(path,bytes){const old=await read(path);if(old&&hash(old)!==hash(bytes))throw Error('Refusing to overwrite differing output '+path);await mkdir(dirname(resolve(root,path)),{recursive:true});if(!old)await writeFile(resolve(root,path),bytes);}
const inventory=JSON.parse(await read(library+'/manifest.json'));
async function source(category,name){const path=library+'/'+category+'/'+name,raw=await read(path),expected=inventory.originals.find(p=>p.newPath===path);if(!raw||!expected||raw.length!==expected.bytes||hash(raw)!==expected.sha256)throw Error('Missing or changed inventoried original '+path);return {path,raw,sourceHash:hash(raw)};}
const voiceDir=library+'/voices/artem',names=(await readdir(resolve(root,voiceDir))).filter(n=>n.endsWith('.wav')).sort((a,b)=>a.localeCompare(b,'ru',{numeric:true})),voices=[];
if(names.length!==52)throw Error('Expected exactly 52 Artem originals');
for(const [i,name]of names.entries()){
 const s=await source('voices/artem',name),pcm=decodePcm16(s.raw),n=String(i+1).padStart(2,'0'),path=voiceOutput+'/'+n+'.wav';await owned(path,s.raw);
 voices.push({id:'npc-artem-'+n,voiceId:'npc-voice:artem-20261018',verified:true,path:'./'+path,source:library+'/voices/artem/'+name,sourceHash:s.sourceHash,sha256:s.sourceHash,sampleRate:pcm.sampleRate,frames:pcm.channels[0].length,seconds:pcm.channels[0].length/pcm.sampleRate,channels:pcm.channels.length,bpm:90,sourceGainDb:Number(Math.min(0,20*Math.log10(.045/pcmStatistics(pcm.channels).rms)).toFixed(2))});
}
const parts=[];
for(const part of JURA_EXPERIMENTAL_BANK.filter(p=>/-[34]$/.test(p.id))){
 const name=part.id.replace('jura-experimental-20261018-','').replace(/-([34])$/,' $1')+'.mp3',category='instruments/'+({drums:'drums',theme:'lead',arrangement:'bass'}[part.kind]),s=await source(category,name),decoded=decodeAudio(resolve(root,s.path)),evidence=signalEvidence(decoded);
 // All six contain a two-bar phrase on the 90 BPM grid plus encoder/decay tail.
 // Trim the quiet encoder prefix only, keeping 2ms before first signal.
 let first=0;const threshold=pcmStatistics(decoded.channels).peak*.001;
 while(first<Math.round(.04*decoded.sampleRate)&&decoded.channels.every(c=>Math.abs(c[first])<threshold))first++;
 const trim=Math.max(0,first-Math.round(.002*decoded.sampleRate)),loop=repeatDrumCycle({...decoded,channels:decoded.channels.map(c=>c.subarray(trim)),cycleBars:2}),cycle=235200,edge=Math.round(loop.sampleRate*.003);
 for(const c of loop.channels)for(let i=0;i<c.length;i++)c[i]*=Math.max(0,Math.min(1,(i%cycle)/edge,(cycle-1-i%cycle)/edge));
 const peak=pcmStatistics(loop.channels).peak,buildGainDb=peak>.9?20*Math.log10(.9/peak):0;
 if(buildGainDb)for(const c of loop.channels)for(let i=0;i<c.length;i++)c[i]*=10**(buildGainDb/20);
 const wav=encodePcm16(loop),path=part.path.replace(/^\.\//,'');await owned(path,wav);
 const target={drums:-30,theme:-27,arrangement:-28.5}[part.kind],loudness=measureLoudness(resolve(root,path)),gainDb=Number(Math.min(target-loudness.lufs,-10-loudness.truePeak).toFixed(2));
 parts.push({...part,path,source:library+'/'+category+'/'+name,sourceHash:s.sourceHash,sha256:hash(wav),sampleRate:loop.sampleRate,frames:loop.channels[0].length,evidence,trimFrames:trim,cycleEvidence:'Two 2.6666667s bars at 90 BPM: active phrase extends through second bar; extra container duration is decay. Full tail folded at 5.3333333s, not looped as a third bar.',tailPolicy:'Measured quiet MP3 prefix trimmed with 2ms pre-onset margin; full remaining decay folded into two bars; 3ms seam fade; four-bar derived playback, no transpose or time stretch.',tonalEvidence:part.kind==='drums'?'90 BPM onset grid; percussion has no assigned key.':'Spectral partials support A natural minor compatibility (A/B/C/D/E/F/G). Inference, not authoritative key detection; mixed only with the established A-minor bank.',calibration:{buildGainDb,gainDb,targetLufs:target,derived:loudness,after:measureLoudness(resolve(root,path),gainDb)}});
}
await owned(voiceOutput+'/manifest.json',Buffer.from(JSON.stringify({version:1,authorship:'User supplied Artem originals; initial base flow 10..65; byte-for-byte copies.',parts:voices},null,2)+'\n'));
await owned(output+'/manifest.json',Buffer.from(JSON.stringify({version:1,builder:'node tools/prepare-artem-local.mjs',parts},null,2)+'\n'));
console.log(JSON.stringify({voices:voices.length,parts:parts.map(p=>({id:p.id,trimFrames:p.trimFrames,gainDb:p.calibration.gainDb,evidence:p.evidence}))}));
