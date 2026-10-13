import {createVirtualPcState,applyToBattle} from '../../src/virtual-pc-state.js';
import {createLyric,startLyricWork,advanceLyricWork,LYRIC_STAGES} from '../../src/lyric-production.js';
import {createBeat,startBeatStage,advanceBeatWork} from '../../src/beat-production.js';
import {genreById} from '../../src/genre-progression.js';
import {startVocalWork,advanceVocalWork} from '../../src/vocal-production.js';
import {activateSocial,advanceSocial} from '../../src/social-runtime.js';
import {attachSubmissionTrack,sendSubmission} from '../../src/social-submission.js';
import {completeSubmissionUpload,completeSubmissionMessage} from './submission-fixtures.js';
import {battleRandom} from '../../src/battle-seeding.js';
export const BATTLE='makarevich-1';
export const skillsAt=value=>Object.fromEntries(['intelligence','writing','musicality','flow','beatmaking','sound','charisma','confidence','resilience'].map(k=>[k,value]));
export const checked=r=>{if(r.ok===false||r.reason&&r.finished===undefined)throw Error(r.reason);return r.state;};
export const tournament=s=>s.tournaments.byId[BATTLE];
export function freshDemo({opensAt=600}={}){const s=checked(activateSocial(applyToBattle(createVirtualPcState({power:'on'}),BATTLE,'Тестовый герой'),opensAt));return advanceSocial(s,opensAt).state;}
export function produceDemoTrack(input,{skill=100,seed=41,roundId='selection',nowMinute=600,clean=true}={}){
 let s=input;const skills=skillsAt(skill),random=battleRandom(seed),textId='demo-text:'+roundId+':'+seed,beatId='demo-beat:'+roundId+':'+seed,reset=()=>{s={...s,music:{...s.music,needs:{satiety:100,energy:100}}};};
 reset();s=checked(createLyric(s,{id:textId,battleId:BATTLE,gameDay:Math.floor(nowMinute/1440)+1},skills,random));
 for(let i=0;i<3;i++){reset();s=checked(startLyricWork(s,{projectId:textId,sliders:LYRIC_STAGES[i].target},skills,random));s=advanceLyricWork(s,1000).state;}
 reset();s=checked(createBeat(s,{id:beatId,name:'Приёмка · '+roundId,genre:'experimental'},skills,random));
 for(let i=0;i<3;i++){reset();s=checked(startBeatStage(s,beatId,genreById('experimental').targets[i],skills,random));s=advanceBeatWork(s,1000).state;}
 for(const kind of clean?['draft','clean','mix','master']:['draft']){reset();s=checked(startVocalWork(s,{beatId,textId,kind,sliders:[8,8,8]},skills,random));s=advanceVocalWork(s,1000).state;}
 return {state:s,beatId,textId,skills};
}
export function submitDemoTrack(state,beatId,nowMinute){let s=checked(attachSubmissionTrack(state,{communityId:BATTLE,projectId:beatId,nowMinute}));s=completeSubmissionUpload(s);s=completeSubmissionMessage(s,{nowMinute});return checked(sendSubmission(s,{communityId:BATTLE,nowMinute}));}
export function runDemo({skill=100,pairSkill=skill,seed=41,through='final',reload=false}={}){
 let s=freshDemo();const trace=[];
 for(let step=0;step<6;step++){
  const t=tournament(s),r=t.rounds[t.currentRoundId],level=r.roundId==='selection'?skill:pairSkill,participates=r.roundId==='selection'||r.pairs.some(p=>p.participantIds.includes('player'));
  if(participates){const made=produceDemoTrack(s,{skill:level,seed:seed+step,roundId:r.roundId,nowMinute:r.opensAt+1,clean:level>=25});s=submitDemoTrack(made.state,made.beatId,r.opensAt+2);}
  s=advanceSocial(s,r.closesAt+2400,{heroSkills:skillsAt(level)}).state;
  const ended=tournament(s).rounds[r.roundId];if(ended.status!=='complete')throw Error('Round failed: '+r.roundId);trace.push({roundId:r.roundId,completedAt:ended.completedAt,player:ended.pairs.find(p=>p.participantIds.includes('player'))?.winnerId??null});
  if(reload)s=createVirtualPcState(JSON.parse(JSON.stringify(s)));
  if(r.roundId===through||tournament(s).status==='complete')break;
  s=advanceSocial(s,tournament(s).nextRoundAt,{heroSkills:skillsAt(pairSkill)}).state;
 }return {state:s,trace};
}
