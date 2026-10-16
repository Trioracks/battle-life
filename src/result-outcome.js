// Resolves only a published, completed result; panel and table aliases share one key.
export function resolveResultOutcome(state,eventId){
 const events=state.socialRuntime?.events??[],source=events.find(e=>e.id===eventId&&['judge-panel-complete','round-result'].includes(e.type));if(!source)return null;
 const now=state.socialRuntime?.lastMinute;if(Number.isFinite(now)&&source.dueAt>now)return null;
 const t=state.tournaments?.byId?.[source.battleId],r=t?.rounds?.[source.roundId];if(!r)return source.type==='judge-panel-complete'?source:null;
 if(r.status!=='complete'||r.completedAt>(now??source.dueAt))return null;
 const final=events.find(e=>e.type==='round-result'&&e.battleId===source.battleId&&e.roundId===source.roundId&&e.dueAt<=(now??source.dueAt));if(!final)return null;
 const selection=source.roundId==='selection',pair=r.pairs?.find(p=>p.participantIds.includes('player'));
 if(selection?!state.battleApplications?.some(a=>a.battleId===source.battleId):!pair)return null;
 const submitted=r.submissions.player,trackVersionId=state.trackVersions?.byId?.[submitted]?submitted:null,technical=pair&&pair.technical?.kind!=='judged',win=selection?t.qualifiedIds.includes('player'):pair.winnerId==='player';
 const outcome=technical&&win?'technical_win':!submitted?'no_show':win?(source.roundId==='final'?'champion':'qualified'):selection?'selection_loss':'pair_loss';
 const resultIds=trackVersionId?Object.values(r.judgeBatches??{}).filter(b=>b.publishedAt<=final.dueAt).flatMap(b=>b.resultIds).filter(id=>{const review=state.judging?.results?.[id];return review?.trackVersionId===trackVersionId&&review.roundId===source.roundId&&review.battleId===source.battleId;}):[];
 return {...final,qualification:win?'qualified':'eliminated',outcome,trackVersionId,resultIds};
}
