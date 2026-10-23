import test from 'node:test';
import assert from 'node:assert/strict';
import {SOCIAL_COMMUNITIES,SOCIAL_PROFILES,communityById,profileById} from '../src/social-catalog.js';
import {backgroundAudioDescriptor} from '../src/social-audio-view.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {advanceGoblin} from '../src/goblin-mentor.js';
import {advanceFilya} from '../src/filya-calendar.js';
import {createSocialProfileView} from '../src/social-profile-view.js';
import {pcDocument,allPc} from './helpers/virtual-pc-dom.js';
test('six distinct fictional archive recordings live only in Makarevich and create no submissions',()=>{
 const demos=SOCIAL_COMMUNITIES.flatMap(c=>c.audio.map(d=>({...d,communityId:c.id})));
 assert.equal(demos.length,6);assert.ok(demos.every(d=>d.communityId==='makarevich-1'&&d.archive));
 assert.deepEqual(demos.map(d=>d.title),['Свет в окне','До последнего автобуса','Лестничная клетка','Сторона Б','После смены','Соседний двор']);
 assert.equal(new Set(demos.map(d=>d.author)).size,6);assert.ok(demos.every(d=>SOCIAL_PROFILES.some(p=>p.name===d.author&&p.fictional)));
 assert.equal(new Set(demos.map(d=>backgroundAudioDescriptor(d).parts.find(p=>p.id.startsWith('beginner-theme-')).id)).size,6,'archive authors have different primary melodies, not only different drums');
 assert.deepEqual(demos.map(d=>d.seed),[100,101,102,103,104,116]);
 const state=createVirtualPcState(),before=state.battleSubmissions.length;communityById('makarevich-1');assert.equal(state.battleSubmissions.length,before);
});
test('archive rows use complete eight-bar demo durations',()=>{
 for(const demo of SOCIAL_COMMUNITIES.flatMap(c=>c.audio))assert.ok(Math.abs(backgroundAudioDescriptor(demo).durationSeconds-64/3)<1e-9,demo.id+' lasts eight bars at 90 BPM');
});
test('twenty original communities cover everyday life, with stable dated history and one battle link',()=>{
 assert.equal(SOCIAL_COMMUNITIES.length,20);assert.equal(new Set(SOCIAL_COMMUNITIES.map(c=>c.id)).size,20);
 assert.ok(SOCIAL_COMMUNITIES.filter(c=>!['rap','battle','music'].includes(c.category)).length>=8);
 assert.equal(SOCIAL_COMMUNITIES.filter(c=>c.battleId==='makarevich-1').length,1);
 for(const c of SOCIAL_COMMUNITIES){assert.ok(c.avatar&&c.description&&c.memberCount>0&&c.members.length&&c.history.length>=2);assert.ok(c.history.every(p=>p.date<='2012-09-01'&&p.body&&p.likes>=0&&Array.isArray(p.comments)));}
 const c=communityById('makarevich-1');c.description='changed';assert.notEqual(communityById(c.id).description,'changed');
 assert.equal(communityById('missing'),null);
});
test('ordinary acquaintances have complete fictional profiles and musicians expose calendar-authored content',()=>{
 assert.ok(SOCIAL_PROFILES.length>=12);assert.ok(SOCIAL_PROFILES.filter(p=>!p.birthday).length>SOCIAL_PROFILES.length/2);
 assert.ok(SOCIAL_PROFILES.filter(p=>p.occupation!=='musician').length>=8);
 const calendarAuthors=new Set(['mak-npc-06','mc-filya']);
 for(const p of SOCIAL_PROFILES){assert.ok(p.name&&p.avatar&&p.description&&p.languages.length);if(!calendarAuthors.has(p.id)){assert.ok(p.photos.length&&p.wall.length,p.id+' has its catalog wall and photos');assert.equal(p.fictional,true);}}
 const state=advanceFilya(advanceGoblin(createVirtualPcState(),480).state,480,{random:()=>.42}).state,d=pcDocument();
 for(const id of calendarAuthors){
  const view=createSocialProfileView(d,{id,getState:()=>state,getMetadata:()=>({gameMinutes:480}),navigate(){},commit(){},audio:{stop(){}}}),nodes=allPc(view);
  assert.ok(nodes.filter(n=>n.className?.split(' ').includes('sn-post')).length>=2,id+' has its actual published calendar posts');
  assert.ok(nodes.some(n=>n.tagName==='IMG'&&n.getAttribute('alt')!=='Аватар: '+profileById(id).name),id+' has published life photos');
 }
 assert.equal(profileById('missing'),null);
});
