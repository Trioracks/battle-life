import test from 'node:test';
import assert from 'node:assert/strict';
import {submissionFixture} from './helpers/submission-fixtures.js';
import {migrateLegacySocial} from '../src/social-runtime.js';
import {createVirtualPcState,saveVirtualPcState,loadVirtualPcState,VIRTUAL_PC_STORAGE_KEY as KEY} from '../src/virtual-pc-state.js';
import {attachSubmissionTrack,sendSubmission} from '../src/social-submission.js';
function legacy(){
 const s=submissionFixture(),track=structuredClone(s.projects[1]),lyrics=structuredClone(s.projects[0]);
 s.battleSubmissions=[{version:1,battleId:'makarevich-1',roundId:'selection',revision:1,submittedDay:2,projectId:track.id,status:'pending',topicMatch:true,track,lyrics}];delete s.socialRuntime;return s;
}
test('legacy submission consumes its window without invented sent minute and schedules a single acknowledgement on activation',()=>{
 const old=legacy(),normalized=createVirtualPcState(old),s=migrateLegacySocial(normalized,3000).state,row=s.battleSubmissions[0];
 assert.equal(row.version,2);assert.equal(row.sentAt,null);assert.equal(row.migration.timePrecision,'day-only');assert.equal(row.legacyArchive.submittedDay,2);
 assert.ok(row.trackVersionId);assert.deepEqual(migrateLegacySocial(createVirtualPcState(s),4000).state.battleSubmissions,s.battleSubmissions);
 assert.equal(sendSubmission(s,{communityId:'makarevich-1',nowMinute:3001}).ok,false);
 assert.equal(attachSubmissionTrack(s,{communityId:'makarevich-1',projectId:'beat',nowMinute:3001}).ok,false);
});
test('damaged old work is preserved and still cannot gain a second attempt',()=>{
 const raw=legacy();raw.battleSubmissions[0].track.drumId='shop-01';const normalized=createVirtualPcState(raw),archive=structuredClone(normalized.battleSubmissions[0]);
 const s=migrateLegacySocial(normalized,3000).state;assert.equal(s.battleSubmissions[0].status,'recovery');assert.deepEqual(s.battleSubmissions[0].legacyArchive,archive);
 assert.equal(sendSubmission(s,{communityId:'makarevich-1',nowMinute:3001}).ok,false);
});
test('migration backup quota failure cannot overwrite original or lose pending track',()=>{
 const old=legacy(),json=JSON.stringify(old),store=new Map([[KEY,json]]),storage={getItem:k=>store.get(k)??null,setItem(k,v){if(k.endsWith('-before-social-delivery'))throw Error('quota');store.set(k,v);}};
 const r=loadVirtualPcState(storage);assert.equal(r.ok,false);assert.equal(r.reason,'social-delivery-backup-failed');
 assert.equal(saveVirtualPcState(storage,r.state),false);assert.equal(store.get(KEY),json);
});
