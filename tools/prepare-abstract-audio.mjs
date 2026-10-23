import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,relative,dirname,isAbsolute,basename} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {decodeAudio,signalEvidence,measureLoudness} from './audio/experimental-analysis.mjs';
import {decodePcm16,encodePcm16,pcmStatistics} from './audio/source-loop.mjs';
import {assembleAdjacentStems,repeatOneBarStem,prepareLeadLoop} from './audio/adjacent-stems.mjs';
import {measuredPhraseSpans,writeOwned} from './prepare-gans-kapa-local.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const round=n=>Number(n.toFixed(5));
const json=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');
const notes=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const targetLufs={drums:-30,theme:-27,arrangement:-28.5};
const within=(root,path)=>{const r=relative(root,path);return r!==''&&!r.startsWith('..')&&!isAbsolute(r);};

// Compatibility is a measured scale-coverage hypothesis, never an authoritative
// key detector. Distorted partials and chromatic notes remain in the evidence.
export function tonalCompatibility(first,second) {
  const vector=rows=>notes.map(note=>rows.find(r=>r.note===note)?.share??0);
  const a=vector(first),b=vector(second);
  const norm=v=>Math.sqrt(v.reduce((s,x)=>s+x*x,0));
  const cosine=a.reduce((s,x,i)=>s+x*b[i],0)/(norm(a)*norm(b)||1);
  const candidates=[];
  for(let tonic=0;tonic<12;tonic++)for(const [mode,intervals] of [['major',[0,2,4,5,7,9,11]],['minor',[0,2,3,5,7,8,10]]]) {
    const scale=intervals.map(i=>(tonic+i)%12);
    const firstCoverage=scale.reduce((s,i)=>s+a[i],0),secondCoverage=scale.reduce((s,i)=>s+b[i],0);
    candidates.push({scale:`${notes[tonic]} ${mode}`,firstCoverage:round(firstCoverage),secondCoverage:round(secondCoverage),score:Math.min(firstCoverage,secondCoverage)});
  }
  candidates.sort((a,b)=>b.score-a.score||a.scale.localeCompare(b.scale));
  const best=candidates[0];
  return {compatible:best.firstCoverage>=.8&&best.secondCoverage>=.8&&cosine>=.1,scale:best.scale,firstCoverage:best.firstCoverage,secondCoverage:best.secondCoverage,cosine:round(cosine),confidence:'spectral scale compatibility only; no listening or authoritative key detection',criterion:'Both sources >=80% extracted chroma energy in one common major/natural-minor scale and chroma cosine >=0.10'};
}

export function experimentalCompatibility(lead,bass) {
  const measured=tonalCompatibility(lead,bass),strict=measured.compatible;
  const broad=!strict&&measured.firstCoverage>=.70&&measured.secondCoverage>=.95&&measured.cosine>=.70;
  return {...measured,compatible:strict||broad,criterion:strict?'strict-common-scale':broad?'broad-texture':'rejected',
    thresholds:strict?{leadCoverage:.8,bassCoverage:.8,cosine:.1}:{leadCoverage:.70,bassCoverage:.95,cosine:.70},
    confidence:broad?'low; plausible detuned experimental texture pairing pending listening, not a proven harmonic match':measured.confidence};
}

export function fullSourceTonalEvidence(pcm) {
  // 229376 = 16384 + 26*8192: exactly covered by the legacy analyser's
  // FFT size/hop, unlike 235200, whose last 5824 frames would be missed.
  const length=pcm.channels[0].length,hop=Math.round(pcm.sampleRate*.01),span=229376,activity=[];
  pcmStatistics(pcm.channels);
  for(let i=0;i<length;i+=hop)activity.push(pcmStatistics(pcm.channels.map(c=>c.subarray(i,i+hop))).rms);
  const threshold=Math.max(...activity)*.05,windows=[],total=new Float64Array(12);
  const activeWindows=new Set(activity.flatMap((rms,i)=>rms>threshold?[i]:[])),coveredActiveWindows=new Set();
  let totalEnergy=0;
  for(let start=0;start<length;start+=span) {
    const end=Math.min(start+span,length),first=Math.floor(start/hop),last=Math.ceil(end/hop);
    const active=Array.from({length:last-first},(_,i)=>first+i).filter(i=>activeWindows.has(i));
    if(!active.length)continue;
    const channels=pcm.channels.map(c=>c.subarray(start,end)),stats=pcmStatistics(channels),energy=stats.rms**2*(end-start);
    if(!energy)continue; // Activity bins may straddle a completely silent neighbor.
    // Zero padding only supplies FFT resolution for a short final source window;
    // it never enters the runtime audio or the measured source energy.
    const fftFrames=Math.max(16384,16384+Math.ceil((end-start-16384)/8192)*8192);
    const padded=channels.map(c=>c.length===fftFrames?c:Float32Array.from({length:fftFrames},(_,i)=>c[i]??0));
    const signal=signalEvidence({sampleRate:pcm.sampleRate,channels:padded});
    const chroma=signal.pitchClassEnergy;
    if(chroma.some(p=>!Number.isFinite(p.share)))throw Error('No finite chroma for active source window');
    for(const p of chroma)total[notes.indexOf(p.note)]+=p.share*energy;
    totalEnergy+=energy;for(const i of active)coveredActiveWindows.add(i);
    windows.push({startFrame:start,endFrame:end,fftFrames,active10msWindows:active.length,energy,energyWeight:0,pitchClassEnergy:chroma});
  }
  if(!totalEnergy||!activeWindows.size)throw Error('No active tonal source windows');
  for(const w of windows)w.energyWeight=round(w.energy/totalEnergy);
  return {method:'Full source partitioned into <=229376-frame windows exactly covered by 16384-point FFTs at 8192-frame hops; include every partition touching a 10ms RMS window >5% source maximum. Aggregate normalized FFT-peak chroma weighted by unrounded stereo squared-sample energy. Final FFT partition zero-padded to hop grid for analysis only.',activityThresholdRms:round(threshold),sourceFrames:length,coveredActive10msWindows:coveredActiveWindows.size,totalActive10msWindows:activeWindows.size,activeWindowCoverage:coveredActiveWindows.size/activeWindows.size,windows,pitchClassEnergy:notes.map((note,i)=>({note,share:round(total[i]/totalEnergy)})).sort((a,b)=>b.share-a.share)};
}

function firstSignal(pcm) {
  for(let i=0;i<pcm.channels[0].length;i++)if(pcm.channels.some(c=>Math.abs(c[i])>.0001))return i;
  throw Error('Silent instrumental source');
}
function measuredPrefix(pcms) {
  // A long intentional rest cannot move the grid: only common <=40ms quiet
  // padding is eligible, retaining 2ms before the earliest signal in the set.
  const earliest=Math.min(...pcms.map(firstSignal));
  if(earliest>Math.round(pcms[0].sampleRate*.04))throw Error(`Unknown musical start: first signal ${earliest}; no confirmed encoder prefix`);
  return Math.max(0,earliest-Math.round(pcms[0].sampleRate*.002));
}
function evidence(pcm) {
  // Empty tail regions in the legacy analyser yield NaN; null explicitly means
  // not applicable, while PCM samples and actual coefficients must stay finite.
  const sanitize=value=>typeof value==='number'&&!Number.isFinite(value)?null:Array.isArray(value)?value.map(sanitize):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,sanitize(v)])):value;
  return sanitize(signalEvidence(pcm));
}

export async function prepareAbstractAudio({manifestPath,workspaceRoot,ffmpegPath}={}) {
  const root=resolve(workspaceRoot??fileURLToPath(new URL('../',import.meta.url)));
  const intakePath=resolve(manifestPath??resolve(root,'stems/source-library/batches/abstract-20261020-v1.json'));
  const intakeBytes=await readFile(intakePath),intake=JSON.parse(intakeBytes);
  if(intake.version!==1||intake.batch!=='abstract-20261020-v1'||!Array.isArray(intake.sources))throw Error('Invalid intake manifest');
  if(!within(root,resolve(intake.libraryRoot)))throw Error('Library must be inside workspace');
  const previousFfmpeg=process.env.FFMPEG_PATH;
  if(ffmpegPath)process.env.FFMPEG_PATH=ffmpegPath;
  try {
    const outputs=[],analyses=[],decoded=new Map(),rows=[];
    // Complete source-hash preflight before creating derived output. The intake
    // remains read-only; paths in manifests are portable workspace relatives.
    for(const row of intake.sources) {
      if(!within(resolve(intake.libraryRoot),resolve(row.destination)))throw Error('Source outside library');
      const raw=await readFile(row.destination);
      if(raw.length!==row.bytes||hash(raw)!==row.sha256)throw Error('Source hash changed: '+row.destination);
      rows.push({...row,source:relative(root,row.destination).replaceAll('\\','/')});
    }
    const put=async(path,bytes)=>{await writeOwned(root,path,bytes);outputs.push({path,sha256:hash(bytes),bytes:bytes.length});};
    const load=row=>{
      if(!decoded.has(row.destination)){
        const pcm=decodeAudio(row.destination),signal=evidence(pcm);
        decoded.set(row.destination,{pcm,signal});
        analyses.push({source:row.source,sourceHash:row.sha256,role:row.role,family:row.family,index:row.index,...signal});
      }
      return decoded.get(row.destination);
    };
    async function calibratedPart(pcm,{id,kind,path,...fields}) {
      const stats=pcmStatistics(pcm.channels);
      if(stats.rms<.0001)throw Error('Silent derived instrumental: '+id);
      const buildGainDb=stats.peak>.9?20*Math.log10(.9/stats.peak):0,gain=10**(buildGainDb/20);
      const built={sampleRate:pcm.sampleRate,channels:pcm.channels.map(c=>Float32Array.from(c,s=>s*gain))};
      const bytes=encodePcm16(built);await put(path,bytes);
      const derived=measureLoudness(resolve(root,path)),wanted=targetLufs[kind]-derived.lufs;
      const gainDb=round(Math.min(wanted,-10-derived.truePeak));
      if(!Number.isFinite(gainDb)||gainDb< -40||gainDb>12)throw Error('Calibration outside runtime range: '+id);
      const after=measureLoudness(resolve(root,path),gainDb);
      return {id,kind,name:id,path:'./'+path,sha256:hash(bytes),authorship:'user',sampleRate:44100,channels:2,frames:470400,seconds:32/3,bpm:90,bars:4,playbackBars:4,key:null,...fields,calibration:{buildGainDb:round(buildGainDb),gainDb,targetLufs:targetLufs[kind],derived,after,peakLimited:gainDb<wanted-.01,compression:false}};
    }

    const familyRows=rows.filter(r=>/^Track 0[1-4]$/.test(r.family)),families=[],parts=[],recipes=[],sets=new Map();
    for(const family of [...new Set(familyRows.map(r=>r.family))].sort()) {
      const selected=familyRows.filter(r=>r.family===family),count=Math.max(...selected.map(r=>r.index));
      if(selected.length!==count*3)throw Error('Incomplete family '+family);
      families.push({id:family,count:count-1,sourceSetCount:count});
      for(let index=1;index<=count;index++) {
        const triple=['bass','drums','lead'].map(role=>{
          const found=selected.filter(r=>r.index===index&&r.role===role);
          if(found.length!==1)throw Error('Incomplete/duplicate role '+family+'/'+index+'/'+role);
          return found[0];
        });
        const sources=triple.map(load),trimFrames=measuredPrefix(sources.map(s=>s.pcm));
        const sourceBars=family==='Track 04'&&index===20?1:2;
        for(let i=0;i<triple.length;i++) {
          const {pcm,signal}=sources[i],trimmed={sampleRate:pcm.sampleRate,channels:pcm.channels.map(c=>c.subarray(trimFrames))};
          const normalized=sourceBars===1?repeatOneBarStem(trimmed):trimmed;
          sets.set(`${family}/${index}/${triple[i].role}`,{row:triple[i],pcm:normalized,trimFrames,signal,sourceBars,repetitions:sourceBars===1?2:1});
        }
      }
      for(let index=1;index<count;index++) {
        const token=family.toLowerCase().replace(' ','-')+`-${String(index).padStart(2,'0')}-${String(index+1).padStart(2,'0')}`;
        const recipe={id:'abstract-20261020-'+token,family,indices:[index,index+1]};
        for(const [role,kind,ref] of [['bass','arrangement','arrangementId'],['drums','drums','drumsId'],['lead','theme','themeId']]) {
          const a=sets.get(`${family}/${index}/${role}`),b=sets.get(`${family}/${index+1}/${role}`);
          const assembled=assembleAdjacentStems(a.pcm,b.pcm,{sampleRate:44100,firstTrimFrames:0,secondTrimFrames:0});
          const id=`abstract-20261020-${token}-${kind}`,path=`assets/audio/ft/abstract-v1/${token}-${kind}.wav`;
          parts.push(await calibratedPart(assembled,{id,kind,path,family,indices:[index,index+1],role,seamFrame:235200,sourceHashes:[a.row.sha256,b.row.sha256],sources:[a,b].map(s=>({source:s.row.source,sourceHash:s.row.sha256,trimFrames:s.trimFrames,sourceBars:s.sourceBars,repetitions:s.repetitions,frames:s.signal.frames,evidence:s.signal})),tailPolicy:assembled.tailPolicy+(b.sourceBars===1?' Set 20: one-bar source repeated twice at exact 117600-frame boundaries with decay overlap.':''),tonalEvidence:role==='drums'?{key:null,basis:'Percussion; resonances are not assigned a tonal key.'}:tonalCompatibility(a.signal.pitchClassEnergy,b.signal.pitchClassEnergy)}));
          recipe[ref]=id;
        }
        recipes.push(recipe);
      }
    }
    const abstract={version:1,batch:intake.batch,families,parts,recipes};
    await put('assets/audio/ft/abstract-v1/manifest.json',json(abstract));

    const voiceReports=[];
    for(const [role,name,version,voiceId] of [['voice-danya','daniel',1,'npc-voice:daniel-20261020'],['voice-kapa','kapa',2,'npc-voice:kapa-20261018']]) {
      const selected=rows.filter(r=>r.role===role).sort((a,b)=>basename(a.destination).localeCompare(basename(b.destination),'ru',{numeric:true})),voiceParts=[];
      for(const [i,row] of selected.entries()) {
        // Reference the complete archived PCM WAV. Speech is never fitted to a
        // musical slot or automatically trimmed, even when its take is long.
        const raw=await readFile(row.destination),pcm=decodePcm16(raw),stats=pcmStatistics(pcm.channels),usable=stats.rms>=.0001;
        const id=`npc-${name}${version===2?'-v2':''}-${String(i+1).padStart(2,'0')}`,phraseSpans=usable?measuredPhraseSpans(pcm):[];
        const sourceGainDb=usable?round(Math.min(0,20*Math.log10(.045/stats.rms))):0;
        voiceParts.push({id,voiceId,catalogVersion:version,usable,verified:true,path:'./'+row.source,source:row.source,sourceHash:row.sha256,sha256:row.sha256,bytes:row.bytes,sampleRate:pcm.sampleRate,channels:pcm.channels.length,frames:pcm.channels[0].length,seconds:pcm.channels[0].length/pcm.sampleRate,bpm:90,sourceGainDb,rms:stats.rms,peak:stats.peak,phraseSpans,selectedForDemo:false,initialSkillRange:{min:0,max:40},tailPolicy:'Full original take referenced byte-for-byte; no speech trimming or repetition.',exclusionReason:usable?null:'Measured silent PCM (RMS < 0.0001); original retained.'});
      }
      const voice={version:1,batch:intake.batch,catalogVersion:version,voice:name,voiceId,parts:voiceParts};
      await put(`assets/audio/ft/npc-${name}-v${version}/manifest.json`,json(voice));
      voiceReports.push({voice:name,count:voiceParts.length,usable:voiceParts.filter(p=>p.usable).length});
    }

    const leadParts=[],leadRecipes=[],leadRows=rows.filter(r=>r.family==='experimental').sort((a,b)=>a.index-b.index),candidates=[];
    if(leadRows.length) {
      const existing=JSON.parse(await readFile(resolve(root,'assets/audio/ft/user-experimental-v1/manifest.json')));
      for(const bass of existing.parts.filter(p=>p.kind==='arrangement')) {
        const drums=existing.parts.find(p=>p.kind==='drums'&&p.family===bass.family);
        if(!drums)continue;
        const bassRaw=await readFile(resolve(root,bass.path)),drumsRaw=await readFile(resolve(root,drums.path));
        if(hash(bassRaw)!==bass.sha256||hash(drumsRaw)!==drums.sha256)throw Error('Existing recipe asset hash changed');
        candidates.push({bass,drums,tonalAnalysis:fullSourceTonalEvidence(decodeAudio(resolve(root,bass.path)))});
      }
    }
    for(const row of leadRows) {
      const {pcm,signal}=load(row),trimFrames=measuredPrefix([pcm]),loop=prepareLeadLoop(pcm,{trimFrames}),tonalAnalysis=fullSourceTonalEvidence(pcm);
      const compatible=candidates.map(c=>({...c,tonal:experimentalCompatibility(tonalAnalysis.pitchClassEnergy,c.tonalAnalysis.pitchClassEnergy)})).filter(c=>c.tonal.compatible).sort((a,b)=>b.tonal.cosine-a.tonal.cosine||a.bass.id.localeCompare(b.bass.id));
      if(!compatible.length)throw Error('No measured compatible existing bass/drums recipe: '+row.source);
      const chosen=compatible[0],id=`experimental-lead-20261020-${String(row.index).padStart(2,'0')}`,recipeId=id+'-recipe';
      leadParts.push(await calibratedPart(loop,{id,kind:'theme',path:`assets/audio/ft/experimental-leads-v1/lead-${String(row.index).padStart(2,'0')}.wav`,family:'experimental',source:row.source,sourceHash:row.sha256,sourceFrames:signal.frames,sourceSeconds:signal.seconds,trimFrames,tailFrames:loop.tailFrames,paddedFrames:loop.paddedFrames,tailStats:loop.tailStats,activeThreshold:loop.activeThreshold,tailPolicy:loop.tailPolicy,evidence:signal,tonalAnalysis,tonalEvidence:chosen.tonal,recipeIds:[recipeId]}));
      leadRecipes.push({id:recipeId,drumsId:chosen.drums.id,themeId:id,arrangementId:chosen.bass.id,bpm:90,bars:4,verified:true,verification:{tonal:chosen.tonal,bassTonalAnalysis:chosen.tonalAnalysis,bassSha256:chosen.bass.sha256,drumsSha256:chosen.drums.sha256,subjectiveListening:false}});
    }
    const experimental={version:1,batch:intake.batch,parts:leadParts,recipes:leadRecipes};
    await put('assets/audio/ft/experimental-leads-v1/manifest.json',json(experimental));
    for(const row of rows)if(hash(await readFile(row.destination))!==row.sha256)throw Error('Original changed during preparation');
    const report={version:1,batch:intake.batch,intakeManifestSha256:hash(intakeBytes),verifiedOriginals:rows.length,abstract:{parts:parts.length,recipes:recipes.length,families},voices:voiceReports,experimental:{parts:leadParts.length,recipes:leadRecipes.length},outputHashes:outputs,sourceAnalysis:analyses};
    await mkdir(resolve(root,'artifacts/abstract-20261020'),{recursive:true});
    await writeFile(resolve(root,'artifacts/abstract-20261020/preparation-report.json'),json(report));
    await writeFile(resolve(root,'artifacts/abstract-20261020/hashes.json'),json({sources:rows.map(({source,sha256})=>({path:source,sha256})),outputs}));
    return report;
  } finally {if(previousFfmpeg===undefined)delete process.env.FFMPEG_PATH;else process.env.FFMPEG_PATH=previousFfmpeg;}
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const root=fileURLToPath(new URL('../',import.meta.url));
  const report=await prepareAbstractAudio({workspaceRoot:root,ffmpegPath:process.env.FFMPEG_PATH??'H:/Codex Dist/FFmpeg/8.1.1/bin/ffmpeg.exe'});
  console.log(JSON.stringify({abstract:report.abstract,voices:report.voices,experimental:report.experimental,outputs:report.outputHashes.length}));
}
