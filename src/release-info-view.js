import {BUILD_INFO} from './build-info.js?rev=61';
export function mountReleaseInfo(root,{buildInfo=BUILD_INFO}={}){
 const doc=root.ownerDocument,section=doc.createElement('div');section.className='release-info';section.setAttribute('tabindex','0');section.setAttribute('aria-label','Версия и ограничения веб-превью');
 const label=doc.createElement('p');label.textContent=`${buildInfo.version} · ${buildInfo.revision.slice(0,7)}`;section.append(label);
 if(buildInfo.profile==='public-preview'){const note=doc.createElement('p');note.textContent='Музыка и вокал отключены в тестовой веб-версии';section.append(note);}
 root.append(section);return {dispose(){section.remove();}};
}
