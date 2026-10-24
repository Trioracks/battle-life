import {mountPcFilePicker} from './pc-file-picker-view.js?rev=60';
import {pcFileById} from './pc-filesystem.js?rev=60';
export function mountAudioFilePicker(root,{getState,onSelect,onClose=()=>{},filter=()=>true}={}){
 return mountPcFilePicker(root,{getState,mode:'attach',types:['wav','mp3'],initialFolderId:'exports',emptyText:'Сначала экспортируй полный трек для этого баттла в FT Studio.',filter:file=>file.kind==='track'&&filter(file),onCancel:onClose,onSelect:fileId=>{
  const file=pcFileById(getState(),fileId);if(!file||file.kind!=='track'||!filter(file))return {ok:false,reason:'Выбери готовый трек для этого баттла.'};const result=onSelect(fileId);if(result?.ok===false)return result;onClose();return {ok:true};
 }});
}
