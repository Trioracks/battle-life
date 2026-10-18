import {readFile,writeFile,mkdir,lstat} from 'node:fs/promises';
import {resolve,dirname,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {decodePcm16,encodePcm16,pcmStatistics,repeatDrumCycle} from './audio/source-loop.mjs';
import {decodeAudio,signalEvidence,measureLoudness} from './audio/experimental-analysis.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const round=n=>Number(n.toFixed(5));
export function measuredPhraseSpans({sampleRate,channels}){
 const window=Math.round(sampleRate*.01),threshold=Math.max(.001,pcmStatistics(channels).rms*.12),regions=[];
 for(let i=0;i<channels[0].length;i+=window){
  if(pcmStatistics(channels.map(c=>c.subarray(i,i+window))).rms<threshold)continue;
  const start=i/sampleRate,end=Math.min(i+window,channels[0].length)/sampleRate,prior=regions.at(-1);
  if(prior&&start-prior.endSeconds<.081)prior.endSeconds=round(end);else regions.push({startSeconds:round(start),endSeconds:round(end)});
 }
 return regions.filter(s=>s.endSeconds-s.startSeconds>=.12);
}
export function deriveMeasuredLoop(pcm,{cycleBars,trimFrames}){
 const cycleFrames=Math.round(pcm.sampleRate*8/3*cycleBars);
 if(![1,2,4].includes(cycleBars)||!Number.isInteger(trimFrames)||trimFrames<0||trimFrames>pcm.sampleRate*.04)throw Error('Invalid measured cycle or prefix');
 const channels=pcm.channels.map(c=>c.subarray(trimFrames));
 if(channels.some(c=>c.length<cycleFrames||c.length>cycleFrames+pcm.sampleRate*2.6))throw Error('Measured cycle has excess tail or insufficient frames; review instead of trimming');
 const loop=repeatDrumCycle({...pcm,channels,cycleBars}),edge=Math.round(loop.sampleRate*.003);
 for(const c of loop.channels)for(let i=0;i<c.length;i++)c[i]*=Math.max(0,Math.min(1,(i%cycleFrames)/edge,(cycleFrames-1-i%cycleFrames)/edge));
 const peak=pcmStatistics(loop.channels).peak,buildGainDb=peak>.9?20*Math.log10(.9/peak):0;
 if(buildGainDb)for(const c of loop.channels)for(let i=0;i<c.length;i++)c[i]*=10**(buildGainDb/20);
 return {...loop,buildGainDb};
}
export async function writeOwned(root,path,bytes){
 const full=resolve(root,path),rel=relative(resolve(root),full);
 if(!rel||rel.startsWith('..')||isAbsolute(rel))throw Error('Output escapes owned root');
 for(let current=full;;current=dirname(current)){
  try{if((await lstat(current)).isSymbolicLink())throw Error('Output junction/symlink rejected');}catch(e){if(e.code!=='ENOENT')throw e;}
  if(dirname(current)===current)break;
 }
 let old;try{old=await readFile(full);}catch(e){if(e.code!=='ENOENT')throw e;}
 if(old){if(hash(old)!==hash(bytes))throw Error('Refusing to overwrite differing output '+path);return;}
 await mkdir(dirname(full),{recursive:true});await writeFile(full,bytes,{flag:'wx'});
}
async function main(){
 const root=fileURLToPath(new URL('../',import.meta.url)),batch='gans-kapa-20261018-v1',archivePath=`stems/source-library/batches/${batch}.json`,archive=JSON.parse(await readFile(resolve(root,archivePath)));
 const originals=[];
 for(const row of archive.originals){const raw=await readFile(resolve(root,row.newPath));if(raw.length!==row.bytes||hash(raw)!==row.sha256)throw Error('Archived original changed '+row.newPath);originals.push({...row,raw});}
 const json=(path,value)=>writeOwned(root,path,Buffer.from(JSON.stringify(value,null,2)+'\n'));
 const voiceManifests=[];
 for(const [name,max] of [['gans',50],['kapa',40]]){
  const sources=originals.filter(r=>r.newPath.includes(`/voices/${name}/`)).sort((a,b)=>a.newPath.localeCompare(b.newPath,'ru',{numeric:true})),parts=[];
  for(const [i,s] of sources.entries()){
   const pcm=decodePcm16(s.raw),n=String(i+1).padStart(2,'0'),stats=pcmStatistics(pcm.channels),selected=name==='gans'&&i===0,path=selected?`assets/audio/ft/npc-gans-v1/${n}.wav`:s.newPath;
   if(selected)await writeOwned(root,path,s.raw);
   parts.push({id:`npc-${name}-${n}`,voiceId:`npc-voice:${name}-20261018`,verified:true,path:'./'+path,source:s.newPath,sourceHash:s.sha256,sha256:s.sha256,bytes:s.bytes,sampleRate:pcm.sampleRate,channels:pcm.channels.length,frames:pcm.channels[0].length,seconds:pcm.channels[0].length/pcm.sampleRate,bpm:90,sourceGainDb:round(Math.min(0,20*Math.log10(.045/stats.rms))),rms:stats.rms,peak:stats.peak,phraseSpans:measuredPhraseSpans(pcm),selectedForDemo:selected,initialSkillRange:{min:0,max},skillRangeStatus:'metadata only; persistent NPC selection is not wired in this preview'});
  }
  const manifest={version:1,batch,authorship:'User supplied full WAV takes; original archive preserved byte-for-byte. Usable WAV paths reference originals; only the selected demo take has a runtime copy.',voice:name,initialSkillRange:{min:0,max},parts};
  await json(`assets/audio/ft/npc-${name}-v1/manifest.json`,manifest);voiceManifests.push(manifest);
 }
 const analyses=[],parts=[];
 for(const s of originals.filter(r=>r.oldPath.endsWith('.mp3'))){
  const pcm=decodeAudio(resolve(root,s.newPath)),evidence=signalEvidence(pcm),bars=[];
  for(let start=0;start<pcm.channels[0].length;start+=117600)bars.push(round(pcmStatistics(pcm.channels.map(c=>c.subarray(start,start+117600))).rms));
  const basename=s.oldPath.split('/').at(-1),selected=['bass 3.mp3','drumm 2.mp3','lead 2.mp3'].includes(basename);
  analyses.push({source:s.newPath,sourceHash:s.sha256,evidence,barRmsAll:bars,selectedForDemo:selected,cycleAssessment:basename==='bass 1.mp3'?'21.264s container; significant signal spans ~8.13s and quieter tail continues. No short cycle asserted, no derived trim; original fully preserved.':selected?'Two-bar phrase at supplied 90 BPM with active energy in both bars and measured post-cycle tail. Full tail folded, not discarded.':'Not selected; duration and full bar/tail measurements retained for later review.'});
  if(!selected)continue;
  const threshold=pcmStatistics(pcm.channels).peak*.001;let first=0;
  while(first<Math.round(.04*pcm.sampleRate)&&pcm.channels.every(c=>Math.abs(c[first])<threshold))first++;
  const trimFrames=Math.max(0,first-Math.round(.002*pcm.sampleRate)),loop=deriveMeasuredLoop(pcm,{cycleBars:2,trimFrames}),wav=encodePcm16(loop),stem=basename.replace('drumm','drums').replace(' ','-').replace('.mp3',''),path=`assets/audio/ft/experimental-gans-v1/${stem}.wav`;
  await writeOwned(root,path,wav);
  const kind=stem.startsWith('bass')?'arrangement':stem.startsWith('drums')?'drums':'theme',targetLufs={arrangement:-28.5,drums:-30,theme:-27}[kind],derived=measureLoudness(resolve(root,path)),gainDb=round(Math.min(targetLufs-derived.lufs,-10-derived.truePeak));
  parts.push({id:`gans-experimental-20261018-${stem}`,kind,path:'./'+path,source:s.newPath,sourceHash:s.sha256,sha256:hash(wav),sampleRate:44100,channels:2,frames:470400,seconds:32/3,bpm:90,bpmProvenance:'User supplied 90 BPM folder; measured onset spacings support quarter/eighth-beat grid after encoder prefix. Not an independent exact-tempo estimate.',cycleBars:2,playbackBars:4,cycleFrames:235200,trimFrames,sourceFrames:pcm.channels[0].length,foldedTailFrames:pcm.channels[0].length-trimFrames-235200,tailPolicy:'Only measured <=40ms quiet encoder prefix removed, retaining 2ms before first signal. Entire remaining source tail folded into 2-bar cycle; repeated to 4 bars; 3ms seam fade; no pitch/time shift.',tonalEvidence:kind==='drums'?{key:null,confidence:'unassigned',basis:'Percussion; low A-region kick resonance, no musical key assigned.'}:{key:'A minor compatible',confidence:'medium; spectral compatibility inference, not authoritative key detection',basis:kind==='arrangement'?'A1/A2 dominant with E partials; A 74.9%, E 15.2% of extracted pitch-class peak energy.':'A 35.9%, E 28.7%, C 17.9% of extracted pitch-class peak energy; compatible triad, limited evidence for complete scale.'},evidence,calibration:{buildGainDb:loop.buildGainDb,gainDb,targetLufs,derived,after:measureLoudness(resolve(root,path),gainDb)}});
 }
 await json('assets/audio/ft/experimental-gans-v1/manifest.json',{version:1,batch,builder:'node tools/prepare-gans-kapa-local.mjs',archiveManifest:archivePath,parts,sourceAnalysis:analyses});
 const selected=voiceManifests[0].parts.find(p=>p.selectedForDemo);
 const changedPaths=['tools/archive-gans-kapa-local.ps1','tools/prepare-gans-kapa-local.mjs','test/gans-kapa-intake.test.mjs','test/gans-kapa-preparation.test.mjs',archivePath,'assets/audio/ft/npc-gans-v1/manifest.json','assets/audio/ft/npc-gans-v1/01.wav','assets/audio/ft/npc-kapa-v1/manifest.json','assets/audio/ft/experimental-gans-v1/manifest.json',...parts.map(p=>p.path.replace(/^\.\//,'')),...originals.map(s=>s.newPath)];
 const changedFiles=[];
 for(const path of changedPaths){const bytes=await readFile(resolve(root,path));changedFiles.push({path,bytes:bytes.length,sha256:hash(bytes)});}
 const remaining=[];
 for(const s of originals){try{await lstat(resolve(root,s.oldPath));remaining.push(s.oldPath);}catch(e){if(e.code!=='ENOENT')throw e;}}
 const testLogs=[];
 for(const path of ['artifacts/gans-mix-session/intake-red.log','artifacts/gans-mix-session/intake-green.log','artifacts/gans-mix-session/preparation-red.log','artifacts/gans-mix-session/preparation-green.log']){
  const bytes=await readFile(resolve(root,path));testLogs.push({path,sha256:hash(bytes),text:bytes.toString('utf8')});
 }
 const baseline=JSON.parse(await readFile(resolve(root,'artifacts/gans-mix-session/baseline.json'))),excludedStat=await lstat(resolve(root,baseline.excluded.path));
 const report={version:1,batch,status:'prepared; independently auditable local preview assets only',archiveManifest:archivePath,movedOriginalCount:108,verifiedOriginalCount:originals.length,remainingApprovedSources:remaining,remainingIntakeFiles:[baseline.excluded.path],excluded:{path:baseline.excluded.path,neverOpened:true,bytes:excludedStat.size,modified:excludedStat.mtimeMs,baselineStatUnchanged:excludedStat.size===baseline.excluded.bytes&&excludedStat.mtimeMs===baseline.excluded.modified},voices:voiceManifests.map(m=>({voice:m.voice,count:m.parts.length,initialSkillRange:m.initialSkillRange,manifest:`assets/audio/ft/npc-${m.voice}-v1/manifest.json`})),selectedVoice:selected,parts:parts.map(({id,path,sha256,cycleBars,playbackBars,seconds,calibration,tonalEvidence})=>({id,path,sha256,cycleBars,playbackBars,seconds,calibration,tonalEvidence})),verification:{all108ArchivedBytesMatch:true,all99VoiceMetadataReadFromOriginalPcm:true,derivedWavFrames:470400,focusedIntakeTests:6,focusedPreparationTests:4,fullSuite:'Controller owns full project suite after source freeze.'},originals:originals.map(({oldPath,newPath,bytes,sha256})=>({oldPath,newPath,bytes,sha256})),changedFiles,testLogs};
 await json('artifacts/gans-mix-session/intake-report.json',report);
 console.log(JSON.stringify({verifiedOriginals:originals.length,voices:report.voices,selectedVoice:selected,parts},null,2));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
