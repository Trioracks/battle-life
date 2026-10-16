import assert from 'node:assert/strict';
export function summarizeNative(rows){
 const quantile=(a,p)=>a[Math.min(a.length-1,Math.floor(a.length*p))]??0;
 const updates=rows.map(r=>r.ms).sort((a,b)=>a-b),frames=rows.map(r=>r.dt).filter(n=>n>0).sort((a,b)=>a-b);
 return {frames:rows.length,fps:frames.length?1000/(frames.reduce((a,b)=>a+b,0)/frames.length):0,updateP50:quantile(updates,.5),updateP95:quantile(updates,.95),updateMax:updates.at(-1)??0,frameP95:quantile(frames,.95),frameMax:frames.at(-1)??0,framesOver100ms:frames.filter(n=>n>100).length,walking:rows.filter(r=>r.walking||r.phase==='walk').length,whileBusy:rows.filter(r=>r.background).length,targetsMet:quantile(updates,.95)<=20&&quantile(frames,.95)<=25};
}
export function assertNativeTargets(row,label){
 assert.ok(Number.isFinite(row.updateP95)&&row.updateP95<=20,label+' update p95 '+row.updateP95+' ms exceeds 20 ms');
 assert.ok(Number.isFinite(row.frameP95)&&row.frameP95>0&&row.frameP95<=25,label+' frame p95 '+row.frameP95+' ms exceeds 25 ms');
}
