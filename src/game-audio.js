import {BeatAudio} from './beat-audio.js?rev=45';
import {BUILD_INFO} from './build-info.js?rev=45';

export const PUBLIC_AUDIO_NOTICE='Музыка и вокал отключены в тестовой веб-версии';
const stopped=()=>({status:'stopped',key:'',owner:null,positionSeconds:0,durationSeconds:0,error:''});
const noop=()=>{};
export function createGameAudio({profile=BUILD_INFO.profile,engineFactory=options=>new BeatAudio(options),engineOptions}={}){
 if(profile==='local-full'){
  const engine=engineFactory(engineOptions);
  Object.defineProperty(engine,'capabilities',{value:Object.freeze({recordedPlayback:true,reason:''}),enumerable:true});
  return engine;
 }
 // No engine, context, bank request, or PCM worker exists in the public build.
 return Object.freeze({
  capabilities:Object.freeze({recordedPlayback:false,reason:PUBLIC_AUDIO_NOTICE}),
  play:async()=>false,playProject:async()=>false,playDescriptor:async()=>false,
  unlock:async()=>{},getSnapshot:stopped,error:'',
  pause:noop,stop:noop,setRoomFrame:noop,dispose:noop,
 });
}
