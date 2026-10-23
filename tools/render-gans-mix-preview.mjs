// Local GANS listening comparison and additive Flow-quota v2 render.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {decodePcm16} from './audio/source-loop.mjs';
import {prepareSourcePcm,encodeSafePcm16,pcmStats} from './audio/beat-skill-ladder.mjs';
import {renderGansMix} from './audio/gans-mix-preview.mjs';
import {writePreview as writeFlowPreview} from './render-flow-genre-curve.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const pcmSha=channels=>{const h=createHash('sha256');for(const c of channels)h.update(Buffer.from(c.buffer,c.byteOffset,c.byteLength));return h.digest('hex');};
const files=['before-mix.wav','after-mix-master.wav','after-gain-matched.wav'];
function page(m){return '<!doctype html><html lang="ru"><meta charset="utf-8"><title>GANS · до и после сведения</title><style>body{font:17px system-ui;max-width:900px;margin:40px auto;padding:0 20px;background:#111923;color:#eee}article{margin:30px 0}audio{width:100%;display:block}small{color:#afbdcf}a{color:#9bcfff}</style><h1>GANS · локальное сравнение сведения и мастеринга</h1><p>Один новый бит и один исходный дубль GANS. Флоу 25, битмейкинг 50, опыт жанра 100: навыки не повышаются. В игре эта обработка не включена.</p><p>90 BPM, 8 тактов: вступление 2, основная часть 4, концовка 2. До сведения голос звучит один раз в основной части. После — два полных исполнения того же исходного дубля: ошибки каждого исполнения рассчитаны отдельно с фиксированными seed, а не скопированы вместе с обработанным голосом. Поэтому разница включает аранжировку, а не только эквалайзер.</p><article><h2>1. До сведения</h2><p>Приглушённая середина, немного ослаблен низ, общий уровень ниже с запасом по пикам. Один проход голоса.</p><audio controls preload="none" src="before-mix.wav"></audio></article><article><h2>2. После сведения и мастеринга</h2><p>Два прохода голоса; величина исходных ошибок уменьшена на 10% без новой жеребьёвки первого прохода. Умеренное восстановление середины и низа, выход +1,5 dB. Оставшиеся ошибки не исчезают.</p><audio controls preload="none" src="after-mix-master.wav"></audio></article><article><h2>3. После — с громкостью, сопоставленной с «до»</h2><p>Точно тот же обработанный микс и два прохода, только один постоянный множитель громкости для сравнения тембра. Это контроль для прослушивания, не игровая громкость и не изолированное сравнение только EQ.</p><audio controls preload="none" src="after-gain-matched.wav"></audio></article><p><small>Один общий запас по пикам, без лимитера и индивидуального спасения громкости. Контроль сопоставлен по RMS полного файла: состав аранжировки различается. Высота голоса намеренно не меняется; возможны небольшие артефакты растяжения. Разметка фраз по энергии, без распознавания ударений. <a href="metadata.json">Все параметры, границы, события, seed и SHA256</a>. <a href="../flow-genre-curve-v2/">Отдельно: новая шкала входов фраз Артёма</a>.</small></p></html>';}

export async function writeGansPreview({recipe,outputDir,verifyOnly=false}){
  const targets=[...files,'metadata.json','index.html'];
  if(!verifyOnly){for(const name of targets)if(await access(resolve(outputDir,name)).then(()=>true,()=>false))throw new Error('Refusing to overwrite local preview '+resolve(outputDir,name));await mkdir(outputDir,{recursive:true});}
  const rendered=renderGansMix(recipe),variants=[];
  for(const [i,v] of [rendered.before,rendered.after,rendered.matched].entries()){
    const bytes=encodeSafePcm16({sampleRate:rendered.sampleRate,channels:v.channels});
    if(verifyOnly)assert.deepEqual(bytes,await readFile(resolve(outputDir,files[i])));else await writeFile(resolve(outputDir,files[i]),bytes,{flag:'wx'});
    variants.push({filename:files[i],kind:v.kind,sha256:sha(bytes),pcmSha256:pcmSha(v.channels),stats:v.stats,penaltyScale:v.penaltyScale??.9,outputGain:v.outputGain??rendered.after.outputGain*rendered.matchGain,
      comparisonOnly:v.comparisonOnly??false,filters:v.filters??rendered.after.filters,beat:v.beat??rendered.after.beat,
      occurrences:(v.occurrences??rendered.after.occurrences).map(({channels,...o})=>({...o,pcmSha256:pcmSha(channels),counts:{phrases:o.plan.events.length,timingEligible:o.plan.timingEligible,timing:o.plan.events.filter(e=>e.timingActive).length,speed:o.plan.events.filter(e=>e.speedActive).length}}))});
  }
  const source=p=>{const {channels,...rest}=p;return {...rest,preparedFrames:channels[0].length,preparedStats:pcmStats(channels),preparedPcmSha256:pcmSha(channels)};};
  const manifest={provenance:'LOCAL GANS comparison, not current game output',sampleRate:rendered.sampleRate,frames:rendered.frames,channels:2,durationSeconds:rendered.durationSeconds,bpm:90,bars:8,flow:rendered.flow,beatmaking:rendered.beatmaking,genreXP:rendered.genreXP,voiceId:rendered.voiceId,beatIds:rendered.beatIds,seeds:rendered.seeds,phrases:rendered.phrases,
    baselineGain:rendered.baselineGain,masterGainDb:1.5,masterGain:rendered.masterGain,sharedGain:rendered.sharedGain,matchGain:rendered.matchGain,sources:[source(recipe.voice),...recipe.parts.map(source)],
    processing:{before:'One full take in main, original penalties1, baseline=-2dB from frozen output gain; low shelf180Hz -1dB, peaking900Hz Q.7 -2dB.',after:'Two full original-source performances in main, each with independent fixed seed. First seed retained from before. Penalty magnitudes x.9, event selection/ranks unchanged. Low shelf180Hz -.4dB, peaking900Hz Q.7 -1dB; output +1.5dB relative to baseline. Single processed path, no dry/wet parallel beat.',matched:'Exactly after PCM times one fixed scalar RMS(before)/RMS(after), comparison only; same two-take arrangement. No game-gain claim or isolated-EQ claim.',arrangement:'Bass2bar intro+4bar main; drums4bar main; melody4bar main+2bar outro. Beforevoice atbar2 once, aftervoice atbar2 andbar4, eachslot2bars. Entire source retained, no truncation to fit.',voice:'Same pitch-preserving warp and attenuating dynamics as reviewed Flow model, channels apart/phase laminar, identical time controls, no double/unchanged parallel source. RMS analysis scaling undone. Source artistic ceiling preserved.',timing:'Ranked quota on movable energy phrases, seeded fixed signs/magnitudes bounded by real pauses, no padded-silence entries. Offset/tempo/dynamics multiplied .9 after selection and pause-clamping, not redraw/heal. Beat severity also x.9 before parameter derivation; integer timing can round by half sample.',headroom:'One shared min(1,.95/max(before,after peaks)) applied to both mixes; matched uses only its disclosed scalar. No individual normalization, compressor or limiter.',playerStorageTouched:false,soundSkillMapping:false,liveGameIntegration:false},variants};
  const html=page(manifest);
  if(verifyOnly){assert.deepEqual(manifest,JSON.parse(await readFile(resolve(outputDir,'metadata.json'),'utf8')));assert.equal(html,await readFile(resolve(outputDir,'index.html'),'utf8'));}
  else {await writeFile(resolve(outputDir,'metadata.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});await writeFile(resolve(outputDir,'index.html'),html,{flag:'wx'});}
  return manifest;
}

async function preparePart(root,part,rate,seconds){
  const bytes=await readFile(resolve(root,part.path)),decoded=decodePcm16(bytes);
  if(part.sha256)assert.equal(sha(bytes),part.sha256,'fixed local source hash: '+part.id);
  if(part.role==='vocal'&&decoded.channels[0].length/decoded.sampleRate>seconds)throw new RangeError('GANS source too long to fit two full performances');
  return {...part,sourceSha256:sha(bytes),sourceBytes:bytes.length,sourceRate:decoded.sampleRate,sourceFrames:decoded.channels[0].length,sourceDecodedStats:pcmStats(decoded.channels),channels:prepareSourcePcm(decoded,rate,seconds)};
}
export async function loadGansRecipe(root){
  const descriptor=JSON.parse(await readFile(resolve(root,'artifacts/gans-mix-session/recipe.json'),'utf8'));
  const voice=await preparePart(root,{...descriptor.voice,role:'vocal'},44100,16/3);
  const parts=[];for(const part of descriptor.parts)parts.push(await preparePart(root,part,44100,32/3));
  return {...descriptor,sampleRate:44100,voice,parts};
}
export async function renderFlowV2(root,verifyOnly=false){
  const recipe=JSON.parse(await readFile(resolve(root,'tools/audio/beat-skill-ladder-fixture.json'),'utf8'));
  recipe.referenceSha256=sha(await readFile(resolve(root,recipe.reference)));recipe.provenance+=' Flow entry-quota v2; original generated preview preserved.';
  const parts=[];for(const p of recipe.parts)parts.push(await preparePart(root,p,recipe.sampleRate,p.loopSeconds));recipe.parts=parts;
  return writeFlowPreview({recipe,outputDir:resolve(root,'artifacts/flow-genre-curve-v2'),verifyOnly});
}
async function main(){
  process.env.TEMP='D:/Codex/Temp';process.env.TMP='D:/Codex/Temp';process.env.npm_config_cache='D:/Codex/Caches/npm';
  const args=process.argv.slice(2);if(args.some(a=>!['--verify-only','--flow-v2-only'].includes(a)))throw new Error('Usage: node tools/render-gans-mix-preview.mjs [--verify-only] [--flow-v2-only]');
  const root=fileURLToPath(new URL('../',import.meta.url)),verifyOnly=args.includes('--verify-only');
  if(!args.includes('--flow-v2-only')){const recipe=await loadGansRecipe(root),manifest=await writeGansPreview({recipe,outputDir:resolve(root,'artifacts/gans-mix-preview'),verifyOnly});for(const p of [recipe.voice,...recipe.parts])assert.equal(sha(await readFile(resolve(root,p.path))),p.sourceSha256,'GANS source unchanged');console.log(JSON.stringify({gans:manifest.variants.map(v=>({filename:v.filename,sha256:v.sha256,stats:v.stats,counts:v.occurrences.map(o=>o.counts)})),frames:manifest.frames,sharedGain:manifest.sharedGain},null,2));}
  const flow=await renderFlowV2(root,verifyOnly);console.log(JSON.stringify({flowV2:flow.variants.filter(v=>v.kind==='flow').map(v=>({filename:v.filename,sha256:v.sha256,counts:v.eventCounts}))},null,2));
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)await main();
