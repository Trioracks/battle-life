// Standalone local-only listening page; never reads browser/player storage.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {decodePcm16} from './audio/source-loop.mjs';
import {prepareSourcePcm,encodeSafePcm16,pcmStats} from './audio/beat-skill-ladder.mjs';
import {renderComparison,beatParameters,LEVELS} from './audio/flow-genre-curve.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const pcmSha=channels=>{const hash=createHash('sha256');for(const c of channels)hash.update(Buffer.from(c.buffer,c.byteOffset,c.byteLength));return hash.digest('hex');};
const filename=(kind,level)=>`${kind}-${String(level).padStart(3,'0')}.wav`;
function listeningPage(manifest){
  const sections=[['flow','Флоу: меняется только голос','Бит чистый (битмейкинг и жанр 100). Флоу и опыт жанра равны указанному уровню. Меняются темп внутри фразы без намеренного изменения высоты, вход фраз, ослабление акцентов и концовок.'],['beat','Битмейкинг: меняется только бит','Голос исходный, флоу 100. Битмейкинг и опыт жанра равны указанному уровню. Меняются низ/середина ударных, окраска и строй баса/мелодии, смещение дорожек. Расстройка тона исчезает до уровня 50; оставшиеся окраска и тайминг сходятся к исходнику на 100. Смешивания с параллельной исходной дорожкой нет.']];
  return '<!doctype html><html lang="ru"><meta charset="utf-8"><title>Флоу и битмейкинг · 0–100</title><style>body{font:17px system-ui;max-width:900px;margin:40px auto;padding:0 20px;background:#111923;color:#eee}section{margin:45px 0}article{margin:22px 0}audio{display:block;width:100%}small{color:#afbdcf}a{color:#9bcfff}</style><h1>Флоу, битмейкинг и опыт жанра · 0–100</h1><p>Локальное сравнение на одном бите seed 33 и одном уже обработанном дубле Артёма №47. Эффективный уровень — минимум навыка и опыта жанра. В игре эта обработка не включена.</p><p>Общая шкала дефектов: 0 → 100%, 25 → 50%, 50 → 8%, 80 → 2,5%, 100 → 0%. Доля ошибок входа: 0 — все фразы, 10 и 25 — три из четырёх, 50 — одна из четырёх; на 80 они редкие и могут отсутствовать. Ошибки темпа по-прежнему редкие на 50 и выше. Уровень 100 совпадает с исходным подготовленным миксом.</p>'+sections.map(([kind,title,description])=>`<section><h2>${title}</h2><p>${description}</p>`+LEVELS.map(level=>{const v=manifest.variants.find(v=>v.kind===kind&&v.level===level);const note=kind==='flow'?` · ошибок входа ${v.eventCounts.timing}/${v.eventCounts.eligible}, темпа ${v.eventCounts.speed}/${v.eventCounts.eligible}`:'';return `<article><label>${kind==='flow'?'Флоу':'Битмейкинг'} ${level} · жанр ${level}${note}</label><audio controls preload="none" src="${v.filename}"></audio></article>`;}).join('')+'</section>').join('')+'<section><h2>Чистый эталон</h2><audio controls preload="none" src="dry-reference.wav"></audio></section><p><small>Один общий запас по пикам на все файлы, без индивидуального выравнивания громкости. Разметка фраз по энергии, без распознавания слов/ударений. Реальные сдвиги ограничены паузами: максимум 250 мс, в этом дубле меньше. Rubber Band может вносить небольшие артефакты растяжения. Исходные эффекты записи сохранены. <a href="metadata.json">Параметры, события и SHA256</a>.</small></p></html>';
}

export async function writePreview({recipe,outputDir,verifyOnly=false}) {
  const targets=[...['flow','beat'].flatMap(kind=>LEVELS.map(level=>filename(kind,level))),'dry-reference.wav','metadata.json','index.html'];
  // Check the entire target set before any rendering/writing. Exclusive writes also
  // prevent races. Verification never mkdirs or refreshes annotations.
  if(!verifyOnly){
    for(const name of targets)if(await access(resolve(outputDir,name)).then(()=>true,()=>false))throw new Error('Refusing to overwrite existing preview: '+resolve(outputDir,name));
    await mkdir(outputDir,{recursive:true});
  }
  const rendered=renderComparison(recipe),variants=[];
  for(const v of [...rendered.flow,...rendered.beat,rendered.dryReference]){
    const name=v.kind==='dry'?'dry-reference.wav':filename(v.kind,v.level),bytes=encodeSafePcm16({sampleRate:recipe.sampleRate,channels:v.channels});
    if(verifyOnly)assert.deepEqual(bytes,await readFile(resolve(outputDir,name)),'deterministic WAV: '+name);
    else await writeFile(resolve(outputDir,name),bytes,{flag:'wx'});
    variants.push({filename:name,kind:v.kind,level:v.level,genreXP:v.level,effectiveSkill:v.level,sha256:sha(bytes),vocalSha256:pcmSha(v.vocalChannels),beatSha256:pcmSha(v.beatChannels),unscaledStats:v.unscaledStats,stats:v.stats,
      plan:v.plan,eventCounts:v.plan?{eligible:v.plan.events.length,timing:v.plan.events.filter(e=>e.timingActive).length,speed:v.plan.events.filter(e=>e.speedActive).length}:null,
      beatParameters:v.kind==='beat'?['drums','bass','melody'].map(role=>{const p=beatParameters(role,v.level,v.level);return {...p,appliedOffsetSamples:Math.round(p.offsetSeconds*recipe.sampleRate),appliedOffsetSeconds:Math.round(p.offsetSeconds*recipe.sampleRate)/recipe.sampleRate};}):null});
  }
  const dryReference=variants.pop();
  for(const kind of ['flow','beat'])assert.equal(variants.find(v=>v.kind===kind&&v.level===100).sha256,dryReference.sha256,'100 equals independently assembled clean reference');
  assert.equal(new Set(variants.filter(v=>v.kind==='flow').map(v=>v.beatSha256)).size,1);
  assert.equal(new Set(variants.filter(v=>v.kind==='beat').map(v=>v.vocalSha256)).size,1);
  const manifest={provenance:recipe.provenance??'LOCAL comparison',baselineCommit:'60f5187bdc6f54cf64d62d4d9fcef13bf4b48aa3',reference:recipe.reference??null,referenceSha256:recipe.referenceSha256??null,demoSeed:recipe.demoSeed??33,beatSeed:recipe.beatSeed??null,vocalTakeSeed:recipe.vocalTakeSeed??null,
    sampleRate:rendered.sampleRate,channels:2,frames:rendered.frames,durationSeconds:rendered.durationSeconds,outputGain:rendered.outputGain,sharedGain:rendered.sharedGain,phrases:rendered.phrases,
    curve:'effective=min(skill,genreXP); positive knots (0,1),(25,.5),(50,.08),(80,.025), geometric interpolation; 80..100=.025*((100-effective)/20)^2',
    processing:{oldGameDspApplied:false,playerStorageTouched:false,randomDraws:0,
      vocal:'Prepared original once. Per phrase: continuous Rubber Band tempo commands pitch=1, channels=apart, phase=laminar, transients=smooth, window=long, pitchq=consistency; identical stereo tempo commands/frame mapping with independent channel content. Reversible RMS analysis scaling is undone after stretching. No source-rate change, EQ, detune, mic damage, compressor, doubling or unchanged parallel vocal. Tempo +/-40%*severity, source partition fractions (1-a)/2 and (1+a)/2, then exact-duration pitch-preserving correction if needed. 120ms zero guards protect phrase tails; cropped guards can contain algorithmic ringing. Actual44100Hz late-marker tests verify retained tails. 4ms introduced edge fade scaled by severity.',
      dynamics:'Triangular 20%-phrase accent envelope centered at seeded 28..48%; up to -8dB*severity. Ending ramp over72..92% of phrase then -12dB*severity. Gain only attenuates. Envelope markers are energy-based approximations, not semantic stress.',
      events:'Speed: independent fixed seeded ranks, original density knots0=.9,25=.6,50=.12,80=.04,100=0. Timing: eligible movable phrases ranked by fixed seeded timingRank; round(N*fraction), min1 at effective<=50 for nonempty eligible set; fraction linearly interpolates0=1,10=.75,25=.75,50=.25,80=.04,100=0. Nested selections, unchanged source order/signs. Desired absolute offsets=(.5+.5*abs(seeded signed rank))*.25*severity, sign selected once against available pauses; clamp to half adjacent pause, no overlapping speech. Immovable phrases not labeled timing errors; no padded-silence events.',
      beat:'Single processed path, no dry/wet blend or gain rescue. Gain EQ uses v1 strength=severity. HP/LP RBJ normalized numerators approach identity: b=identityNumerator+filterDepth*(fullNumerator-identityNumerator), identityNumerator=(1,a1,a2), filterDepth=min(1,severity/.5); denominator unchanged. Intended detune=(bass+380,melody-460)*severity^1.5*clamp((severity-.08)/.42,0,1)^2 cents. Actual detune is0 when abs(intended)<=.1cent; otherwise intended. Tuning is absent50+, tiny deadband before50 avoids near-zero RubberBand phase residual, not a sample-wise continuity claim across offline bypass. Timing=(drums+95,bass-130,melody+170)ms*severity, rounded to nearest whole sample to avoid fractional interpolation coloration. 100 bypasses every defect stage; near100 gain/filter/timing converge to dry.',
      normalization:'Saved calibration/windows/output gain plus one gain=min(1,.95/max(all12+dry peak)). No per-file normalization or loudness rescue.',
      pcmHashFormat:'Planar Float32 little endian, channel order',tool:recipe.pitchTool??null},
    sources:recipe.parts.map(({channels,...p})=>({...p,preparedPcmStats:pcmStats(channels),preparedPcmSha256:pcmSha(channels)})),variants,dryReference};
  const html=listeningPage(manifest);
  if(verifyOnly){assert.deepEqual(manifest,JSON.parse(await readFile(resolve(outputDir,'metadata.json'),'utf8')));assert.equal(html,await readFile(resolve(outputDir,'index.html'),'utf8'));}
  else{await writeFile(resolve(outputDir,'metadata.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});await writeFile(resolve(outputDir,'index.html'),html,{flag:'wx'});}
  return manifest;
}

async function main(){
  const args=process.argv.slice(2);if(args.some(a=>a!=='--verify-only'))throw new Error('Usage: node tools/render-flow-genre-curve.mjs [--verify-only]');
  const root=fileURLToPath(new URL('../',import.meta.url)),recipe=JSON.parse(await readFile(new URL('./audio/beat-skill-ladder-fixture.json',import.meta.url),'utf8'));
  const reference=await readFile(resolve(root,recipe.reference)),original=JSON.parse(reference).version.recipe.descriptor;
  assert.equal(recipe.durationSeconds,original.durationSeconds);assert.equal(recipe.outputGain,original.outputGain);
  assert.deepEqual(recipe.parts.map(({id,sourceGainDb,windows,loopSeconds})=>({id,sourceGainDb,windows,loopSeconds})),original.parts.map(({id,sourceGainDb,windows,loopSeconds})=>({id,sourceGainDb,windows,loopSeconds})));
  recipe.referenceSha256=sha(reference);
  const executable=process.env.FFMPEG_PATH||'ffmpeg',version=spawnSync(executable,['-version'],{encoding:'utf8',windowsHide:true});if(version.status!==0)throw new Error('FFmpeg unavailable');
  recipe.pitchTool={executable,version:version.stdout.split(/\r?\n/)[0],sha256:sha(await readFile(executable))};
  for(const p of recipe.parts){const bytes=await readFile(resolve(root,p.path)),decoded=decodePcm16(bytes);p.sourceSampleRate=decoded.sampleRate;p.sourceFrames=decoded.channels[0].length;p.sourceBytes=bytes.length;p.sourceSha256=sha(bytes);p.sourceDecodedPcmStats=pcmStats(decoded.channels);p.sourceDecodedPcmSha256=pcmSha(decoded.channels);p.channels=prepareSourcePcm(decoded,recipe.sampleRate,p.loopSeconds);}
  const outputDir=resolve(root,'artifacts/flow-genre-curve'),manifest=await writePreview({recipe,outputDir,verifyOnly:args.includes('--verify-only')});
  for(const p of recipe.parts)assert.equal(sha(await readFile(resolve(root,p.path))),p.sourceSha256,'source preserved');assert.equal(sha(await readFile(resolve(root,recipe.reference))),recipe.referenceSha256,'reference preserved');
  console.log(JSON.stringify({outputDir,verifyOnly:args.includes('--verify-only'),frames:manifest.frames,sharedGain:manifest.sharedGain,phrases:manifest.phrases,variants:manifest.variants.map(({filename,sha256,eventCounts,stats})=>({filename,sha256,eventCounts,stats})),dryReference:manifest.dryReference.sha256},null,2));
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)await main();
