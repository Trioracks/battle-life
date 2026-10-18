import {PC_IDENTITY} from './pc-identity.js?rev=45';
import {pcElement as el,pcButton as button} from './virtual-pc-dom.js?rev=45';
import {createPcIcon} from './virtual-pc-icons.js?rev=45';
import {createExplorerState,reconcileExplorerState,navigateExplorer,explorerEntries,explorerProperties,explorerPaths} from './virtual-pc-explorer.js?rev=45';
import {createVirtualPcState,diskUsage} from './virtual-pc-state.js?rev=45';
import {mountDiskUsage} from './virtual-pc-disk-view.js?rev=45';
import {normalizeStudioProject} from './ft-studio-project.js?rev=45';
import {normalizeBeat} from './beat-production.js?rev=45';
import {mountAudioFilePlayer} from './pc-audio-export-view.js?rev=45';

export function mountExplorer(root,{onOpenArtifact,onSoftware,onOpenApp,onOpenProject,onProperties,onClose,onMenu,onNavigate,audio}) {
  const d=root.ownerDocument;let state=createVirtualPcState(),nav=createExplorerState(),signature='',diskLabel=null,disposed=false;
  const wrap=el(d,'div',{className:'pc-explorer'}),menubar=el(d,'div',{className:'pc-menubar'});
  const tools=el(d,'div',{className:'pc-explorer-tools'}),form=el(d,'form',{className:'pc-address'});
  const address=el(d,'input',{attributes:{'aria-label':'Адрес папки'},value:'Мой компьютер'});
  form.append(el(d,'label',{text:'Адрес'}),createPcIcon(d,'folder',{size:16}),address,button(d,'Переход',{},()=>navigate(address.value)));
  const main=el(d,'div',{className:'pc-explorer-main'}),tree=el(d,'nav',{className:'pc-folder-tree',attributes:{'aria-label':'Дерево папок'}});
  const files=el(d,'div',{className:'pc-file-area',attributes:{'aria-label':'Содержимое папки'}}),status=el(d,'div',{className:'pc-explorer-status',attributes:{'aria-live':'polite'}});
  main.append(tree,files);wrap.append(menubar,tools,form,main,status);root.replaceChildren(wrap);
  const player=mountAudioFilePlayer(wrap,{audio});
  const change=a=>{nav=navigateExplorer(nav,a,state);render(true);onNavigate?.(explorerPaths(state)[nav.path]);};
  const navigate=path=>change({type:'navigate',path});
  const entries=()=>explorerEntries(state,nav.path);
  const structuralSignature=()=>JSON.stringify([entries().map(({sizeMb,...entry})=>entry),explorerPaths(state)]);
  const sizeLabels=new Map();
  const selected=()=>entries().find(e=>e.id===nav.selection);
  function openEntry(entry) {
    if(!entry)return;
    if(entry.targetPath){navigate(entry.targetPath);return;}
    if(entry.kind==='audio'){const file=state.audioExports?.files.find(f=>f.id===entry.fileId);if(file)player.open(file);return;}
    if(entry.kind==='artifact'){
      if(entry.action){const message=onOpenArtifact?.(entry);nav={...nav,error:typeof message==='string'?message:''};status.textContent=nav.error||'Объектов: '+entries().length;status.dataset.error=String(!!nav.error);}
      return;
    }
    if(entry.kind==='application'){onOpenApp?.(entry.appId);return;}
    if(entry.kind==='file')return;
    const raw=state.projects.find(p=>p.id===entry.projectId),p=normalizeBeat(raw)??normalizeStudioProject(raw);
    if(!p){nav={...nav,error:'Этот проект повреждён и не может быть открыт.'};render(false);return;}
    onOpenProject(p);
  }
  function properties(entry=selected()){if(entry)onProperties(explorerProperties(state,entry));}
  const viewItems=()=>[
    {id:'icons',label:'Значки',onSelect:()=>change({type:'view',view:'icons'})},
    {id:'details',label:'Таблица',onSelect:()=>change({type:'view',view:'details'})},
    {id:'tree',label:'Панель папок',onSelect:()=>change({type:'toggle-tree'})},
  ];
  function menu(anchor,items,e) {const r=anchor.getBoundingClientRect();onMenu?.({anchor,items,x:e?.clientX??r.left,y:e?.clientY??r.bottom});}
  for(const [label,items]of [
    ['Файл',()=>[{id:'open',label:'Открыть',disabled:!selected(),onSelect:()=>openEntry(selected())},{id:'properties',label:'Свойства',disabled:!selected(),onSelect:()=>properties()},{id:'close',label:'Закрыть',onSelect:onClose}]],
    ['Вид',viewItems],
    ['Переход',()=>[{id:'back',label:'Назад',disabled:nav.index===0,onSelect:()=>change({type:'back'})},{id:'forward',label:'Вперёд',disabled:nav.index===nav.history.length-1,onSelect:()=>change({type:'forward'})},{id:'up',label:'Вверх',disabled:nav.path==='computer',onSelect:()=>change({type:'up'})}]],
  ]) {const b=button(d,label,{className:'pc-menu-trigger'},()=>menu(b,items()));menubar.append(b);}
  const back=button(d,'← Назад',{'attributes':{'aria-label':'Назад'}},()=>change({type:'back'}));
  const forward=button(d,'Вперёд →',{'attributes':{'aria-label':'Вперёд'}},()=>change({type:'forward'}));
  const up=button(d,'↑ Вверх',{'attributes':{'aria-label':'Вверх'}},()=>change({type:'up'}));
  const install=button(d,'Установить',{},()=>{const entry=selected(),id=entry?.softwareId??entry?.appId;if(id)onSoftware?.(state.software[id]?.installed?'uninstall':'installer',id);});
  tools.append(back,forward,up,button(d,'Папки',{},()=>change({type:'toggle-tree'})),button(d,'Вид',{},e=>menu(e.currentTarget,viewItems())),install);
  function updateInstall(){const entry=selected(),id=entry?.softwareId??(entry?.action==='installer'?entry.appId:null);install.hidden=!id;install.disabled=!id;install.textContent=id&&state.software[id]?.installed?'Удалить':'Установить';}
  function render(updateAddress) {
    if(disposed)return;
    const paths=explorerPaths(state);
    signature=structuralSignature();sizeLabels.clear();
    updateInstall();
    if(updateAddress)address.value=paths[nav.path]?.address??'Мой компьютер';
    back.disabled=nav.index===0;forward.disabled=nav.index===nav.history.length-1;up.disabled=nav.path==='computer';
    tree.hidden=!nav.treeVisible;tree.replaceChildren();
    for(const [id,p]of Object.entries(paths)){
      let depth=0,ancestor=p;while(ancestor.parent){depth++;ancestor=paths[ancestor.parent];}
      const b=button(d,'',{className:'pc-tree-item',attributes:{'aria-label':'Перейти: '+p.label,'aria-current':String(nav.path===id)}},()=>navigate(id));
      b.style.setProperty('padding-left',(6+depth*14)+'px');b.append(createPcIcon(d,p.iconId,{size:16}),el(d,'span',{text:p.label}));tree.append(b);
    }
    diskLabel?.dispose();files.replaceChildren();files.dataset.view=nav.view;diskLabel=null;
    if(nav.view==='details')files.append(el(d,'div',{className:'pc-details-head',text:'Имя                                      Тип                 Размер'}));
    if(nav.path==='windows')files.append(el(d,'p',{className:'pc-system-note',text:PC_IDENTITY.name+' — системные файлы. Доступны только для просмотра.'}));
    for(const entry of entries()){
      const label=entry.kind==='project'?'Открыть проект '+entry.name:entry.kind==='disk'?'Открыть диск C:':entry.kind==='folder'?'Открыть папку '+entry.name:'Открыть '+entry.name;
      const b=button(d,'',{className:'pc-file',dataset:{entryId:entry.id},attributes:{'aria-label':label,'aria-pressed':String(nav.selection===entry.id)}},()=>{
        nav={...nav,selection:entry.id,error:''};
        for(const item of files.children)if(item.dataset.entryId)item.setAttribute('aria-pressed',String(item.dataset.entryId===entry.id));
        status.textContent=entry.name;
        updateInstall();
      });
      b.append(createPcIcon(d,entry.iconId,{size:nav.view==='details'?16:32}),el(d,'span',{className:'pc-file-name',text:entry.name}));
      if(entry.kind==='disk'){const info=el(d,'span');b.append(info);diskLabel=mountDiskUsage(info);diskLabel.update(diskUsage(state));}
      if(nav.view==='details'){const size=el(d,'span',{text:entry.sizeMb?entry.sizeMb.toFixed(3)+' МБ':''});sizeLabels.set(entry.id,size);b.append(el(d,'span',{className:'pc-file-type',text:entry.kind==='project'?'Проект FT Studio':entry.kind==='audio'?'Аудиофайл WAV':entry.kind==='disk'?'Локальный диск':entry.kind==='folder'?'Папка':'Файл'}),size);}
      b.addEventListener('dblclick',()=>openEntry(entry));
      const context=e=>{e.preventDefault();e.stopPropagation();nav={...nav,selection:entry.id};b.setAttribute('aria-pressed','true');menu(b,[{id:'open',label:'Открыть',onSelect:()=>openEntry(entry)},{id:'properties',label:'Свойства',onSelect:()=>properties(entry)}],e.type==='contextmenu'?e:undefined);};
      b.addEventListener('contextmenu',context);
      b.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();openEntry(entry);}if(e.key==='F10'&&e.shiftKey)context(e);});
      files.append(b);
    }
    status.textContent=nav.error||'Объектов: '+entries().length;
    status.dataset.error=String(!!nav.error);
  }
  const submit=e=>{e.preventDefault();navigate(address.value);};
  form.addEventListener('submit',submit);
  const backgroundMenu=e=>{
    if(e.target!==files)return;e.preventDefault();nav={...nav,selection:null};
    menu(files,[{id:'view',label:'Вид',items:viewItems()},{id:'refresh',label:'Обновить',onSelect:()=>render(false)}],e);
  };
  files.addEventListener('contextmenu',backgroundMenu);
  render(true);
  return {navigate,update(next){
    player.update();
    state=next;const previous=nav;nav=reconcileExplorerState(nav,state);const moved=previous.path!==nav.path,sig=structuralSignature();
    if(sig!==signature||nav!==previous){if(nav.selection&&!entries().some(e=>e.id===nav.selection))nav={...nav,selection:null};render(moved);}
    else {updateInstall();diskLabel?.update(diskUsage(state));for(const entry of entries()){const label=sizeLabels.get(entry.id);if(label)label.textContent=entry.sizeMb?entry.sizeMb.toFixed(3)+' МБ':'';}}
    if(moved)onNavigate?.(explorerPaths(state)[nav.path]);
  },dispose(){disposed=true;player.dispose();diskLabel?.dispose();form.removeEventListener('submit',submit);files.removeEventListener('contextmenu',backgroundMenu);root.replaceChildren();}};
}
