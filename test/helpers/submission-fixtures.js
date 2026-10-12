import {createVirtualPcState,applyToBattle} from '../../src/virtual-pc-state.js';
import {createBeat} from '../../src/beat-production.js';
import {createLyric} from '../../src/lyric-production.js';
import {startCreativeChain} from '../../src/creative-workflow.js';
import {advanceCreativeWork} from '../../src/home-creative-work.js';
import {startVocalWork,advanceVocalWork} from '../../src/vocal-production.js';
export function submissionFixture({battleId='makarevich-1',registered=true,vocal=true}={}){
 let s=createVirtualPcState({power:'on',music:{needs:{satiety:100,energy:100}}});
 if(registered)s=applyToBattle(s,'makarevich-1','Игрок');
 for(const kind of ['lyrics','beat']){
  s.music.needs={satiety:100,energy:100};
  s=(kind==='beat'?createBeat:createLyric)(s,{id:kind,name:'Работа',battleId,gameDay:1},{},()=>.4).state;
  s=advanceCreativeWork(startCreativeChain(s,{kind,projectId:kind},{},()=>.4).state,24,{day:1,minutes:100}).state;
 }
 if(vocal){s.music.needs={satiety:100,energy:100};s=advanceVocalWork(startVocalWork(s,{beatId:'beat',textId:'lyrics'},{},()=>.4).state,1000).state;}
 return s;
}
