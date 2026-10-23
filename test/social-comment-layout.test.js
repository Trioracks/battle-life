import test from 'node:test';
import assert from 'node:assert/strict';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {advanceFilya} from '../src/filya-calendar.js';
import {createSocialProfileView} from '../src/social-profile-view.js';
import {socialPost} from '../src/social-dom.js';
import {profileById} from '../src/social-catalog.js';
import {pcDocument,allPc,findButton,fire} from './helpers/virtual-pc-dom.js';
const has=(n,c)=>n.className?.split(' ').includes(c);
test('musician replies are separate avatar comments below the post footer, with working profile links',()=>{
 const state=advanceFilya(createVirtualPcState(),480,{random:()=>.42}).state,d=pcDocument(),visited=[];
 const view=createSocialProfileView(d,{id:'mc-filya',getState:()=>state,getMetadata:()=>({gameMinutes:480}),navigate:u=>visited.push(u),commit(){},audio:{stop(){}}});
 const posts=allPc(view).filter(n=>has(n,'sn-post'));
 for(const post of posts){
  const rows=allPc(post).filter(n=>has(n,'sn-comment-row'));
  assert.equal(rows.length,2,'one row per speaker, not a merged text block');
  const content=post.children.find(n=>has(n,'sn-post-content'));
  const thread=content.children.find(n=>has(n,'sn-comments'));
  assert.ok(content.children.indexOf(thread)>content.children.findIndex(n=>has(n,'sn-post-footer')));
  for(const row of rows){assert.ok(allPc(row).some(n=>has(n,'sn-avatar')));assert.ok(allPc(row).some(n=>n.tagName==='TIME'&&n.textContent));}
  fire(findButton(rows[0],'Гоблин Ссаблей'),'click');
  assert.equal(visited.at(-1),'underweb://social/profile/mak-npc-06');
 }
});
test('ordinary wall comments also show separate authors, avatars and supplied dates',()=>{
 const d=pcDocument(),post=socialPost(d,{body:'Пост',date:'01.09.2012',graffiti:{kind:'spark'},comments:[{authorId:'mc-filya',body:'Ответ',date:'01.09.2012 08:13'}]},{author:'Гоблин',profileById,navigate(){}});
 const rows=allPc(post).filter(n=>has(n,'sn-comment-row'));
 assert.equal(rows.length,1);assert.ok(findButton(rows[0],'МЦ Филя'));
 assert.ok(allPc(rows[0]).some(n=>n.tagName==='IMG'));assert.ok(allPc(rows[0]).some(n=>n.tagName==='TIME'&&n.textContent==='01.09.2012 08:13'));
 assert.ok(post.children.findIndex(n=>n.tagName==='SVG')<post.children.findIndex(n=>has(n,'sn-comments')),'all post attachments precede the discussion');
});
