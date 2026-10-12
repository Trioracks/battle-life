import test from 'node:test';
import assert from 'node:assert/strict';
import * as portraits from '../src/social-portraits.js';
import {DEFAULT_APPEARANCE} from '../src/avatar-v3-profile.js';
import {normalizeSocial} from '../src/social-state.js';
import {SOCIAL_PROFILES} from '../src/social-catalog.js';
const jpeg=(w=256,h=256)=>'data:image/jpeg;base64,'+Buffer.from([255,216,255,192,0,11,8,h>>8,h&255,w>>8,w&255,1,1,17,0,255,217]).toString('base64');
test('portrait identity is canonical and changes with every relevant appearance field',()=>{
 assert.equal(typeof portraits.portraitKey,'function');const key=portraits.portraitKey(DEFAULT_APPEARANCE);
 assert.equal(portraits.portraitKey({...DEFAULT_APPEARANCE,irrelevant:'x'}),key);
 assert.notEqual(portraits.portraitKey({...DEFAULT_APPEARANCE,topColor:'red'}),key);
});
test('portrait whitelist verifies JPEG dimensions and byte budget, not supplied metadata',()=>{
 const valid={key:'portrait-v1:test',url:jpeg()};assert.deepEqual(portraits.normalizePlayerPortrait(valid),valid);
 for(const url of ['https://evil/photo.jpg','javascript:alert(1)',jpeg().replace('image/jpeg','image/png'),jpeg(512),jpeg(256,512),'data:image/jpeg;base64,'+'A'.repeat(140000),'data:image/jpeg;base64,////'])assert.equal(portraits.normalizePlayerPortrait({...valid,url}),null);
 const normalized=normalizeSocial({subscriptions:['makarevich-1'],playerPortrait:valid});assert.deepEqual(normalized.playerPortrait,valid);assert.deepEqual(normalized.subscriptions,['makarevich-1']);
});
test('portrait cache dedupes render; failed render/save can retry and never overwrites newer state',async()=>{
 let state={social:normalizeSocial({})},appearance={...DEFAULT_APPEARANCE},calls=0,fail=true,quota=false;
 const controller=portraits.createPlayerPortraitController({getState:()=>state,getAppearance:()=>appearance,render:async()=>{calls++;if(fail)throw Error('WebGL');return {url:jpeg()};},save:next=>{if(quota)return false;state=next;return true;}});
 assert.equal((await controller.request()).ok,false);assert.equal(state.social.playerPortrait,null);
 fail=false;quota=true;assert.equal((await controller.request()).ok,false);assert.equal(state.social.playerPortrait,null);
 quota=false;state.extra='concurrent change';assert.equal((await controller.request()).ok,true);assert.equal(state.extra,'concurrent change');
 const previous=calls;await Promise.all([controller.request(),controller.request()]);assert.equal(calls,previous);
 appearance={...appearance,hair:'bald'};await Promise.all([controller.request(),controller.request()]);assert.equal(calls,previous+1);
});
test('three acquaintances have their own avatar and two distinct personal photos',()=>{
 for(const id of ['anya','vitya','dasha']){const p=SOCIAL_PROFILES.find(x=>x.id===id);assert.match(p.avatar.src,/assets\/social\/photos\//);assert.ok(p.photos.length>=2);assert.equal(new Set(p.photos.map(x=>x.src)).size,p.photos.length);assert.ok(p.photos.every(x=>x.src&&!x.src.includes('wallpaper')));}
});
test('pending render cannot replace a newer appearance or discard concurrent game changes',async()=>{
 let appearance={...DEFAULT_APPEARANCE},state={social:{}},resolve;
 const controller=portraits.createPlayerPortraitController({getAppearance:()=>appearance,getState:()=>state,render:()=>new Promise(r=>resolve=r),save:next=>{state=next;return true;}});
 const pending=controller.request();state.other='new message';appearance={...appearance,hair:'bald'};resolve({url:jpeg()});assert.equal((await pending).stale,true);assert.equal(state.social.playerPortrait,undefined);assert.equal(state.other,'new message');
});
