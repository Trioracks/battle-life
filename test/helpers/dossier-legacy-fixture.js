import {judgeStudyFixture} from './judge-study-fixture.js';
import {studySkills} from './analysis-fixture.js';
import {startJudgeStudy} from '../../src/judge-dossier-analysis.js';
import {advanceStudy} from '../../src/rap-analysis.js';
export function dossierLegacyFixture(){
 const started=startJudgeStudy(judgeStudyFixture(),{judgeId:'eparhiya',trackVersionId:'weak',reviewIds:['r'],analysisReportId:'study:1',heroSnapshot:studySkills(85),nowMinute:150});
 if(!started.ok)throw Error(started.reason);
 const s=advanceStudy(started.state,{gameMinutes:45,nowMinute:195}).state;
 s.battleSubmissions=[{version:2,id:'sent',windowId:'makarevich-1:selection:1',communityId:'makarevich-1',battleId:'makarevich-1',roundId:'selection',trackVersionId:'weak',sentAt:100,ackAt:101,ackTemplateId:'received',status:'accepted'}];return s;
}
