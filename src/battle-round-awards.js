import {seededLottery} from './battle-seeding.js?rev=45';
export function selectRoundLtr({versions,judgeResults,judgeId,seed}={}){
 const candidates=(versions??[]).flatMap(v=>{const trackVersionId=v.id??v.trackVersionId,participantId=v.participantId??v.npc?.characterId,r=(judgeResults??[]).find(r=>r.judgeId===judgeId&&r.trackVersionId===trackVersionId&&Number.isFinite(r.raw));return participantId&&r?[{judgeId,participantId,trackVersionId,rawScore:r.raw}]:[];});
 if(!candidates.length)return null;const maximum=Math.max(...candidates.map(c=>c.rawScore)),best=candidates.filter(c=>c.rawScore===maximum),winner=seededLottery([...new Set(best.map(c=>c.trackVersionId))],[seed,judgeId,'ltr'].join(':'))[0];return best.find(c=>c.trackVersionId===winner);
}
