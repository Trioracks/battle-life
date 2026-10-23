import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {profileById} from '../src/social-catalog.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {publicCharacterProfile,normalizeNpcSocialProfiles} from '../src/npc-social-profiles.js';
import {npcLifeStory} from '../src/social-life-stories.js';
import {opponentFixture} from './helpers/social-profile-fixture.js';
test('Vitya has four illustrated life stages and comments from several acquaintances, not a blank gallery',()=>{
 const p=profileById('vitya');assert.equal(p.photos.length,4);
 for(const stage of ['school','college','army','work'])assert.ok(p.photos.some(x=>x.id==='vitya-'+stage));
 for(const photo of p.photos)assert.ok(existsSync(new URL('../'+photo.src,import.meta.url)));
 assert.ok(p.wall.length>=4);assert.ok(p.wall.every(post=>post.photoId&&p.photos.some(x=>x.id===post.photoId)));
 assert.ok(new Set(p.wall.flatMap(post=>post.comments.map(c=>c.authorId??c.authorName))).size>=3);
 assert.ok(p.wall.some(post=>post.comments.some(c=>/деньги|долг/.test(c.body))));
});
test('life photo assets exist for every personal identity and ordinary life applies to roughly 70 percent',()=>{
 const profiles=Object.values(normalizeNpcSocialProfiles().byId).filter(p=>p.profileType==='personal'),stories=profiles.map(npcLifeStory);
 assert.equal(stories.filter(s=>s.ordinary).length,4);assert.equal(stories.length,6);
 for(const story of stories)for(const photo of story.photos)assert.ok(existsSync(new URL('../'+photo.src,import.meta.url)),photo.src);
});
test('a changed saved appearance never receives photographs of a different face',()=>{
 const state=opponentFixture(),p=state.npcSocialProfiles.byId['mak-npc-01'];p.appearance={...p.appearance,hair:p.appearance.hair==='buzz'?'short':'buzz'};
 const projection=publicCharacterProfile(state,{characterId:p.characterId,nowMinute:14000});
 assert.ok(projection.photos.every(photo=>!photo.src?.includes('/life/')));
});
test('personal NPC stories keep identity after load, stay private until access, and include distinct dated scenes',()=>{
 const state=opponentFixture(),profile=publicCharacterProfile(state,{characterId:'mak-npc-01',nowMinute:14000});
 assert.ok(profile.photos.some(p=>p.id.includes(':school')));assert.ok(profile.posts.some(p=>p.photoId));
 const restored={...state,npcSocialProfiles:createVirtualPcState(JSON.parse(JSON.stringify(state))).npcSocialProfiles};
 assert.deepEqual(publicCharacterProfile(restored,{characterId:'mak-npc-01',nowMinute:14000}),profile);
 assert.equal(publicCharacterProfile(state,{characterId:'mak-npc-02',nowMinute:14000}).photos,undefined);
 assert.ok(profile.posts.filter(p=>p.photoId).every(p=>p.at<=14000&&p.comments.length>0));
});
