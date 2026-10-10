import {diskUsage} from './virtual-pc-state.js?rev=23';
import {formatDiskGb,diskAmount} from './virtual-pc-disk-view.js?rev=21';
import {BATTLE_BRIEFS} from './virtual-pc-catalog.js?rev=23';
export const EXPLORER_PATHS=Object.freeze({
  computer:{label:'Мой компьютер',address:'Мой компьютер',parent:null,iconId:'computer'},
  disk:{label:'Локальный диск (C:)',address:'C:\\',parent:'computer',iconId:'disk'},
  windows:{label:'Windows',address:'C:\\Windows',parent:'disk',iconId:'folder'},
  documents:{label:'Мои документы',address:'C:\\Мои документы',parent:'disk',iconId:'documents'},
  projects:{label:'Мои проекты',address:'C:\\Мои документы\\Мои проекты',parent:'documents',iconId:'folder'},
  downloads:{label:'Загрузки',address:'C:\\Загрузки',parent:'disk',iconId:'folder'},
});
export function explorerPaths(state={}){
 const paths={...EXPLORER_PATHS};
 for(const [id,app]of Object.entries(state.software??{})){
  if(!['client','ft'].includes(id)||!app.installed)continue;
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
export function navigateExplorer(s,a,pcState={}) {
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
   for(const [id,app,name,total]of [['client',s.client,'torent-setup.exe',2000000],['ft',s.ft,'FT-Studio-setup.zip',800000000]])if(app.receivedBytes>0)entries.push({id:'archive:'+id,kind:'artifact',name:name+(app.receivedBytes<total?'.part':''),iconId:'project',sizeMb:app.receivedBytes/1000000,...(app.receivedBytes===total?{action:'installer',appId:id}:{})});
   if(s.metadata)entries.push({id:'ft-metadata',kind:'artifact',name:'FT-Studio.torrent',iconId:'torent',sizeMb:.012,action:'open-metadata'});
  }
  for(const [id,app]of Object.entries(s??{}))if(['client','ft'].includes(id)&&app.installed&&paths[path]?.address.toLowerCase()===app.path.toLowerCase()){
   entries.push({id:'exe:'+id,kind:'application',name:id==='ft'?'FT Studio.exe':'torent.exe',iconId:id==='ft'?'studio':'torent',appId:id==='ft'?'ft-studio':'torent'});
   if(id==='client')entries.push({id:'config:client',kind:'file',name:'settings.dat',iconId:'project'});
  }
  return entries;
}
export function explorerProperties(state,entry) {
  if(entry?.kind==='disk'){
    const u=diskUsage(state);return {kind:'disk',title:'Свойства: Локальный диск (C:)',rows:[{label:'Тип',value:'Локальный игровой диск'},{label:'Ёмкость',value:formatDiskGb(u.capacityMb)},{label:'Занято',value:diskAmount(u.usedMb)},{label:'Свободно',value:diskAmount(u.freeMb)}]};
  }
  const p=state.projects.find(p=>p.id===entry?.projectId);
  return {title:'Свойства: '+(entry?.name??'Объект'),rows:[{label:'Имя',value:entry?.name??''},{label:'Тип',value:entry?.kind==='project'?'Проект FT Studio':'Папка'},...(p?[{label:'Размер',value:'2 МБ'},{label:'Баттл',value:BATTLE_BRIEFS.find(b=>b.id===p.battleId)?.title??'Не указан'}]:[])]};
}
