import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname,basename} from 'node:path';
import {encodePcm16,decodePcm16,pcmStatistics} from '../tools/audio/source-loop.mjs';

const builder = () => import('../tools/audio/adjacent-stems.mjs');
const stereo = (frames = 235220) => ({sampleRate:44100, channels:[new Float32Array(frames),new Float32Array(frames)]});

// Catches dropping the first tail, moving the second onset, or swapping stereo channels.
test('adjacent stems preserve the common boundary', async () => {
  const {assembleAdjacentStems} = await builder();
  for (const role of ['bass','drums','lead']) {
    const first=stereo(),second=stereo();
    first.channels[0][235200]=.25; first.channels[1][235200]=-.125;
    second.channels[0][0]=.5; second.channels[1][0]=.25;
    second.channels[0][235201]=.125;
    const result=assembleAdjacentStems(first,second,{sampleRate:44100,firstTrimFrames:0,secondTrimFrames:0});
    assert.equal(result.frames,470400,role);
    assert.equal(result.seamFrame,235200,role);
    assert.equal(result.channels[0][235200],.75,role);
    assert.equal(result.channels[1][235200],.125,role);
    assert.equal(result.channels[0][1],.125,'second decay wraps to the start of the next four-bar cycle');
    assert.ok(result.tailPolicy);
  }
});

// Catches silently squeezing an unbounded phrase into the fixed two-bar source slot.
test('active oversized fragment rejected', async () => {
  const {assembleAdjacentStems}=await builder();
  const active=stereo(470400); active.channels.forEach(c=>c.fill(.2));
  assert.throws(()=>assembleAdjacentStems(active,stereo(),{sampleRate:44100,firstTrimFrames:0,secondTrimFrames:0}),/length|oversized|tail/i);
});

test('unknown prefix and active trimming rejected', async () => {
  const {assembleAdjacentStems}=await builder();
  assert.throws(()=>assembleAdjacentStems(stereo(),stereo(),{sampleRate:44100}),/trim|prefix/i);
  const active=stereo();active.channels[1][0]=.1;
  assert.throws(()=>assembleAdjacentStems(active,stereo(),{sampleRate:44100,firstTrimFrames:5,secondTrimFrames:0}),/active|prefix/i);
});

test('invalid stereo PCM rejected', async () => {
  const {assembleAdjacentStems}=await builder();
  const invalid=stereo();invalid.channels[0][50]=NaN;
  assert.throws(()=>assembleAdjacentStems(invalid,stereo(),{sampleRate:44100,firstTrimFrames:0,secondTrimFrames:0}),/PCM|finite/i);
});

test('one-bar source repeats on exact bar boundaries with decay overlap', async () => {
  const {repeatOneBarStem}=await builder();
  const source=stereo(117610);source.channels[0][0]=.5;source.channels[1][0]=-.25;
  source.channels[0][117600]=.125;
  const before=source.channels.map(c=>c.slice());
  const result=repeatOneBarStem(source);
  assert.equal(result.channels[0].length,235210);
  assert.equal(result.channels[0][0],.5);
  assert.equal(result.channels[0][117600],.625);
  assert.equal(result.channels[1][117600],-.25);
  assert.equal(result.channels[0][235200],.125);
  assert.deepEqual(source.channels,before,'original PCM is immutable');
});

test('lead loop preserves long quiet decay and rejects active oversized phrases', async () => {
  const {prepareLeadLoop}=await builder();
  const source=stereo(500000);source.channels[0][100]=.5;source.channels[0][480000]=.001;
  const loop=prepareLeadLoop(source,{trimFrames:0});
  assert.equal(loop.channels[0][9600],.0010000000474974513);
  const active=stereo(500000);active.channels.forEach(c=>c.fill(.2));
  assert.throws(()=>prepareLeadLoop(active,{trimFrames:0}),/active.*four|four.*active/i);
});

test('tonal compatibility is measured and rejects diffuse chroma', async () => {
  const {tonalCompatibility}=await import('../tools/prepare-abstract-audio.mjs');
  const pitched=notes=>notes.map(note=>({note,share:1/notes.length}));
  const result=tonalCompatibility(pitched(['C#','E','G#']),pitched(['C#','E','F#','G#','B']));
  assert.ok(result.compatible);
  assert.notEqual(result.scale,'A minor');
  const diffuse=pitched(['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']);
  assert.equal(tonalCompatibility(diffuse,diffuse).compatible,false);
});

test('broad-texture compatibility requires coverage, a concentrated bass, and high similarity', async () => {
  const {experimentalCompatibility:tonalCompatibility}=await import('../tools/prepare-abstract-audio.mjs');
  const texture=[['E',.1769],['A',.17182],['B',.12785],['F',.09572],['C',.09403],['A#',.09138],['C#',.06383],['F#',.0544],['D',.0397],['G#',.03666],['D#',.02793],['G',.01979]].map(([note,share])=>({note,share}));
  const bass=[{note:'A',share:.5},{note:'E',share:.4},{note:'B',share:.1}];
  const result=tonalCompatibility(texture,bass);
  assert.equal(result.compatible,true);
  assert.equal(result.criterion,'broad-texture');
  assert.equal(result.firstCoverage,.72581);
  assert.match(result.confidence,/low.*pending listening/i);
  assert.equal(tonalCompatibility(texture,[{note:'C#',share:1}]).compatible,false,'incompatible bass rejected');
  const noise=Array.from({length:12},(_,i)=>({note:['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][i],share:1/12}));
  assert.equal(tonalCompatibility(noise,bass).compatible,false,'uniform chromatic noise rejected');
});

test('full-source tonal evidence includes later active windows with energy weighting', async () => {
  const {fullSourceTonalEvidence}=await import('../tools/prepare-abstract-audio.mjs');
  const pcm=stereo(470400);
  for(let i=0;i<470400;i++)for(const c of pcm.channels)c[i]=(i<235200?.1:.2)*Math.sin(2*Math.PI*(i<235200?110:138.591315)*i/44100);
  const result=fullSourceTonalEvidence(pcm);
  assert.ok(result.windows.length>=2);
  assert.equal(result.windows.at(-1).endFrame,470400);
  assert.ok(result.pitchClassEnergy.find(p=>p.note==='C#').share>.75,'later louder C# cannot disappear behind first-window A');
  assert.ok(result.pitchClassEnergy.find(p=>p.note==='A').share>.15);
  const laterWeight=result.windows.slice(1).reduce((sum,w)=>sum+w.energyWeight,0);
  assert.ok(laterWeight>.79&&laterWeight<.81);
  assert.equal(result.activeWindowCoverage,1);
});

test('tonal analysis covers active samples at FFT partition edges', async () => {
  const {fullSourceTonalEvidence}=await import('../tools/prepare-abstract-audio.mjs');
  const pcm=stereo(235200);
  for(let i=230000;i<235200;i++)for(const c of pcm.channels)c[i]=.2*Math.sin(2*Math.PI*138.591315*i/44100);
  const result=fullSourceTonalEvidence(pcm);
  assert.ok(result.pitchClassEnergy.find(p=>p.note==='C#').share>.9);
  assert.equal(result.activeWindowCoverage,1);
  const transient=stereo(470400);transient.channels[0][229350]=.2;
  const edge=fullSourceTonalEvidence(transient);
  assert.equal(edge.activeWindowCoverage,1,'one activity bin crossing a partition does not make the silent neighbor a tonal source');
  assert.ok(edge.pitchClassEnergy.every(p=>Number.isFinite(p.share)));
});

// Exercises real files and FFmpeg, catching unstable output bytes and silent take selection.
test('preparation rerun preserves hashes and silent takes excluded', async () => {
  const {prepareAbstractAudio}=await import('../tools/prepare-abstract-audio.mjs');
  await mkdir(resolve('artifacts/test-temp'),{recursive:true});
  const root=await mkdtemp(resolve('artifacts/test-temp/abstract-preparation-'));
  const sources=[];
  const hash=b=>createHash('sha256').update(b).digest('hex');
  async function source(role,family,index,pcm,name) {
    const bytes=encodePcm16(pcm),destination=resolve(root,'stems/source-library',name);
    await mkdir(dirname(destination),{recursive:true});await writeFile(destination,bytes);
    sources.push({source:destination,destination,role,family,index,bytes:bytes.length,sha256:hash(bytes)});
  }
  const tone=stereo(235210);
  for(let i=0;i<235200;i++){tone.channels[0][i]=.1*Math.sin(2*Math.PI*110*i/44100);tone.channels[1][i]=.05*Math.sin(2*Math.PI*110*i/44100);}
  for(let index=1;index<=2;index++)for(const role of ['bass','drums','lead'])await source(role,'Track 01',index,tone,`${role}-${index}.wav`);
  await source('voice-danya',null,null,tone,'Даниил - REC.wav');
  await source('voice-kapa',null,null,tone,'Капа - REC.wav');
  await source('voice-kapa',null,null,stereo(),'Капа - REC_9.wav');
  const manifestPath=resolve(root,'intake.json');
  await writeFile(manifestPath,JSON.stringify({version:1,batch:'abstract-20261020-v1',libraryRoot:resolve(root,'stems/source-library'),sources}));
  const options={manifestPath,workspaceRoot:root,ffmpegPath:process.env.FFMPEG_PATH||'H:/Codex Dist/FFmpeg/8.1.1/bin/ffmpeg.exe'};
  const first=await prepareAbstractAudio(options),second=await prepareAbstractAudio(options);
  assert.deepEqual(second.outputHashes,first.outputHashes);
  const kapa=JSON.parse(await readFile(resolve(root,'assets/audio/ft/npc-kapa-v2/manifest.json')));
  assert.equal(kapa.parts.filter(p=>p.usable).length,1);
  assert.equal(kapa.parts.find(p=>!p.usable).sourceGainDb,0,'silent calibration remains finite');
  assert.equal(kapa.parts.find(p=>!p.usable).phraseSpans.length,0);
  for(const s of sources)assert.equal(hash(await readFile(s.source)),s.sha256);
});

test('prepared real catalogs contain 43 paired recipes and 13 verified compatible leads', async () => {
  const read=async name=>JSON.parse(await readFile(new URL(`../assets/audio/ft/${name}/manifest.json`,import.meta.url)));
  const abstract=await read('abstract-v1'),leads=await read('experimental-leads-v1');
  assert.equal(abstract.recipes.length,43);
  assert.equal(abstract.parts.length,129);
  assert.deepEqual(abstract.families.map(f=>f.count),[8,10,6,19]);
  const parts=new Map(abstract.parts.map(p=>[p.id,p]));
  for(const recipe of abstract.recipes) {
    assert.equal(recipe.indices[1],recipe.indices[0]+1);
    for(const ref of ['drumsId','themeId','arrangementId']) {
      const part=parts.get(recipe[ref]);assert.ok(part,ref);
      assert.equal(part.family,recipe.family);assert.deepEqual(part.indices,recipe.indices);
      assert.equal(part.frames,470400);assert.equal(part.seamFrame,235200);
      assert.equal(part.key,null,'do not fabricate an identified key');
    }
  }
  const last=abstract.parts.filter(p=>p.family==='Track 04'&&p.indices[1]===20);
  assert.equal(last.length,3);
  for(const part of last){assert.equal(part.sources[1].sourceBars,1);assert.equal(part.sources[1].repetitions,2);}
  assert.equal(leads.parts.length,13);assert.equal(leads.recipes.length,13);
  const old=await read('user-experimental-v1'),oldById=new Map(old.parts.map(p=>[p.id,p]));
  for(const part of leads.parts) {
    const recipe=leads.recipes.find(r=>r.themeId===part.id);
    assert.equal(recipe?.verified,true);
    assert.equal(oldById.get(recipe.drumsId)?.kind,'drums');
    assert.equal(oldById.get(recipe.arrangementId)?.kind,'arrangement');
    const tonal=recipe.verification.tonal;
    assert.equal(part.tonalAnalysis.activeWindowCoverage,1);
    assert.equal(part.tonalAnalysis.sourceFrames,part.sourceFrames);
    assert.equal(recipe.verification.bassTonalAnalysis.sourceFrames,470400);
    assert.equal(recipe.verification.bassTonalAnalysis.activeWindowCoverage,1);
    const weight=part.tonalAnalysis.windows.reduce((sum,w)=>sum+w.energyWeight,0);
    assert.ok(Math.abs(weight-1)<.00002);
    if(part.evidence.activeEndSeconds>229376/44100)assert.ok(part.tonalAnalysis.windows.some(w=>w.startFrame>0));
    if(part.id==='experimental-lead-20261020-01') {
      assert.equal(tonal.criterion,'broad-texture');
      assert.ok(tonal.firstCoverage>=.7&&tonal.secondCoverage>=.95&&tonal.cosine>=.7);
    } else {
      assert.equal(tonal.criterion,'strict-common-scale');
      assert.ok(tonal.firstCoverage>=.8&&tonal.secondCoverage>=.8&&tonal.cosine>=.1);
    }
    assert.equal(part.key,null);
  }
  for(const part of [...abstract.parts,...leads.parts]) {
    const pcm=decodePcm16(await readFile(new URL('../'+part.path.replace(/^\.\//,''),import.meta.url)));
    assert.equal(pcm.channels.length,2);assert.equal(pcm.channels[0].length,470400);
    const stats=pcmStatistics(pcm.channels);assert.ok(Number.isFinite(stats.rms)&&stats.rms>0);
    assert.ok(stats.peak<=.9001);
    for(const key of ['gainDb','buildGainDb','targetLufs'])assert.ok(Number.isFinite(part.calibration[key]));
    for(const measure of ['derived','after'])for(const key of ['lufs','truePeak','lra'])assert.ok(Number.isFinite(part.calibration[measure][key]));
    assert.ok(part.calibration.after.truePeak<=-9.99);
  }
});

test('silent takes excluded from real Daniel and refreshed Kapa catalogs', async () => {
  const read=async name=>JSON.parse(await readFile(new URL(`../assets/audio/ft/${name}/manifest.json`,import.meta.url)));
  const daniel=await read('npc-daniel-v1'),kapa=await read('npc-kapa-v2');
  assert.equal(daniel.parts.length,51);assert.equal(daniel.parts.filter(p=>p.usable).length,51);
  assert.equal(kapa.parts.length,50);assert.equal(kapa.parts.filter(p=>p.usable).length,48);
  assert.deepEqual(kapa.parts.filter(p=>!p.usable).map(p=>basename(p.source)).sort(),['Капа - REC_9.wav','Капа - Track 1.wav']);
  for(const [i,part] of kapa.parts.entries())assert.equal(part.id,`npc-kapa-v2-${String(i+1).padStart(2,'0')}`);
  for(const part of [...daniel.parts,...kapa.parts]){
    assert.ok(Number.isFinite(part.sourceGainDb));
    assert.equal(part.sha256,part.sourceHash,'full archived voice take referenced unchanged');
    assert.equal(part.path,'./'+part.source);
    assert.equal(part.voiceId,part.id.startsWith('npc-kapa')?'npc-voice:kapa-20261018':'npc-voice:daniel-20261020');
  }
});
