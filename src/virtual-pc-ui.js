import { FtStudioAudio } from './ft-studio-audio.js?rev=4';
import {mountPcShell} from './virtual-pc-shell.js?rev=17';
import {mountExplorer} from './virtual-pc-explorer-view.js?rev=17';
import {mountPcMenu} from './virtual-pc-menus.js?rev=17';
import {mountSystemWindow} from './virtual-pc-system-windows.js?rev=17';
import {explorerProperties} from './virtual-pc-explorer.js?rev=17';
import {createWindowState,reduceWindows} from './virtual-pc-window-state.js?rev=17';
import {layoutDesktopIcons,setDesktopIconPosition,resetDesktopIconPositions} from './virtual-pc-state.js?rev=17';
import {createPcIcon} from './virtual-pc-icons.js?rev=17';
import { createStudioProject, normalizeStudioProject, setArrangementCell, setBpm, setStudioStep, setTrackGain } from './ft-studio-project.js';
import { BATTLE_BRIEFS, WALLPAPERS, desktopApps, resolveUnderweb } from './virtual-pc-catalog.js?rev=17';
import { cancelFtDownload, createVirtualPcState, diskUsage, FT_STUDIO_MB, PROJECT_MB, installFtStudio, saveStudioProject, setWallpaper, startFtDownload } from './virtual-pc-state.js?rev=17';
import { downloadPresentation } from './virtual-pc-runtime.js?rev=17';

const NOOP = () => {};
const BOOT_STAGES = [
  { percent: 5, delay: 1100, text: 'Проверка памяти…' },
  { percent: 30, delay: 1500, text: 'Найден жёсткий диск C: · чтение системы…' },
  { percent: 65, delay: 1900, text: 'Подготовка звука и рабочего стола…' },
  { percent: 90, delay: 1000, text: 'Запуск Windows XP…' },
];

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
      onOpenProject: callbacks.onOpenProject ?? NOOP,
      onSaveProject: callbacks.onSaveProject ?? saveStudioProject,
    },
    setTimeoutFn: callbacks.setTimeoutFn ?? ((...args) => globalThis.setTimeout(...args)),
    clearTimeoutFn: callbacks.clearTimeoutFn ?? (timer => globalThis.clearTimeout(timer)),
    audio: callbacks.audio ?? new FtStudioAudio(),
    state: createVirtualPcState(),
    phase: 'off',
    windows: createWindowState({width:globalThis.innerWidth??1280,height:globalThis.innerHeight??720}),
    shell: null,
    explorer: null,
    menu: null,
    systemViews: new Map(),
    properties: null,
    shutdownModal: null,
    metadata: {playerName:'Игрок',clockLabel:'12:00'},
    returnFocus: null,
    folder: 'computer',
    startOpen: false,
    address: 'underweb://battles',
    underweb: resolveUnderweb('underweb://battles'),
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

  pc.persist = (state = pc.state) => {
    pc.state = createVirtualPcState(state);
    const result = pc.callbacks.onPersist(pc.state);
    const durable = result?.ok ?? result !== false;
    pc.persistenceWarning = durable ? '' : 'Сохранение браузера недоступно: изменения останутся только до закрытия страницы.';
    pc.refreshPersistenceWarning();
    return durable;
  };

  pc.diskLabel = () => `C: свободно ${mb(1500 - (pc.state.projects.length * 2 + (pc.state.download.status === 'installed' ? 800 : pc.state.download.receivedBytes / 1000000)))}`;

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
    if(pc.confirmClose||pc.shutdownModal)return;
    if(action.type==='close'){pc.closeWindow(action.id);return;}
    pc.windows=reduceWindows(pc.windows,action);
    pc.renderDesktop(false);
  };
  pc.syncHost = metadata => {
    if(pc.metadata.playerName===metadata.playerName&&pc.metadata.clockLabel===metadata.clockLabel)return;
    pc.metadata={...metadata};
    if(pc.phase==='desktop')pc.renderDesktop(false);
  };

  pc.refreshTorent = () => {
    const progress = downloadPresentation(pc.state);
    const label = findByDataset(root, 'pcRole', 'torent-progress');
    const meter = findByDataset(root, 'pcRole', 'torent-meter');
    const controls = findByDataset(root, 'pcRole', 'torent-controls');
    if (label) label.textContent = `${progress.receivedMb.toFixed(1)} / ${progress.totalMb} МБ · ${progress.speedKbPerSecond} КБ/с · осталось ${progress.remainingGameMinutes} игровых мин.`;
    if (meter) { meter.value = progress.percent; meter.setAttribute('value', String(progress.percent)); }
    if (controls?.dataset.downloadStatus !== pc.state.download.status) pc.renderTorentControls(controls);
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

  pc.renderBoot = () => {
    const stage = BOOT_STAGES[pc.bootStep];
    root.dataset.pcStage = 'booting';
    const shell = el(document, 'section', { className: 'pc-shell pc-boot' });
    add(shell, createPcIcon(document,'start',{size:76}));
    add(shell, el(document, 'p', { className: 'pc-boot-kicker', text: 'BATTLE LIFE · HOME COMPUTER' }));
    add(shell, el(document, 'h2', { text: 'Windows XP' }));
    add(shell, el(document, 'p', { className:'pc-boot-edition',text: 'Домашний компьютер' }));
    const progress = el(document, 'progress', { attributes: { max: '100', value: String(stage.percent), 'aria-label': 'Загрузка Windows XP' } });
    progress.value = stage.percent;
    add(shell, progress);
    add(shell, el(document, 'p', { className: 'pc-boot-status', text: stage.text, attributes: { 'aria-live': 'polite' } }));
    root.replaceChildren(shell);
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
    for(const view of pc.systemViews.values())view.update();
    const guard=pc.confirmClose?findByDataset(root,'pcRole','close-guard'):null;
    pc.shell.setModal(pc.shutdownModal?.node??guard,pc.returnFocus);
    if(!pc.confirmClose&&replaceActive){
      const scope=pc.focusScope(),restored=focusId&&findFocusControl(scope,focusId);
      (restored&&!restored.disabled?restored:focusableControls(scope)[0])?.focus?.();
    }
  };
  pc.refreshApp = (appId,{replaceContent=false}={}) => {
    const target=pc.shell?.getContentRoot(appId);if(!target)return;
    if(appId==='computer'){
      if(!pc.explorer)pc.explorer=mountExplorer(target,{onOpenProject:p=>pc.openProject(p),onProperties:p=>pc.showProperties(p),onClose:()=>pc.closeWindow('computer'),onMenu:p=>pc.menu?.open(p),onNavigate:location=>{
        pc.windows={...pc.windows,windows:pc.windows.windows.map(w=>w.id==='computer'?{...w,title:location.label,iconId:location.iconId}:w)};pc.renderDesktop(false);
      }});
      pc.explorer.update(pc.state);return;
    }
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
      {id:'documents',label:'Мои документы',iconId:'documents',column:'right',onSelect:()=>pc.open('documents')},
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
  pc.showShutdown = () => {
    if(pc.confirmClose||pc.shutdownModal)return;pc.menu.close();pc.returnFocus=document.activeElement;
    const node=el(document,'div');const view=mountSystemWindow(node,{kind:'shutdown',getState:()=>pc.state,onClose:()=>pc.cancelShutdown(),onConfirmShutdown:()=>{pc.cancelShutdown();pc.requestShutdown();}});
    pc.shutdownModal={node,view};pc.shell.setModal(node,pc.returnFocus);
  };
  pc.clearViews = () => {
    pc.explorer?.dispose();pc.explorer=null;for(const view of pc.systemViews.values())view.dispose();pc.systemViews.clear();
    pc.shutdownModal?.view.dispose();pc.shutdownModal=null;pc.menu?.close();
  };

  pc.windowFrame = (title, content) => content;

  pc.openFolder = folder => pc.explorer?.navigate(folder);

  pc.navigateUnderweb = address => {
    pc.address = typeof address === 'string' ? address : '';
    pc.underweb = resolveUnderweb(pc.address);
    pc.render();
  };

  pc.renderUnderweb = () => {
    const content = el(document, 'div', { className: 'pc-window-content pc-underweb' });
    const form = el(document, 'form', { attributes: { 'aria-label': 'Адрес Underweb' } });
    const address = el(document, 'input', { value: pc.address, attributes: { 'aria-label': 'Адрес или поиск Underweb' } });
    address.name = 'address';
    add(form, address);
    add(form, button(document, 'Открыть', { attributes: { 'aria-label': 'Открыть адрес Underweb' } }, () => pc.navigateUnderweb(address.value)));
    form.addEventListener('submit', event => { event.preventDefault(); pc.navigateUnderweb(address.value); });
    add(content, form);
    if (pc.underweb.type === 'battles') {
      add(content, el(document, 'h3', { text: 'Баттлы рядом' }));
      for (const brief of pc.underweb.briefs) {
        const card = el(document, 'article', { className: 'pc-brief' });
        add(card, el(document, 'strong', { text: brief.title }));
        add(card, el(document, 'p', { text: brief.condition }));
        add(card, button(document, 'Выбрать для FT Studio', { attributes: { 'aria-label': `Выбрать баттл ${brief.title}` } }, () => pc.startStudio(brief.id)));
        add(content, card);
      }
    } else if (pc.underweb.type === 'battle') {
      add(content, el(document, 'h3', { text: pc.underweb.brief.title }));
      add(content, el(document, 'p', { text: pc.underweb.brief.condition }));
      add(content, button(document, 'Открыть в FT Studio', {}, () => pc.startStudio(pc.underweb.brief.id)));
    } else add(content, el(document, 'p', { className: 'pc-error', text: pc.underweb.message }));
    return pc.windowFrame('Underweb', content);
  };

  pc.renderTorentControls = controls => {
    controls.replaceChildren();
    controls.dataset.downloadStatus = pc.state.download.status;
    if (pc.state.download.status === 'idle') {
      const download = button(document, 'Скачать FT Studio', { attributes: { 'aria-label': 'Скачать FT Studio через torent' } }, () => { pc.persist(startFtDownload(pc.state)); pc.render(); });
      download.disabled = diskUsage(pc.state).freeMb < FT_STUDIO_MB;
      add(controls, download);
      if (download.disabled) add(controls, el(document, 'p', { className: 'pc-error', text: 'На C: недостаточно места: для загрузки FT Studio нужно 800 МБ.' }));
    }
    if (pc.state.download.status === 'downloading') add(controls, button(document, 'Отменить загрузку', {}, () => { pc.persist(cancelFtDownload(pc.state)); pc.render(); }));
    if (pc.state.download.status === 'ready-to-install') add(controls, button(document, 'Установить FT Studio', {}, () => { pc.persist(installFtStudio(pc.state)); pc.render(); }));
    if (pc.state.download.status === 'installed') add(controls, el(document, 'p', { text: 'FT Studio установлена. Ярлык появился на рабочем столе.' }));
  };

  pc.renderTorent = () => {
    const content = el(document, 'div', { className: 'pc-window-content pc-torent' });
    const progress = downloadPresentation(pc.state);
    add(content, el(document, 'h3', { text: 'FT Studio 1.0 · 800 МБ' }));
    add(content, el(document, 'p', { text: `${progress.receivedMb.toFixed(1)} / ${progress.totalMb} МБ · ${progress.speedKbPerSecond} КБ/с · осталось ${progress.remainingGameMinutes} игровых мин.`, dataset: { pcRole: 'torent-progress' } }));
    const meter = el(document, 'progress', { dataset: { pcRole: 'torent-meter' }, attributes: { max: '100', value: String(progress.percent), 'aria-label': 'Прогресс загрузки FT Studio' } });
    meter.value = progress.percent;
    add(content, meter);
    const controls = el(document, 'div', { className: 'pc-torent-controls', dataset: { pcRole: 'torent-controls' } });
    pc.renderTorentControls(controls);
    add(content, controls);
    if (pc.message || pc.persistenceWarning) add(content, el(document, 'p', { className: 'pc-status', text: pc.message || pc.persistenceWarning }));
    return pc.windowFrame('torent', content);
  };

  pc.updateProject = (next, rerender = true) => {
    pc.audio.stop();
    pc.project = next;
    pc.dirty = true;
    pc.persist({ ...pc.state, draft: next });
    pc.message = pc.persistenceWarning;
    if (rerender) pc.render();
    else {
      const status = findByDataset(root, 'pcRole', 'studio-status');
      if (status) status.textContent = pc.message;
    }
  };

  pc.runPendingAction = () => {
    const action = pc.pendingAction;
    pc.pendingAction = null;
    pc.confirmClose = false;
    pc.recoveringDraft = false;
    pc.refreshApp('ft-studio',{replaceContent:true});
    pc.renderDesktop(false);
    if (action) action();
  };

  pc.cancelPendingAction = () => {
    pc.pendingAction = null;
    pc.confirmClose = false;
    pc.recoveringDraft = false;
    pc.render();
  };

  pc.requestProjectTransition = (action, protectDraft = false) => {
    if (pc.confirmClose) return;
    const draft = protectDraft && !pc.dirty && normalizeStudioProject(pc.state.draft);
    if (draft) {
      pc.project = draft;
      pc.dirty = true;
      pc.ensureWindow('ft-studio');
      pc.recoveringDraft = true;
    }
    if (pc.project && pc.dirty) {
      pc.menu?.close();
      pc.returnFocus=document.activeElement;
      pc.ensureWindow('ft-studio');
      pc.pendingAction = action;
      pc.confirmClose = true;
      pc.startOpen = false;
      pc.render();
      return;
    }
    action();
  };

  pc.openTorentForStudio = briefId => {
    pc.audio.stop();
    pc.selectedBrief = briefId;
    pc.ensureWindow('torent');
    pc.project = null;
    pc.dirty = false;
    pc.message = 'Сначала установи FT Studio через torent.';
    pc.render();
  };

  pc.startStudio = briefId => {
    pc.requestProjectTransition(() => {
      if (pc.state.download.status !== 'installed') { pc.openTorentForStudio(briefId); return; }
      pc.audio.stop();
      pc.selectedBrief = briefId;
      pc.ensureWindow('ft-studio');
      pc.project = null;
      pc.dirty = false;
      pc.confirmClose = false;
      pc.message = '';
      pc.render();
    }, true);
  };

  pc.openProject = project => {
    const normalized = normalizeStudioProject(project);
    if (!normalized) { pc.message = 'Этот проект повреждён и не может быть открыт.'; pc.render(); return; }
    pc.requestProjectTransition(() => {
      if (pc.state.download.status !== 'installed') { pc.openTorentForStudio(normalized.battleId); return; }
      pc.audio.stop();
      pc.ensureWindow('ft-studio');
      pc.project = normalized;
      pc.selectedBrief = normalized.battleId;
      pc.dirty = false;
      pc.confirmClose = false;
      pc.callbacks.onOpenProject(normalized);
      pc.render();
    }, true);
  };

  pc.canSaveProject = () => pc.state.projects.some(project => project.id === pc.project?.id) || diskUsage(pc.state).freeMb >= PROJECT_MB;

  pc.saveProject = () => {
    if (!pc.project) return;
    const result = pc.callbacks.onSaveProject(pc.state, pc.project);
    if (!result?.ok) { pc.message = result?.reason === 'insufficient-space' ? 'На C: недостаточно места для нового проекта.' : 'Не удалось сохранить проект.'; pc.render(); return; }
    pc.project = result.state.projects.find(project => project.id === pc.project.id) ?? pc.project;
    pc.audio.stop();
    const durable = pc.persist({ ...result.state, draft: null });
    pc.message = durable ? 'Проект сохранён в Мои проекты.' : 'Проект сохранён только в памяти: браузер не подтвердил запись.';
    if (!durable) {
      pc.dirty = true;
      if (pc.pendingAction) pc.confirmClose = true;
      pc.render();
      return;
    }
    pc.dirty = false;
    pc.confirmClose = false;
    pc.runPendingAction();
  };

  pc.renderStudioStart = content => {
    add(content, el(document, 'p', { text: 'Новый проект · выбери баттл и собери первый паттерн.' }));
    const form = el(document, 'form', { attributes: { 'aria-label': 'Новый проект FT Studio' } });
    const name = el(document, 'input', { value: 'Новый бит', attributes: { maxlength: '32', 'aria-label': 'Название проекта' } });
    const brief = el(document, 'select', { attributes: { 'aria-label': 'Баттл для проекта' } });
    for (const item of BATTLE_BRIEFS) {
      const option = el(document, 'option', { text: item.title, value: item.id });
      option.value = item.id;
      option.selected = item.id === pc.selectedBrief;
      add(brief, option);
    }
    const bpm = el(document, 'input', { type: 'number', value: '92', attributes: { min: '72', max: '150', 'aria-label': 'Темп в BPM' } });
    add(form, labeledInput(document, 'Название', name));
    add(form, labeledInput(document, 'Баттл', brief));
    add(form, labeledInput(document, 'BPM', bpm));
    const create = () => {
      const result = createStudioProject({ name: name.value, battleId: brief.value || pc.selectedBrief, bpm: Number(bpm.value) });
      if (!result.ok) { pc.message = result.reason === 'invalid-name' ? 'Название нужно ввести (до 32 символов).' : 'Выбери баттл из Underweb.'; pc.render(); return; }
      pc.project = result.project;
      pc.dirty = true;
      pc.persist({ ...pc.state, draft: pc.project });
      pc.render();
    };
    add(form, button(document, 'Создать проект', { attributes: { 'aria-label': 'Создать проект FT Studio' } }, create));
    form.addEventListener('submit', event => { event.preventDefault(); create(); });
    add(content, form);
  };

  pc.renderStudio = () => {
    const content = el(document, 'div', { className: 'pc-window-content ft-studio' });
    if (!pc.project) pc.renderStudioStart(content);
    else {
      const header = el(document, 'div', { className: 'ft-header' });
      add(header, createPcIcon(document,'studio',{size:28}));
      add(header, el(document, 'strong', { text: `FT Studio · ${pc.project.name}` }));
      const bpm = el(document, 'input', { type: 'number', value: String(pc.project.bpm), dataset: { focusId: 'studio-bpm' }, attributes: { min: '72', max: '150', 'aria-label': 'Темп проекта в BPM' } });
      bpm.addEventListener('change', () => pc.updateProject(setBpm(pc.project, Number(bpm.value))));
      add(header, bpm);
      add(header, button(document, '▶ Слушать', { attributes: { 'aria-label': 'Слушать проект' } }, async () => { const result = await pc.audio.play(pc.project); pc.message = result.ok ? 'Играет паттерн.' : 'Браузер не дал запустить звук.'; const status=findByDataset(root,'pcRole','studio-status');if(status)status.textContent=pc.message; }));
      add(header, button(document, '■ Стоп', { attributes: { 'aria-label': 'Остановить проект' } }, () => { pc.audio.stop(); pc.message = 'Воспроизведение остановлено.'; pc.render(); }));
      add(content, header);
      const sequencer = el(document, 'section', { className: 'ft-sequencer', attributes: { 'aria-label': 'Пошаговый секвенсор' } });
      for (const track of pc.project.tracks) {
        const row = el(document, 'div', { className: 'ft-track' });
        add(row, el(document, 'strong', { text: track.id.toUpperCase() }));
        for (let step = 0; step < track.steps.length; step++) add(row, button(document, track.steps[step] ? '●' : '·', { className: track.steps[step] ? 'on' : '', dataset: { track: track.id, step: String(step), focusId: `step-${track.id}-${step}` }, attributes: { 'aria-label': `${track.id}, шаг ${step + 1}` } }, () => pc.updateProject(setStudioStep(pc.project, track.id, step, !track.steps[step]))));
        add(sequencer, row);
      }
      add(content, sequencer);
      const arrangement = el(document, 'section', { className: 'ft-arrangement', attributes: { 'aria-label': 'Аранжировка на восемь тактов' } });
      add(arrangement, el(document, 'h3', { text: 'Аранжировка · 8 тактов' }));
      for (const track of pc.project.tracks) {
        const row = el(document, 'div', { className: 'ft-track' });
        add(row, el(document, 'strong', { text: track.id.toUpperCase() }));
        for (let bar = 0; bar < track.bars.length; bar++) add(row, button(document, String(bar + 1), { className: track.bars[bar] ? 'on' : '', dataset: { focusId: `bar-${track.id}-${bar}` }, attributes: { 'aria-label': `${track.id}, такт ${bar + 1}` } }, () => pc.updateProject(setArrangementCell(pc.project, track.id, bar, !track.bars[bar]))));
        add(arrangement, row);
      }
      add(content, arrangement);
      const mixer = el(document, 'section', { className: 'ft-mixer', attributes: { 'aria-label': 'Микшер' } });
      add(mixer, el(document, 'h3', { text: 'Микшер' }));
      for (const track of pc.project.tracks) {
        const gain = el(document, 'input', { type: 'range', value: String(track.gain), dataset: { focusId: `gain-${track.id}` }, attributes: { min: '0', max: '1', step: '.05', 'aria-label': `Громкость ${track.id}` } });
        gain.addEventListener('input', () => pc.updateProject(setTrackGain(pc.project, track.id, Number(gain.value)), false));
        add(mixer, labeledInput(document, track.id.toUpperCase(), gain));
      }
      add(content, mixer);
      const save = button(document, 'Сохранить в Мои проекты', { attributes: { 'aria-label': 'Сохранить проект в Мои проекты' } }, () => pc.saveProject());
      save.disabled = !pc.canSaveProject();
      add(content, save);
      if (save.disabled) add(content, el(document, 'p', { className: 'pc-error', text: 'На C: недостаточно места для нового проекта: нужно 2 МБ. Уже сохранённые проекты можно обновлять.' }));
    }
    add(content, el(document, 'p', { className: 'pc-status', dataset: { pcRole: 'studio-status' }, attributes: { 'aria-live': 'polite' }, text: pc.message || pc.persistenceWarning }));
    if (pc.confirmClose) {
      const guard = el(document, 'aside', { className: 'pc-close-guard', dataset: { pcRole: 'close-guard' }, attributes: { 'aria-label': 'Сохранение проекта', role: 'dialog', 'aria-modal': 'true' } });
      for (const child of content.children) child.inert = true;
      add(guard, el(document, 'strong', { text: pc.recoveringDraft ? 'Найден несохранённый черновик: ' + pc.project.name : 'Сохранить проект перед закрытием?' }));
      const save = button(document, 'Сохранить', { dataset: { focusId: 'guard-save' } }, () => pc.saveProject());
      save.disabled = !pc.canSaveProject();
      add(guard, save);
      add(guard, button(document, 'Не сохранять', { dataset: { focusId: 'guard-discard' } }, () => pc.discardProject()));
      add(guard, button(document, pc.recoveringDraft ? 'Восстановить черновик' : 'Отмена', { dataset: { focusId: 'guard-cancel' } }, () => pc.cancelPendingAction()));
      add(content, guard);
    }
    return pc.windowFrame('FT Studio', content);
  };

  pc.renderWindow = (appId=pc.windows.activeId) => {
    if(appId==='underweb')return pc.renderUnderweb();
    if(appId==='torent')return pc.renderTorent();
    if(appId==='ft-studio')return pc.renderStudio();
    return el(document,'p',{text:'Приложение недоступно.'});
  };

  pc.render = () => {
    if (pc.phase === 'booting') pc.renderBoot();
    else if (pc.phase === 'desktop') pc.renderDesktop();
    else { root.dataset.pcStage = 'off'; root.replaceChildren(); }
  };

  // Called directly by the apartment's computer click, before the seated animation.
  pc.prepareAudio = () => Promise.resolve(pc.audio.unlock?.()).catch(NOOP);

  pc.boot = state => {
    pc.state = createVirtualPcState(state);
    pc.phase = 'booting';
    pc.clearViews();pc.menu?.dispose();pc.menu=null;
    pc.shell?.dispose();pc.shell=null;
    pc.windows=reduceWindows(pc.windows,{type:'clear'});
    pc.bootStep = 0;
    if (pc.bootTimer !== null) pc.clearTimeoutFn(pc.bootTimer);
    Promise.resolve(pc.audio.playBoot?.()).catch(NOOP);
    const advanceBoot = () => {
      pc.bootStep++;
      if (pc.bootStep === BOOT_STAGES.length) { pc.showDesktop(pc.state); return; }
      pc.render();
      pc.bootTimer = pc.setTimeoutFn(advanceBoot, BOOT_STAGES[pc.bootStep].delay);
    };
    pc.bootTimer = pc.setTimeoutFn(advanceBoot, BOOT_STAGES[0].delay);
    pc.render();
  };

  pc.showDesktop = state => {
    if (pc.bootTimer !== null) pc.clearTimeoutFn(pc.bootTimer);
    pc.bootTimer = null;
    pc.state = createVirtualPcState(state);
    pc.phase = 'desktop';
    pc.renderDesktop(false);
  };

  pc.openNow = appId => {
    pc.menu?.close();
    const documents=appId==='documents';if(documents)appId='computer';
    const existing=pc.windows.windows.some(w=>w.id===appId);
    pc.ensureWindow(appId);
    pc.startOpen=false;
    if(!existing&&appId==='computer')pc.folder='computer';
    if(!existing&&appId==='ft-studio'){
      pc.project=normalizeStudioProject(pc.state.draft);pc.dirty=Boolean(pc.project);
    }
    pc.renderDesktop(false);
    if(documents)pc.explorer?.navigate('documents');
    pc.shell.focusActive();
  };
  pc.open = appId => {
    if(!desktopApps(pc.state).some(app=>app.id===appId)||pc.confirmClose||pc.shutdownModal)return;
    pc.openNow(appId);
  };
  pc.closeNow = id => {
    pc.systemViews.get(id)?.dispose();pc.systemViews.delete(id);
    if(id==='computer'){pc.explorer?.dispose();pc.explorer=null;}
    if(id==='ft-studio')pc.audio.stop();
    pc.windows=reduceWindows(pc.windows,{type:'close',id});
    pc.confirmClose=false;pc.pendingAction=null;
    pc.renderDesktop(false);
  };
  pc.closeWindow = (id=pc.windows.activeId) => {
    if(pc.confirmClose||!id)return;
    if(id==='ft-studio')pc.requestProjectTransition(()=>pc.closeNow(id));
    else pc.closeNow(id);
  };

  pc.requestLeave = () => {
    if (pc.confirmClose||pc.shutdownModal) return;
    pc.menu?.close();
    pc.requestProjectTransition(() => {
      pc.audio.stop();
      pc.callbacks.onLeave();
    });
  };

  pc.requestShutdown = () => {
    if (pc.confirmClose) return;
    pc.requestProjectTransition(() => {
      pc.audio.stop();
      pc.clearViews();
      pc.windows=reduceWindows(pc.windows,{type:'clear'});
      pc.renderDesktop(false);
      pc.callbacks.onShutdown();
    });
  };

  pc.discardProject = () => {
    pc.dirty = false;
    pc.project = null;
    pc.persist({ ...pc.state, draft: null });
    pc.audio.stop();
    pc.runPendingAction();
  };

  pc.focusScope = () => {
    if (pc.confirmClose) return findByDataset(root, 'pcRole', 'close-guard');
    if (pc.startOpen) return findByDataset(root, 'pcRole', 'start-menu');
    return findByDataset(root, 'windowId', pc.windows.activeId) ?? root;
  };

  root.addEventListener('keydown', event => {
    if (pc.phase !== 'desktop' || event.defaultPrevented) return;
    const scope = pc.focusScope();
    const controls = focusableControls(scope);
    if(event.key==='Escape'&&pc.shutdownModal){event.preventDefault();event.stopPropagation();pc.cancelShutdown();return;}
    if (event.key === 'Escape' && pc.confirmClose) {
      event.preventDefault();
      event.stopPropagation();
      pc.cancelPendingAction();
      return;
    }
    if (event.key === 'Escape' && pc.startOpen) {
      event.preventDefault(); event.stopPropagation();
      pc.menu?.close(); return;
    }
    // The shell owns Tab traversal; apartment Escape handling closes the active window.
  });

  pc.reset = state => {
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
    pc.address = 'underweb://battles';
    pc.underweb = resolveUnderweb(pc.address);
    pc.message = '';
    pc.persistenceWarning = '';
    pc.render();
  };

  pc.dispose = () => {
    if (pc.bootTimer !== null) pc.clearTimeoutFn(pc.bootTimer);
    pc.bootTimer = null;
    pc.audio.dispose();
    pc.clearViews();pc.menu?.dispose();pc.menu=null;
    pc.shell?.dispose();pc.shell=null;
    pc.phase = 'off';
    pc.render();
  };

  return pc;
}
