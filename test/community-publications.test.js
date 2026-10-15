import test from 'node:test';
import assert from 'node:assert/strict';
import {topicFixture} from './helpers/round-topic-fixture.js';
import {profileAccess} from '../src/social-profile-policy.js';
import {ensureSocialReactionPlans,publicJudgeAnnouncements,setPostVote,publicPostReactions,normalizeSocialReactions} from '../src/social-reactions.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {opponentFixture} from './helpers/social-profile-fixture.js';
const api=await import('../src/social-community-publications.js').catch(()=>({}));
const options=nowMinute=>({communityId:'makarevich-1',nowMinute});
test('judge introductions spread over the first week and only published people get public access',()=>{
 assert.equal(typeof api.publicCommunityPosts,'function','canonical publication API exists');
 const s=topicFixture(),author=s.roundThemes['makarevich-1:round-2'].authorJudgeId;
 const early=api.publicCommunityPosts(s,options(13440));
 assert.equal(early.filter(p=>p.kind==='judge-announcement').length,0);
 assert.equal(profileAccess(s,{characterId:author,nowMinute:13440}).canView,true);
 for(const id of s.tournaments.byId['makarevich-1'].rounds['round-2'].judgeIds.filter(id=>id!==author))assert.equal(profileAccess(s,{characterId:id,nowMinute:13440}).canView,false);
 const posts=api.publicCommunityPosts(s,options(23519)).filter(p=>p.kind==='judge-announcement');
 assert.equal(posts.length,3);assert.equal(new Set(posts.map(p=>p.at)).size,3);
 assert.ok(posts.every(p=>p.at>13440&&p.at<23520));
 assert.deepEqual(posts.map(p=>p.at),[13800,17940,22080]);
 assert.equal(new Set(posts.map(p=>p.body)).size,3);
 assert.ok(posts.every(p=>!/панел/i.test(p.body)),'introductions describe judges without panel language');
 for(const p of posts){assert.equal(p.authorId,'makarevich-1');assert.match(p.authorName,/организаторы/);assert.equal(profileAccess(s,{characterId:p.judgeId,nowMinute:p.at}).canView,true);assert.equal(p.profile,undefined);assert.equal(p.weights,undefined);}
 assert.equal(api.publicAnnouncedJudges(s,{battleId:'makarevich-1',roundId:'round-2',nowMinute:13439}).length,0);
 assert.deepEqual(api.publicAnnouncedJudges(s,{battleId:'makarevich-1',roundId:'round-2',nowMinute:13440}).map(p=>p.id),[author]);
 assert.deepEqual(publicJudgeAnnouncements(s,23519).map(p=>p.id),posts.map(p=>p.id));
});
test('migration preserves already-public judge posts and their saved votes on reload',()=>{
 assert.equal(typeof api.ensureCommunityPublications,'function');
 let s=topicFixture();s.socialRuntime.lastMinute=13440;
 s=ensureSocialReactionPlans(s,13440).state;
 const id='announce:judge:eparhiya';
 s=setPostVote(s,{postId:id,vote:'like',nowMinute:13440}).state;
 const before=structuredClone(s.socialReactions);
 s=api.ensureCommunityPublications(s,13440).state;
 const posts=api.publicCommunityPosts(s,options(13440));
 assert.equal(posts.filter(p=>p.kind==='judge-announcement').length,3);
 assert.ok(posts.some(p=>p.id==='makarevich-1-welcome'));
 s=createVirtualPcState(s);assert.deepEqual(s.socialReactions,before);
 assert.deepEqual(api.publicCommunityPosts(s,options(13440)),posts);
});
test('new judges in a later round get cadence, existing judges are not reintroduced',()=>{
 assert.equal(typeof api.publicCommunityPosts,'function');
 const s=topicFixture(),t=s.tournaments.byId['makarevich-1'];
 t.rounds.final={...t.rounds['round-2'],roundId:'final',opensAt:30000,closesAt:40080,judgeIds:['eparhiya','thirty-third','audience']};
 s.roundThemes['makarevich-1:final']={...s.roundThemes['makarevich-1:round-2'],id:'makarevich-1:final',roundId:'final',opensAt:30000,closesAt:40080};
 t.events.push({id:'final',type:'round-announced',battleId:t.battleId,roundId:'final',dueAt:30000,themeId:'makarevich-1:final'});
 const posts=api.publicCommunityPosts(s,options(40079)).filter(p=>p.kind==='judge-announcement');
 assert.equal(posts.filter(p=>p.judgeId==='eparhiya').length,1);
 assert.equal(posts.find(p=>p.judgeId==='audience').at,30360);
});
test('static authored counts and comments survive interactive like/dislike switching and reload',()=>{
 let s=ensureSocialReactionPlans(topicFixture(),13440).state;
 const postId='makarevich-1-welcome',result=setPostVote(s,{postId,vote:'like',nowMinute:13440});
 assert.equal(result.ok,true,'static published post accepts a viewer vote');s=result.state;
 let view=publicPostReactions(s.socialReactions.plans[postId],13440,s.socialReactions.votes[postId]);
 assert.equal(view.likes,4);assert.equal(view.dislikes,0);assert.equal(view.comments.length,1);
 s=setPostVote(s,{postId,vote:'dislike',nowMinute:13440}).state;s=createVirtualPcState(s);
 view=publicPostReactions(s.socialReactions.plans[postId],13440,s.socialReactions.votes[postId]);
 assert.equal(view.likes,3);assert.equal(view.dislikes,1);assert.equal(view.comments[0].body,'Загляну вечером.');
});
test('legacy published judge access survives an old round announcement without theme metadata',()=>{
 const s=opponentFixture();s.socialRuntime.lastMinute=13440;
 assert.equal(profileAccess(s,{characterId:'eparhiya',nowMinute:13440}).canView,true);
 assert.equal(profileAccess(s,{characterId:'eparhiya',nowMinute:13439}).canView,false);
});
test('damaged cadence and read cursors are quarantined without replacement',()=>{
 const s=topicFixture();s.social.communityPublications={version:99,legacyCutoff:'bad'};s.social.communityReads={'makarevich-1':{at:-3,ids:'broken'}};
 const loaded=createVirtualPcState(s);
 assert.equal(loaded.social.communityPublications,null);assert.deepEqual(loaded.social.communityReads,{});
 assert.equal(loaded.social.communityPublicationRecovery.length,2);
 const initialized=api.ensureCommunityPublications(loaded,19920);
 assert.equal(initialized.state,loaded);assert.equal(initialized.changed,false);
});
test('damaged authored reaction baselines are kept in recovery instead of silently clamped',()=>{
 const s=ensureSocialReactionPlans(topicFixture(),13440).state,id='makarevich-1-welcome';
 s.socialReactions.plans[id].staticCounts.likes=-2;
 const normalized=normalizeSocialReactions(s.socialReactions);
 assert.equal(normalized.plans[id],undefined);assert.equal(normalized.recovery.find(p=>p.id===id).recoveryData.staticCounts.likes,-2);
});
