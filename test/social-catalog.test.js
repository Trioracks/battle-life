import test from 'node:test';
import assert from 'node:assert/strict';
import {SOCIAL_COMMUNITIES,SOCIAL_PROFILES,communityById,profileById} from '../src/social-catalog.js';
import {backgroundAudioDescriptor} from '../src/social-audio-view.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
test('six distinct fictional archive recordings live only in Makarevich and create no submissions',()=>{
 const demos=SOCIAL_COMMUNITIES.flatMap(c=>c.audio.map(d=>({...d,communityId:c.id})));
 assert.equal(demos.length,6);assert.ok(demos.every(d=>d.communityId==='makarevich-1'&&d.archive));
 assert.deepEqual(demos.map(d=>d.title),['Свет в окне','До последнего автобуса','Лестничная клетка','Сторона Б','После смены','Соседний двор']);
 assert.equal(new Set(demos.map(d=>d.author)).size,6);assert.ok(demos.every(d=>SOCIAL_PROFILES.some(p=>p.name===d.author&&p.fictional)));
 assert.equal(new Set(demos.map(d=>JSON.stringify(backgroundAudioDescriptor(d).parts))).size,6);
 assert.deepEqual(demos.map(d=>d.seed),[100,101,102,103,104,116]);
 const state=createVirtualPcState(),before=state.battleSubmissions.length;communityById('makarevich-1');assert.equal(state.battleSubmissions.length,before);
});
test('twenty original communities cover everyday life, with stable dated history and one battle link',()=>{
 assert.equal(SOCIAL_COMMUNITIES.length,20);assert.equal(new Set(SOCIAL_COMMUNITIES.map(c=>c.id)).size,20);
 assert.ok(SOCIAL_COMMUNITIES.filter(c=>!['rap','battle','music'].includes(c.category)).length>=8);
 assert.equal(SOCIAL_COMMUNITIES.filter(c=>c.battleId==='makarevich-1').length,1);
 for(const c of SOCIAL_COMMUNITIES){assert.ok(c.avatar&&c.description&&c.memberCount>0&&c.members.length&&c.history.length>=2);assert.ok(c.history.every(p=>p.date<='2012-09-01'&&p.body&&p.likes>=0&&Array.isArray(p.comments)));}
 const c=communityById('makarevich-1');c.description='changed';assert.notEqual(communityById(c.id).description,'changed');
 assert.equal(communityById('missing'),null);
});
test('ordinary acquaintances and musicians have complete profiles without fabricated real identities',()=>{
 assert.ok(SOCIAL_PROFILES.length>=12);assert.ok(SOCIAL_PROFILES.filter(p=>!p.birthday).length>SOCIAL_PROFILES.length/2);
 assert.ok(SOCIAL_PROFILES.filter(p=>p.occupation!=='musician').length>=8);
 for(const p of SOCIAL_PROFILES){assert.ok(p.name&&p.avatar&&p.description&&p.languages.length&&p.photos.length&&p.wall.length);assert.equal(p.fictional,true);}
 assert.equal(profileById('missing'),null);
});
