import { FtStudioAudio } from './ft-studio-audio.js';
import { createStudioProject, normalizeStudioProject, setArrangementCell, setBpm, setStudioStep, setTrackGain } from './ft-studio-project.js';
import { BATTLE_BRIEFS, WALLPAPERS, desktopApps, resolveUnderweb } from './virtual-pc-catalog.js';
import { cancelFtDownload, createVirtualPcState, installFtStudio, saveStudioProject, setWallpaper, startFtDownload } from './virtual-pc-state.js';
import { downloadPresentation } from './virtual-pc-runtime.js';

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

export function mountVirtualPc(root, callbacks = {}) {
  const document = root.ownerDocument ?? globalThis.document;
  const pc = {
    root,
    document,
    callbacks: {
      onPersist: callbacks.onPersist ?? NOOP,
      onLeave: callbacks.onLeave ?? NOOP,
      onShutdown: callbacks.onShutdown ?? NOOP,
      onOpenProject: callbacks.onOpenProject ?? NOOP,
      onSaveProject: callbacks.onSaveProject ?? saveStudioProject,
    },
    setTimeoutFn: callbacks.setTimeoutFn ?? globalThis.setTimeout,
    clearTimeoutFn: callbacks.clearTimeoutFn ?? globalThis.clearTimeout,
    audio: callbacks.audio ?? new FtStudioAudio(),
    state: createVirtualPcState(),
    phase: 'off',
    window: null,
    startOpen: false,
    address: 'underweb://battles',
    underweb: resolveUnderweb('underweb://battles'),
    project: null,
    selectedBrief: BATTLE_BRIEFS[0].id,
    dirty: false,
    confirmClose: false,
    message: '',
    bootTimer: null,
  };

  pc.persist = (state = pc.state) => {
    pc.state = createVirtualPcState(state);
    pc.callbacks.onPersist(pc.state);
  };

  pc.renderBoot = () => {
    root.dataset.pcStage = 'booting';
    const shell = el(document, 'section', { className: 'pc-shell pc-boot' });
    add(shell, el(document, 'p', { className: 'pc-boot-kicker', text: 'SLOBODA-486 / SELF TEST' }));
    add(shell, el(document, 'h2', { text: 'Sloboda Desk 96' }));
    add(shell, el(document, 'p', { text: 'Проверка памяти · поиск жёсткого диска · запуск оболочки' }));
    const progress = el(document, 'progress', { attributes: { max: '100', value: '68', 'aria-label': 'Загрузка Sloboda Desk 96' } });
    progress.value = 68;
    add(shell, progress);
    add(shell, el(document, 'p', { className: 'pc-boot-status', text: 'Не выключайте питание…' }));
    root.replaceChildren(shell);
  };

  pc.renderDesktop = () => {
    root.dataset.pcStage = 'desktop';
    const shell = el(document, 'section', { className: 'pc-shell pc-desktop' });
    const wallpaper = WALLPAPERS.find(item => item.id === pc.state.wallpaper) ?? WALLPAPERS[0];
    shell.style.setProperty('--pc-wallpaper', `url("${wallpaper.path}")`);
    const header = el(document, 'header', { className: 'pc-desktop-header' });
    add(header, el(document, 'span', { text: 'SLOBODA DESK 96' }));
    add(header, el(document, 'span', { text: `C: свободно ${mb(1500 - (pc.state.projects.length * 2 + (pc.state.download.status === 'installed' ? 800 : pc.state.download.receivedBytes / 1000000)))}` }));
    add(shell, header);
    const workspace = el(document, 'div', { className: 'pc-workspace', attributes: { 'aria-label': 'Рабочий стол Sloboda Desk 96' } });
    const icons = el(document, 'nav', { className: 'pc-icons', attributes: { 'aria-label': 'Приложения компьютера' } });
    for (const app of desktopApps(pc.state)) {
      const icon = button(document, `${app.icon} ${app.label}`, { className: 'pc-icon', dataset: { app: app.id }, attributes: { 'aria-label': app.label, title: app.description } }, () => pc.open(app.id));
      add(icons, icon);
    }
    add(workspace, icons);
    if (pc.window) add(workspace, pc.renderWindow());
    if (pc.startOpen) add(workspace, pc.renderStartMenu());
    add(shell, workspace);
    const taskbar = el(document, 'footer', { className: 'pc-taskbar' });
    add(taskbar, button(document, 'Пуск', { className: 'pc-start', attributes: { 'aria-label': 'Пуск' } }, () => { pc.startOpen = !pc.startOpen; pc.render(); }));
    add(taskbar, el(document, 'span', { className: 'pc-task-label', text: pc.window ? desktopApps(pc.state).find(app => app.id === pc.window)?.label ?? 'Окно' : 'Рабочий стол' }));
    const wallpapers = el(document, 'div', { className: 'pc-wallpaper-picker', attributes: { 'aria-label': 'Обои рабочего стола' } });
    for (const item of WALLPAPERS) add(wallpapers, button(document, item.label, { className: item.id === pc.state.wallpaper ? 'active' : '', attributes: { 'aria-pressed': String(item.id === pc.state.wallpaper) } }, () => { pc.persist(setWallpaper(pc.state, item.id)); pc.render(); }));
    add(taskbar, wallpapers);
    add(shell, taskbar);
    root.replaceChildren(shell);
  };

  pc.renderStartMenu = () => {
    const menu = el(document, 'aside', { className: 'pc-start-menu', attributes: { 'aria-label': 'Меню Пуск' } });
    add(menu, el(document, 'strong', { text: 'Sloboda Desk 96' }));
    add(menu, button(document, 'Отойти от ПК', { attributes: { 'aria-label': 'Отойти от ПК, оставив его включённым' } }, () => { pc.audio.stop(); pc.callbacks.onLeave(); }));
    add(menu, button(document, 'Выключить', { attributes: { 'aria-label': 'Выключить компьютер' } }, () => { pc.audio.stop(); pc.callbacks.onShutdown(); }));
    return menu;
  };

  pc.windowFrame = (title, content) => {
    const frame = el(document, 'section', { className: 'pc-window', attributes: { 'aria-label': title } });
    const titlebar = el(document, 'header', { className: 'pc-window-title' });
    add(titlebar, el(document, 'strong', { text: title }));
    add(titlebar, button(document, '×', { attributes: { 'aria-label': 'Закрыть окно' } }, () => pc.closeWindow()));
    add(frame, titlebar);
    add(frame, content);
    return frame;
  };

  pc.renderComputer = () => {
    const content = el(document, 'div', { className: 'pc-window-content pc-files' });
    add(content, el(document, 'p', { text: 'Мой компьютер > C:' }));
    add(content, el(document, 'p', { text: 'Windows' }));
    if (!pc.state.projects.length) add(content, el(document, 'p', { text: 'Мои проекты · пусто' }));
    else {
      add(content, el(document, 'h3', { text: 'Мои проекты' }));
      for (const project of pc.state.projects) add(content, button(document, project.name ?? project.id, { attributes: { 'aria-label': `Открыть проект ${project.name ?? project.id}` } }, () => pc.openProject(project)));
    }
    return pc.windowFrame('Мой компьютер', content);
  };

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

  pc.renderTorent = () => {
    const content = el(document, 'div', { className: 'pc-window-content pc-torent' });
    const progress = downloadPresentation(pc.state);
    add(content, el(document, 'h3', { text: 'FT Studio 1.0 · 800 МБ' }));
    add(content, el(document, 'p', { text: `${progress.receivedMb.toFixed(1)} / ${progress.totalMb} МБ · ${progress.speedKbPerSecond} КБ/с · осталось ${progress.remainingGameMinutes} игровых мин.` }));
    const meter = el(document, 'progress', { attributes: { max: '100', value: String(progress.percent), 'aria-label': 'Прогресс загрузки FT Studio' } });
    meter.value = progress.percent;
    add(content, meter);
    if (pc.state.download.status === 'idle') add(content, button(document, 'Скачать FT Studio', { attributes: { 'aria-label': 'Скачать FT Studio через torent' } }, () => { pc.persist(startFtDownload(pc.state)); pc.render(); }));
    if (pc.state.download.status === 'downloading') add(content, button(document, 'Отменить загрузку', {}, () => { pc.persist(cancelFtDownload(pc.state)); pc.render(); }));
    if (pc.state.download.status === 'ready-to-install') add(content, button(document, 'Установить FT Studio', {}, () => { pc.persist(installFtStudio(pc.state)); pc.render(); }));
    if (pc.state.download.status === 'installed') add(content, el(document, 'p', { text: 'FT Studio установлена. Ярлык появился на рабочем столе.' }));
    return pc.windowFrame('torent', content);
  };

  pc.updateProject = next => {
    pc.project = next;
    pc.dirty = true;
    pc.persist({ ...pc.state, draft: next });
    pc.render();
  };

  pc.startStudio = briefId => {
    pc.selectedBrief = briefId;
    pc.window = 'ft-studio';
    pc.project = null;
    pc.dirty = false;
    pc.confirmClose = false;
    pc.render();
  };

  pc.openProject = project => {
    const normalized = normalizeStudioProject(project);
    if (!normalized) { pc.message = 'Этот проект повреждён и не может быть открыт.'; pc.render(); return; }
    pc.window = 'ft-studio';
    pc.project = normalized;
    pc.selectedBrief = normalized.battleId;
    pc.dirty = false;
    pc.confirmClose = false;
    pc.callbacks.onOpenProject(normalized);
    pc.render();
  };

  pc.saveProject = () => {
    if (!pc.project) return;
    const result = pc.callbacks.onSaveProject(pc.state, pc.project);
    if (!result?.ok) { pc.message = result?.reason === 'insufficient-space' ? 'На C: недостаточно места для нового проекта.' : 'Не удалось сохранить проект.'; pc.render(); return; }
    pc.project = result.state.projects.find(project => project.id === pc.project.id) ?? pc.project;
    pc.dirty = false;
    pc.confirmClose = false;
    pc.persist({ ...result.state, draft: null });
    pc.message = 'Проект сохранён в Мои проекты.';
    pc.render();
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
      add(header, el(document, 'span', { className: 'ft-berry', text: '✽' }));
      add(header, el(document, 'strong', { text: `FT Studio · ${pc.project.name}` }));
      const bpm = el(document, 'input', { type: 'number', value: String(pc.project.bpm), attributes: { min: '72', max: '150', 'aria-label': 'Темп проекта в BPM' } });
      bpm.addEventListener('change', () => pc.updateProject(setBpm(pc.project, Number(bpm.value))));
      add(header, bpm);
      add(header, button(document, '▶ Слушать', { attributes: { 'aria-label': 'Слушать проект' } }, async () => { const result = await pc.audio.play(pc.project); pc.message = result.ok ? 'Играет паттерн.' : 'Браузер не дал запустить звук.'; pc.render(); }));
      add(header, button(document, '■ Стоп', { attributes: { 'aria-label': 'Остановить проект' } }, () => { pc.audio.stop(); pc.message = 'Воспроизведение остановлено.'; pc.render(); }));
      add(content, header);
      const sequencer = el(document, 'section', { className: 'ft-sequencer', attributes: { 'aria-label': 'Пошаговый секвенсор' } });
      for (const track of pc.project.tracks) {
        const row = el(document, 'div', { className: 'ft-track' });
        add(row, el(document, 'strong', { text: track.id.toUpperCase() }));
        for (let step = 0; step < track.steps.length; step++) add(row, button(document, track.steps[step] ? '●' : '·', { className: track.steps[step] ? 'on' : '', dataset: { track: track.id, step: String(step) }, attributes: { 'aria-label': `${track.id}, шаг ${step + 1}` } }, () => pc.updateProject(setStudioStep(pc.project, track.id, step, !track.steps[step]))));
        add(sequencer, row);
      }
      add(content, sequencer);
      const arrangement = el(document, 'section', { className: 'ft-arrangement', attributes: { 'aria-label': 'Аранжировка на восемь тактов' } });
      add(arrangement, el(document, 'h3', { text: 'Аранжировка · 8 тактов' }));
      for (const track of pc.project.tracks) {
        const row = el(document, 'div', { className: 'ft-track' });
        add(row, el(document, 'strong', { text: track.id.toUpperCase() }));
        for (let bar = 0; bar < track.bars.length; bar++) add(row, button(document, String(bar + 1), { className: track.bars[bar] ? 'on' : '', attributes: { 'aria-label': `${track.id}, такт ${bar + 1}` } }, () => pc.updateProject(setArrangementCell(pc.project, track.id, bar, !track.bars[bar]))));
        add(arrangement, row);
      }
      add(content, arrangement);
      const mixer = el(document, 'section', { className: 'ft-mixer', attributes: { 'aria-label': 'Микшер' } });
      add(mixer, el(document, 'h3', { text: 'Микшер' }));
      for (const track of pc.project.tracks) {
        const gain = el(document, 'input', { type: 'range', value: String(track.gain), attributes: { min: '0', max: '1', step: '.05', 'aria-label': `Громкость ${track.id}` } });
        gain.addEventListener('input', () => pc.updateProject(setTrackGain(pc.project, track.id, Number(gain.value))));
        add(mixer, labeledInput(document, track.id.toUpperCase(), gain));
      }
      add(content, mixer);
      add(content, button(document, 'Сохранить в Мои проекты', { attributes: { 'aria-label': 'Сохранить проект в Мои проекты' } }, () => pc.saveProject()));
    }
    if (pc.message) add(content, el(document, 'p', { className: 'pc-status', text: pc.message }));
    if (pc.confirmClose) {
      const guard = el(document, 'aside', { className: 'pc-close-guard', attributes: { 'aria-label': 'Сохранение проекта' } });
      add(guard, el(document, 'strong', { text: 'Сохранить проект перед закрытием?' }));
      add(guard, button(document, 'Сохранить', {}, () => pc.saveProject()));
      add(guard, button(document, 'Не сохранять', {}, () => { pc.dirty = false; pc.confirmClose = false; pc.state = createVirtualPcState({ ...pc.state, draft: null }); pc.closeWindow(); }));
      add(guard, button(document, 'Отмена', {}, () => { pc.confirmClose = false; pc.render(); }));
      add(content, guard);
    }
    return pc.windowFrame('FT Studio', content);
  };

  pc.renderWindow = () => {
    if (pc.window === 'computer') return pc.renderComputer();
    if (pc.window === 'underweb') return pc.renderUnderweb();
    if (pc.window === 'torent') return pc.renderTorent();
    if (pc.window === 'ft-studio') return pc.renderStudio();
    return pc.windowFrame('Sloboda Desk 96', el(document, 'p', { text: 'Выбери приложение на рабочем столе.' }));
  };

  pc.render = () => {
    if (pc.phase === 'booting') pc.renderBoot();
    else if (pc.phase === 'desktop') pc.renderDesktop();
    else { root.dataset.pcStage = 'off'; root.replaceChildren(); }
  };

  pc.boot = state => {
    pc.state = createVirtualPcState(state);
    pc.phase = 'booting';
    pc.window = null;
    if (pc.bootTimer !== null) pc.clearTimeoutFn(pc.bootTimer);
    pc.bootTimer = pc.setTimeoutFn(() => pc.showDesktop(pc.state), 5500);
    pc.render();
  };

  pc.showDesktop = state => {
    if (pc.bootTimer !== null) pc.clearTimeoutFn(pc.bootTimer);
    pc.bootTimer = null;
    pc.state = createVirtualPcState(state);
    pc.phase = 'desktop';
    pc.render();
  };

  pc.open = appId => {
    if (!desktopApps(pc.state).some(app => app.id === appId)) return;
    pc.window = appId;
    pc.startOpen = false;
    pc.confirmClose = false;
    if (appId === 'underweb') pc.underweb = resolveUnderweb(pc.address);
    if (appId === 'ft-studio') {
      pc.project = normalizeStudioProject(pc.state.draft);
      pc.dirty = Boolean(pc.project);
    }
    pc.render();
  };

  pc.closeWindow = () => {
    if (pc.window === 'ft-studio' && pc.project && pc.dirty && !pc.confirmClose) { pc.confirmClose = true; pc.render(); return; }
    if (pc.window === 'ft-studio') pc.audio.stop();
    pc.window = null;
    pc.confirmClose = false;
    pc.render();
  };

  pc.dispose = () => {
    if (pc.bootTimer !== null) pc.clearTimeoutFn(pc.bootTimer);
    pc.bootTimer = null;
    pc.audio.dispose();
    pc.phase = 'off';
    pc.render();
  };

  return pc;
}
