import {PC_IDENTITY} from './pc-identity.js?rev=39';
import {diskUsage} from './virtual-pc-state.js?rev=39';
import {formatDiskGb,diskAmount} from './virtual-pc-disk-view.js?rev=39';
import {BATTLE_BRIEFS} from './virtual-pc-catalog.js?rev=39';
import {SOFTWARE} from './pc-software-catalog.js?rev=39';
export const EXPLORER_PATHS=Object.freeze({
  computer:{label:'Мой компьютер',address:'Мой компьютер',parent:null,iconId:'computer'},
  disk:{label:'Локальный диск (C:)',address:'C:\\',parent:'computer',iconId:'disk'},
  windows:{label:PC_IDENTITY.systemLabel,address:PC_IDENTITY.systemAddress,parent:'disk',iconId:'folder'},
  documents:{label:'Мои документы',address:'C:\\Мои документы',parent:'disk',iconId:'documents'},
  projects:{label:'Мои проекты',address:'C:\\Мои документы\\Мои проекты',parent:'documents',iconId:'folder'},
  downloads:{label:'Загрузки',address:'C:\\Загрузки',parent:'disk',iconId:'folder'},
});
export function explorerPaths(state={}){
 const paths={...EXPLORER_PATHS};
 for(const [id,app]of Object.entries(state.software??{})){
  if(!SOFTWARE[id]||!app.installed)continue;
  const parts=app.path.slice(3).split('\\');let parent='disk',address='C:';
  for(const label of parts){address+='\\'+label;const key=Object.keys(paths).find(k=>paths[k].address.toLowerCase()===address.toLowerCase())??address;paths[key]={label,address,parent,iconId:'folder'};parent=key;}
  if(id==='ft')for(const label of ['Data','Projects','Plugins','Presets'])paths[address+'\\'+label]={label,address:address+'\\'+label,parent,iconId:'folder'};
 }
 return paths;
}
function resolvePath(value,paths=EXPLORER_PATHS) {
  if(typeof value!=='string')return null;
  if(Object.hasOwn(paths,value))return value;
  const normalized=value.trim().replaceAll('/','\\').replace(/\\+$/,'').toLowerCase();
  return Object.keys(paths).find(k=>paths[k].address.replace(/\\+$/,'').toLowerCase()===normalized)??null;
}
export function createExplorerState(path='computer') {
  path=resolvePath(path)??'computer';return {path,history:[path],index:0,selection:null,view:'icons',treeVisible:true,error:''};
}
export function reconcileExplorerState(s,pcState={}) {
  const paths=explorerPaths(pcState);
  const existingAncestor=value=>{
    let candidate=value;
    while(candidate){
      const found=resolvePath(candidate,paths);if(found)return found;
      const end=candidate.lastIndexOf('\\');if(end<0)break;
      candidate=candidate.slice(0,end);
    }
    return 'computer';
  };
  const path=existingAncestor(s.path),history=s.history.map(existingAncestor);
  if(path===s.path&&history.every((entry,i)=>entry===s.history[i]))return s;
  return {...s,path,history,...(path!==s.path?{selection:null,error:''}:{})};
}
export function navigateExplorer(s,a,pcState={}) {
  s=reconcileExplorerState(s,pcState);
  const paths=explorerPaths(pcState);
  if(a.type==='select')return {...s,selection:a.id??null,error:''};
  if(a.type==='view')return ['icons','details'].includes(a.view)?{...s,view:a.view}:s;
  if(a.type==='toggle-tree')return {...s,treeVisible:!s.treeVisible};
  if(a.type==='back'||a.type==='forward'){
    const i=s.index+(a.type==='back'?-1:1);
    return i<0||i>=s.history.length?s:{...s,index:i,path:s.history[i],selection:null,error:''};
  }
  const path=a.type==='up'?paths[s.path]?.parent:resolvePath(a.path,paths);
  if(a.type==='up'&&!path)return s;
  if(!path)return {...s,error:'Путь не найден. Доступны только папки игрового компьютера.'};
  if(path===s.path)return {...s,error:''};
  const history=[...s.history.slice(0,s.index+1),path];
  return {...s,path,history,index:history.length-1,selection:null,error:''};
}
export function explorerEntries(pcState,path) {
  if(path==='projects')return pcState.projects.map(p=>({id:'project:'+p.id,kind:'project',name:typeof p.name==='string'?p.name:p.id,iconId:'project',projectId:p.id,sizeMb:2}));
  const paths=explorerPaths(pcState),entries=Object.entries(paths).filter(([,p])=>p.parent===path).map(([id,p])=>({id,kind:id==='disk'?'disk':'folder',name:p.label,iconId:p.iconId,targetPath:id}));
  const s=pcState.software;
  if(path==='downloads'&&s){
   for(const [id,definition]of Object.entries(SOFTWARE)){const app=s[id],total=definition.downloadBytes;if(app?.receivedBytes>0)entries.push({id:'archive:'+id,kind:'artifact',name:definition.archive+(app.receivedBytes<total?'.part':''),iconId:definition.iconId,sizeMb:app.receivedBytes/1000000,...(app.receivedBytes===total?{action:'installer',appId:id}:{})});}
   for(const [id,definition]of Object.entries(SOFTWARE))if(definition.metadataKey&&s[definition.metadataKey])entries.push({id:id+'-metadata',kind:'artifact',name:definition.torrent,iconId:'torent',sizeMb:.012,action:'open-metadata',appId:id});
  }
  for(const [id,app]of Object.entries(s??{}))if(SOFTWARE[id]&&app.installed&&paths[path]?.address.toLowerCase()===app.path.toLowerCase()){
   entries.push({id:'exe:'+id,kind:'application',name:SOFTWARE[id].name+'.exe',iconId:SOFTWARE[id].iconId,softwareId:id,sizeMb:SOFTWARE[id].installedBytes/1000000,appId:SOFTWARE[id].desktopAppId});
   if(id==='client')entries.push({id:'config:client',kind:'file',name:'settings.dat',iconId:'project'});
  }
  return entries;
}
export function explorerProperties(state,entry) {
  if(entry?.kind==='disk'){
    const u=diskUsage(state);return {kind:'disk',title:'Свойства: Локальный диск (C:)',rows:[{label:'Тип',value:'Локальный игровой диск'},{label:'Ёмкость',value:formatDiskGb(u.capacityMb)},{label:'Занято',value:diskAmount(u.usedMb)},{label:'Свободно',value:diskAmount(u.freeMb)}]};
  }
  const p=state.projects.find(p=>p.id===entry?.projectId);
  let type=({project:'Проект FT Studio',folder:'Папка',application:'Приложение',file:'Файл конфигурации'})[entry?.kind]??'Файл';
  if(p?.kind==='lyrics')type='Документ Рэпблокнота';
  if(entry?.kind==='artifact')type=({part:'Незавершённая загрузка',torrent:'Файл метаданных BitTorrent',zip:'Архив ZIP',exe:'Приложение'})[entry.name.split('.').pop().toLowerCase()]??'Файл';
  return {title:'Свойства: '+(entry?.name??'Объект'),rows:[{label:'Имя',value:entry?.name??''},{label:'Тип',value:type},...(p?[{label:'Размер',value:'2 МБ'},{label:'Баттл',value:BATTLE_BRIEFS.find(b=>b.id===p.battleId)?.title??'Не указан'}]:[])]};
}
