// Standalone local preview. No live server, game renderer, or player storage.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {decodePcm16} from './audio/source-loop.mjs';
import {renderLadder,defectParameters,pcmStats,encodeSafePcm16,prepareSourcePcm} from './audio/beat-skill-ladder.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const pcmSha=channels=>{
  const hash=createHash('sha256');
  for(const channel of channels)hash.update(Buffer.from(channel.buffer,channel.byteOffset,channel.byteLength));
  return hash.digest('hex');
};
const filenames=[0,10,20,30,40,50].map(level=>`skill-${String(level).padStart(2,'0')}.wav`);

export async function writePreview({recipe,outputDir,verifyOnly=false,refreshNotes=false}) {
  if(verifyOnly&&refreshNotes)throw new Error('Choose verification or note refresh');
  const targets=[...filenames,'dry-reference.wav','metadata.json','index.html'];
  if(!verifyOnly&&!refreshNotes) {
    await mkdir(outputDir,{recursive:true});
    for(const name of targets) {
      const exists=await access(resolve(outputDir,name)).then(()=>true,()=>false);
      if(exists)throw new Error('Refusing to overwrite existing preview: '+resolve(outputDir,name));
    }
  }
  const rendered=renderLadder(recipe),variants=[];
  for(const [index,item] of [...rendered.variants,rendered.dryReference].entries()) {
    const filename=filenames[index]??'dry-reference.wav';
    const wav=encodeSafePcm16({sampleRate:rendered.sampleRate,channels:item.channels});
    if(verifyOnly||refreshNotes)assert.deepEqual(wav,await readFile(resolve(outputDir,filename)),'deterministic WAV replay: '+filename);
    else await writeFile(resolve(outputDir,filename),wav,{flag:'wx'});
    variants.push({filename,beatmaking:item.level,genreXP:item.level,effectiveSkill:item.level,
      parameters:item.level===null?null:['drums','bass','melody'].map(role=>defectParameters(role,item.level,item.level)),
      sha256:sha(wav),vocalSha256:pcmSha(item.vocalChannels),unscaledStats:item.unscaledStats,stats:item.stats,layers:item.layers});
  }
  const dryReference=variants.pop();
  assert.equal(variants.at(-1).sha256,dryReference.sha256,'exact dry WAV bypass at skill50');
  assert.equal(new Set(variants.map(item=>item.vocalSha256)).size,1,'same vocal contribution at every level');
  const manifest={
    provenance:recipe.provenance,baselineCommit:recipe.baselineCommit??null,
    reference:recipe.reference??null,referenceSha256:recipe.referenceSha256??null,
    demoSeed:recipe.demoSeed,beatSeed:recipe.beatSeed??null,vocalTakeSeed:recipe.vocalTakeSeed??null,
    sampleRate:rendered.sampleRate,channels:2,frames:rendered.frames,durationSeconds:rendered.durationSeconds,
    outputGain:rendered.outputGain,sharedGain:rendered.sharedGain,
    curve:'effective=min(beatmaking,genreXP); strength=max(0,1-effective/50). Finite numeric skills in [0,100]; invalid input throws. No boost.',
    processing:{
      implementation:'Node Float32 PCM; RBJ biquad EQ, FFmpeg Rubber Band pitch (tempo=1, channels=together), constant fractional-sample timing translation, existing arrangeSongSamples, saved output gain, one series-wide safety gain, PCM16.',
      order:'source calibration -> role EQ -> pitch -> constant timing shift -> frozen song windows -> saved output gain -> shared safety gain',
      roles:'drums=engine stage0; bass=engine stage2; melody=engine stage1. Conceptual order drums -> bass -> melody; live stages unchanged.',
      oldGameDspApplied:false,playerStorageTouched:false,randomDraws:0,
      timing:'Fixed role offsets: drums +95ms, bass -130ms, melody +170ms at0, scaled linearly to0 at50. Same controls on stereo; no time stretching or per-hit slicing/retrigger. Fixed off-grid displacement, not independent jitter per hit.',
      detune:'Bass +380c and melody -460c at0; cents scale linearly to0. FFmpeg pad/trim enforces original frame count. Pitch algorithm may smear transients; no creative effects added.',
      edges:'4ms linear fade only at introduced timing boundaries plus existing 4ms arrangement-window fades. Final effective45..50 blends processed role with calibrated dry: wet=min(1,strength*10), guaranteeing continuous dry convergence; requested0..40 remain fully wet. All defect stages bypass completely at50.',
      voice:'Raw bank take npc-artem-47, once resampled 48000 -> 44100 Hz and zero-padded to the fixed loop; saved sourceGainDb and windows. No old microphone/vocal damage or old vocalGainDb/postGain. Identical voice contribution at every level.',
      normalization:'No per-file normalization, compressor, limiter or master effects. One shared gain=min(1,0.95/max(all-six-and-dry peak)). Intermediate float DSP is not clipped; mixes are verified finite before PCM16 export.',
      pcmHashFormat:'SHA256 of planar Float32 little-endian PCM in channel order',
      tool:recipe.pitchTool??null
    },
    sources:recipe.parts.map(({channels,...part})=>({...part,rawDecodedStats:pcmStats(channels),rawPcmSha256:pcmSha(channels)})),
    variants,dryReference
  };
  const html='<!doctype html><html lang="ru"><meta charset="utf-8"><title>Битмейкинг 0–50 — локальное сравнение</title><style>body{font:17px system-ui;max-width:850px;margin:40px auto;padding:0 20px;background:#111923;color:#eee}article{margin:24px 0}audio{width:100%}small{color:#abb8c8}</style><h1>Битмейкинг 0–50 · локальный прототип</h1><p>Во всех примерах один экспериментальный бит из сохранённого рецепта с seed 33 и исходный дубль Артёма №47. Битмейкинг и опыт жанра равны указанному уровню; эффективный уровень — минимум из этих двух навыков. Это новая пробная обработка, ещё не встроенная в игру.</p><p>Ударные: сильный срез низов и середины, опоздание. Бас: слабый низ, выпирающая середина, завышенная высота и ранний вход. Мелодия: радиозвук, заниженная высота и опоздание. К уровню 50 дефекты полностью исчезают.</p>'+filenames.map((name,i)=>`<article><label for="s${i}">Битмейкинг ${i*10} · опыт жанра ${i*10} · эффективный уровень ${i*10}</label><audio id="s${i}" controls preload="none" src="${name}"></audio></article>`).join('')+'<p><small>Индивидуального выравнивания громкости нет. Громкость и тайминг голоса, исходники и аранжировка одинаковы. Параметры и контрольные суммы — в metadata.json. Файлы локальные, без публикации.</small></p></html>';
  if(verifyOnly) {
    assert.deepEqual(manifest,JSON.parse(await readFile(resolve(outputDir,'metadata.json'),'utf8')),'deterministic metadata replay');
    assert.equal(html,await readFile(resolve(outputDir,'index.html'),'utf8'));
  } else {
    await writeFile(resolve(outputDir,'metadata.json'),JSON.stringify(manifest,null,2)+'\n',{flag:refreshNotes?'w':'wx'});
    await writeFile(resolve(outputDir,'index.html'),html,{flag:refreshNotes?'w':'wx'});
  }
  return manifest;
}

async function main() {
  const args=process.argv.slice(2);
  if(args.some(arg=>!['--verify-only','--refresh-notes'].includes(arg)))throw new Error('Usage: node tools/render-beat-skill-ladder.mjs [--verify-only | --refresh-notes]');
  const root=fileURLToPath(new URL('../',import.meta.url)),fixturePath=new URL('./audio/beat-skill-ladder-fixture.json',import.meta.url);
  const recipe=JSON.parse(await readFile(fixturePath,'utf8'));
  const referenceBytes=await readFile(resolve(root,recipe.reference)),prior=JSON.parse(referenceBytes).version.recipe.descriptor;
  assert.equal(recipe.durationSeconds,prior.durationSeconds);assert.equal(recipe.outputGain,prior.outputGain);
  assert.deepEqual(recipe.parts.map(({id,sourceGainDb,windows,loopSeconds})=>({id,sourceGainDb,windows,loopSeconds})),prior.parts.map(({id,sourceGainDb,windows,loopSeconds})=>({id,sourceGainDb,windows,loopSeconds})),'frozen original recipe');
  recipe.referenceSha256=sha(referenceBytes);
  const executable=process.env.FFMPEG_PATH||'ffmpeg';
  const version=spawnSync(executable,['-version'],{encoding:'utf8',windowsHide:true});
  if(version.status!==0)throw Error('FFmpeg unavailable');
  recipe.pitchTool={executable,version:version.stdout.split(/\r?\n/)[0],sha256:sha(await readFile(executable)),options:'rubberband=tempo=1:pitch=2^(cents/1200):channels=together,apad=whole_len=frames,atrim=end_sample=frames; f32le input/output'};
  for(const part of recipe.parts) {
    const bytes=await readFile(resolve(root,part.path)),decoded=decodePcm16(bytes);
    part.sourceSampleRate=decoded.sampleRate;part.sourceFrames=decoded.channels[0].length;
    part.channels=prepareSourcePcm(decoded,recipe.sampleRate,part.loopSeconds);
    part.sourceBytes=bytes.length;part.sourceSha256=sha(bytes);
  }
  const outputDir=resolve(root,'artifacts/beat-skill-ladder'),verifyOnly=args.includes('--verify-only'),refreshNotes=args.includes('--refresh-notes');
  const manifest=await writePreview({recipe,outputDir,verifyOnly,refreshNotes});
  for(const part of recipe.parts)assert.equal(sha(await readFile(resolve(root,part.path))),part.sourceSha256,'source unchanged during render');
  assert.equal(sha(await readFile(resolve(root,recipe.reference))),recipe.referenceSha256,'original demo recipe unchanged');
  console.log(JSON.stringify({outputDir,verifyOnly,refreshNotes,frames:manifest.frames,sampleRate:manifest.sampleRate,durationSeconds:manifest.durationSeconds,sharedGain:manifest.sharedGain,sourceHashesUnchanged:true,dry50Exact:manifest.variants.at(-1).sha256===manifest.dryReference.sha256,vocalHashes:manifest.variants.map(v=>v.vocalSha256),variants:manifest.variants.map(({filename,sha256,stats})=>({filename,sha256,stats}))},null,2));
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)await main();
