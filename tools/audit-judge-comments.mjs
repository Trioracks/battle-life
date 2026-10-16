import {JUDGE_PROFILES} from '../src/judge-profiles.js';
import {generateJudgeReview,commentSimilarity,JUDGE_COMMENTS} from '../src/judge-comments.js';
import {evaluateTrack,perceiveTrack} from '../src/judge-evaluation.js';
import {battleFormat} from '../src/battle-format.js';
import {REFERENCE_CATALOG} from '../src/cultural-references.js';
import {captureTrackVersion} from '../src/track-version.js';
import {submissionFixture} from '../test/helpers/submission-fixtures.js';
const saved=captureTrackVersion(submissionFixture(),{projectId:'beat',nowMinute:600}),base=saved.state.trackVersions.byId[saved.versionId],format=battleFormat('makarevich-1','selection');
const report={sourceRows:JUDGE_COMMENTS.filter(t=>t.sourceRef.kind==='authored-source-row').length,judges:[],failures:[]};
for(const judge of JUDGE_PROFILES)for(const scenario of ['similar','diverse','legacy']){
 let history=[],exact=0,near=0,recentRepeat=0;const focus={},lengths={},refs={};let unavailable=0;
 const count=['eparhiya','klim-propavshiy','svinoferma','thirty-third'].includes(judge.id)&&scenario==='diverse'?100:50;
 for(let i=0;i<count;i++){
  const version=structuredClone(base),quality=scenario==='similar'?20:10+(i*17)%90;version.id=judge.id+':'+scenario+':'+i;
  version.qualities={text:quality/10,performance:quality/10,music:quality/10,sound:quality/10};
  for(const f of version.facts)if(/^(text|music|vocal|sound)\./.test(f.key)&&Number.isFinite(f.value))f.value=quality;
  if(scenario==='legacy')version.facts=[];
  const evaluation=evaluateTrack(version,judge,format),perception=perceiveTrack(version,judge,history,REFERENCE_CATALOG),run=generateJudgeReview({version,judge,format,evaluation,perception},{seed:1000+i,history});
  if(!run.result){report.failures.push({judgeId:judge.id,scenario,i,diagnostics:run.diagnostics});continue;}
  const r=run.result;if(history.some(h=>h.comment===r.comment))exact++;
  if(history.some(h=>commentSimilarity(h.comment,r.comment)>.65))near++;
  if(history.slice(-12).some(h=>h.templateIds.some(id=>r.templateIds.includes(id))))recentRepeat++;
  if(run.diagnostics.unsupportedClaims.length)report.failures.push({judgeId:judge.id,scenario,i,unsupported:run.diagnostics.unsupportedClaims});
  if(/\{[^}]*\}/.test(r.comment))report.failures.push({judgeId:judge.id,placeholder:r.comment});
  focus[r.focus]=(focus[r.focus]??0)+1;lengths[r.length]=(lengths[r.length]??0)+1;
  for(const id of r.recognizedReferences)refs[id]=(refs[id]??0)+1;
  unavailable+=Number(r.limitedEvidence);history=run.history;
 }
 report.judges.push({judgeId:judge.id,scenario,count,exact,near,recentRepeat,focus,lengths,refs,limitedEvidence:unavailable});
 if(recentRepeat)report.failures.push({judgeId:judge.id,scenario,recentRepeat});
}
console.log(JSON.stringify(report,null,2));if(report.failures.length)process.exitCode=1;
