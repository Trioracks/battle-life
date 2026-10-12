import test from 'node:test';
import assert from 'node:assert/strict';
import {SOCIAL_IDENTITY} from '../src/social-identity.js';
import {mountUnderweb} from '../src/underweb-view.js';
import {mountSocial} from '../src/social-view.js';
import {resolveUnderweb} from '../src/virtual-pc-catalog.js';
import {resolveSocialRoute} from '../src/social-routing.js';
import {ensureBattleWindow} from '../src/battle-windows.js';
import {attachSubmissionTrack,sendSubmission} from '../src/social-submission.js';
import {advanceSocial} from '../src/social-runtime.js';
import {submissionFixture,completeSubmissionUpload,completeSubmissionMessage} from './helpers/submission-fixtures.js';
import {pcDocument,allPc,findButton} from './helpers/virtual-pc-dom.js';
test('V krugu identity is shared by header, search and new notifications',()=>{
 assert.deepEqual(SOCIAL_IDENTITY,{name:'В кругу',mark:'в',year:2012});
 const d=pcDocument(),root=d.createElement('main');let state=ensureBattleWindow(submissionFixture(),{battleId:'makarevich-1',nowMinute:600}).state;
 mountSocial(root,{route:resolveSocialRoute('underweb://social/me'),getState:()=>state,onChange(){},navigate(){}});
 assert.equal(root.children[0].getAttribute('aria-label'),'В кругу');
 assert.ok(allPc(root).some(n=>n.className==='sn-brandmark'&&n.textContent==='в'));
 assert.ok(resolveUnderweb('В кругу').results.some(r=>r.url==='underweb://social/me'&&r.title.includes('друзья')));
 state=attachSubmissionTrack(state,{communityId:'makarevich-1',projectId:'beat',nowMinute:601}).state;
 state=sendSubmission(completeSubmissionMessage(completeSubmissionUpload(state)),{communityId:'makarevich-1',nowMinute:601}).state;
 const next=advanceSocial(state,state.battleSubmissions[0].ackAt);assert.equal(next.events[0].source,'В кругу');
});
test('general social network is above news and second in browser bookmarks',()=>{
 const d=pcDocument(),root=d.createElement('main');mountUnderweb(root,{getState:()=>submissionFixture(),getMetadata:()=>({gameDay:1}),onChange(){}});
 const nodes=allPc(root),entry=findButton(root,'В кругу — найди друзей и одноклассников');assert.ok(entry);
 assert.ok(nodes.indexOf(entry)<nodes.findIndex(n=>n.className==='uw-news-panel'));
 const nav=nodes.find(n=>n.getAttribute('aria-label')==='Избранное Underweb');assert.deepEqual(nav.children.filter(n=>n.tagName==='BUTTON').slice(0,2).map(n=>n.textContent),['Искра','В кругу']);
});
