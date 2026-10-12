import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const api = await import('../src/cultural-references.js').catch(()=>({}));
const read = path => fs.existsSync(new URL(path,import.meta.url)) ? JSON.parse(fs.readFileSync(new URL(path,import.meta.url))) : [];
const catalog=read('../data/references/catalog.json');
const sources=read('../docs/research/package-one-reference-sources.json');

test('catalog has 200 distinct grounded motifs across eight covered groups',()=>{
 assert.ok(catalog.length>=200);
 assert.equal(new Set(catalog.map(r=>r.id)).size,catalog.length);
 assert.equal(new Set(catalog.map(r=>r.sourceId+'|'+r.motif)).size,catalog.length);
 const groups=new Set(catalog.map(r=>r.group)); assert.equal(groups.size,8);
 for(const group of groups)assert.ok(catalog.filter(r=>r.group===group).length>=15,group);
 for(const r of catalog){
  assert.ok(sources.some(s=>s.id===r.sourceId&&s.url.startsWith('https://')&&s.verifiedAt));
  assert.ok(r.motif.length>8&&r.uses.organic.length>8&&r.uses.strained.length>8);
  assert.notEqual(r.uses.organic,r.uses.strained);
  assert.ok(r.themes.length&&r.obviousness>=0&&r.obviousness<=1);
 }
});

test('availability respects date, actual knowledge and topic; malformed dates fail closed',()=>{
 assert.equal(typeof api.availableReferences,'function');
 const rows=[{id:'old',group:'games',availableFrom:'2010-01-01',themes:['district']},{id:'future',group:'games',availableFrom:'2013-01-01',themes:['district']},{id:'unknown',group:'literature',availableFrom:'1900-01-01',themes:['district']},{id:'money',group:'games',availableFrom:'2010-01-01',themes:['money']}];
 const query={gameDate:'2012-09-01',knownTopics:['games'],theme:'district'};
 assert.deepEqual(api.availableReferences(query,rows).map(r=>r.id),['old']);
 assert.deepEqual(api.availableReferences({...query,gameDate:'tomorrow'},rows),[]);
 assert.deepEqual(api.availableReferences({...query,knownTopics:[]},rows),[]);
});

test('fifty saved works are deterministic and never overuse a motif; exhaustion yields no reference',()=>{
 assert.equal(typeof api.chooseTrackReferences,'function');
 let history=[];
 for(let n=0;n<50;n++){
  const input={seed:n+41,gameDate:'2012-09-01',knownTopics:['games','animation','everyday','internet'],theme:['district','money','rivalry','memory'][n%4],history,limit:2};
  const result=api.chooseTrackReferences(input,catalog);
  assert.deepEqual(result,api.chooseTrackReferences(JSON.parse(JSON.stringify(input)),catalog));
  for(const use of result.uses){assert.equal(use.origin,'production-simulation');assert.ok(catalog.some(r=>r.id===use.referenceId&&r.sourceId===use.sourceId));}
  assert.deepEqual(history,input.history,'caller history not mutated');history=JSON.parse(JSON.stringify(result.history));
 }
 const counts=new Map();for(const work of history)for(const id of work.referenceIds)counts.set(id,(counts.get(id)||0)+1);
 assert.ok([...counts.values()].every(n=>n<=2));
 const one=catalog.find(r=>r.group==='games');
 const opts={seed:1,gameDate:'2012-09-01',knownTopics:['games'],theme:one.themes[0],history:[{referenceIds:[one.id]},{referenceIds:[one.id]}],limit:2};
 assert.deepEqual(api.chooseTrackReferences(opts,[one]).uses,[]);
 assert.ok(api.STARTING_REFERENCE_TOPICS.length<8);
});

test('every judge has explicit fictional source knowledge, not omniscient recognition',async()=>{
 const {JUDGE_PROFILES}=await import('../src/judge-profiles.js');
 assert.equal(typeof api.judgeReferenceKnowledge,'function');
 for(const judge of JUDGE_PROFILES){const k=api.judgeReferenceKnowledge(judge.id);assert.equal(k.status,'fictional_game_configuration');assert.ok(k.sourceIds.length>0&&k.sourceIds.length<sources.length);for(const id of k.sourceIds)assert.ok(sources.some(s=>s.id===id));}
 assert.deepEqual(api.judgeReferenceKnowledge('missing').sourceIds,[]);
});
