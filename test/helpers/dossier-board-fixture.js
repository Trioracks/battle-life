import {topicFixture} from './round-topic-fixture.js';
import {studySkills} from './analysis-fixture.js';
import {startCaseStudy,advanceCaseStudy} from '../../src/rap-research.js';
import {exportedSubmissionFixture} from './submission-fixtures.js';
import {createVirtualPcState} from '../../src/virtual-pc-state.js';
import {startTrackStudy,advanceStudy} from '../../src/rap-analysis.js';
export function dossierBoardFixture(){
 let s=topicFixture();s.software.dossier.installed=true;s.music.needs={satiety:100,energy:100};const exported=exportedSubmissionFixture(),file=exported.audioExports.files[0],version=exported.trackVersions.byId[file.trackVersionId];s.trackVersions.byId.weak={...version,id:'weak',name:'Первая демка',createdAtMinute:100};
 s.battleSubmissions=[{version:2,id:'sent',windowId:'makarevich-1:selection:1',communityId:'makarevich-1',battleId:'makarevich-1',roundId:'selection',trackVersionId:'weak',sentAt:600,ackAt:601,ackTemplateId:'received',status:'accepted'}];
 const t=s.tournaments.byId['makarevich-1'];t.rounds.selection.submissions.player='weak';t.rounds['round-2'].pairs=[{nodeId:'pair',participantIds:['player','mak-npc-01'],technical:{kind:'judged'}}];
 for(let i=0;i<19;i++){const id='export:'+i;s.trackVersions.byId[id]={...s.trackVersions.byId.weak,id,name:'Запись '+(i+2),signature:'saved-'+i};}
 s.audioExports.files=Object.values(s.trackVersions.byId).map((v,i)=>({...file,id:'file:'+i,trackVersionId:v.id,filename:'recording-'+i+'.wav',createdAtMinute:150}));s=createVirtualPcState(s);
 for(const trackVersionId of Object.keys(s.trackVersions.byId)){s.music.needs={satiety:100,energy:100};const study=startTrackStudy(s,{trackVersionId,heroSnapshot:studySkills(70),nowMinute:13000});if(!study.ok)throw Error(study.reason);s=advanceStudy(study.state,{gameMinutes:45,nowMinute:13045}).state;}s.music.needs={satiety:100,energy:100};
 const started=startCaseStudy(s,{kind:'battle',battleId:'makarevich-1',heroSnapshot:studySkills(70),nowMinute:13440});if(!started.ok)throw Error(started.reason);
 s=advanceCaseStudy(started.state,{gameMinutes:360,nowMinute:13800}).state;s.music.needs={satiety:100,energy:100};return s;
}
