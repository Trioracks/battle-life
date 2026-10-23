import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayerAlbumController,normalizePlayerAlbum,PLAYER_LIFE_SCENES,playerLifePosts} from '../src/player-life-photos.js';
import {normalizeSocial} from '../src/social-state.js';
import {DEFAULT_APPEARANCE} from '../src/avatar-v3-profile.js';
import {socialPhotoSource} from '../src/social-portraits.js';
const jpeg=(w=512)=>'data:image/jpeg;base64,'+Buffer.from([255,216,255,192,0,11,8,w>>8,w&255,w>>8,w&255,1,1,17,0,255,217]).toString('base64');
test('player album keeps two validated saved scenes, supplies real photos and authored comments',async()=>{
 let state={social:normalizeSocial({})},calls=0;const appearance={...DEFAULT_APPEARANCE};
 const c=createPlayerAlbumController({getState:()=>state,getAppearance:()=>appearance,render:async(look,stage)=>{assert.deepEqual(look,appearance);assert.ok(['school-group','barbecue'].includes(stage));calls++;return {url:jpeg()};},save:next=>{state=next;return true;}});
 await Promise.all([c.request(),c.request()]);assert.equal(calls,2);assert.equal(state.social.playerAlbum.photos.length,2);
 const saved=JSON.parse(JSON.stringify(state));assert.deepEqual(normalizeSocial(saved.social).playerAlbum,state.social.playerAlbum);await c.request();assert.equal(calls,2);
 assert.equal(socialPhotoSource(jpeg()),jpeg());assert.ok(playerLifePosts(state.social.playerAlbum.photos).every(p=>p.comments.length===2));
 assert.equal(normalizePlayerAlbum({...state.social.playerAlbum,photos:[{id:PLAYER_LIFE_SCENES[0].id,src:'https://remote/photo.jpg'}]}),null);
});
test('album retries after render/save failure and never overwrites a newer avatar or game changes',async()=>{
 let state={social:{}},appearance={...DEFAULT_APPEARANCE},fail=true,quota=false,calls=0;
 const c=createPlayerAlbumController({getState:()=>state,getAppearance:()=>appearance,render:async()=>{calls++;if(fail)throw Error('WebGL');return {url:jpeg()};},save:next=>{if(quota)return false;state=next;return true;}});
 assert.equal((await c.request()).ok,false);fail=false;quota=true;assert.equal((await c.request()).ok,false);const previous=calls;
 quota=false;state.message='new message';assert.equal((await c.request()).ok,true);assert.equal(calls,previous);assert.equal(state.message,'new message');
 let resolve;const delayed=createPlayerAlbumController({getState:()=>state,getAppearance:()=>appearance,render:()=>new Promise(r=>resolve=r),save:next=>{state=next;return true;}});
 appearance={...appearance,hair:'bald'};const pending=delayed.request();appearance={...appearance,hair:'buzz'};resolve({url:jpeg()});await Promise.resolve();resolve({url:jpeg()});assert.equal((await pending).stale,true);assert.equal(state.message,'new message');
});
