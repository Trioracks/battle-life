import test from 'node:test';
import assert from 'node:assert/strict';
import {submissionFixture} from './helpers/submission-fixtures.js';
import {advanceGoblin} from '../src/goblin-mentor.js';
import {sendGoblinFile,exportLyricFile} from '../src/goblin-exchange.js';
import {savePcDocument,pcFileEntries,openPcDocument} from '../src/pc-filesystem.js';
import {startMentorDownload,advanceBrowserDownloads,cancelBrowserDownload} from '../src/pc-browser-downloads.js';
import {softwareDiskBytes} from '../src/pc-software.js';
import {createAudioExport} from '../src/pc-audio-exports.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {GOBLIN_ID} from '../src/goblin-catalog.js';
const tutorial=stage=>{const s=advanceGoblin(submissionFixture({vocal:false}),480).state;s.social.goblin.stage=stage;s.social.goblin.pending=[];s.software.notebook.installed=true;s.software.ft.installed=true;return s;};
test('legacy text-save callers reuse a saved version and old received attachments stay accessible',()=>{
 const original=tutorial('text'),first=exportLyricFile(original,'lyrics',500),repeat=exportLyricFile(first.state,'lyrics',501);assert.equal(repeat.ok,true,repeat.reason);assert.equal(repeat.fileId,first.fileId);
 const raw=structuredClone(original),project=raw.projects.find(p=>p.id==='lyrics');raw.social.goblin.files.push({id:'legacy-text',kind:'lyrics',filename:'Старый.rap.txt',author:'player',folderId:'documents',createdAtMinute:10,bytes:2000,project});
 const loaded=createVirtualPcState(raw);assert.ok(loaded.fileSystem.files.some(f=>f.mentorFileId==='legacy-text'));assert.equal(sendGoblinFile(loaded,loaded.fileSystem.files.find(f=>f.mentorFileId==='legacy-text').id,501).ok,true);
});
test('a received TXT is downloaded through the browser and opens separately from downloading',()=>{
 let s=tutorial('text'),saved=savePcDocument(s,{projectId:'lyrics',folderId:'documents',filename:'Текст.txt',nowMinute:500});s=saved.state;const r=sendGoblinFile(s,saved.fileId,500);assert.equal(r.ok,true,r.reason);s=r.state;const attachment=s.social.goblin.files.at(-1);assert.equal(startMentorDownload(s,{attachmentId:attachment.id,nowMinute:501}).ok,false);
 s=advanceGoblin(s,520).state;assert.equal(pcFileEntries(s,{folderId:'downloads',types:['txt']}).length,0);s=startMentorDownload(s,{attachmentId:attachment.id,nowMinute:520}).state;const active=s.writing.activeTextId;s=advanceBrowserDownloads(s,{activeSeconds:.99}).state;assert.equal(pcFileEntries(s,{folderId:'downloads',types:['txt']}).length,0);s=advanceBrowserDownloads(s,{activeSeconds:.01}).state;
 const file=pcFileEntries(s,{folderId:'downloads',types:['txt']})[0];assert.ok(file);assert.equal(s.writing.activeTextId,active);assert.match(file.filename,/\.txt$/);assert.equal(openPcDocument(s,{fileId:file.id,appId:'rap-notebook'}).ok,true);assert.equal(createVirtualPcState(JSON.parse(JSON.stringify(s))).fileSystem.files.some(f=>f.id===file.id),true);
});
test('Goblin requests the matching FLP after hearing a beat and returns a downloadable project',()=>{
 let s=tutorial('beat');s=createAudioExport(s,{id:'sound',projectId:'beat',kind:'beat',folderId:'exports',filename:'Послушай',nowMinute:500}).state;s=sendGoblinFile(s,'sound',500).state;s=advanceGoblin(s,520).state;assert.equal(s.social.goblin.stage,'beat-project');
 let saved=savePcDocument(s,{projectId:'beat',folderId:'projects',filename:'Проект.flp',nowMinute:521});const r=sendGoblinFile(saved.state,saved.fileId,521);assert.equal(r.ok,true,r.reason);s=advanceGoblin(r.state,541).state;assert.equal(s.social.goblin.stage,'vocal');const attachment=s.social.goblin.files.find(f=>f.id==='goblin-return-project');assert.ok(attachment);assert.equal(pcFileEntries(s,{folderId:'downloads',types:['flp']}).length,0);
 s=advanceBrowserDownloads(startMentorDownload(s,{attachmentId:attachment.id,nowMinute:541}).state,{activeSeconds:1}).state;const file=pcFileEntries(s,{folderId:'downloads',types:['flp']})[0];assert.equal(file.snapshot.status,'ready');assert.ok(s.social.dialogs[GOBLIN_ID].messages.some(m=>m.id==='goblin:return:project'));assert.equal(s.music.activeBeatId,'beat');
});
test('cancelling an attachment download frees its partial bytes and repeating it publishes one file',()=>{
 let s=tutorial('text'),saved=savePcDocument(s,{projectId:'lyrics',folderId:'documents',filename:'Текст.txt',nowMinute:500});s=advanceGoblin(sendGoblinFile(saved.state,saved.fileId,500).state,520).state;const attachment=s.social.goblin.files.at(-1),base=softwareDiskBytes(s).used;
 s=advanceBrowserDownloads(startMentorDownload(s,{attachmentId:attachment.id,nowMinute:520}).state,{activeSeconds:.5}).state;assert.ok(softwareDiskBytes(s).used>base);const result=cancelBrowserDownload(s,'mentor:'+attachment.id);assert.equal(result.ok,true);assert.equal(softwareDiskBytes(result.state).used,base);
 s=advanceBrowserDownloads(startMentorDownload(result.state,{attachmentId:attachment.id,nowMinute:520}).state,{activeSeconds:1}).state;const bytes=softwareDiskBytes(s).used;s=advanceBrowserDownloads(startMentorDownload(s,{attachmentId:attachment.id,nowMinute:520}).state,{activeSeconds:2}).state;assert.equal(pcFileEntries(s,{folderId:'downloads',types:['txt']}).length,1);assert.equal(softwareDiskBytes(s).used,bytes);
});
