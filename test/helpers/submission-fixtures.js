import {createVirtualPcState,applyToBattle} from '../../src/virtual-pc-state.js';
import {createBeat} from '../../src/beat-production.js';
import {createLyric} from '../../src/lyric-production.js';
import {startCreativeChain} from '../../src/creative-workflow.js';
import {advanceCreativeWork} from '../../src/home-creative-work.js';
import {startVocalWork,advanceVocalWork} from '../../src/vocal-production.js';
import {advanceSubmissionUpload} from '../../src/social-upload.js';
import {startSubmissionMessage,advanceSubmissionMessage} from '../../src/social-composer.js';
export const completeSubmissionUpload=state=>advanceSubmissionUpload(state,{activeSeconds:3600,powered:true,paused:false}).state;
export const completeSubmissionMessage=(state,{communityId='makarevich-1',nowMinute=601}={})=>advanceSubmissionMessage(startSubmissionMessage(state,{communityId,nowMinute}).state,{activeSeconds:6,visible:true,powered:true,paused:false}).state;
export function submissionFixture({battleId='makarevich-1',registered=true,vocal=true,mixed=false}={}){
 let s=createVirtualPcState({power:'on',music:{needs:{satiety:100,energy:100}}});
 if(registered)s=applyToBattle(s,'makarevich-1','Игрок');
 for(const kind of ['lyrics','beat']){
  s.music.needs={satiety:100,energy:100};
  s=(kind==='beat'?createBeat:createLyric)(s,{id:kind,name:'Работа',battleId,gameDay:1},{},()=>.4).state;
  s=advanceCreativeWork(startCreativeChain(s,{kind,projectId:kind},{},()=>.4).state,24,{day:1,minutes:100}).state;
 }
 if(vocal){s.music.needs={satiety:100,energy:100};s=advanceVocalWork(startVocalWork(s,{beatId:'beat',textId:'lyrics'},{},()=>.4).state,1000).state;}
 if(vocal&&mixed){s.music.needs={satiety:100,energy:100};s=advanceVocalWork(startVocalWork(s,{beatId:'beat',kind:'mix'},{},()=>.4).state,1000).state;}
 return s;
}
// Archived v1 input for migration tests, not a production submission action.
export function legacySubmissionFixture(){
 const s=submissionFixture(),track=structuredClone(s.projects[1]),lyrics=structuredClone(s.projects[0]);
 return {...s,battleSubmissions:[{version:1,battleId:'makarevich-1',roundId:'selection',revision:1,submittedDay:2,projectId:track.id,status:'pending',topicMatch:true,track,lyrics}]};
}
