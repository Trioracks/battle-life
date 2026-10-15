import {publicRoundTable} from './battle-results-table.js?rev=42';
import {publicCharacterProfile} from './npc-social-profiles.js?rev=42';
import {publicAnnouncedJudges,publicCommunityPosts} from './social-community-publications.js?rev=42';
import {SOCIAL_COMMUNITIES} from './social-catalog.js?rev=42';
import {publishedStudyReviews} from './rap-analysis.js?rev=42';
import {validGameMinute} from './game-minute.js?rev=42';
const sorted=values=>[...new Set(values)].sort();

// Resolve public projections only at command/completion boundaries, never per frame.
export function caseStudySources(state,{kind,battleId='makarevich-1',roundId,characterId,nowMinute}={}){
 const empty={sourceIds:[],reviewIds:[],judgeIds:[],trackVersionIds:[],cutoff:nowMinute};
 if(!validGameMinute(nowMinute)||!['battle','round','judge','opponent'].includes(kind))return empty;
 const roundIds=kind==='round'?[roundId]:Object.keys(state.tournaments?.byId?.[battleId]?.rounds??{});
 const tables=roundIds.filter(Boolean).map(id=>publicRoundTable(state,{battleId,roundId:id,nowMinute}));
 let tracks=tables.flatMap(t=>t.rows.filter(r=>!r.masked&&(kind!=='opponent'||r.participantId===characterId)).map(r=>r.trackVersionId).filter(Boolean));
 if(kind==='opponent')tracks.push(...(publicCharacterProfile(state,{characterId,nowMinute}).publicTrackVersionIds??[]));
 tracks=sorted(tracks).filter(id=>{const v=state.trackVersions?.byId?.[id];return v&&validGameMinute(v.createdAtMinute)&&v.createdAtMinute<=nowMinute;});
 let reviews=tracks.flatMap(trackVersionId=>publishedStudyReviews(state,{trackVersionId,nowMinute}));
 if(kind==='judge'){reviews=reviews.filter(r=>r.judgeId===characterId);const ids=new Set(reviews.map(r=>r.trackVersionId));tracks=tracks.filter(id=>ids.has(id));}
 const communityId=SOCIAL_COMMUNITIES.find(c=>c.battleId===battleId)?.id;
 const posts=communityId?publicCommunityPosts(state,{communityId,nowMinute}).filter(p=>p.roundId&&(kind!=='round'||p.roundId===roundId)&&(kind!=='judge'||p.judgeId===characterId)&&(kind!=='opponent')):[];
 const assignments=roundIds.flatMap(id=>publicAnnouncedJudges(state,{battleId,roundId:id,nowMinute})).map(j=>j.id);
 const judgeIds=sorted([...assignments,...reviews.map(r=>r.judgeId)].filter(id=>typeof id==='string'&&(kind!=='judge'||id===characterId)));
 const reviewIds=sorted(reviews.map(r=>r.id));
 return {sourceIds:sorted([...posts.map(p=>p.id),...tracks,...reviewIds]),reviewIds,judgeIds,trackVersionIds:tracks,cutoff:nowMinute};
}
