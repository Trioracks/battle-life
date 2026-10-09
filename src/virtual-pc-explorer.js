import {diskUsage} from './virtual-pc-state.js?rev=17';
import {BATTLE_BRIEFS} from './virtual-pc-catalog.js?rev=17';
export const EXPLORER_PATHS=Object.freeze({
  computer:{label:'Мой компьютер',address:'Мой компьютер',parent:null,iconId:'computer'},
  disk:{label:'Локальный диск (C:)',address:'C:\\',parent:'computer',iconId:'disk'},
  windows:{label:'Windows',address:'C:\\Windows',parent:'disk',iconId:'folder'},
  documents:{label:'Мои документы',address:'C:\\Мои документы',parent:'disk',iconId:'documents'},
  projects:{label:'Мои проекты',address:'C:\\Мои документы\\Мои проекты',parent:'documents',iconId:'folder'},
});
function resolvePath(value) {
  if(typeof value!=='string')return null;
  if(Object.hasOwn(EXPLORER_PATHS,value))return value;
  const normalized=value.trim().replaceAll('/','\\').replace(/\\+$/,'').toLowerCase();
  return Object.keys(EXPLORER_PATHS).find(k=>EXPLORER_PATHS[k].address.replace(/\\+$/,'').toLowerCase()===normalized)??null;
}
export function createExplorerState(path='computer') {
  path=resolvePath(path)??'computer';return {path,history:[path],index:0,selection:null,view:'icons',treeVisible:true,error:''};
}
export function navigateExplorer(s,a) {
  if(a.type==='select')return {...s,selection:a.id??null,error:''};
  if(a.type==='view')return ['icons','details'].includes(a.view)?{...s,view:a.view}:s;
  if(a.type==='toggle-tree')return {...s,treeVisible:!s.treeVisible};
  if(a.type==='back'||a.type==='forward'){
    const i=s.index+(a.type==='back'?-1:1);
    return i<0||i>=s.history.length?s:{...s,index:i,path:s.history[i],selection:null,error:''};
  }
  const path=a.type==='up'?EXPLORER_PATHS[s.path].parent:resolvePath(a.path);
  if(a.type==='up'&&!path)return s;
  if(!path)return {...s,error:'Путь не найден. Доступны только папки игрового компьютера.'};
  if(path===s.path)return {...s,error:''};
  const history=[...s.history.slice(0,s.index+1),path];
  return {...s,path,history,index:history.length-1,selection:null,error:''};
}
function folder(id,kind='folder') {
  const p=EXPLORER_PATHS[id];return {id,kind,name:p.label,iconId:p.iconId,targetPath:id};
}
export function explorerEntries(pcState,path) {
  if(path==='computer')return [folder('disk','disk')];
  if(path==='disk')return [folder('windows'),folder('documents')];
  if(path==='documents')return [folder('projects')];
  if(path==='projects')return pcState.projects.map(p=>({id:'project:'+p.id,kind:'project',name:typeof p.name==='string'?p.name:p.id,iconId:'project',projectId:p.id,sizeMb:2}));
  return [];
}
export function explorerProperties(state,entry) {
  if(entry?.kind==='disk'){
    const u=diskUsage(state);return {title:'Свойства: Локальный диск (C:)',rows:[{label:'Тип',value:'Локальный игровой диск'},{label:'Ёмкость',value:u.capacityMb+' МБ'},{label:'Занято',value:Math.round(u.usedMb)+' МБ'},{label:'Свободно',value:Math.round(u.freeMb)+' МБ'}]};
  }
  const p=state.projects.find(p=>p.id===entry?.projectId);
  return {title:'Свойства: '+(entry?.name??'Объект'),rows:[{label:'Имя',value:entry?.name??''},{label:'Тип',value:entry?.kind==='project'?'Проект FT Studio':'Папка'},...(p?[{label:'Размер',value:'2 МБ'},{label:'Баттл',value:BATTLE_BRIEFS.find(b=>b.id===p.battleId)?.title??'Не указан'}]:[])]};
}
