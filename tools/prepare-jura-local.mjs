// Reproducible local preparation from archived, byte-preserved originals.
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {decodeAudio,measureLoudness,signalEvidence} from './audio/experimental-analysis.mjs';
import {decodePcm16,encodePcm16,repeatDrumCycle,pcmStatistics} from './audio/source-loop.mjs';
import {JURA_EXPERIMENTAL_BANK} from '../src/beat-jura-experimental-bank.js';
const root=fileURLToPath(new URL('../',import.meta.url)),intake='stems/source-library',output='assets/audio/ft/jura-experimental-v1',voiceOutput='assets/audio/ft/npc-jura-v1';
const hash=b=>createHash('sha256').update(b).digest('hex');
const read=async p=>{try{return await readFile(resolve(root,p));}catch(e){if(e.code==='ENOENT')return null;throw e;}};
const oldBytes=await read(output+'/manifest.json'),previous=oldBytes?JSON.parse(oldBytes):null;
const voiceBytes=await read(voiceOutput+'/manifest.json'),previousVoices=voiceBytes?JSON.parse(voiceBytes):null;
async function owned(path,bytes,oldHash){
 const old=await read(path);if(old&&hash(old)!==hash(bytes)&&hash(old)!==oldHash)throw Error('Refusing to overwrite unrelated output '+path);
 await mkdir(dirname(resolve(root,path)),{recursive:true});if(!old||hash(old)!==hash(bytes))await writeFile(resolve(root,path),bytes);
}
const sourceHashes=[];
async function source(path){const raw=await read(path);if(!raw)throw Error('Missing input '+path);sourceHashes.push({path,bytes:raw.length,sha256:hash(raw)});return raw;}
const parts=[],gains={};
for(const part of JURA_EXPERIMENTAL_BANK.filter(p=>p.path.includes('/jura-experimental-v1/'))){
 const name=part.id.replace('jura-experimental-20261018-','').replace('-2',' 2'),category={drums:'drums',theme:'lead',arrangement:'bass'}[part.kind],sourcePath=intake+'/instruments/'+category+'/'+name+'.mp3',raw=await source(sourcePath),old=previous?.parts.find(p=>p.id===part.id);
 if(old&&old.sourceHash!==hash(raw))throw Error('Changed original '+sourcePath);
 const decoded=decodeAudio(resolve(root,sourcePath)),evidence=signalEvidence(decoded);
 // These non-gapless MP3 exports share ~25ms encoder delay. Trim only the
 // measured quiet prefix (never the onset), then fold the entire decay onto
 // its supplied 1/2-bar grid. Long lead container tails are not musical bars.
 let first=0;const threshold=pcmStatistics(decoded.channels).peak*.001;
 while(first<Math.round(.04*decoded.sampleRate)&&decoded.channels.every(c=>Math.abs(c[first])<threshold))first++;
 const trim=Math.max(0,first-Math.round(.002*decoded.sampleRate));
 const loop=repeatDrumCycle({...decoded,channels:decoded.channels.map(c=>c.subarray(trim)),cycleBars:part.cycleBars});
 const cycle=Math.round(loop.sampleRate*8/3*part.cycleBars),edge=Math.round(loop.sampleRate*.003);
 for(const c of loop.channels)for(let i=0;i<c.length;i++)c[i]*=Math.max(0,Math.min(1,(i%cycle)/edge,(cycle-1-i%cycle)/edge));
 const peak=pcmStatistics(loop.channels).peak,buildGainDb=peak>.9?20*Math.log10(.9/peak):0;
 if(buildGainDb)for(const c of loop.channels)for(let i=0;i<c.length;i++)c[i]*=10**(buildGainDb/20);
 const wav=encodePcm16(loop),path=part.path.replace(/^\.\//,'');await owned(path,wav,old?.sha256);
 const target={drums:-30,theme:-27,arrangement:-28.5}[part.kind],loudness=measureLoudness(resolve(root,path)),gainDb=Number(Math.min(target-loudness.lufs,-10-loudness.truePeak).toFixed(2));gains[part.id]=gainDb;
 parts.push({...part,path,source:sourcePath,sourceHash:hash(raw),sha256:hash(wav),sampleRate:loop.sampleRate,frames:loop.channels[0].length,evidence,trimFrames:trim,tailPolicy:'Entire remaining decoded decay folded into measured musical cycle; 3ms seam fades; no transpose or time stretch',tonalEvidence:part.kind==='drums'?'Percussion; kick resonances are not a key.':'A/C/E/G and D/B natural partials support common A-minor compatibility, inferred rather than authoritative key detection.',calibration:{buildGainDb,gainDb,targetLufs:target,derived:loudness,after:measureLoudness(resolve(root,path),gainDb)}});
}
const voiceDir=intake+'/voices/jura',names=(await readdir(resolve(root,voiceDir))).filter(n=>n.endsWith('.wav')).sort((a,b)=>a.localeCompare(b,'ru',{numeric:true})),voiceParts=[];
if(names.length!==49)throw Error('Expected the 49 supplied Jura recordings');
for(const [i,name]of names.entries()){
 const sourcePath=voiceDir+'/'+name,raw=await source(sourcePath),pcm=decodePcm16(raw),n=String(i+1).padStart(2,'0'),id='npc-jura-'+n,path=voiceOutput+'/'+n+'.wav',old=previousVoices?.parts.find(p=>p.id===id);
 if(old&&old.sourceHash!==hash(raw))throw Error('Changed original '+sourcePath);
 // Copy original PCM bytes exactly: no pitch, compression or optimization.
 await owned(path,raw,old?.sha256);
 voiceParts.push({id,voiceId:'npc-voice:jura-20261018',verified:true,path:'./'+path,source:sourcePath,sourceHash:hash(raw),sha256:hash(raw),sampleRate:pcm.sampleRate,frames:pcm.channels[0].length,seconds:pcm.channels[0].length/pcm.sampleRate,channels:pcm.channels.length,bpm:90,sourceGainDb:Number(Math.min(0,20*Math.log10(.045/pcmStatistics(pcm.channels).rms)).toFixed(2))});
}
for(const s of sourceHashes)if(hash(await read(s.path))!==s.sha256)throw Error('Original changed '+s.path);
const manifest=Buffer.from(JSON.stringify({version:1,builder:'node tools/prepare-jura-local.mjs',originals:sourceHashes,parts},null,2)+'\n');
await owned(output+'/manifest.json',manifest,oldBytes?hash(oldBytes):undefined);
const vm=Buffer.from(JSON.stringify({version:1,authorship:'User supplied Jura recordings, assigned to NPCs with initial base flow 0..40. Original PCM retained byte-for-byte.',parts:voiceParts},null,2)+'\n');
await owned(voiceOutput+'/manifest.json',vm,voiceBytes?hash(voiceBytes):undefined);
console.log(JSON.stringify({parts:parts.map(p=>({id:p.id,trimFrames:p.trimFrames,gainDb:p.calibration.gainDb})),voices:voiceParts.length,originals:sourceHashes.length,gains}));
