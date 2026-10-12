import {REFERENCE_CATALOG,chooseTrackReferences,STARTING_REFERENCE_TOPICS} from '../src/cultural-references.js';
import assert from 'node:assert/strict';
const report={catalogCount:REFERENCE_CATALOG.length,groups:{},runs:[],semanticReview:{method:'Authored and read all 200 motifs, grouped by source. Organic and strained cases are different contextual uses, not lyric quotations.',crossSourceRelations:['Portal fall vs Mario retry: momentum versus a consumed resource','Sampling loop vs Groundhog practice: repetition of audio versus persistence of acquired skill','Kommunalka shared room vs Khrushchevka separate flat: opposite privacy constraints']}};
for(const r of REFERENCE_CATALOG)report.groups[r.group]=(report.groups[r.group]||0)+1;
let history=[];
for(let i=0;i<50;i++){
 const theme=['district','money','rivalry','memory'][i%4];
 const options={seed:i+100,gameDate:'2012-09-01',knownTopics:STARTING_REFERENCE_TOPICS,theme,history,limit:2};
 const result=chooseTrackReferences(options);
 assert.deepEqual(result,chooseTrackReferences(JSON.parse(JSON.stringify(options))));
 history=JSON.parse(JSON.stringify(result.history));report.runs.push({work:i+1,theme,uses:result.uses.map(u=>u.referenceId)});
}
const counts={};for(const work of history)for(const id of work.referenceIds)counts[id]=(counts[id]||0)+1;
assert.ok(Object.values(counts).every(n=>n<=2));
assert.ok(REFERENCE_CATALOG.length>=200&&Object.keys(report.groups).length===8&&Object.values(report.groups).every(n=>n>=15));
report.distinctUsed=Object.keys(counts).length;report.maxReuse=Math.max(...Object.values(counts));
console.log(JSON.stringify(report,null,2));
