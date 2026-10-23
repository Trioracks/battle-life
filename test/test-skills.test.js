import test from 'node:test';
import assert from 'node:assert/strict';
import {createProfile,saveProfile,loadProfile} from '../src/avatar-v3-profile.js';
import {createVirtualPcState,saveVirtualPcState,loadVirtualPcState} from '../src/virtual-pc-state.js';
import {chooseGenre,genreOptions} from '../src/genre-progression.js';
import {createBeat,advanceBeatWork,startBeatStage,restoreMusicNeeds} from '../src/beat-production.js';
import {startCreativeChain,pauseCreativeChain} from '../src/creative-workflow.js';
const api=await import('../src/test-skills.js').catch(()=>({}));
const request={kind:'skill',id:'beatmaking'};
function fixture(){const profile=createProfile({name:'Тест'});profile.skills.beatmaking=20;const pc=createVirtualPcState({music:{practice:5.4}});return {profile,pc};}
function storage(){const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v))};}

test('plus one preserves practice and other skills',()=>{
 const {profile,pc}=fixture(),before=structuredClone({profile,pc});
 const result=api.raiseTestSkill(profile,pc,request);
 assert.equal(result.ok,true);assert.equal(result.store,'profile');assert.equal(result.profile.skills.beatmaking,21);assert.equal(result.pc,pc);
 assert.equal(api.testSkillRows(result.profile,pc).find(r=>r.id==='beatmaking').value,26.4);
 assert.equal(pc.music.practice,5.4);assert.deepEqual({profile,pc},before);
 const expected=structuredClone(profile);expected.skills.beatmaking=21;assert.deepEqual(result.profile,expected);
});
test('fractional cap reaches 100 once and capped clicks are no-ops',()=>{
 const {profile,pc}=fixture();profile.skills.beatmaking=94.3;
 const result=api.raiseTestSkill(profile,pc,request);assert.equal(result.profile.skills.beatmaking,94.6);
 assert.equal(api.testSkillRows(result.profile,pc).find(r=>r.id==='beatmaking').value,100);
 const capped=api.raiseTestSkill(result.profile,pc,request);assert.equal(capped.ok,false);assert.equal(capped.store,null);assert.equal(capped.profile,result.profile);assert.equal(capped.pc,pc);
});
test('rows combine the four practice stores once and expose nine skills plus only open genres',()=>{
 const {profile,pc}=fixture();profile.skills.writing=10;profile.skills.flow=11;profile.skills.sound=12;pc.writing.practice=2.25;pc.recording.practice={flow:3.5,sound:4.75};
 const rows=api.testSkillRows(profile,pc);assert.equal(rows.filter(r=>r.kind==='skill').length,9);assert.deepEqual(rows.filter(r=>r.kind==='genre').map(r=>r.id),['experimental']);
 for(const [id,want]of [['writing',12.25],['flow',14.5],['sound',16.75]])assert.equal(rows.find(r=>r.id===id).value,want);
});
test('locked genre and active job reject edits',()=>{
 const {profile,pc}=fixture();assert.equal(api.raiseTestSkill(profile,pc,{kind:'genre',id:'abstract'}).ok,false);
 for(const patch of [{music:{...pc.music,job:{elapsed:1}}},{writing:{...pc.writing,job:{elapsed:1}}},{recording:{...pc.recording,job:{elapsed:1}}},{rapAnalysis:{job:{status:'active'}}},{rapResearch:{job:{status:'active'}}}]){
  const active={...pc,...patch};for(const target of [request,{kind:'genre',id:'experimental'}]){const result=api.raiseTestSkill(profile,active,target);assert.equal(result.ok,false);assert.equal(result.profile,profile);assert.equal(result.pc,active);assert.equal(result.store,null);assert.ok(result.reason);}
  assert.ok(api.testSkillRows(profile,active).every(r=>!r.canRaise));
 }
 for(const target of [{kind:'skill',id:'unknown'},{kind:'unknown',id:'beatmaking'},null])assert.equal(api.raiseTestSkill(profile,pc,target).ok,false);
});
test('paused snapshot remains unchanged and genre raise changes only its xp',()=>{
 const {profile,pc}=fixture();pc.creativeWork={items:[{projectId:'frozen',pausedJob:{skill:20,genreSkill:3,stageBudget:.8,practiceCredit:.2,genreCredit:.2,elapsed:4,total:20}}]};pc.rapAnalysis={job:{status:'paused',heroSnapshot:{beatmaking:20}}};pc.rapResearch={job:{status:'paused'}};
 pc.projects=[{id:'frozen',practicePlan:{version:2,startSkill:20,totalBudget:2.4},mix:{layers:[{execution:{version:1,beatmaking:20,genreXP:3,effective:3}}]}}];pc.trackVersions=[{id:'archive',quality:3}];
 const before=JSON.stringify(pc),result=api.raiseTestSkill(profile,pc,{kind:'genre',id:'experimental'});
 assert.equal(result.ok,true);assert.equal(result.store,'pc');assert.equal(result.profile,profile);
 const expected=structuredClone(pc);expected.music.genres.xp.experimental=1;assert.deepEqual(result.pc,expected);assert.equal(JSON.stringify(pc),before);
 const raised=api.raiseTestSkill(profile,result.pc,request);assert.equal(raised.ok,true);assert.equal(JSON.stringify(raised.pc.projects),JSON.stringify(pc.projects));assert.equal(JSON.stringify(raised.pc.creativeWork),JSON.stringify(pc.creativeWork));assert.deepEqual(raised.pc.trackVersions,pc.trackVersions);
});
test('repeat raises unlock a genre slot at 25 and both stores survive reload independently',()=>{
 const {profile,pc}=fixture(),saved=storage();pc.music.practice=0;let p=profile,s=pc;
 for(let i=0;i<5;i++){const result=api.saveTestSkill(p,s,request,{saveProfile:next=>saveProfile(saved,next),persistPc(){throw Error('wrong store');}});assert.equal(result.ok,true);p=result.profile;}
 assert.equal(p.skills.beatmaking,25);assert.equal(genreOptions(s.music.genres,p.skills.beatmaking).remaining,1);
 s={...s,music:{...s.music,genres:chooseGenre(s.music.genres,'abstract',25).value}};
 const result=api.saveTestSkill(p,s,{kind:'genre',id:'abstract'},{saveProfile(){throw Error('wrong store');},persistPc(next,options){assert.deepEqual(options,{atomic:true});return saveVirtualPcState(saved,next);}});
 assert.equal(result.ok,true);assert.equal(loadProfile(saved).profile.skills.beatmaking,25);assert.equal(loadVirtualPcState(saved).state.music.genres.xp.abstract,1);
});
test('legacy schema upgrade preserves every other profile field and skill value',()=>{
 const {profile,pc}=fixture();delete profile.skillSchema;profile.version=4;for(const key of Object.keys(profile.skills))profile.skills[key]=10;profile.skills.beatmaking=94.3;profile.extra={earned:'keep'};
 const result=api.raiseTestSkill(profile,pc,request),expected=structuredClone(profile);expected.skillSchema=2;expected.skills.beatmaking=94.6;
 assert.deepEqual(result.profile,expected);const saved=storage();assert.equal(saveProfile(saved,result.profile).ok,true);assert.deepEqual(loadProfile(saved).profile,result.profile);
});
test('storage failure returns original state for profile-save and pc-save separately',()=>{
 const {profile,pc}=fixture();
 for(const target of [request,{kind:'genre',id:'experimental'}])for(const throws of [false,true]){
  const failed=()=>{if(throws)throw Error('denied');return {ok:false,error:'denied'};};
  const result=api.saveTestSkill(profile,pc,target,{saveProfile:failed,persistPc:failed});
  assert.equal(result.ok,false);assert.equal(result.profile,profile);assert.equal(result.pc,pc);assert.equal(result.store,null);assert.match(result.reason,/denied/);
 }
});
test('real failing storage retains original saves and live objects for each store',()=>{
 const {profile,pc}=fixture(),saved=storage();assert.equal(saveProfile(saved,profile).ok,true);assert.equal(saveVirtualPcState(saved,pc),true);
 const before=JSON.stringify({profile:loadProfile(saved).profile,pc:loadVirtualPcState(saved).state});
 const denied={getItem:saved.getItem,setItem(){throw Error('storage full');}};
 for(const target of [request,{kind:'genre',id:'experimental'}]){
  const result=api.saveTestSkill(profile,pc,target,{saveProfile:next=>saveProfile(denied,next),persistPc:next=>saveVirtualPcState(denied,next)});
  assert.equal(result.ok,false);assert.equal(result.profile,profile);assert.equal(result.pc,pc);
  assert.equal(JSON.stringify({profile:loadProfile(saved).profile,pc:loadVirtualPcState(saved).state}),before);
 }
});
test('saved completed and paused projects remain byte equivalent across raises and resume',()=>{
 const profile=createProfile({name:'Архив'}),saved=storage();profile.skills.beatmaking=20;
 let pc=createBeat(createVirtualPcState({music:{needs:{satiety:100,energy:100}}}),{id:'done',name:'Готовый'},profile.skills,()=>.4).state;
 for(let stage=0;stage<3;stage++){pc=restoreMusicNeeds(restoreMusicNeeds(pc,'meal'),'sleep',500);pc=startBeatStage(pc,'done',[5,5,5],profile.skills).state;pc=advanceBeatWork(pc,600).state;}
 pc=restoreMusicNeeds(restoreMusicNeeds(pc,'meal'),'sleep',500);pc=createBeat(pc,{id:'pause',name:'На паузе'},profile.skills,()=>.4).state;pc=startCreativeChain(pc,{kind:'beat',projectId:'pause'},profile.skills,()=>.4).state;pc=advanceBeatWork(pc,2).state;pc=pauseCreativeChain(pc);
 assert.equal(saveVirtualPcState(saved,pc),true);pc=loadVirtualPcState(saved).state;
 const projects=JSON.stringify(pc.projects),chain=JSON.stringify(pc.creativeWork),paused=structuredClone(pc.creativeWork.items[0].pausedJob),plan=structuredClone(pc.projects.find(p=>p.id==='pause').practicePlan);
 let raised=api.saveTestSkill(profile,pc,request,{saveProfile:next=>saveProfile(saved,next)});assert.equal(raised.ok,true);
 raised=api.saveTestSkill(raised.profile,pc,{kind:'genre',id:'experimental'},{persistPc:next=>saveVirtualPcState(saved,next)});assert.equal(raised.ok,true);
 pc=loadVirtualPcState(saved).state;assert.equal(JSON.stringify(pc.projects),projects);assert.equal(JSON.stringify(pc.creativeWork),chain);
 const resumed=startCreativeChain(pc,{kind:'beat',projectId:'pause'},raised.profile.skills);assert.equal(resumed.ok,true);assert.deepEqual(resumed.state.music.job,paused);assert.deepEqual(resumed.state.projects.find(p=>p.id==='pause').practicePlan,plan);
});
