import assert from 'node:assert/strict';
import {createVirtualPcState,applyToBattle} from '../../src/virtual-pc-state.js';
import {chooseGenre} from '../../src/genre-progression.js';
import {createBeat} from '../../src/beat-production.js';
import {createLyric} from '../../src/lyric-production.js';
import {startCreativeChain} from '../../src/creative-workflow.js';
import {advanceCreativeWork} from '../../src/home-creative-work.js';
import {startVocalWork,advanceVocalWork} from '../../src/vocal-production.js';

export const VOICES=['player-voice:original','npc-voice:kapa-20261018','npc-voice:gans-20261018','npc-voice:artem-20261018','npc-voice:jura-20261018','npc-voice:daniel-20261020'];
export function abstractRecordingFixture({family=0,pair=0,genreXP=0,voiceId=VOICES[5],experimentalLead=false}={}){
 const skills={beatmaking:100,flow:100,sound:100,writing:100,intelligence:100};
 let s=applyToBattle(createVirtualPcState({voiceId,power:'on'}),'makarevich-1','Герой');
 s.music.genres=chooseGenre(s.music.genres,'abstract',25).value;s.music.genres.xp.abstract=genreXP;
 const next=r=>{assert.equal(r.ok,true,r.reason);return r.state;};
 for(const kind of ['lyrics','beat']){
  s.music.needs={satiety:100,energy:100};
  const count=[8,10,6,19][family],draws=[(family+.5)/4,(pair+.5)/count];
  const random=experimentalLead?()=>14.5/81:()=>draws.shift()??.4;
  s=next((kind==='beat'?createBeat:createLyric)(s,{id:kind,name:'Abstract '+family,genre:experimentalLead?'experimental':'abstract',battleId:'makarevich-1',gameDay:1},skills,random));
  s=next(startCreativeChain(s,{kind,projectId:kind},skills,()=>.4));
  // Exercise active work persistence before completing the real production chain.
  s=advanceCreativeWork(s,1,{day:1,minutes:100},skills).state;
  const active=structuredClone({music:s.music,writing:s.writing,beat:s.projects.find(p=>p.id==='beat')});
  s=createVirtualPcState(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(s.music,active.music);assert.deepEqual(s.writing,active.writing);
  if(active.beat)assert.deepEqual(s.projects.find(p=>p.id==='beat'),active.beat);
  for(let i=0;i<3&&s.projects.find(p=>p.id===kind).status!=='ready';i++){
   s.music.needs={satiety:100,energy:100};
   if(!s.music.job&&!s.writing.job)s=next(startCreativeChain(s,{kind,projectId:kind},skills,()=>.4));
   s=advanceCreativeWork(s,24,{day:1,minutes:101},skills).state;
  }
  assert.equal(s.projects.find(p=>p.id===kind).status,'ready');
 }
 s.music.needs={satiety:100,energy:100};
 s=next(startVocalWork(s,{beatId:'beat',textId:'lyrics'},skills,()=>.2));
 s=advanceVocalWork(s,1).state;const pending=structuredClone(s.recording.job);s=createVirtualPcState(JSON.parse(JSON.stringify(s)));assert.deepEqual(s.recording.job,pending);
 s=advanceVocalWork(s,1000).state;
 return s;
}
