import test from 'node:test';
import assert from 'node:assert/strict';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {advanceFilya} from '../src/filya-calendar.js';
import {createSocialProfileView} from '../src/social-profile-view.js';
import {mountSocial} from '../src/social-view.js';
import {mountVirtualPc} from '../src/virtual-pc-ui.js';
import {resolveSocialRoute} from '../src/social-routing.js';
import {pcDocument,allPc,findButton,fire} from './helpers/virtual-pc-dom.js';
const has=(n,c)=>n.className?.split(' ').includes(c);
const setup=()=>{let state=advanceFilya(createVirtualPcState(),480,{random:()=>.42}).state;const d=pcDocument(),visited=[];
 const options={getState:()=>state,getMetadata:()=>({gameMinutes:480,playerName:'Гриша'}),navigate:u=>visited.push(u),commit:r=>{state=createVirtualPcState(JSON.parse(JSON.stringify(r.state)));return true;},audio:{stop(){}}};
 return {d,options,visited,view:kind=>createSocialProfileView(d,{...options,id:'mc-filya',view:kind})};};
test('current profile section is disabled; friends contains only mutual friends and no sidebar shortcuts',()=>{
 const {view,options}=setup();
 for(const kind of ['page','photos','audio','friends']){const root=view(kind),aside=root.children[0],buttons=allPc(aside).filter(n=>n.tagName==='BUTTON');
  assert.equal(buttons.filter(b=>b.disabled).length,1);assert.equal(buttons.find(b=>b.disabled).getAttribute('aria-current'),'page');
  assert.ok(buttons.some(b=>/^Друзья \(\d{3}\)$/.test(b.textContent)));assert.equal(findButton(aside,'Гоблин Ссаблей'),undefined);
 }
 options.getState().social.friends=[];
 assert.equal(allPc(view('friends')).filter(n=>has(n,'sn-person')).length,0);
});
test('photo opens full card, persists likes/comments across save, rejects blank comments, closes and restores focus',()=>{
 const {d,view}=setup(),root=view('photos'),host=d.createElement('main');host.append(root);
 const opener=allPc(root).find(n=>n.tagName==='BUTTON'&&n.getAttribute('aria-haspopup')==='dialog');assert.ok(opener);
 opener.focus();fire(opener,'click');let dialog=allPc(root).find(n=>n.tagName==='DIALOG');assert.ok(dialog);
 const image=allPc(dialog).find(n=>n.tagName==='IMG'&&has(n,'sn-photo-full'));assert.ok(image?.getAttribute('src'));
 fire(findButton(dialog,'Нравится фотографии'),'click');
 const input=allPc(dialog).find(n=>n.tagName==='TEXTAREA'),send=findButton(dialog,'Отправить комментарий');
 input.value='  ';fire(send,'click');assert.equal(allPc(dialog).filter(n=>has(n,'sn-photo-user-comment')).length,0);
 input.value='Классный кадр!';fire(send,'click');assert.equal(input.value,'');
 assert.ok(allPc(dialog).some(n=>n.textContent==='Классный кадр!'));
 fire(dialog,'keydown',{key:'Escape'});assert.ok(!root.contains(dialog));assert.equal(d.activeElement,opener);
 const restored=view('photos');host.replaceChildren(restored);fire(allPc(restored).find(n=>n.tagName==='BUTTON'&&n.getAttribute('aria-haspopup')==='dialog'),'click');
 dialog=allPc(restored).find(n=>n.tagName==='DIALOG');assert.equal(findButton(dialog,'Нравится фотографии').getAttribute('aria-pressed'),'true');assert.ok(allPc(dialog).some(n=>n.textContent==='Классный кадр!'));
 fire(dialog,'click',{target:dialog});assert.ok(!restored.contains(dialog));
});
test('saving photo feedback keeps the mounted card open and is not duplicated by a clock update',()=>{
 const {d,options}=setup(),host=d.createElement('main');let state=options.getState();
 const social=mountSocial(host,{route:{section:'profile',profileId:'mc-filya',view:'photos'},getState:()=>state,getMetadata:options.getMetadata,navigate(){},audio:{stop(){}},onChange:next=>{state=createVirtualPcState(next);return true;}});
 const opener=allPc(host).find(n=>n.getAttribute('aria-haspopup')==='dialog');assert.ok(opener);fire(opener,'click');
 const dialog=allPc(host).find(n=>n.tagName==='DIALOG');fire(findButton(dialog,'Нравится фотографии'),'click');social.update();
 assert.ok(host.contains(dialog),'saving must not tear down the modal or audio player');social.dispose();assert.ok(!host.contains(dialog));
});
test('audio reports the actual browser error and can retry the existing local source',()=>{
 const {view}=setup(),root=view('audio'),control=allPc(root).find(n=>n.tagName==='AUDIO');let loads=0;control.load=()=>loads++;
 control.error={code:2};fire(control,'error');assert.ok(allPc(root).some(n=>!n.hidden&&/загрузить/.test(n.textContent)));
 const retry=findButton(root,'Повторить загрузку');assert.ok(retry&&!retry.hidden);fire(retry,'click');assert.equal(loads,1);
 fire(control,'loadedmetadata');assert.equal(retry.hidden,true);
 assert.match(control.getAttribute('src'),/assets\/audio\/filya\/[a-z]+\.mp3$/);
});

test('own profile Page button returns to a valid page from every subpage',()=>{
 const {d,options,visited}=setup();
 for(const view of ['photos','audio','friends']){
  const root=createSocialProfileView(d,{...options,id:'me',view});
  fire(findButton(root,'Страница'),'click');
  assert.equal(resolveSocialRoute(visited.at(-1))?.section,'me');
 }
});

test('real PC reentrant saves and background social updates preserve the photo and unsent draft',()=>{
 const d=pcDocument(),root=d.createElement('main'),pc=mountVirtualPc(root,{onPersist(){return true;}});
 pc.showDesktop(createVirtualPcState());pc.open('underweb');pc.navigateUnderweb('underweb://social/profile/vitya?view=photos');
 const opener=allPc(root).find(n=>has(n,'sn-photo-open'));assert.ok(opener);fire(opener,'click');
 const dialog=allPc(root).find(n=>n.tagName==='DIALOG'),input=allPc(dialog).find(n=>n.tagName==='TEXTAREA');input.value='Ещё дописываю';
 fire(findButton(dialog,'Нравится фотографии'),'click');
 assert.ok(root.contains(dialog),'reentrant desktop refresh must preserve the open dialog');assert.equal(input.value,'Ещё дописываю');
 pc.syncState({...pc.state,social:{...pc.state.social,friends:[...pc.state.social.friends,'mak-npc-01']}});
 assert.ok(root.contains(dialog),'background social refresh must preserve the draft');assert.equal(input.value,'Ещё дописываю');
 fire(findButton(dialog,'Отправить комментарий'),'click');assert.ok(root.contains(dialog));assert.equal(input.value,'');
 fire(dialog,'keydown',{key:'Escape'});assert.ok(!root.contains(dialog));pc.syncHost({...pc.metadata,gameMinutes:481});
 fire(allPc(root).find(n=>has(n,'sn-photo-open')),'click');
 const reopened=allPc(root).find(n=>n.tagName==='DIALOG');assert.equal(findButton(reopened,'Нравится фотографии').getAttribute('aria-pressed'),'true');assert.ok(allPc(reopened).some(n=>n.textContent==='Ещё дописываю'));pc.dispose();
});
