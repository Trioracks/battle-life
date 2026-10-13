import assert from 'node:assert/strict';
import {freshDemo,produceDemoTrack,BATTLE,tournament} from './package-two-fixture.js';
import {captureTrackVersion} from '../../src/track-version.js';
import {advanceTournament} from '../../src/battle-tournament.js';
import {DEMO_BATTLE} from '../../src/battle-demo-config.js';
import {judgeProfile} from '../../src/judge-profiles.js';
import {evaluateTrack} from '../../src/judge-evaluation.js';
import {generateJudgeReview} from '../../src/judge-comments.js';
import {battleFormat} from '../../src/battle-format.js';
import {rankTournamentSelection,seedBracket} from '../../src/battle-seeding.js';
import {planPostReactions,REACTION_AUTHORS,REACTION_BANK,publicPostReactions} from '../../src/social-reactions.js';
export function auditPackageTwo(){
 const base=freshDemo(),closed=advanceTournament(base,10680).state,npcs=Object.entries(tournament(closed).rounds.selection.submissions).map(([id,v])=>({id,version:closed.trackVersions.byId[v]}));
 const selectionFormat=battleFormat(BATTLE,'selection'),pairFormat=battleFormat(BATTLE,'round-2'),selectionJudges=DEMO_BATTLE.panels.selection.judgeIds.map(judgeProfile),pairJudges=DEMO_BATTLE.panels['round-2'].judgeIds.map(judgeProfile),allJudges=[...new Set(Object.values(DEMO_BATTLE.panels).flatMap(p=>p.judgeIds))].map(judgeProfile);
 const npcGrades=Object.fromEntries(npcs.map(n=>[n.id,selectionJudges.map(j=>evaluateTrack(n.version,j,selectionFormat).grade)])),rows=[],comments=[],diagnostics=[],summaries=[];let history=[];
 for(const skill of [10,25,50,75,100]){let passes=0,wins=0;const places=[];
  for(let i=0;i<10;i++){
   const seed=1000+i,produced=produceDemoTrack(base,{skill,seed,clean:skill>=25}),captured=captureTrackVersion(produced.state,{projectId:produced.beatId,nowMinute:602});assert.equal(captured.ok,true,captured.reason);const version=captured.state.trackVersions.byId[captured.versionId];
   const grades=selectionJudges.map(j=>evaluateTrack(version,j,selectionFormat).grade),ranking=rankTournamentSelection([...npcs.map(n=>n.id),'player'],{...npcGrades,player:grades},{seed}),place=ranking.ranked.find(r=>r.participantId==='player').place,passed=ranking.qualifiedIds.includes('player');places.push(place);passes+=passed?1:0;
   const bracket=seedBracket(ranking.qualifiedIds,{seed}),pair=bracket.rounds[0].find(p=>p.participantIds.includes('player')),other=npcs.find(n=>n.id===pair?.participantIds.find(id=>id!=='player'))?.version;
   const votes=other?pairJudges.map(j=>evaluateTrack(version,j,pairFormat,{opponent:other,tieSeed:seed}).decision.winnerId===version.id):[],won=votes.filter(Boolean).length>votes.length/2;wins+=won?1:0;
   rows.push({skill,seed,versionId:version.id,qualities:version.qualities,grades,place,passed,pairWon:won,opponentId:other?.npc.characterId??null});
   for(const judge of allJudges){const round=DEMO_BATTLE.panels.selection.judgeIds.includes(judge.id)?'selection':Object.keys(DEMO_BATTLE.panels).find(r=>DEMO_BATTLE.panels[r].judgeIds.includes(judge.id)),format=battleFormat(BATTLE,round),opponent=round==='selection'?null:other??npcs[0].version;
    const previous=history.findLast(r=>r.judgeId===judge.id),generated=generateJudgeReview({version,judge,format,opponent,pairTieSeed:seed},{seed,history,copyHistory:false});assert.ok(generated.result,JSON.stringify(generated.diagnostics));assert.deepEqual(generated.diagnostics.unsupportedClaims,[]);const r=generated.result;assert.notEqual(r.comment,previous?.comment);assert.ok(r.evidenceIds.every(id=>version.facts.some(f=>f.id===id)));assert.doesNotMatch(r.comment,/\{[^}]+\}/);history=generated.history;
    comments.push({skill,seed,judgeId:judge.id,versionId:version.id,comment:r.comment,families:r.families,evidenceIds:r.evidenceIds});if(generated.diagnostics.nearRepeats.length||generated.diagnostics.limitedFamilies.length)diagnostics.push({skill,seed,judgeId:judge.id,...generated.diagnostics});
   }
  }summaries.push({skill,seeds:10,passes,pairWins:wins,places});
 }
 const social=[];for(const context of REACTION_BANK.contexts){const facts=[...new Set(context.items.flatMap(t=>t.requires??[])),'next_round_exists','player_track_exists','published_judge_reviews_exist'];for(let seed=0;seed<10;seed++){const p=planPostReactions({postId:context.id+':'+seed,context:context.id,seed,audience:100,hype:80,negativeShare:.5,activeAuthors:REACTION_AUTHORS,startAt:100,eventFacts:facts,judgeName:'Судья'});assert.equal(publicPostReactions(p,99).comments.length,0);assert.equal(new Set(p.comments.map(c=>c.body)).size,p.comments.length);for(const c of p.comments){const template=context.items.find(t=>t.id===c.templateId);assert.ok(template.requires.every(f=>facts.includes(f)));assert.doesNotMatch(c.body,/\{[^}]+\}/);}social.push({context:context.id,seed,templates:p.comments.map(c=>c.templateId),bodies:p.comments.map(c=>c.body)});}}
 assert.equal(rows.length,50);assert.ok(Math.min(...summaries.at(-1).places)<Math.min(...summaries[0].places));assert.ok(new Set(comments.filter(c=>c.seed===1000&&c.skill===50).map(c=>c.comment)).size>=25);
 return {policyVersion:2,kind:'fixed-production-sample-not-promised-win-rates',seeds:'1000–1009 at each skill',works:50,judges:allJudges.length,reviewCount:comments.length,summaries,rows,comments,diagnostics,social};
}
