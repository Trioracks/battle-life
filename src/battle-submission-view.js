import {mountAudioFilePicker} from './pc-audio-file-picker.js?rev=45';
import {attachSubmissionTrack} from './social-submission.js?rev=45';

export function mountBattleSubmissionPicker(root,{getState,battleId,communityId=battleId,getGameMinute=()=>null,onChange,onClose=()=>{}}){
 return mountAudioFilePicker(root,{getState,onClose,describe:file=>{
  const lyrics=getState().trackVersions?.byId?.[file.trackVersionId]?.recipe?.lyrics;
  return !lyrics?'Связь с темой не подтверждена.':lyrics.battleId===battleId?'Текст написан для этого баттла.':'Трек для другой темы. Отправка разрешена.';
 },onSelect:fileId=>{
  const result=attachSubmissionTrack(getState(),{communityId,fileId,nowMinute:getGameMinute()});if(!result.ok)return result;
  let saved;try{saved=onChange(result.state);}catch{saved=false;}
  return saved===false||saved?.ok===false?{ok:false,reason:'Вложение не сохранено. Освободи место для сохранения и попробуй снова.'}:{ok:true};
 }});
}
