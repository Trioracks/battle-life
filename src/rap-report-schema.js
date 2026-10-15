// Pure saved-report contract. Historical reports do not require live audio,
// version qualities, or judge data; every consumer accepts the same structure.
const record=v=>v&&typeof v==='object'&&!Array.isArray(v);
const strings=v=>Array.isArray(v)&&v.every(x=>typeof x==='string');
export function validRapReport(r){
 return Boolean(record(r)&&typeof r.id==='string'&&typeof r.subjectId==='string'&&typeof r.trackVersionId==='string'&&typeof r.trackName==='string'&&(r.supersedes==null||typeof r.supersedes==='string')&&Number.isFinite(r.createdAt)&&r.createdAt>=0&&strings(r.sourceIds)&&r.sourceIds.includes(r.trackVersionId)&&strings(r.reviewIds)&&record(r.heroSnapshot)&&['intelligence','writing','flow','musicality','beatmaking','sound'].every(k=>Number.isFinite(r.heroSnapshot[k])&&r.heroSnapshot[k]>=0&&r.heroSnapshot[k]<=100)&&['text','performance','music','sound'].every(k=>{
  const o=r.observations?.[k];return record(o)&&(o.band===null||Number.isInteger(o.band)&&o.band>=0&&o.band<=7)&&Number.isFinite(o.confidence)&&o.confidence>=0&&o.confidence<=1;
 }));
}
// Check saved report associations without consulting live source availability.
// Shared by reload, case retry and direct track retry; originals remain recoverable.
export function reconcileResearchFindings(research,analysis){
 if(!research)return research;
 const invalid=Object.values(research.findings??{}).filter(f=>{
  const reports=(f.reportIds??[]).map(id=>analysis.reports[id]);
  return !Array.isArray(f.trackVersionIds)||reports.length!==f.trackVersionIds.length||reports.some((r,i)=>!validRapReport(r)||r.id!==f.reportIds[i]||!f.trackVersionIds.includes(r.trackVersionId)||r.createdAt>f.createdAt)||new Set(reports.map(r=>r?.trackVersionId)).size!==f.trackVersionIds.length;
 });
 if(!invalid.length)return research;
 const findings={...research.findings},recovery=[...(research.recovery??[])];
 for(const finding of invalid){delete findings[finding.id];recovery.push({type:'finding',id:finding.id,recoveryData:structuredClone(finding),reason:'Отчёт этого изучения недоступен или повреждён. Исходное изучение сохранено; источники можно изучить снова.'});}
 return {...research,findings,recovery};
}
