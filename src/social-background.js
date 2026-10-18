// The background domain may write only these sections. UI actions replace them
// immutably; reference guards prevent a late worker from undoing a newer action.
export const SOCIAL_DOMAIN_KEYS=Object.freeze(['social','phone','socialRuntime','communityAudio','battleSubmissions','battleWindows','tournaments','trackVersions','judging','judgingSchedule','npcTracks','battleHistory','roundThemes','roundThemeRecovery','socialReactions']);
const READ_KEYS=[...SOCIAL_DOMAIN_KEYS,'battleApplications'];
const captured=state=>Object.fromEntries(READ_KEYS.map(key=>[key,state[key]]));
const unchanged=(state,base)=>READ_KEYS.every(key=>state[key]===base[key]);

export function createSocialBackground({createWorker=()=>new Worker(new URL('./social-worker.js?rev=45',import.meta.url),{type:'module'}),getState,persist,onState,onError=()=>{}}){
 let worker=null,pending=null,mirror={},lastInput=null,lastMinute=null,lastDispatch=-Infinity,sequence=0,epoch=0,failed='',disposed=false,jobsStarted=0,commits=0;
 function stop(){if(worker)worker.terminate();worker=null;pending=null;mirror={};epoch++;}
 function fail(reason){stop();failed=reason||'Не удалось обработать события баттла.';onError(failed);}
 function receive(data,generation){
  if(disposed||generation!==epoch||!pending||data.id!==pending.id)return;
  const job=pending;pending=null;
  if(!unchanged(getState(),job.input)){mirror={};lastInput=null;return;}
  if(data.error){fail(data.error);return;}
  // Never merge a whole old snapshot: needs, project work and transfers continue
  // independently while the worker calculates. No optimistic events before save.
  const patch=Object.fromEntries(SOCIAL_DOMAIN_KEYS.filter(key=>Object.hasOwn(data.patch??{},key)).map(key=>[key,data.patch[key]]));
  const archives=(data.archives??[]).map(entry=>{
   const field=entry.key==='trackVersions'?'byId':'results',previous=job.input[entry.key];
   const value=entry.same?previous:{...entry.value,[field]:{...Object.fromEntries((entry.reused??[]).map(id=>[id,previous[field][id]])),...entry.value[field]}};
   patch[entry.key]=value;return {...entry,value};
  });
  const next={...getState(),...patch};
  if(data.durable){
   let saved;try{saved=persist(next,archives);}catch{saved=false;}
   if(saved===false||saved?.ok===false){fail('События баттла не сохранены. Проверь свободное место и повтори попытку.');return;}
  }
  onState(next,archives);commits++;lastMinute=job.minute;lastInput=captured(getState());mirror={...job.input,...patch};
 }
 return {
  tick(nowMinute,options={},realMs=performance.now()){
   if(disposed||failed||pending||!Number.isFinite(nowMinute)||nowMinute<0||realMs-lastDispatch<250)return;
   const minute=Math.floor(nowMinute),state=getState();if(lastMinute===minute&&lastInput&&unchanged(state,lastInput))return;
   const input=captured(state),patch=Object.fromEntries(READ_KEYS.filter(key=>!Object.hasOwn(mirror,key)||mirror[key]!==input[key]).map(key=>[key,input[key]]));
   // Practice changes continuously. Use the dispatch-time skill snapshot for
   // newly announced rounds, not as a reason to starve the job during writing.
   patch.music={practice:state.music?.practice};patch.writing={practice:state.writing?.practice};patch.recording={practice:{...state.recording?.practice}};
   try{
    if(!worker){worker=createWorker();const generation=epoch;worker.onmessage=event=>receive(event.data,generation);worker.onerror=event=>{event.preventDefault?.();if(generation===epoch&&!disposed)fail(event.message||'Фоновая обработка недоступна.');};worker.onmessageerror=()=>{if(generation===epoch&&!disposed)fail('Не удалось прочитать фоновый результат.');};}
    pending={id:++sequence,input,minute};lastDispatch=realMs;jobsStarted++;worker.postMessage({id:pending.id,patch,nowMinute:minute,options:structuredClone(options)});
   }catch(error){fail(error.message);}
  },
  retry(){if(disposed)return;failed='';lastInput=null;lastDispatch=-Infinity;onError('');},
  reset(){stop();failed='';lastInput=null;lastMinute=null;lastDispatch=-Infinity;onError('');},
  dispose(){disposed=true;stop();},
  get snapshot(){return {busy:Boolean(pending),failed:Boolean(failed),error:failed,jobsStarted,commits};},
 };
}
