import {pcPresentation} from './virtual-pc-presentation.js?rev=60';
// A small read-only projection. It owns neither clocks, audio nor application state.
export function pcMonitorPresentation(state,{activeAppId,address='',projectId,job,snapshot={phase:'room'},paused=false,playerName='Игрок'}={}){
 const base=pcPresentation(snapshot,state.power,playerName);if(base.screen!=='desktop')return base;
 const id=job?.projectId??job?.beatId??projectId,project=state.projects?.find(p=>p.id===id);
 const app=job?(project?.kind==='lyrics'?'notebook':'studio'):activeAppId==='rap-notebook'?'notebook':activeAppId==='ft-studio'?'studio':activeAppId==='underweb'?(address.startsWith('underweb://social')?'social':'browser'):activeAppId?'files':'desktop';
 const selected=project??(['notebook','studio'].includes(app)?state.projects?.find(p=>p.id===(app==='notebook'?state.writing?.activeTextId:state.music?.activeBeatId)):null);
 const progress=job?Math.max(0,Math.min(1,(job.elapsed??0)/(job.total||1))):0;
 const lines=String(selected?.content??selected?.text??'').split('\n').filter(Boolean).slice(0,10);
 return {...base,app,address,title:selected?.name??(app==='social'?'В кругу':app==='browser'?'Underweb':base.title),lines,lanes:Math.min(9,Math.max(1,(selected?.stages?.length??0)*3)),progress,frame:job?Math.floor((job.elapsed??0)*3)%12:0,working:Boolean(job),paused:Boolean(paused)};
}
