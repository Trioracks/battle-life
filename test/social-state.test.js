import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSocial,listCommunities,subscribeCommunity,profileAccess,addSocialFriend,grantOpponentAccess} from '../src/social-state.js';
import {createVirtualPcState,saveVirtualPcState,loadVirtualPcState} from '../src/virtual-pc-state.js';
test('subscriptions sort first, deduplicate and preserve forum and work through save/load',()=>{
 const initial=createVirtualPcState();initial.community.drafts={'concrete-echo-general':{body:'forum stays',quoteId:null}};const source=JSON.stringify(initial);
 const once=subscribeCommunity(initial,'makarevich-1',true);assert.ok(once.ok);
 const twice=subscribeCommunity(once.state,'makarevich-1',true);assert.equal(listCommunities(twice.state,{query:''})[0].id,'makarevich-1');
 assert.equal(twice.state.social.subscriptions.length,1);assert.equal(JSON.stringify(initial),source);
 assert.ok(listCommunities(twice.state,{query:'велосипед'}).some(c=>c.id==='city-cycling'));
 const store=new Map(),storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
 assert.ok(saveVirtualPcState(storage,twice.state));const loaded=loadVirtualPcState(storage).state;
 assert.deepEqual(loaded.social,twice.state.social);assert.deepEqual(loaded.community,initial.community);
 assert.equal(subscribeCommunity(initial,'missing',true).ok,false);
 assert.equal(subscribeCommunity(twice.state,'makarevich-1',false).state.social.subscriptions.length,0);
});
test('friend button cannot reveal strangers; known and past opponents stay accessible',()=>{
 let state=createVirtualPcState();assert.ok(profileAccess(state,'me').allowed);assert.ok(profileAccess(state,'anya').allowed);
 assert.equal(profileAccess(state,'sever').allowed,false);assert.equal(addSocialFriend(state,'sever').ok,false);
 state=grantOpponentAccess(state,'sever').state;assert.ok(profileAccess(state,'sever').allowed);
 state=addSocialFriend(state,'sever').state;assert.equal(state.social.friends.filter(id=>id==='sever').length,1);
 state={...state,social:normalizeSocial(JSON.parse(JSON.stringify(state.social)))};assert.ok(profileAccess(state,'sever').allowed);
 assert.equal(grantOpponentAccess(state,'unknown').ok,false);
});
test('normalization is deterministic, filters broken lists, and preserves new social records independently',()=>{
 const raw={subscriptions:['makarevich-1','makarevich-1','bad'],friends:['bad'],accessibleProfiles:['sever'],personalAudioIds:['a','a'],dialogs:{'makarevich-1':{messages:[],draftVersionId:'a'}},posts:[{id:'post',body:'hello'}],reactions:[{id:'reaction'}]};
 const a=normalizeSocial(raw),b=normalizeSocial(a);assert.deepEqual(a,b);assert.equal(a.personalAudioIds.length,1);assert.equal(a.dialogs['makarevich-1'].draftVersionId,'a');
 a.dialogs['makarevich-1'].messages.push({id:'x'});assert.equal(raw.dialogs['makarevich-1'].messages.length,0);
 assert.deepEqual(normalizeSocial(null),normalizeSocial(null));
});
