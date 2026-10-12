import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveSocialRoute} from '../src/social-routing.js';
import {resolveUnderweb} from '../src/virtual-pc-catalog.js';
import {mountUnderweb} from '../src/underweb-view.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {pcDocument,findButton} from './helpers/virtual-pc-dom.js';
test('six section routes and strict nested routes resolve through the real browser catalogue',()=>{
 for(const section of ['me','friends','photos','audio','messages','groups']){const r=resolveSocialRoute('underweb://social/'+section);assert.equal(r.section,section);assert.equal(resolveUnderweb(r.url).type,'social');}
 for(const path of ['profile/anya','community/makarevich-1','dialog/makarevich-1'])assert.equal(resolveSocialRoute('underweb://social/'+path).type,'social');
 for(const path of ['ads','profile/anya/secret','profile/','community/not-there'])assert.equal(resolveSocialRoute('underweb://social/'+path),null);
 assert.ok(resolveUnderweb('В кругу').results.some(r=>r.url==='underweb://social/me'));
});
test('browser bookmark, battle community link and back/forward preserve social routes',()=>{
 const d=pcDocument(),root=d.createElement('div'),state=createVirtualPcState();
 const view=mountUnderweb(root,{getState:()=>state,getMetadata:()=>({gameDay:1}),onChange:()=>true,onApply:()=>{}});
 findButton(root,'В кругу').click();assert.equal(view.snapshot.route.section,'me');
 findButton(root,'Мои сообщества').click();assert.equal(view.snapshot.route.section,'groups');
 findButton(root,'Назад в Underweb').click();assert.equal(view.snapshot.route.section,'me');
 findButton(root,'Вперёд в Underweb').click();assert.equal(view.snapshot.route.section,'groups');
 view.navigate('underweb://battles/makarevich-1');findButton(root,'Сообщество баттла →').click();assert.equal(view.snapshot.route.communityId,'makarevich-1');view.dispose();
});
