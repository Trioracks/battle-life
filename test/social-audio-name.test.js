import test from 'node:test';
import assert from 'node:assert/strict';
import {exportedSubmissionFixture,completeSubmissionUpload,completeSubmissionMessage} from './helpers/submission-fixtures.js';
import {ensureBattleWindow} from '../src/battle-windows.js';
import {attachSubmissionTrack,sendSubmission} from '../src/social-submission.js';
import {createSocialAudio} from '../src/social-audio-view.js';
import {mountSocialDialog} from '../src/social-dialog-view.js';
import {pcDocument,allPc} from './helpers/virtual-pc-dom.js';
test('a sent audio attachment displays its exported filename rather than the earlier project title',()=>{
 let s=ensureBattleWindow(exportedSubmissionFixture(),{battleId:'makarevich-1',nowMinute:600}).state;s=completeSubmissionMessage(completeSubmissionUpload(attachSubmissionTrack(s,{communityId:'makarevich-1',fileId:'submission-file',nowMinute:601}).state));s=sendSubmission(s,{communityId:'makarevich-1',nowMinute:602}).state;
 const d=pcDocument(),audio=createSocialAudio({capabilities:{recordedPlayback:false,reason:'Музыка и вокал отключены в тестовой веб-версии'},stop(){}},{getState:()=>s}),view=mountSocialDialog(d,{id:'makarevich-1',getState:()=>s,getMetadata:()=>({gameMinutes:602}),navigate(){},commit:()=>true,audio});assert.ok(allPc(view.root).some(n=>n.textContent==='submission-file'));view.dispose();audio.dispose();
});
