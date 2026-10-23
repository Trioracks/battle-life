import test from 'node:test';
import assert from 'node:assert/strict';
const {pcMonitorPresentation}=await import('../src/pc-monitor-presentation.js').catch(()=>({}));
const state={power:'on',projects:[{id:'text',kind:'lyrics',name:'Не переключай',content:'Первая строка\nВторая строка'},{id:'beat',kind:'beat',name:'Первый бит',stages:[{}]}],writing:{activeTextId:'text'},music:{activeBeatId:'beat'}};
test('monitor follows active app, keeps social route after leaving and is read only',()=>{
 assert.equal(typeof pcMonitorPresentation,'function');const before=structuredClone(state);
 assert.equal(pcMonitorPresentation(state,{activeAppId:'rap-notebook'}).app,'notebook');
 assert.equal(pcMonitorPresentation(state,{activeAppId:'ft-studio'}).app,'studio');
 const social=pcMonitorPresentation(state,{activeAppId:'underweb',address:'underweb://social/dialog/goblin'});assert.equal(social.app,'social');assert.equal(social.address,'underweb://social/dialog/goblin');assert.deepEqual(state,before);
});
test('production overrides browser with working app, uses job progress and freezes on pause without another clock',()=>{
 const job={projectId:'text',elapsed:20,total:60,kind:'stage'};const p=pcMonitorPresentation(state,{activeAppId:'underweb',job});assert.equal(p.app,'notebook');assert.equal(p.progress,1/3);assert.equal(p.title,'Не переключай');
 assert.deepEqual(pcMonitorPresentation(state,{activeAppId:'underweb',job,paused:true,nowMinute:100}),pcMonitorPresentation(state,{activeAppId:'underweb',job,paused:true,nowMinute:1000}));
 assert.equal(pcMonitorPresentation(state,{activeAppId:'rap-notebook',snapshot:{phase:'power-on'}}).screen,'bios');
 assert.equal(pcMonitorPresentation(state,{snapshot:{phase:'loading',progress:.5}}).screen,'loading');
});
