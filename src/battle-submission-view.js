import {audioFileMatchesBattle} from './battle-file-match.js?rev=57';
import {currentBattleWindow} from './battle-windows.js?rev=57';
import {mountAudioFilePicker} from './pc-audio-file-picker.js?rev=57';
import {attachSubmissionTrack} from './social-submission.js?rev=57';

export function mountBattleSubmissionPicker(root,{getState,battleId,communityId=battleId,getGameMinute=()=>null,onChange,onClose=()=>{}}){
 return mountAudioFilePicker(root,{getState,onClose,filter:file=>{const s=getState(),w=currentBattleWindow(s,battleId,getGameMinute());return Boolean(w)&&audioFileMatchesBattle(s,file,{battleId,roundId:w.roundId,themeId:s.roundThemes?.[battleId+':'+w.roundId]?.id});},onSelect:fileId=>{
  const result=attachSubmissionTrack(getState(),{communityId,fileId,nowMinute:getGameMinute()});if(!result.ok)return result;
  let saved;try{saved=onChange(result.state);}catch{saved=false;}
  return saved===false||saved?.ok===false?{ok:false,reason:'Вложение не сохранено. Освободи место для сохранения и попробуй снова.'}:{ok:true};
 }});
}
