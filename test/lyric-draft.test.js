import test from 'node:test';
import assert from 'node:assert/strict';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {createLyric,startLyricWork,advanceLyricWork,LYRIC_STAGES} from '../src/lyric-production.js';

const lines=p=>p.sections.flatMap(s=>s.lines);
const notes=p=>lines(p).filter(l=>l.note).length;
function draft(name='Голос спального района',skill=10,seed=.37){
 let state=createLyric(createVirtualPcState({music:{needs:{satiety:100,energy:100}}}),{id:'draft',name},{writing:skill},()=>seed).state;
 return {get state(){return state;},finish(){
  state.music.needs={satiety:100,energy:100};
  const result=startLyricWork(state,{projectId:'draft',sliders:LYRIC_STAGES[state.projects[0].stages.length].target},{writing:skill},()=>.5);
  assert.equal(result.ok,true,result.reason);state=advanceLyricWork(result.state,1000).state;return state.projects[0];
 }};
}

test('experienced first writing pass is scattered unfinished notes rather than a verse',()=>{
 for(const skill of [60,99]){
  const f=draft(undefined,skill),p=f.finish();
  assert.ok(p.sections.every(s=>s.type==='draft'&&s.title===''));
  assert.ok(notes(p)>=4);
  assert.ok(lines(p).some(l=>l.unfinished));
  assert.ok(new Set(lines(p).map(l=>l.indent)).size>1);
  assert.ok(lines(p).some(l=>l.gapBefore));
  assert.match(lines(p).map(l=>l.note).join(' '),/рифму|панч|сравнение|бит|размерность/);
 }
});

test('symbols spell consonants and vowels with theme marks instead of random ornaments',()=>{
 for(const [name,motif]of [['Голос спального района','Zzz…'],['Деньги и кэш','$$$']]){
  const f=draft(name),p=f.finish(),words=lines(p).flatMap(l=>l.words);
  assert.ok(words.some(w=>w.text===motif),name+' has its motif');
  assert.ok(words.some(w=>/[∎□]/.test(w.text)));
  for(const w of words)assert.ok(w.text===motif||/^[∎□]+[,.!?…:#$%*]*$/.test(w.text),'Unexpected symbolic word '+w.text);
 }
});

test('rhymes and images refine the same lines and keep room for a final revision',()=>{
 const f=draft(undefined,40),first=f.finish(),rhymes=f.finish(),images=f.finish();
 assert.ok(notes(first)>notes(rhymes));assert.ok(notes(rhymes)>notes(images));assert.ok(notes(images)>0);
 assert.ok(rhymes.sections.some(s=>s.type!=='draft'));assert.equal(images.status,'ready');
 const starts=p=>lines(p).slice(0,8).map(l=>l.words[0].text);
 assert.deepEqual(starts(first),starts(rhymes));assert.deepEqual(starts(rhymes),starts(images));
 assert.ok(lines(images).every(l=>l.indent===0));
 assert.ok(lines(images).filter(l=>!l.note).length/lines(images).length>=.6);
 assert.ok(lines(images).filter(l=>!l.note).length/lines(images).length<=.85);
 const saved=createVirtualPcState(JSON.parse(JSON.stringify(f.state)));
 assert.deepEqual(saved.projects[0],images,'reload must not re-roll unfinished text');
});

test('novice prose in all three stages has no headings or author notes',()=>{
 for(const skill of [10,24]){
  const f=draft(undefined,skill);
  for(let i=0;i<3;i++){
   const p=f.finish();assert.ok(p.sections.every(s=>s.presentation==='prose'&&!s.title));assert.equal(notes(p),0);
   assert.ok(lines(p).filter(l=>l.gapBefore).length<=2);
  }
 }
});
test('notes unlock at actual skill 25 and advanced notes at 50, not at slider fit',()=>{
 for(const skill of [24,25,49,50]){
  const f=draft(undefined,skill),p=f.finish(),all=lines(p).map(l=>l.note).join(' ');
  if(skill<25)assert.equal(notes(p),0);else assert.ok(notes(p)>0);
  if(skill<50)assert.doesNotMatch(all,/панч|сравнение|размерность/);else assert.match(all,/панч|сравнение|размерность/);
 }
});

test('legacy written sections are kept verbatim on load rather than silently regenerated',()=>{
 const f=draft(),p=f.finish();
 p.sections=[{type:'verse',title:'Куплет 1',lines:[{words:[{text:'˜°*”',error:true}]}]}];
 const saved=createVirtualPcState(JSON.parse(JSON.stringify(f.state)));
 assert.equal(saved.projects[0].sections[0].lines[0].words[0].text,'˜°*”');
});
