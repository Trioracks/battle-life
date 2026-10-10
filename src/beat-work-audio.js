// Only the work scene owns these sources. Frame updates never restart a loop.
export function createBeatWorkAudio(audio){
 let current=null,activeKey=null,lastPhase='',blocked=false,disposed=false,error='',generation=0;
 function stop(){generation++;if(activeKey!==null)audio.stop({fadeSeconds:.08});activeKey=null;}
 function sync(frame){
  if(disposed)return {audioError:'',needsGesture:false};
  current=frame;
  if(frame.phase==='work-out'&&lastPhase!=='work-out'){blocked=false;error='';}
  lastPhase=frame.phase;
  const valid=frame.phase==='working'&&frame.beat?.id===frame.job?.beatId&&[0,1,2].includes(frame.job?.stage);
  if(frame.hidden){if(frame.phase.startsWith('work'))blocked=true;stop();}
  else if(!valid)stop();
  else if(!blocked){
   const key=frame.beat.id+':'+frame.job.stage;
   if(key!==activeKey){
    stop();activeKey=key;error='';const token=generation;
    Promise.resolve(audio.playProject(frame.beat,{workStage:frame.job.stage})).then(ok=>{
     if(!disposed&&token===generation&&!ok)error=audio.error||'Не удалось включить звук. Работа продолжается.';
    }).catch(()=>{if(!disposed&&token===generation)error='Не удалось включить звук. Работа продолжается.';});
   }
  }
  return {audioError:error,needsGesture:blocked||Boolean(error)};
 }
 async function enableAudio(){
  if(disposed||!current||current.hidden||current.phase!=='working')return false;
  const token=generation;
  try{await audio.unlock?.();if(disposed||token!==generation)return false;blocked=false;error='';activeKey=null;sync(current);return true;}
  catch{error='Браузер не разрешил звук. Попробуйте ещё раз.';return false;}
 }
 return {sync,enableAudio,dispose(){stop();disposed=true;current=null;}};
}
