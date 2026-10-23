import test from 'node:test';
import assert from 'node:assert/strict';
import {savePcDocument,openPcDocument} from '../src/pc-filesystem.js';
import {documentIsDirty,discardPcDocument} from '../src/pc-document-session.js';
import {creativeFixture} from './helpers/creative-fixtures.js';
import {startCreativeChain,pauseCreativeChain} from '../src/creative-workflow.js';
import {advanceCreativeWork} from '../src/home-creative-work.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {createAudioExport} from '../src/pc-audio-exports.js';
import {submissionFixture} from './helpers/submission-fixtures.js';
test('save clears dirty, later work is dirty, and discard restores the saved file without undoing earned practice',()=>{
 const {state,projectId}=creativeFixture('beat');
 const saved=savePcDocument(state,{projectId,folderId:'projects',filename:'Бит.flp',nowMinute:1});assert.equal(saved.ok,true);
 assert.equal(documentIsDirty(saved.state,'ft-studio'),false);
 const changed={...saved.state,music:{...saved.state.music,practice:5},projects:saved.state.projects.map(p=>({...p,name:'Несохранённый'}))};
 assert.equal(documentIsDirty(changed,'ft-studio'),true);
 const discarded=discardPcDocument(changed,'ft-studio');assert.equal(discarded.ok,true);
 assert.equal(discarded.state.projects.find(p=>p.id===projectId).name,'Ночной район');assert.equal(discarded.state.music.practice,5);
 assert.equal(documentIsDirty(openPcDocument(discarded.state,{fileId:saved.fileId,appId:'ft-studio'}).state,'ft-studio'),false);
});
test('opening a snapshot removes later paused output for the same document without reversing practice',()=>{
 const f=creativeFixture('beat'),saved=savePcDocument(f.state,{projectId:f.projectId,folderId:'projects',filename:'Ритм.flp',nowMinute:1});
 const changed=pauseCreativeChain(advanceCreativeWork(startCreativeChain(saved.state,{kind:'beat',projectId:f.projectId},f.skills).state,2,null,f.skills).state);
 assert.ok(changed.creativeWork.items[0].pausedJob);const r=openPcDocument(changed,{fileId:saved.fileId,appId:'ft-studio'});assert.equal(r.ok,true,r.reason);
 assert.equal(r.state.creativeWork.items.some(i=>i.projectId===f.projectId),false);assert.equal(r.state.music.practice,changed.music.practice);
});
test('discard removes unsaved working documents across reload but keeps exported audio and earned practice',()=>{
 const exported=createAudioExport(submissionFixture({vocal:false}),{id:'kept',projectId:'beat',kind:'beat',folderId:'exports',filename:'Останется',nowMinute:1});
 const s={...exported.state,music:{...exported.state.music,practice:4}},r=discardPcDocument(s,'ft-studio');assert.equal(r.ok,true,r.reason);
 const loaded=createVirtualPcState(JSON.parse(JSON.stringify(r.state)));assert.equal(loaded.projects.some(p=>p.id==='beat'),false);assert.equal(loaded.audioExports.files[0].id,'kept');assert.equal(loaded.music.practice,4);assert.equal(documentIsDirty(loaded,'ft-studio'),false);
});
