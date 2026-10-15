import test from 'node:test';
import assert from 'node:assert/strict';
import {studySkills} from './helpers/analysis-fixture.js';
const api=await import('../src/rap-dossier-forecast.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
const report=(band=4,confidence=.2,trackVersionId='own')=>({id:'report:'+trackVersionId,subjectId:trackVersionId==='own'?'player':'rival',trackVersionId,trackName:'Запись',createdAt:100,heroSnapshot:studySkills(confidence*100),sourceIds:[trackVersionId],reviewIds:[],observations:Object.fromEntries(['text','performance','music','sound'].map(k=>[k,{band,confidence}]))});
test('missing or malformed reports never invent numeric forecasts',()=>{
 assert.equal(typeof api.publicTrackForecast,'function');
 for(const r of [null,{}, {...report(),observations:{text:{band:99,confidence:2}}}]){const f=api.publicTrackForecast({report:r});assert.equal(f.status,'unavailable');assert.equal(f.range,null);assert.equal(f.label,'Моё предположение');}
});
test('low-confidence ranges stay broad at both score boundaries and use subjective band midpoints',()=>{
 assert.equal(typeof api.publicTrackForecast,'function');
 for(const band of [0,4,7]){const f=api.publicTrackForecast({report:report(band,.2),scale:50});assert.ok(f.range[1]-f.range[0]>=22.5);assert.ok(f.range[0]>=0&&f.range[1]<=50);}
 const f=api.publicTrackForecast({report:report(4,.9),scale:80});assert.equal((f.range[0]+f.range[1])/2,45);
});
test('learned evidence narrows uncertainty with fifteen-percent floor; missing axes widen it',()=>{
 assert.equal(typeof api.publicTrackForecast,'function');
 const r=report(4,.9),old=JSON.stringify(r),base=api.publicTrackForecast({report:r});
 const hypotheses=[{judgeId:'j',aspect:'text',stage:'confident',sources:['review']}];
 const learned=api.publicTrackForecast({report:r,judgeHypotheses:hypotheses});assert.ok(learned.range[1]-learned.range[0]<base.range[1]-base.range[0]);assert.ok(learned.range[1]-learned.range[0]>=7.5);assert.ok(learned.sources.includes('review'));
 const partial=structuredClone(r);partial.observations.text.band=null;const missing=api.publicTrackForecast({report:partial});assert.ok(missing.range[1]-missing.range[0]>base.range[1]-base.range[0]);assert.equal(JSON.stringify(r),old);
 assert.deepEqual(api.publicTrackForecast({report:r,privateData:{weights:{text:999},raw:50}}),base);
});
test('pair forecasts are qualitative, unknown with missing or same-version reports, and never promise a win',()=>{
 assert.equal(typeof api.publicTrackForecast,'function');
 for(const other of [null,report(7,.9),{...report(1,.9,'other'),sourceIds:['wrong-version']}]){const f=api.publicTrackForecast({report:report(7,.9),scale:null,comparisonReport:other});assert.equal(f.range,null);assert.equal(f.comparison.status,'unknown');}
 const f=api.publicTrackForecast({report:report(7,.9),scale:null,comparisonReport:report(0,.9,'other')});assert.equal(f.comparison.status,'leans-own');assert.equal(f.range,null);assert.match(f.comparison.text,/не гарант/);assert.ok(!('probability' in f));
});
