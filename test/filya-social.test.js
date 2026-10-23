import test from 'node:test';
import assert from 'node:assert/strict';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {advanceFilya,filyaPublicPosts} from '../src/filya-calendar.js';
import {FILYA_ID,FILYA_CARDS,FILYA_RELEASES} from '../src/filya-catalog.js';
import {GOBLIN_ID} from '../src/goblin-catalog.js';
import {battleCharacter} from '../src/battle-demo-config.js';
import {profileById} from '../src/social-catalog.js';
import {createSocialProfileView} from '../src/social-profile-view.js';
import {pcDocument,allPc,findButton} from './helpers/virtual-pc-dom.js';

const start=()=>advanceFilya(createVirtualPcState(),480,{random:()=>.42}).state;
test('Filya starts with two distinct random historical photos; save and clock do not reroll',()=>{
 const s=start(),f=s.social.filya;
 assert.equal(f.posts.length,2);assert.equal(new Set(f.posts.map(p=>p.cardId)).size,2);
 assert.ok(f.posts.every(p=>p.at<0&&p.dateLabel&&!p.dateLabel.endsWith('00:00')));
 assert.ok(f.nextAt>480+24*1440&&f.nextAt<480+37*1440);
 const restored=createVirtualPcState(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(restored.social.filya,f);
 assert.equal(advanceFilya(restored,500).state,restored);
 const other=advanceFilya(createVirtualPcState(),480,{random:()=>.12}).state;
 assert.notDeepEqual(other.social.filya.posts.map(p=>p.cardId),f.posts.map(p=>p.cardId));
});
test('monthly posts survive sleep/reload, never publish early and stop after the finite authored deck',()=>{
 const s=start();let fine=structuredClone(s);
 for(let day=1;day<=800;day++)fine=advanceFilya(fine,480+day*1440).state;
 const coarse=advanceFilya(s,480+800*1440).state;
 assert.deepEqual(coarse.social.filya,fine.social.filya);
 const all=advanceFilya(s,99999*1440).state.social.filya;
 assert.equal(all.posts.length,FILYA_CARDS.length);assert.equal(all.nextAt,null);
 assert.equal(new Set(all.posts.map(p=>p.cardId)).size,all.posts.length);
 assert.equal(filyaPublicPosts(coarse,480).length,2);
 assert.ok(FILYA_CARDS.some(c=>!c.releaseId));assert.equal(FILYA_RELEASES.length,14);
});
test('profiles link to each other, Filya comments are clickable and playback is lazy',()=>{
 const s=start(),d=pcDocument(),visited=[];
 const options={getState:()=>s,getMetadata:()=>({gameMinutes:480}),navigate:url=>visited.push(url),commit(){},audio:{stop(){}}};
 assert.ok(profileById(GOBLIN_ID).friends.includes(FILYA_ID));
 assert.ok(profileById(FILYA_ID).friends.includes(GOBLIN_ID));
 const view=createSocialProfileView(d,{...options,id:FILYA_ID});
 assert.equal(allPc(view).filter(n=>n.tagName==='ARTICLE'&&n.className==='sn-post').length,2);
 assert.ok(allPc(view).filter(n=>n.tagName==='AUDIO').every(n=>n.getAttribute('preload')==='none'));
 assert.ok(findButton(view,'Гоблин Ссаблей'));
});
test('the battle alias is Плата Гоблина; saved dialogue is refreshed without losing progress',()=>{
 assert.equal(battleCharacter(GOBLIN_ID).nickname,'Плата Гоблина');
 const s=start();s.social.goblin.stage='vocal';
 s.social.dialogs[GOBLIN_ID]={messages:[{id:'goblin:invite',sender:GOBLIN_ID,body:'Я там Trioracks',at:540}]};
 const restored=createVirtualPcState(JSON.parse(JSON.stringify(s)));
 assert.match(restored.social.dialogs[GOBLIN_ID].messages[0].body,/Плата Гоблина/);
 assert.equal(restored.social.goblin.stage,'vocal');
});
