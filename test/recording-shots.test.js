import test from 'node:test';
import assert from 'node:assert/strict';
const shots=await import('../src/recording-shots.js').catch(()=>({}));
import * as studio from '../src/ft-studio-view.js';
import {pcDocument,allPc} from './helpers/virtual-pc-dom.js';
import {mountVirtualPc} from '../src/virtual-pc-ui.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {createBeatWorkPanel} from '../src/beat-work-view.js';
import {submissionFixture} from './helpers/submission-fixtures.js';

test('four 90 BPM beats precede screen, then rear at 80 percent',()=>{
 assert.equal(typeof shots.recordingShot,'function');
 for(const [elapsedSeconds,phase] of [[0,'mic'],[2.66,'mic'],[8/3,'screen'],[6.39,'screen'],[6.4,'rear'],[8,'rear']])
  assert.equal(shots.recordingShot({elapsedSeconds,durationSeconds:8}).phase,phase);
});

test('screen REC keeps the desktop hidden, preserves the job and clears after cancellation',()=>{
 const root=pcDocument().createElement('section');let writes=0;
 const pc=mountVirtualPc(root,{onPersist(){writes++;}}),state=createVirtualPcState({power:'on'});
 pc.showDesktop(state);const before=JSON.stringify(pc.state),audio=pc.beatAudio.getSnapshot();
 const job={kind:'clean',elapsed:30,total:60},beat={id:'take',name:'Take',stages:[{},{},{}]};
 pc.presentTransition({phase:'working',overlay:0,locked:true},{beat,job,shot:{phase:'screen',progress:.5,bob:0}});
 const layer=allPc(root).find(n=>n.dataset.pcRole==='recording-screen');
 assert.equal(layer.hidden,false);assert.equal(layer.inert,true);assert.equal(pc.desktopVisible,false);
 assert.equal(root.style.opacity,'1');assert.equal(JSON.stringify(pc.state),before);assert.deepEqual(pc.beatAudio.getSnapshot(),audio);assert.equal(writes,0);
 pc.presentTransition({phase:'work-cover',overlay:0,locked:true},{beat,job,shot:{phase:'screen',progress:.5,bob:0}});
 assert.equal(layer.hidden,true);assert.equal(allPc(layer).find(n=>n.dataset.ftRole==='recording-status').hidden,true);assert.equal(root.style.opacity,'0');pc.dispose();
});
test('shot clamps short jobs and derives a repeatable 90 BPM bob from elapsed work',()=>{
 for(const [time,phase]of [[0,'mic'],[.8,'screen'],[1.6,'rear'],[2,'rear']])assert.equal(shots.recordingShot({elapsedSeconds:time,durationSeconds:2}).phase,phase);
 const at=elapsedSeconds=>shots.recordingShot({elapsedSeconds,durationSeconds:8});
 assert.ok(at(1/6).bob>0);assert.ok(Math.abs(at(2/3).bob)<1e-10);
 assert.deepEqual(at(3),at(3),'paused and restored clocks are identical');
 assert.equal(shots.recordingShot({elapsedSeconds:3,durationSeconds:8,reducedMotion:true}).bob,0);
 assert.equal(at(-1).progress,0);assert.equal(at(20).progress,1);
});
test('passive recording workspace grows from job progress and clears REC on cancellation',()=>{
 const root=studio.createStudioWorkspace(pcDocument()),beat={name:'Take',stages:[{},{},{}]};
 const frame={phase:'screen',progress:.5,bob:0},job={kind:'draft',elapsed:30,total:60};
 const before=JSON.stringify({beat,job});
 assert.equal(typeof studio.presentRecordingWorkspace,'function');
 studio.presentRecordingWorkspace(root,{beat,job,shot:frame});
 const find=role=>allPc(root).find(n=>n.dataset.ftRole===role);
 assert.equal(find('recording-status').textContent,'REC · Черновая запись');
 assert.equal(find('recording-region').style.width,'50%');
 studio.presentRecordingWorkspace(root,{beat,job,shot:frame,paused:true});
 assert.equal(find('recording-region').style.width,'50%');
 assert.match(find('recording-status').textContent,/Пауза/);
 studio.presentRecordingWorkspace(root,{beat,job:null,shot:null});
 assert.equal(find('recording-status').hidden,true);
 assert.equal(JSON.stringify({beat,job}),before);
});

test('screen shot keeps cancellation accessible above the passive studio and restores normal work HUD',()=>{
 let cancelled=0;const panel=createBeatWorkPanel(pcDocument(),{onCancel:()=>cancelled++});
 const job={kind:'draft',elapsed:30,total:60,output:{draft:{}}};
 panel.update({job,recordingShot:{phase:'screen',progress:.5,bob:0}});
 assert.equal(panel.element.style.zIndex,'45');
 const button=allPc(panel.element).find(n=>n.textContent==='Прервать работу');assert.equal(button.hidden,false);button.click();assert.equal(cancelled,1);
 panel.update({job,recordingShot:{phase:'rear',progress:.9,bob:0}});assert.equal(panel.element.style.zIndex,'');assert.equal(panel.element.style.left,'');panel.dispose();
});

test('recording playhead, musical readout and waveform share the project range and paused job position',()=>{
 for(const mixed of [false,true]){
  const beat=submissionFixture({mixed}).projects.find(p=>p.id==='beat'),root=studio.createStudioWorkspace(pcDocument());
  const find=role=>allPc(root).find(n=>n.dataset.ftRole===role),job={kind:'clean',elapsed:30,total:60};
  studio.presentRecordingWorkspace(root,{beat,job,shot:{phase:'screen',progress:.5}});
  assert.equal(find('playhead').style.left,'50%');
  assert.equal(find('recording-tempo').textContent,'90');
  assert.equal(find('recording-position').textContent,mixed?'05 : 01 : 000':'03 : 01 : 000');
  assert.equal(root.dataset.recordingBars,mixed?'8':'4');
  const waves=allPc(root).filter(n=>n.dataset.ftRole==='recording-region');
  assert.equal(waves[0].style.left,mixed?'25%':'0%');
  assert.equal(waves[0].style.width,mixed?'25%':'50%');
  studio.presentRecordingWorkspace(root,{beat,job,shot:{phase:'screen',progress:.5},paused:true});
  assert.equal(find('playhead').style.left,'50%');
  assert.equal(find('recording-position').textContent,mixed?'05 : 01 : 000':'03 : 01 : 000');
 }
});
