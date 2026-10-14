import {createVirtualPcState} from '../../src/virtual-pc-state.js';
import {createBeat} from '../../src/beat-production.js';
import {createLyric} from '../../src/lyric-production.js';
import {startCreativeChain} from '../../src/creative-workflow.js';
import {advanceCreativeWork} from '../../src/home-creative-work.js';

// Twenty tracks means twenty beat/text pairs. Every archived plan comes from
// the real command path; replenishing needs is only campaign fixture setup.
export function longCampaignFixture({tracks=20,day=8}={}){
 if(!Number.isSafeInteger(tracks)||tracks<0||!Number.isSafeInteger(day)||day<1)throw Error('Invalid campaign size or day');
 const skills={beatmaking:10,writing:10,sound:10};
 let state=createVirtualPcState({power:'on',music:{needs:{satiety:100,energy:100}}});
 for(const id of ['client','ft','notebook'])state.software[id].installed=true;
 for(let track=1;track<=tracks;track++){
  const gameDay=Math.min(day,1+Math.floor((track-1)*day/Math.max(1,tracks)));
  for(const kind of ['beat','lyrics']){
   state={...state,music:{...state.music,needs:{satiety:100,energy:100}}};
   const projectId=`campaign-${kind}-${track}`;
   const created=(kind==='beat'?createBeat:createLyric)(state,{id:projectId,name:`Кампания ${track}`,gameDay},skills,()=>.4);
   if(!created.ok)throw Error(created.reason);
   const started=startCreativeChain(created.state,{kind,projectId,gameDay},skills,()=>.4);
   if(!started.ok)throw Error(started.reason);
   const finished=advanceCreativeWork(started.state,24,{day:gameDay,minutes:720},skills);
   if(!finished.finished)throw Error('Campaign work did not finish');
   state=finished.state;
  }
 }
 return {state:{...state,music:{...state.music,needs:{satiety:100,energy:100}}},skills};
}
