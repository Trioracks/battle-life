import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {abstractRecordingFixture,VOICES} from '../test/helpers/abstract-recording-fixture.js';
import {startVocalWork,advanceVocalWork} from '../src/vocal-production.js';
import {resolveBeatPlayback} from '../src/beat-playback.js';
import {captureTrackVersion} from '../src/track-version.js';
const out=new URL('../artifacts/abstract-20261020/demos/',import.meta.url),examples=[];
for(const [family,pair,experimentalLead,label]of [...[0,1,2,3].map(f=>[f,0,false,'track-0'+(f+1)]),[3,18,false,'track-04-19-20'],[0,0,true,'experimental-lead-01']]){
 for(const voiceId of [VOICES[5],VOICES[1]]){
  let state=abstractRecordingFixture({family,pair,experimentalLead,voiceId,genreXP:100});state.music.needs={satiety:100,energy:100};
  const mixed=startVocalWork(state,{beatId:'beat',kind:'mix'},{beatmaking:100,flow:100,sound:100},()=>.4);assert.equal(mixed.ok,true,mixed.reason);
  state=advanceVocalWork(mixed.state,1000).state;
  const captured=captureTrackVersion(state,{projectId:'beat',nowMinute:600});assert.equal(captured.ok,true,captured.reason);state=captured.state;
  const beat=state.projects.find(p=>p.id==='beat'),play=resolveBeatPlayback(beat);assert.equal(play.ok,true);
  if(experimentalLead)assert.equal(beat.audio.themeId,'experimental-lead-20261020-01');
  else assert.deepEqual(beat.audio.abstractRecipe.indices,[pair+1,pair+2]);
  examples.push({label:label+'-'+(voiceId===VOICES[5]?'daniel':'kapa-v2'),version:state.trackVersions.byId[captured.versionId],state});
 }
}
await mkdir(out,{recursive:true});
async function writeIdentical(name,text){const target=new URL(name,out),prior=await readFile(target,'utf8').catch(e=>{if(e.code==='ENOENT')return null;throw e;});if(prior!==null){assert.equal(prior,text,'refusing different existing demo '+name);return;}await writeFile(target,text,{flag:'wx'});}
await writeIdentical('fixtures.json',JSON.stringify({version:1,examples},null,2)+'\n');
await writeIdentical('index.html','<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Abstract · примеры</title><style>body{font:17px system-ui;max-width:900px;margin:36px auto;padding:0 20px;background:#111923;color:#eee}article{margin:28px 0}audio{display:block;width:100%;margin:8px 0}a{color:#a5d4ff}</style><h1>Abstract · локальные примеры</h1><p>Четыре семейства с Даниилом и новой Kapa, финальная пара Track 04 №19→20 и экспериментальный lead 1. Готовые WAV: проигрываются без повторного рендера и без доступа к сохранениям игрока.</p><p>Рендер использует PCM и микс игры. Измерены пики, RMS, стыки и работа настоящего Worker. Измерения не заменяют прослушивание человеком: музыкальность, тембр, воспринимаемая громкость и слышимость стыков пока не оценивались.</p>'+examples.map(e=>'<article><h2>'+e.label.replace('-daniel',' · Даниил').replace('-kapa-v2',' · новая Kapa')+'</h2><audio controls preload="none" src="'+e.label+'.wav"></audio><a href="'+e.label+'.wav" download>Скачать WAV</a></article>').join('')+'<p><a href="render-evidence.json">Измерения, источники и SHA-256</a></p></html>\n');
console.log(JSON.stringify({examples:examples.length,path:out.pathname,route:'/tools/abstract-demo.html'}));
