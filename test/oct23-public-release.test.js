import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyPublicationFile} from '../tools/publication/policy.mjs';
import {createGameAudio,PUBLIC_AUDIO_NOTICE} from '../src/game-audio.js';
import {createSocialAudio} from '../src/social-audio-view.js';
import {createMusicianProfileView} from '../src/musician-profile-view.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {GOBLIN_PROFILE} from '../src/goblin-catalog.js';
import {pcDocument,allPc} from './helpers/virtual-pc-dom.js';

test('public publication retains the new shells and metadata while excluding recordings',()=>{
 for(const target of ['source','site']){
  for(const p of ['social-dialogs.css','social-community.css','rap-notebook-shell.css','test-skills.css'])assert.equal(classifyPublicationFile(p,Buffer.from('body{}'),{target}).allowed,true,p);
  for(const bank of ['abstract-v1','experimental-leads-v1','npc-daniel-v1','npc-kapa-v2']){
   assert.equal(classifyPublicationFile('assets/audio/ft/'+bank+'/manifest.json',Buffer.from('{}'),{target}).allowed,true,bank);
   assert.equal(classifyPublicationFile('assets/audio/ft/'+bank+'/take.wav',Buffer.from('recording'),{target}).allowed,false);
  }
 }
});

test('public musician profiles create no media sources even in the audio tab',()=>{
 const state=createVirtualPcState(),audio=createSocialAudio(createGameAudio()),post={id:'release',body:'Домашний архив',release:{title:'Демо',mediaUrl:'./assets/audio/goblin/demo.mp3'}};
 for(const view of ['page','audio']){
  const root=createMusicianProfileView(pcDocument(),{profile:GOBLIN_PROFILE,posts:[post],photos:[],stateKey:'goblin',subtitle:'Архив',view,getState:()=>state,getMetadata:()=>({gameMinutes:480}),navigate(){},commit(){},audio});
  assert.equal(allPc(root).filter(n=>n.tagName==='AUDIO').length,0);
  assert.ok(allPc(root).some(n=>n.textContent===PUBLIC_AUDIO_NOTICE));
 }
 audio.dispose();
});
