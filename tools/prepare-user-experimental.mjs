// Rebuild from verified archives after intake is emptied; no downloads or source normalization.
import {readFile,writeFile,mkdir,realpath,lstat,readdir,unlink} from 'node:fs/promises';
import {resolve,dirname,relative,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {USER_EXPERIMENTAL_BANK} from '../src/beat-user-experimental-bank.js';
import {decodePcm16,encodePcm16,pcmStatistics,repeatDrumCycle} from './audio/source-loop.mjs';
import {decodeAudio,measureLoudness,signalEvidence} from './audio/experimental-analysis.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),intake=resolve(root,'Новая папка/beats 90 bpm');
const output='assets/audio/ft/user-experimental-v1',archive='stems/janres/non',hash=b=>createHash('sha256').update(b).digest('hex');
const targets={drums:-30,theme:-27,arrangement:-28.5};
const exists=async p=>{try{return await readFile(p);}catch(e){if(e.code==='ENOENT')return null;throw e;}};
const inside=(base,path)=>{const r=relative(base,path);return r!==''&&!r.startsWith('..'+sep)&&r!=='..'&&!resolve(r).startsWith('\\\\')&&!r.includes(':');};

if(process.argv.includes('--empty-intake')){
 const manifest=JSON.parse(await readFile(resolve(root,output,'manifest.json')));
 if(manifest.parts.length!==28||new Set(manifest.parts.map(p=>p.originalName)).size!==28)throw Error('Invalid intake manifest');
 const realIntake=await realpath(intake),realArchive=await realpath(resolve(root,archive));
 // Preflight every asset/archive before touching any original; recheck each pair immediately before removal.
 for(const p of manifest.parts){
  if(!/^untitled - Track ([1-9]|1[0-9]|2[0-8])\.wav$/.test(p.originalName))throw Error('Unexpected original name');
  const source=await realpath(resolve(root,p.source));if(!inside(realArchive,source))throw Error('Archive escaped root');
  if(hash(await readFile(source))!==p.sourceHash||hash(await readFile(resolve(root,p.path)))!==p.sha256)throw Error('Archive/asset checksum mismatch');
 }
 let removed=0;
 for(const p of manifest.parts){
  const path=resolve(realIntake,p.originalName);if(!await exists(path))continue;
  if((await lstat(path)).isSymbolicLink()||!inside(realIntake,await realpath(path)))throw Error('Intake path escaped root');
  const source=await realpath(resolve(root,p.source));
  if(!inside(realArchive,source)||hash(await readFile(source))!==p.sourceHash||hash(await readFile(path))!==p.sourceHash)throw Error('Changed original retained: '+path);
  await unlink(path);removed++;
 }
 console.log(JSON.stringify({removed,remaining:await readdir(realIntake),archive:realArchive}));
}else{
 const previousBytes=await exists(resolve(root,output,'manifest.json')),previous=previousBytes?JSON.parse(previousBytes):null,parts=[],gains={};
 await mkdir(resolve(root,output),{recursive:true});
 for(const [index,part] of USER_EXPERIMENTAL_BANK.entries()){
  const originalName=`untitled - Track ${index+1}.wav`,role=part.kind==='drums'?'drums':part.kind==='arrangement'?'bass':'keys-leads',filename=part.path.split('/').at(-1);
  const source=`${archive}/${role}/90bpm/user-2026-10-15/${filename}`,sourcePath=resolve(root,source),input=await exists(resolve(intake,originalName)),stored=await exists(sourcePath),raw=input??stored;
  if(!raw)throw Error('Missing original '+originalName);
  const sourceHash=hash(raw),old=previous?.parts.find(p=>p.id===part.id);
  if(stored&&hash(stored)!==sourceHash||old&&old.sourceHash!==sourceHash)throw Error('Original hash changed '+originalName);
  await mkdir(dirname(sourcePath),{recursive:true});if(!stored)await writeFile(sourcePath,raw,{flag:'wx'});
  if(hash(await readFile(sourcePath))!==sourceHash)throw Error('Archive verification failed');
  const original=decodePcm16(raw),decoded=decodeAudio(sourcePath),signal=signalEvidence(decoded),rawLoudness=measureLoudness(sourcePath);
  if(original.channels.length!==2||original.sampleRate!==48000||signal.seconds<16/3||signal.seconds>8||signal.clippedSamples)throw Error('Unexpected source format/timing/clipping');
  const loop=repeatDrumCycle({...decoded,cycleBars:2}),cycleFrames=235200,edge=132;
  // A two-bar steady-state cycle folds the reverb tail. Symmetric 3ms seam fades
  // remove wrap discontinuities at both the internal repeat and external boundary.
  for(const c of loop.channels)for(let i=0;i<c.length;i++)c[i]*=Math.max(0,Math.min(1,(i%cycleFrames)/edge,(cycleFrames-1-i%cycleFrames)/edge));
  const peak=pcmStatistics(loop.channels).peak,buildGainDb=peak>.9?20*Math.log10(.9/peak):0;
  for(const c of loop.channels)for(let i=0;i<c.length;i++)c[i]*=10**(buildGainDb/20);
  const path=part.path.replace(/^\.\//,''),wav=encodePcm16(loop);await writeFile(resolve(root,path),wav);
  const derived=measureLoudness(resolve(root,path)),wanted=targets[part.kind]-derived.lufs,gainDb=Number(Math.min(wanted,-10-derived.truePeak).toFixed(2));
  if(gainDb < -40||gainDb >12)throw Error('Derived gain outside runtime range: '+part.id);
  const after=measureLoudness(resolve(root,path),gainDb);gains[part.id]=gainDb;
  const pitched=part.key!==null,lowKeys=index===15;
  const evidence={signal,
   role:part.kind==='drums'?'Percussive broadband transients and low kick resonances, unlike stable 55/110Hz bass harmonics.':part.kind==='arrangement'?'Stable A1/A2 bass harmonics, >88% spectral energy below 200Hz, low spectral centroid.':lowKeys?'Low harmonic keys: C3/G3/E3/E2 peaks, 43.5% below 200Hz and centroid375Hz; broader chord register and long decay distinguish this from the bass sources.':'Pitched harmonic keys/lead register, several simultaneous partials and extended decay; used as one alternative theme.',
   key:pitched?'A minor compatible (inferred, not authoritative key detection): A/C/E with G/D/B natural pitch classes across the family. Spectral partials can produce chromatic energy; exact instrument, voicing and mode remain uncertain.':'Percussion: no assigned tonal key; kick resonances are not interpreted as harmonic bass notes.',
   timing:'90 BPM supplied; two bars = 5.333333s = 235200 decoded frames. Both bars have nonzero RMS; remainder is decay. Transient onset grid residuals and tail energy are measured above. Half/double-time interpretation is not independently proven.',
   subjectiveListening:false,confidence:lowKeys?'moderate (low chordal voice, not confidently a named instrument)':'role high; tonal mode moderate'};
  const item={id:part.id,originalName,source,sourceHash,path,sha256:hash(wav),role,kind:part.kind,family:part.family,key:part.key,bpm:90,bars:4,cycleBars:2,frames:470400,sampleRate:44100,channels:2,original:{sampleRate:original.sampleRate,channels:2,frames:original.channels[0].length},evidence,tailPolicy:'Raw tail archived intact; fold into two-bar steady-state cycle, repeat twice, 3ms seam fades',calibration:{raw:rawLoudness,buildGainDb,derived,gainDb,after,peakLimited:gainDb<wanted-.01,targetLufs:targets[part.kind],compression:false}};
  parts.push(item);console.log(JSON.stringify({track:index+1,id:part.id,raw:rawLoudness.lufs,derived:derived.lufs,gainDb,after,buildGainDb}));
 }
 const manifest={version:1,source:'User supplied 2026-10-15',builder:'node tools/prepare-user-experimental.mjs',parts};
 await writeFile(resolve(root,output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 for(const role of ['drums','bass','keys-leads'])await writeFile(resolve(root,archive,role,'90bpm/user-2026-10-15/manifest.json'),JSON.stringify({...manifest,parts:parts.filter(p=>p.role===role)},null,2)+'\n');
 await writeFile(resolve(root,'src/source-levels-user-experimental-v1.js'),'// Generated only for user-experimental-v1; do not overwrite released calibration.\nexport const USER_EXPERIMENTAL_GAINS_DB=Object.freeze('+JSON.stringify(gains,null,2)+');\n');
 console.log('Prepared and hash-verified 28 originals and stereo four-bar loops. Intake retained until explicit --empty-intake.');
}
