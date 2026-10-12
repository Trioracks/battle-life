import {PC_IDENTITY} from './pc-identity.js?rev=38';
import { FtStudioAudio } from './ft-studio-audio.js?rev=38';
import {mountPcShell} from './virtual-pc-shell.js?rev=38';
import {mountExplorer} from './virtual-pc-explorer-view.js?rev=38';
import {mountPcMenu} from './virtual-pc-menus.js?rev=38';
import {mountSystemWindow} from './virtual-pc-system-windows.js?rev=38';
import {explorerProperties} from './virtual-pc-explorer.js?rev=38';
import {createWindowState,reduceWindows} from './virtual-pc-window-state.js?rev=38';
import {layoutDesktopIcons,setDesktopIconPosition,resetDesktopIconPositions} from './virtual-pc-state.js?rev=38';
import {createPcIcon} from './virtual-pc-icons.js?rev=38';
import { normalizeStudioProject } from './ft-studio-project.js?rev=38';
import { BATTLE_BRIEFS, WALLPAPERS, desktopApps, resolveUnderweb } from './virtual-pc-catalog.js?rev=38';
import { createVirtualPcState, diskUsage, saveStudioProject } from './virtual-pc-state.js?rev=38';
import {diskAmount} from './virtual-pc-disk-view.js?rev=38';
import {pcPresentation} from './virtual-pc-presentation.js?rev=38';
import {createStudioWorkspace} from './ft-studio-view.js?rev=38';
import {mountUnderweb} from './underweb-view.js?rev=38';
import {applyToBattle} from './virtual-pc-state.js?rev=38';
import {mountBeatStudio} from './beat-studio-view.js?rev=38';
import {BeatAudio} from './beat-audio.js?rev=38';
import {normalizeBeat} from './beat-production.js?rev=38';
import {createBeatMarket} from './beat-market-view.js?rev=38';
import * as software from './pc-software.js?rev=38';
import {mountTorrent,mountInstaller,softwareMessage} from './pc-software-view.js?rev=38';
import {SOFTWARE} from './pc-software-catalog.js?rev=38';
import {mountRapNotebook} from './rap-notebook-view.js?rev=38';
import {normalizeLyric} from './lyric-production.js?rev=38';
import {pauseCreativeChain} from './creative-workflow.js?rev=38';
import {mountBattleSubmissionPicker} from './battle-submission-view.js?rev=38';

const NOOP = () => {};

function add(parent, child) { parent.append(child); return child; }

function el(document, tag, options = {}) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.type) node.type = options.type;
  if (options.value !== undefined) node.value = options.value;
  if (options.id) node.id = options.id;
  if (options.dataset) Object.assign(node.dataset, options.dataset);
  if (['button', 'input', 'select'].includes(tag) && !node.dataset.focusId) {
    node.dataset.focusId = options.attributes?.['aria-label'] ?? options.text ?? '';
  }
  for (const [name, value] of Object.entries(options.attributes ?? {})) node.setAttribute(name, value);
  return node;
}

function button(document, text, options = {}, handler = NOOP) {
  const node = el(document, 'button', { ...options, type: 'button', text });
  node.addEventListener('click', handler);
  return node;
}

function labeledInput(document, labelText, input) {
  const label = el(document, 'label', { className: 'pc-field', text: labelText });
  add(label, input);
  return label;
}

function mb(value) { return `${Math.round(value)} МБ`; }

function findFocusControl(node, id) {
  if (node?.dataset?.focusId === id) return node;
  for (const child of node?.children ?? []) {
    const found = findFocusControl(child, id);
    if (found) return found;
  }
  return null;
}

function focusableControls(node, controls = []) {
  if (node?.hidden || node?.inert) return controls;
  if (['BUTTON', 'INPUT', 'SELECT'].includes(node?.tagName) && !node.disabled && !node.hidden) controls.push(node);
  for (const child of node?.children ?? []) focusableControls(child, controls);
  return controls;
}

function findByDataset(node, key, value) {
  if (node?.dataset?.[key] === value) return node;
  for (const child of node?.children ?? []) {
    const found = findByDataset(child, key, value);
    if (found) return found;
  }
  return null;
}

export function mountVirtualPc(root, callbacks = {}) {
  const document = root.ownerDocument ?? globalThis.document;
  const pc = {
    root,
    document,
    callbacks: {
      onPersist: callbacks.onPersist ?? (() => true),
      onLeave: callbacks.onLeave ?? NOOP,
      onShutdown: callbacks.onShutdown ?? NOOP,
      onAppSound: callbacks.onAppSound ?? NOOP,
      onOpenProject: callbacks.onOpenProject ?? NOOP,
      onSaveProject: callbacks.onSaveProject ?? saveStudioProject,
    },
    setTimeoutFn: callbacks.setTimeoutFn ?? ((...args) => globalThis.setTimeout(...args)),
    clearTimeoutFn: callbacks.clearTimeoutFn ?? (timer => globalThis.clearTimeout(timer)),
    audio: callbacks.audio ?? new FtStudioAudio(),
    beatAudio: callbacks.beatAudio ?? new BeatAudio(),
    studioView:null,
    notebookView:null,
    pendingStudioProject:null,
    state: createVirtualPcState(),
    phase: 'off',
    windows: createWindowState({width:globalThis.innerWidth??1280,height:globalThis.innerHeight??720}),
    shell: null,
    explorer: null,
    menu: null,
    systemViews: new Map(),
    underwebView:null,
    torrentView:null,
    installerView:null,
    studioLaunch:null,
    launchGeneration:0,
    properties: null,
    shutdownModal: null,
    submissionModal: null,
    uninstallModal: null,
    metadata: {playerName:'Игрок',clockLabel:'12:00'},
    returnFocus: null,
    folder: 'computer',
    startOpen: false,
    address: 'underweb://iskra',
    underweb: resolveUnderweb('underweb://iskra'),
    project: null,
    selectedBrief: BATTLE_BRIEFS[0].id,
    dirty: false,
    confirmClose: false,
    recoveringDraft: false,
    pendingAction: null,
    persistenceWarning: '',
    message: '',
    bootTimer: null,
    bootStep: 0,
  };

  pc.persist = (state = pc.state,options={}) => {
    const next=createVirtualPcState(state);
    const result = pc.callbacks.onPersist(next,options);
    const durable = result?.ok ?? result !== false;
    if(durable||!options.atomic)pc.state=next;
    pc.persistenceWarning = durable ? '' : 'Сохранение браузера недоступно: изменения останутся только до закрытия страницы.';
    pc.refreshPersistenceWarning();
    return durable;
  };

  pc.diskLabel = () => `C: свободно ${diskAmount(diskUsage(pc.state).freeMb)}`;

  pc.refreshPersistenceWarning = () => {
    const warning = findByDataset(root, 'pcRole', 'persistence-warning');
    if (warning) {warning.textContent = pc.persistenceWarning;warning.hidden=!pc.persistenceWarning;}
  };

  pc.setPersistenceWarning = message => {
    pc.persistenceWarning = typeof message === 'string' ? message : '';
    pc.refreshPersistenceWarning();
  };

  Object.defineProperty(pc,'window',{get:()=>pc.windows.activeId});
  pc.ensureWindow = appId => {
    const app=desktopApps(pc.state).find(a=>a.id===appId);
    pc.windows=reduceWindows(pc.windows,{type:'open',id:appId,appId,title:app?.label??appId});
  };
  pc.windowAction = action => {
    if((pc.confirmClose||pc.shutdownModal||pc.submissionModal||pc.uninstallModal)&&action.type!=='viewport')return;
    if(action.type==='close'){pc.closeWindow(action.id);return;}
    pc.windows=reduceWindows(pc.windows,action);
    pc.renderDesktop(false);
  };
  pc.syncHost = metadata => {
    if(JSON.stringify(pc.metadata)===JSON.stringify(metadata))return;
    pc.metadata={...metadata};
    if(pc.phase==='desktop')pc.renderDesktop(false);
  };

  pc.closeUninstall=()=>{pc.uninstallModal=null;pc.shell.setModal(null,pc.returnFocus);pc.renderDesktop(false);};
  pc.showUninstall=id=>{
    if(!SOFTWARE[id]||pc.uninstallModal||pc.submissionModal||pc.shutdownModal||pc.confirmClose)return;
    pc.returnFocus=document.activeElement;
    const node=el(document,'section',{className:'pc-system-content pc-uninstall-confirm',attributes:{role:'dialog','aria-modal':'true','aria-label':'Удаление '+SOFTWARE[id].name}});
    const working=(id==='ft'&&pc.state.music.job)||(id==='notebook'&&pc.state.writing.job);
    const check=software.uninstallSoftware(working?pauseCreativeChain(pc.state):pc.state,id),blocked=!check.ok;
    node.append(createPcIcon(document,SOFTWARE[id].iconId,{size:40}),el(document,'h3',{text:'Удалить '+SOFTWARE[id].name+'?'}),el(document,'p',{text:blocked?softwareMessage(check.reason):'Проекты, тексты и скачанный установщик останутся. Работу над битом или текстом можно будет продолжить после повторной установки.'}));
    const remove=button(document,'Удалить программу',{},()=>pc.softwareAction('confirm-uninstall',id));remove.disabled=blocked;
    node.append(remove,button(document,'Отмена',{},pc.closeUninstall));pc.uninstallModal={node,id};pc.shell.setModal(node);pc.shell.focusActive();
  };
  pc.refreshTorent = () => pc.torrentView?.update();
  pc.softwareAction = (action,id) => {
    let result;
    if(action==='uninstall'){pc.showUninstall(id);return;}
    if(action==='confirm-uninstall'){
      const target=SOFTWARE[id]?.desktopAppId;
      const working=(id==='ft'&&pc.state.music.job)||(id==='notebook'&&pc.state.writing.job);
      result=software.uninstallSoftware(working?pauseCreativeChain(pc.state):pc.state,id);
      pc.message=softwareMessage(result.reason);pc.persist(result.state);pc.closeUninstall();
      if(result.ok&&target)pc.closeNow(target);pc.renderDesktop(false);return;
    }
    if(action==='browse-metadata'){pc.open('computer');pc.openFolder('downloads');return;}
    if(action==='next'){
      if(id!==undefined){result=software.setInstallerPath(pc.state,id);if(result.ok)result=software.advanceInstaller(result.state);}
      else result=software.advanceInstaller(pc.state);
    }else if(action==='back')result=software.advanceInstaller(pc.state,{back:true});
    else if(action==='open-after-install')result=software.setInstallerOpenAfter(pc.state,id);
    else {const actions={'download-notebook':software.downloadNotebook,'download-client':software.downloadClient,'download-metadata':software.downloadMetadata,'open-metadata':software.openMetadata,installer:software.openInstaller,pause:software.pauseTransfer,resume:software.resumeTransfer,cancel:software.cancelTransfer,'cancel-installer':software.cancelInstaller};result=actions[action]?.(pc.state,id);}
    if(!result)return;
    const metadataAction=['download-notebook','download-metadata','open-metadata'].includes(action),metadataId=action==='download-notebook'?'notebook':id??'ft';
    if(metadataAction&&action!=='open-metadata'&&result.ok)result=software.openMetadata(result.state,metadataId);
    pc.message=softwareMessage(result.reason);pc.persist(result.state);
    if(action==='installer'&&result.ok){pc.cancelStudioLaunch();pc.windows=reduceWindows(pc.windows,{type:'open',id:'installer',appId:'installer',title:'Мастер установки — '+SOFTWARE[id].name});pc.renderDesktop(false);pc.shell.focusActive();return;}
    if(!pc.state.software.installer&&pc.windows.windows.some(w=>w.id==='installer'))pc.closeNow('installer');
    pc.renderDesktop(false);
    if(result.openAppId){pc.cancelStudioLaunch();pc.openNow(result.openAppId);}
    if(metadataAction&&pc.state.power==='on'&&pc.state.software.client.installed&&pc.state.software[SOFTWARE[metadataId]?.metadataKey]){pc.cancelStudioLaunch();pc.open('torent');}
  };

  pc.refreshDynamicState = () => {
    pc.refreshPersistenceWarning();
    if(pc.windows.windows.some(w=>w.id==='torent'))pc.refreshTorent();
    pc.renderDesktop(false);
  };

  pc.syncState = state => {
    const next = createVirtualPcState(state);
    if (JSON.stringify(next) === JSON.stringify(pc.state)) return;
    pc.state = next;
    if (pc.phase === 'desktop') pc.refreshDynamicState();
  };

  let transitionLayer=null,transitionTitle=null,transitionSubtitle=null,transitionProgress=null;
  pc.presentTransition = snapshot => {
    const p=pcPresentation(snapshot,pc.state.power,pc.metadata.playerName);
    const wasLocked=pc.locked;
    pc.locked=snapshot.locked;root.dataset.pcTransition=snapshot.phase;
    root.dataset.pcStage=['loading','welcome','power-on'].includes(snapshot.phase)?'booting':pc.phase;
    root.style.opacity=String(snapshot.overlay??0);root.style.pointerEvents=snapshot.locked?'none':'auto';
    for(const child of root.children)if(child!==transitionLayer)child.inert=Boolean(snapshot.locked);
    if(!transitionLayer||transitionLayer.parentElement!==root){
      transitionLayer=el(document,'section',{className:'pc-transition',attributes:{'aria-live':'polite'}});
      add(transitionLayer,createPcIcon(document,'start',{size:72}));
      transitionTitle=add(transitionLayer,el(document,'h2'));transitionSubtitle=add(transitionLayer,el(document,'p'));
      transitionProgress=add(transitionLayer,el(document,'progress',{attributes:{max:'1','aria-label':'Загрузка '+PC_IDENTITY.name}}));root.append(transitionLayer);
    }
    transitionLayer.hidden=p.screen==='desktop'||(p.screen==='off'&&snapshot.phase==='room');transitionLayer.dataset.screen=p.screen;
    transitionLayer.style.opacity='1';transitionLayer.style.filter=`brightness(${p.brightness})`;transitionTitle.textContent=p.title;transitionSubtitle.textContent=p.subtitle;
    transitionProgress.hidden=p.screen!=='loading';transitionProgress.value=p.progress;
    if(wasLocked&&!pc.locked&&snapshot.phase==='desktop')pc.shell?.focusActive();
  };

  pc.renderDesktop = (replaceActive=true) => {
    const focused=document.activeElement,focusId=focused?.dataset?.focusId;
    root.dataset.pcStage='desktop';
    if(!pc.shell)pc.shell=mountPcShell(root,{onCommand:command=>{
      if(command.type==='window')pc.windowAction(command.action);
      else if(command.type==='open-app')pc.open(command.appId);
      else if(command.type==='move-icon'){pc.persist(setDesktopIconPosition(pc.state,command.id,command.position));pc.renderDesktop(false);}
      else if(command.type==='start-menu')pc.toggleStart(command.anchor);
      else if(command.type==='desktop-menu')pc.openDesktopMenu(command);
    }});
    if(!pc.menu)pc.menu=mountPcMenu(pc.shell.getMenuRoot(),{onDismiss:()=>{pc.startOpen=false;}});
    const apps=desktopApps(pc.state),v=pc.windows.viewport;
    pc.shell.render({windows:pc.windows,apps,wallpaper:(WALLPAPERS.find(w=>w.id===pc.state.wallpaper)??WALLPAPERS[0]).path,
      iconPositions:layoutDesktopIcons(apps.map(a=>a.id),pc.state.desktopIcons,{width:v.width,height:v.height-32}),metadata:pc.metadata,warning:pc.persistenceWarning});
    for(const w of pc.windows.windows){
      const target=pc.shell.getContentRoot(w.id);
      if(!target.children.length||(replaceActive&&w.id===pc.windows.activeId))pc.refreshApp(w.id,{replaceContent:true});
    }
    pc.explorer?.update(pc.state);
    pc.underwebView?.update();pc.torrentView?.update();pc.installerView?.update();
    pc.studioView?.update();
    pc.notebookView?.update();pc.submissionModal?.view.update();
    for(const view of pc.systemViews.values())view.update();
    const guard=pc.confirmClose?findByDataset(root,'pcRole','close-guard'):null;
    pc.shell.setModal(pc.uninstallModal?.node??pc.submissionModal?.node??pc.shutdownModal?.node??guard,pc.returnFocus);
    if(!pc.confirmClose&&replaceActive){
      const scope=pc.focusScope(),restored=focusId&&findFocusControl(scope,focusId);
      (restored&&!restored.disabled?restored:focusableControls(scope)[0])?.focus?.();
    }
  };
  pc.refreshApp = (appId,{replaceContent=false}={}) => {
    const target=pc.shell?.getContentRoot(appId);if(!target)return;
    if(appId==='rap-notebook'){
      if(!pc.notebookView)pc.notebookView=mountRapNotebook(target,{getState:()=>pc.state,getMetadata:()=>pc.metadata,onChange:next=>pc.persist(next),onWork:()=>callbacks.onWork?.()??false});
      pc.notebookView.update();return;
    }
    if(appId==='underweb'){
      if(!pc.underwebView)pc.underwebView=mountUnderweb(target,{getState:()=>pc.state,getMetadata:()=>pc.metadata,onApply:(id,name)=>pc.persist(applyToBattle(pc.state,id,name)),onSubmitTrack:id=>pc.showSubmission(id),onResultViewed:callbacks.onResultViewed,onSoftware:pc.softwareAction,getSoftwareMessage:()=>pc.message,onChange:next=>{const saved=pc.persist(next,{atomic:true});pc.renderDesktop(false);return saved;},audio:pc.beatAudio});
      pc.underwebView.update();return;
    }
    if(appId==='ft-studio'){
      if(!pc.studioView){const initialProject=pc.pendingStudioProject;pc.pendingStudioProject=null;pc.studioView=mountBeatStudio(target,{getState:()=>pc.state,getMetadata:()=>pc.metadata,onChange:next=>pc.persist(next),onWork:()=>callbacks.onWork?.()??false,audio:pc.beatAudio,initialProject});}
      pc.studioView.update();return;
    }
    if(appId==='computer'){
      if(!pc.explorer)pc.explorer=mountExplorer(target,{onSoftware:pc.softwareAction,onOpenArtifact:entry=>{pc.softwareAction(entry.action,entry.appId);return pc.message;},onOpenApp:id=>pc.open(id),onOpenProject:p=>pc.openProject(p),onProperties:p=>pc.showProperties(p),onClose:()=>pc.closeWindow('computer'),onMenu:p=>pc.menu?.open(p),onNavigate:location=>{
        pc.windows={...pc.windows,windows:pc.windows.windows.map(w=>w.id==='computer'?{...w,title:location.label,iconId:location.iconId}:w)};pc.renderDesktop(false);
      }});
      pc.explorer.update(pc.state);return;
    }
    if(appId==='torent'){if(!pc.torrentView)pc.torrentView=mountTorrent(target,{getState:()=>pc.state,onAction:pc.softwareAction,getMessage:()=>pc.message});pc.torrentView.update();return;}
    if(appId==='installer'){if(!pc.installerView)pc.installerView=mountInstaller(target,{getState:()=>pc.state,onAction:pc.softwareAction,getMessage:()=>pc.message});pc.installerView.update();return;}
    if(appId.startsWith('system:')){
      if(!pc.systemViews.has(appId))pc.systemViews.set(appId,mountSystemWindow(target,{kind:appId.slice(7),getState:()=>pc.state,onPersist:next=>{const ok=pc.persist(next);pc.renderDesktop(false);return ok;},onOpen:kind=>pc.openSystem(kind),onClose:()=>pc.closeWindow(appId),properties:pc.properties}));
      return;
    }
    if(replaceContent)target.replaceChildren(pc.renderWindow(appId));
    else if(appId==='torent')pc.refreshTorent();
  };

  pc.openDesktopMenu = ({targetId,x,y,anchor}) => {
    const app=desktopApps(pc.state).find(a=>a.id===targetId);
    const items=app?[
      {id:'open',label:'Открыть',onSelect:()=>pc.open(app.id)},
      {id:'properties',label:'Свойства',onSelect:()=>pc.showProperties({title:'Свойства: '+app.label,rows:[{label:'Тип',value:'Ярлык'},{label:'Назначение',value:app.description}]})},
    ]:[
      {id:'arrange',label:'Упорядочить значки',onSelect:()=>{pc.persist(resetDesktopIconPositions(pc.state));pc.renderDesktop(false);}},
      {id:'refresh',label:'Обновить',onSelect:()=>pc.renderDesktop(false)},
      {id:'display',label:'Свойства',iconId:'display',onSelect:()=>pc.openSystem('display')},
    ];pc.menu.open({items,x,y,anchor});
  };
  pc.toggleStart = anchor => {
    if(pc.startOpen){pc.menu.close();return;}
    const appItems=desktopApps(pc.state).filter(a=>!['computer','documents'].includes(a.id)).map(a=>({id:a.id,label:a.label,iconId:a.iconId,onSelect:()=>pc.open(a.id)}));
    pc.menu.open({variant:'start',playerName:pc.metadata.playerName,anchor,x:0,y:pc.windows.viewport.height-32,items:[
      ...appItems,{id:'programs',label:'Все программы',iconId:'folder',items:appItems},
      {id:'computer',label:'Мой компьютер',iconId:'computer',column:'right',onSelect:()=>pc.open('computer')},
      {id:'control-panel',label:'Панель управления',iconId:'settings',column:'right',onSelect:()=>pc.openSystem('control-panel')},
      {id:'leave',label:'Отойти от ПК',iconId:'start',column:'footer',onSelect:()=>pc.requestLeave()},
      {id:'shutdown',label:'Выключение',iconId:'power',column:'footer',onSelect:()=>pc.showShutdown()},
    ]});pc.startOpen=true;
  };
  pc.showProperties = properties => {pc.properties=properties;pc.systemViews.get('system:properties')?.dispose();pc.systemViews.delete('system:properties');pc.openSystem('properties');};
  pc.openSystem = kind => {
    if(pc.confirmClose||pc.shutdownModal)return;pc.menu?.close();
    if(kind==='disk'){pc.showProperties(explorerProperties(pc.state,{kind:'disk'}));return;}
    const title=kind==='display'?'Свойства: Экран':kind==='control-panel'?'Панель управления':pc.properties?.title??'Свойства';
    pc.windows=reduceWindows(pc.windows,{type:'open',id:'system:'+kind,appId:kind,title});
    pc.renderDesktop(false);pc.shell.focusActive();
  };
  pc.cancelShutdown = () => {
    pc.shutdownModal?.view.dispose();pc.shutdownModal=null;pc.shell.setModal(null,pc.returnFocus);pc.renderDesktop(false);
  };
  pc.closeSubmission=()=>{
    pc.submissionModal?.view.dispose();pc.submissionModal=null;pc.underwebView?.update();
    const target=findByDataset(root,'pcRole','submit-track')??pc.returnFocus;
    pc.shell.setModal(null,target);pc.renderDesktop(false);
  };
  pc.showSubmission=battleId=>{
    if(pc.submissionModal||pc.shutdownModal||pc.confirmClose)return;
    pc.open('underweb');pc.navigateUnderweb('underweb://social/dialog/'+battleId);
  };
  pc.showShutdown = () => {
    if(pc.confirmClose||pc.shutdownModal)return;pc.cancelStudioLaunch();pc.menu.close();pc.returnFocus=document.activeElement;
    const node=el(document,'div');const view=mountSystemWindow(node,{kind:'shutdown',getState:()=>pc.state,onClose:()=>pc.cancelShutdown(),onConfirmShutdown:()=>{pc.cancelShutdown();pc.requestShutdown();}});
    pc.shutdownModal={node,view};pc.shell.setModal(node,pc.returnFocus);
  };
  pc.clearViews = () => {
    pc.submissionModal?.view.dispose();pc.submissionModal=null;
    pc.notebookView?.dispose();pc.notebookView=null;
    pc.torrentView?.dispose();pc.torrentView=null;pc.installerView?.dispose();pc.installerView=null;
    pc.studioView?.dispose();pc.studioView=null;
    pc.underwebView?.dispose();pc.underwebView=null;
    pc.explorer?.dispose();pc.explorer=null;for(const view of pc.systemViews.values())view.dispose();pc.systemViews.clear();
    pc.shutdownModal?.view.dispose();pc.shutdownModal=null;pc.uninstallModal=null;pc.menu?.close();
  };

  pc.windowFrame = (title, content) => content;

  pc.openFolder = folder => pc.explorer?.navigate(folder);

  pc.navigateUnderweb = address => pc.underwebView?.navigate(address);



  pc.openProject = project => {
    if(pc.state.creativeWork?.activeId&&pc.state.creativeWork.activeId!==project.id)pc.persist(pauseCreativeChain(pc.state));
    const lyric=normalizeLyric(project);
    if(lyric){if(!pc.state.software.notebook.installed){pc.open('underweb');pc.navigateUnderweb('underweb://dump/notebook');return;}pc.persist({...pc.state,writing:{...pc.state.writing,activeTextId:lyric.id}});pc.open('rap-notebook');pc.notebookView?.openProject(lyric);return;}
    const beat=normalizeBeat(project),normalized = beat??normalizeStudioProject(project);
    if (!normalized) { pc.message = 'Этот проект повреждён и не может быть открыт.'; pc.render(); return; }
    if(pc.state.download.status!=='installed'){pc.open('underweb');pc.navigateUnderweb('underweb://dump/ft-studio');return;}
    pc.project=normalized;pc.dirty=false;pc.confirmClose=false;
    if(pc.state.music.activeBeatId!==(beat?.id??null))pc.persist({...pc.state,music:{...pc.state.music,activeBeatId:beat?.id??null}});
    if(!pc.studioView)pc.pendingStudioProject=normalized;
    pc.callbacks.onOpenProject(normalized);pc.open('ft-studio');pc.refreshApp('ft-studio',{replaceContent:true});
    if(pc.studioView){pc.pendingStudioProject=null;pc.studioView.openProject(normalized);}
  };


  pc.renderWindow = (appId=pc.windows.activeId) => {
    if(appId==='ripline')return createBeatMarket(document,{getState:()=>pc.state,onChange:next=>pc.persist(next),audio:pc.beatAudio,ripline:true});
    if(appId==='ft-studio')return createStudioWorkspace(document,{projectName:pc.project?.name});
    return el(document,'p',{text:'Приложение недоступно.'});
  };

  pc.render = () => {
    if (pc.phase === 'desktop') pc.renderDesktop();
    else { root.dataset.pcStage = 'off'; root.replaceChildren(); }
  };

  // Called directly by the apartment's computer click, before the seated animation.
  pc.prepareAudio = () => Promise.resolve(pc.audio.unlock?.()).catch(NOOP);

  pc.boot = state => {
    pc.showDesktop(state);pc.presentTransition({phase:'power-on',progress:0,overlay:0,locked:true,coldStart:true});
  };

  pc.showDesktop = state => {
    if (pc.bootTimer !== null) pc.clearTimeoutFn(pc.bootTimer);
    pc.bootTimer = null;
    pc.state = createVirtualPcState(state);
    pc.phase = 'desktop';
    if(pc.state.software.installer&&!pc.windows.windows.some(w=>w.id==='installer'))pc.windows=reduceWindows(pc.windows,{type:'open',id:'installer',appId:'installer',title:'Мастер установки — '+SOFTWARE[pc.state.software.installer.appId].name});
    pc.locked=false;root.style.opacity='1';root.style.pointerEvents='auto';
    pc.renderDesktop(false);
  };

  pc.openNow = appId => {
    pc.menu?.close();
    const documents=appId==='documents';if(documents)appId='computer';
    const existing=pc.windows.windows.some(w=>w.id===appId);
    pc.ensureWindow(appId);
    pc.startOpen=false;
    if(!existing&&appId==='computer')pc.folder='computer';
    pc.renderDesktop(false);
    if(documents)pc.explorer?.navigate('documents');
    pc.shell.focusActive();
    if(appId==='ft-studio'){
      pc.studioView?.focus();
      if(!existing)Promise.resolve(pc.callbacks.onAppSound('studio')).catch(NOOP);
    }
  };
  pc.open = appId => {
    if(pc.locked||!desktopApps(pc.state).some(app=>app.id===appId)||pc.confirmClose||pc.shutdownModal)return;
    if(appId==='ft-studio'&&!pc.windows.windows.some(w=>w.id===appId)){
      pc.menu?.close();pc.startOpen=false;if(pc.studioLaunch!==null)return;
      const generation=++pc.launchGeneration;pc.setStudioBusy(true);
      pc.studioLaunch=pc.setTimeoutFn(()=>{
        if(generation!==pc.launchGeneration)return;
        pc.studioLaunch=null;pc.setStudioBusy(false);
        if(pc.phase==='desktop'&&!pc.locked)pc.openNow('ft-studio');
      },2500);return;
    }
    pc.openNow(appId);
  };
  let launchFeedback=null;
  pc.setStudioBusy=busy=>{
    root.setAttribute('aria-busy',String(busy));root.dataset.appLaunching=String(busy);
    if(busy){launchFeedback=el(document,'div',{className:'pc-launch-feedback',text:'Запуск FT Studio…',attributes:{role:'status'}});root.append(launchFeedback);}
    else{launchFeedback?.remove();launchFeedback=null;}
  };
  pc.cancelStudioLaunch=()=>{pc.launchGeneration++;if(pc.studioLaunch!==null)pc.clearTimeoutFn(pc.studioLaunch);pc.studioLaunch=null;pc.pendingStudioProject=null;pc.setStudioBusy(false);};
  pc.closeNow = id => {
    if(id==='rap-notebook'){pc.notebookView?.dispose();pc.notebookView=null;}
    if(id==='installer'){if(pc.state.software.installer)pc.persist(software.cancelInstaller(pc.state).state);pc.installerView?.dispose();pc.installerView=null;}
    if(id==='torent'){pc.torrentView?.dispose();pc.torrentView=null;}
    if(id==='underweb'){pc.underwebView?.dispose();pc.underwebView=null;}
    pc.systemViews.get(id)?.dispose();pc.systemViews.delete(id);
    if(id==='computer'){pc.explorer?.dispose();pc.explorer=null;}
    if(id==='ft-studio'){pc.audio.stop();pc.studioView?.dispose();pc.studioView=null;}
    if(['ft-studio','underweb','ripline'].includes(id))pc.beatAudio.stop();
    pc.windows=reduceWindows(pc.windows,{type:'close',id});
    pc.confirmClose=false;pc.pendingAction=null;
    pc.renderDesktop(false);
  };
  pc.closeWindow = (id=pc.windows.activeId) => {
    if(pc.locked||pc.confirmClose||!id)return;
    if((id==='ft-studio'&&pc.state.music.job)||(id==='rap-notebook'&&pc.state.writing.job))pc.persist(pauseCreativeChain(pc.state));
    pc.closeNow(id);
  };

  pc.requestLeave = () => {
    if (pc.locked||pc.confirmClose||pc.shutdownModal) return;
    pc.cancelStudioLaunch();
    pc.menu?.close();
    pc.persist(pauseCreativeChain(pc.state));
    pc.audio.stop();pc.beatAudio.stop();pc.callbacks.onLeave();
  };

  pc.requestShutdown = () => {
    if (pc.locked||pc.confirmClose) return;
    pc.persist(pauseCreativeChain(pc.state));
    pc.cancelStudioLaunch();
    pc.audio.stop();pc.beatAudio.stop();pc.callbacks.onShutdown();
  };

  pc.completeShutdown=()=>{pc.cancelStudioLaunch();pc.clearViews();pc.windows=reduceWindows(pc.windows,{type:'clear'});pc.renderDesktop(false);};


  pc.focusScope = () => {
    if(pc.uninstallModal)return pc.uninstallModal.node;
    if(pc.submissionModal)return pc.submissionModal.node;
    if (pc.confirmClose) return findByDataset(root, 'pcRole', 'close-guard');
    if (pc.startOpen) return findByDataset(root, 'pcRole', 'start-menu');
    return findByDataset(root, 'windowId', pc.windows.activeId) ?? root;
  };

  root.addEventListener('keydown', event => {
    if (pc.locked || pc.phase !== 'desktop' || event.defaultPrevented) return;
    if(event.key==='Escape'&&pc.uninstallModal){event.preventDefault();event.stopPropagation();pc.closeUninstall();return;}
    const scope = pc.focusScope();
    const controls = focusableControls(scope);
    if(event.key==='Escape'&&pc.shutdownModal){event.preventDefault();event.stopPropagation();pc.cancelShutdown();return;}
    if (event.key === 'Escape' && pc.startOpen) {
      event.preventDefault(); event.stopPropagation();
      pc.menu?.close(); return;
    }
    if(event.key==='Escape'&&pc.window==='installer'&&pc.state.software.installer){event.preventDefault();event.stopPropagation();pc.softwareAction('cancel-installer');return;}
    // The shell owns Tab traversal; apartment Escape handling closes the active window.
  });

  pc.reset = state => {
    pc.cancelStudioLaunch();
    pc.beatAudio.stop();
    if (pc.bootTimer !== null) pc.clearTimeoutFn(pc.bootTimer);
    pc.bootTimer = null;
    pc.audio.stop();
    pc.state = createVirtualPcState(state);
    pc.phase = 'off';
    pc.clearViews();pc.menu?.dispose();pc.menu=null;
    pc.shell?.dispose();pc.shell=null;
    pc.windows=reduceWindows(pc.windows,{type:'clear'});
    pc.folder = 'computer';
    pc.startOpen = false;
    pc.project = null;
    pc.dirty = false;
    pc.confirmClose = false;
    pc.recoveringDraft = false;
    pc.pendingAction = null;
    pc.selectedBrief = BATTLE_BRIEFS[0].id;
    pc.address = 'underweb://iskra';
    pc.underweb = resolveUnderweb(pc.address);
    pc.message = '';
    pc.persistenceWarning = '';
    pc.render();
  };

  pc.dispose = () => {
    pc.cancelStudioLaunch();
    if (pc.bootTimer !== null) pc.clearTimeoutFn(pc.bootTimer);
    pc.bootTimer = null;
    pc.audio.dispose();
    pc.beatAudio.dispose();
    pc.clearViews();pc.menu?.dispose();pc.menu=null;
    pc.shell?.dispose();pc.shell=null;
    pc.phase = 'off';
    pc.render();
  };

  return pc;
}
