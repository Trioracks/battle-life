import {pcElement as el} from './virtual-pc-dom.js?rev=59';
import {renamePcFolder} from './pc-filesystem.js?rev=59';
// The folder already exists. Escape keeps its default name, as in Explorer.
export function mountFolderRename(label,{folderId,getState,onChange,onDone=()=>{},onError=()=>{}}){
 const folder=getState().fileSystem.folders.find(f=>f.id===folderId);if(!folder)return;
 const input=el(label.ownerDocument,'input',{className:'pc-folder-rename',value:folder.name,attributes:{'aria-label':'Имя новой папки',maxlength:'120'}});let closed=false,saving=false;
 function finish(){if(closed)return;closed=true;label.replaceChildren();label.textContent=getState().fileSystem.folders.find(f=>f.id===folderId)?.name??folder.name;onDone();}
 function save(){if(closed||saving)return;saving=true;const result=renamePcFolder(getState(),{folderId,name:input.value});if(!result.ok){saving=false;onError(result.reason);input.focus();return;}
  if(onChange(result.state)===false){saving=false;onError('Не удалось сохранить имя папки.');input.focus();return;}finish();
 }
 input.addEventListener('keydown',e=>{if(['Enter','Escape'].includes(e.key)){e.preventDefault();e.stopPropagation();if(e.key==='Escape')finish();else save();}});
 input.addEventListener('blur',save);input.addEventListener('click',e=>e.stopPropagation());label.textContent='';label.replaceChildren(input);input.focus();input.select?.();
 return {dispose(){closed=true;}};
}
