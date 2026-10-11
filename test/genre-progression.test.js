import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeGenreProgression,genreOptions,chooseGenre,chooseSpecialization,addGenrePractice,genreCap,genreSnapshot} from '../src/genre-progression.js';
import {createVirtualPcState,loadVirtualPcState,saveVirtualPcState,VIRTUAL_PC_STORAGE_KEY as KEY} from '../src/virtual-pc-state.js';
import {createBeat,startBeatStage,advanceBeatWork} from '../src/beat-production.js';
const fresh=()=>createVirtualPcState({power:'on'});
test('genre slots unlock at exact general thresholds, all XP starts zero',()=>{
 const g=normalizeGenreProgression();assert.deepEqual(g.chosen,[]);assert.equal(g.primary,null);assert.ok(Object.values(g.xp).every(v=>v===0));
 for(const [skill,slots] of [[24.99,0],[25,1],[49.99,1],[50,2],[74.99,2],[75,3],[99.99,3],[100,3]])assert.equal(genreOptions(g,skill).slots,slots);
 assert.equal(genreOptions(g,99.99).canSpecialize,false);assert.equal(genreOptions(g,100).canSpecialize,true);
});
test('permanent choices reject locked, unknown, duplicate and fourth styles; only one primary',()=>{
 let g=normalizeGenreProgression();
 assert.equal(chooseGenre(g,'boombap',24.99).ok,false);assert.equal(chooseGenre(g,'unknown',100).ok,false);
 for(const [id,skill] of [['boombap',25],['trap',50],['lofi',75]]){const r=chooseGenre(g,id,skill);assert.equal(r.ok,true);g=r.value;}
 assert.equal(chooseGenre(g,'boombap',100).ok,false);assert.equal(chooseGenre(g,'drill',100).ok,false);
 assert.equal(chooseSpecialization(g,'drill',100).ok,false);assert.equal(chooseSpecialization(g,'boombap',99.99).ok,false);
 g=chooseSpecialization(g,'boombap',100).value;assert.equal(chooseSpecialization(g,'experimental',100).ok,false);
 g=addGenrePractice(addGenrePractice(g,'boombap',120),'experimental',120);assert.equal(g.xp.boombap,100);assert.equal(g.xp.experimental,75);assert.equal(genreCap(g,'boombap'),100);
 assert.equal(addGenrePractice(g,'drill',10).xp.drill,0);
});
test('malformed normalization enforces selected unique IDs and only primary reaches100',()=>{
 const g=normalizeGenreProgression({version:1,chosen:['bad','boombap','boombap','trap','lofi','drill'],primary:'drill',xp:{boombap:101,experimental:90,drill:100}});
 assert.deepEqual(g.chosen,['boombap','trap','lofi']);assert.equal(g.primary,null);assert.equal(g.xp.boombap,75);assert.equal(g.xp.experimental,75);assert.equal(g.xp.drill,0);
});
test('new projects default experimental, validate style access and preserve snapshots',()=>{
 let s=fresh();assert.equal(createBeat(s,{id:'locked',name:'No',genre:'boombap'},{beatmaking:100}).ok,false);
 s.music.genres=chooseGenre(s.music.genres,'boombap',25).value;
 s=createBeat(s,{id:'b',name:'Beat',genre:'boombap'},{beatmaking:25}).state;
 assert.equal(s.projects[0].genre,'boombap');assert.deepEqual(s.projects[0].genreProfile,genreSnapshot(s.music.genres,'boombap'));
 const created=createBeat(fresh(),{id:'e',name:'E'}).state.projects[0];assert.equal(created.genre,'experimental');assert.equal(created.genreProfile.xp,0);
 const snapshot=structuredClone(s.projects[0]);s.music.genres=addGenrePractice(s.music.genres,'boombap',50);
 assert.deepEqual(createVirtualPcState(s).projects[0],snapshot);
});
test('partial work credits general and only current genre once across resume',()=>{
 let s=createBeat(fresh(),{id:'b',name:'B'}).state;s=startBeatStage(s,'b',[5,5,5]).state;
 s=advanceBeatWork(s,s.music.job.total/2).state;assert.ok(Math.abs(s.music.genres.xp.experimental-1/6)<1e-10);
 s=createVirtualPcState(JSON.parse(JSON.stringify(s)));s=startBeatStage(s,'b',[0,0,0]).state;
 s=advanceBeatWork(s,600).state;assert.ok(Math.abs(s.music.genres.xp.experimental-1/3)<1e-10);assert.ok(Math.abs(s.music.practice-1/3)<1e-10);
 assert.equal(s.music.genres.xp.boombap,0);assert.deepEqual(advanceBeatWork(s,600).state,s);
});
test('legacy partial job receives genre credit only for remaining work; archive audio unchanged',()=>{
 let s=createBeat(fresh(),{id:'b',name:'B'}).state;s.projects[0].genre='practice';delete s.projects[0].genreProfile;
 s=startBeatStage(s,'b',[5,5,5]).state;s=advanceBeatWork(s,s.music.job.total/2).state;
 delete s.music.genres;delete s.music.job.genreCredit;delete s.music.job.genreProfile;
 const archived=structuredClone(s.projects);s=createVirtualPcState(s);assert.equal(s.music.genres.xp.experimental,0);
 s=advanceBeatWork(s,600).state;assert.ok(Math.abs(s.music.genres.xp.experimental-1/6)<1e-10);
 assert.deepEqual(s.projects[0].mix,archived[0].mix);assert.equal(s.projects[0].genreProfile,undefined);
});
test('genre migration backs up exact raw data and never overwrites after backup failure',()=>{
 const old=fresh();delete old.music.genres;old.music.genrePractice.boombap=44;const raw=JSON.stringify(old),map=new Map([[KEY,raw]]);
 const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 const loaded=loadVirtualPcState(storage);assert.equal(loaded.ok,true);assert.equal(map.get(KEY+'-before-genres'),raw);assert.equal(loaded.state.music.genres.xp.boombap,0);
 assert.equal(saveVirtualPcState(storage,loaded.state),true);
 const bad={getItem:k=>k===KEY?raw:null,setItem(){throw Error('quota');}};
 assert.equal(loadVirtualPcState(bad).reason,'genre-backup-failed');assert.equal(saveVirtualPcState(bad,loaded.state),false);assert.equal(bad.getItem(KEY),raw);
});
