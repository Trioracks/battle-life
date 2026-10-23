import test from 'node:test';
import assert from 'node:assert/strict';
import {savePcDocument,openPcDocument} from '../src/pc-filesystem.js';
import {documentIsDirty,discardPcDocument} from '../src/pc-document-session.js';
import {creativeFixture} from './helpers/creative-fixtures.js';
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
