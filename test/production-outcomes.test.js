import test from 'node:test';
import assert from 'node:assert/strict';
import {submissionFixture} from './helpers/submission-fixtures.js';
import {createVocalTake,normalizeRecording} from '../src/vocal-result.js';
const api=await import('../src/production-outcomes.js').catch(()=>({}));

test('nine writing components are realized and preserved at completion',()=>{
 const state=submissionFixture(),p=state.projects.find(p=>p.id==='lyrics');
 assert.equal(p.productionOutcome?.schemaVersion,1);
 const keys=['text.clarity','text.theme','text.personal','text.rhymes','text.line_rhythm','text.complexity','text.images','text.originality','text.image_density'];
 const targets=[[8,7,6],[8,8,5],[8,7,5]];
 for(let i=0;i<keys.length;i++){const s=p.stages[Math.floor(i/3)],value=s.skill*(.55+.45*(1-Math.abs(s.sliders[i%3]-targets[Math.floor(i/3)][i%3])/10));assert.ok(Math.abs(p.productionOutcome.components[keys[i]].value-value)<1e-8);}
 assert.equal(p.productionOutcome.availability['music.melody'],'unknown');
 assert.equal(p.productionOutcome.facts.some(f=>f.key==='text.story'),false);
});

test('music scale caps at ten without converting the 44 equipment ceiling to ten',()=>{
 assert.equal(typeof api.beatOutcomes,'function');
 for(const quality of [100,110])assert.equal(api.beatOutcomes({result:{quality},recipe:null,descriptor:null}).qualities.music,10);
 const take=createVocalTake({skills:{flow:100,sound:100,musicality:100,confidence:100},sliders:[8,8,8]});
 assert.equal(take.quality,44);assert.ok(take.productionOutcome.qualities.performance>9);
 assert.equal(take.productionOutcome.qualities.sound,4.4);
});

test('recording normalization preserves a versioned produced result instead of recomputing it',()=>{
 const state=submissionFixture(),r=structuredClone(state.projects.find(p=>p.id==='beat').recording);
 assert.equal(r.draft.resultVersion,1);r.draft.quality=12.345;
 const result=normalizeRecording(r);assert.equal(result.draft.quality,12.345);
 assert.deepEqual(result.draft.productionOutcome,r.draft.productionOutcome);
});

test('legacy properties stay limited; missing results do not invent music clipping or story',()=>{
 assert.equal(typeof api.lyricOutcomes,'function');
 const result=api.lyricOutcomes({project:{id:'old',stages:[],sections:[]}});
 assert.equal(result.qualities.text,null);
 assert.equal(result.facts.some(f=>/clip|story|melody/.test(f.key)),false);
 assert.equal(result.availability['text.clarity'],'unknown');
});
