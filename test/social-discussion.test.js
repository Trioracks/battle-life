import test from 'node:test';
import assert from 'node:assert/strict';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {discussionForPhoto,discussionForPost,addDiscussionComment} from '../src/social-discussion.js';
import {playerLifePosts,PLAYER_LIFE_SCENES} from '../src/player-life-photos.js';
import {mountSocial} from '../src/social-view.js';
import {pcDocument,allPc,findButton,fire} from './helpers/virtual-pc-dom.js';
test('school photo and post share authored and player comments across reload, including old photo feedback',()=>{
 let s=createVirtualPcState();s.social.photoFeedback['me:player-school']={liked:true,comments:[{body:'Старый комментарий',at:10}]};const post=playerLifePosts(PLAYER_LIFE_SCENES).find(p=>p.photoId==='player-school'),photo=discussionForPhoto(s,{profileId:'me',photoId:'player-school'});
 assert.ok(photo.comments.some(c=>c.authorId==='anya'));assert.ok(photo.comments.some(c=>c.authorId==='vitya'));assert.ok(photo.comments.some(c=>c.body==='Старый комментарий'));
 const added=addDiscussionComment(s,{threadId:photo.threadId,body:'Помню этот день!',at:100});assert.equal(added.ok,true,added.reason);s=createVirtualPcState(JSON.parse(JSON.stringify(added.state)));
 const wall=discussionForPost(s,{profileId:'me',post}),opened=discussionForPhoto(s,{profileId:'me',photoId:'player-school'});assert.deepEqual(wall,opened);assert.equal(opened.comments.length,4);assert.equal(new Set(opened.comments.map(c=>c.id)).size,4);
});
test('school photo shows authored comments and closing its card refreshes the same post',()=>{
 const jpeg='data:image/jpeg;base64,'+Buffer.from([255,216,255,192,0,11,8,2,0,2,0,1,1,17,0,255,217]).toString('base64');let state=createVirtualPcState({social:{playerAlbum:{key:'portrait-v1:photo-test',photos:PLAYER_LIFE_SCENES.map(p=>({...p,src:jpeg}))}}});
 const d=pcDocument(),root=d.createElement('main'),ui=mountSocial(root,{route:{section:'me'},getState:()=>state,getMetadata:()=>({gameMinutes:100,playerName:'Игрок'}),navigate(){},onChange:s=>{state=createVirtualPcState(s);return true;}});
 const opener=findButton(root,'Открыть фотографию: За последней партой');assert.ok(opener);opener.click();const card=allPc(root).find(n=>n.tagName==='DIALOG');assert.ok(allPc(card).some(n=>n.textContent==='Анна Лесная'));assert.ok(allPc(card).some(n=>n.textContent==='Витя Кольцов'));allPc(card).find(n=>n.getAttribute('aria-label')==='Комментарий к фотографии').value='Помню!';findButton(card,'Отправить комментарий').click();fire(card,'keydown',{key:'Escape'});ui.update();assert.ok(allPc(root).some(n=>n.textContent==='Помню!'));ui.dispose();
});
