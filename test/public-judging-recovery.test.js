import test from 'node:test';
import assert from 'node:assert/strict';
import {exportedSubmissionFixture,completeSubmissionUpload,completeSubmissionMessage} from './helpers/submission-fixtures.js';
import {activateSocial,advanceSocial} from '../src/social-runtime.js';
import {attachSubmissionTrack,sendSubmission} from '../src/social-submission.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {publicRoundTable} from '../src/battle-results-table.js';
const battle='makarevich-1';
function sent(){let s=activateSocial(exportedSubmissionFixture(),600).state;s=attachSubmissionTrack(s,{communityId:battle,fileId:'submission-file',nowMinute:601}).state;s=completeSubmissionMessage(completeSubmissionUpload(s));const r=sendSubmission(s,{communityId:battle,nowMinute:602});assert.equal(r.ok,true,r.reason);return r.state;}
test('13 September public judging completes without fetching audio, survives every boundary reload and never rescores history',()=>{
 const fetch=globalThis.fetch;globalThis.fetch=()=>{throw Error('Physical bank requested');};
 try{const initial=sent(),deadline=initial.battleWindows[0].closesAt;let s=initial;
  for(const at of [initial.battleSubmissions[0].ackAt,deadline,deadline+60,deadline+6*60,deadline+40*60,12*1440]){s=createVirtualPcState(JSON.parse(JSON.stringify(s)));const r=advanceSocial(s,at);assert.equal(r.reason,undefined);s=r.state;}
  const round=s.tournaments.byId[battle].rounds.selection;assert.equal(round.status,'complete');assert.equal(Object.keys(round.judgeBatches).length,5);const row=publicRoundTable(s,{battleId:battle,roundId:'selection',nowMinute:12*1440}).rows.find(r=>r.participantId==='player');assert.equal(row.scores.length,5);assert.ok(row.scores.every(s=>Number.isFinite(s.value)));
  const frozen=structuredClone(s.judging.results);s=advanceSocial(createVirtualPcState(s),12*1440+60).state;for(const [id,result] of Object.entries(frozen))assert.deepEqual(s.judging.results[id],result);assert.equal(s.social.dialogs[battle].messages.filter(m=>m.kind==='ack').length,1);
 }finally{globalThis.fetch=fetch;}
});
