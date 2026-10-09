import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudioProject } from '../src/ft-studio-project.js';
import { BATTLE_BRIEFS } from '../src/virtual-pc-catalog.js';
import { createVirtualPcState } from '../src/virtual-pc-state.js';
import { mountVirtualPc } from '../src/virtual-pc-ui.js';
import { creatorDocument } from './helpers/creator-dom.js';

function descendants(root) {
  return root.children.flatMap(child => [child, ...descendants(child)]);
}

function find(root, predicate) {
  return descendants(root).find(predicate);
}

function hasText(root, text) {
  return Boolean(find(root, element => element.textContent === text));
}

function keydown(key, shiftKey = false) {
  const event = new Event('keydown', { cancelable: true });
  Object.defineProperties(event, { key: { value: key }, shiftKey: { value: shiftKey } });
  return event;
}

function createController(state = createVirtualPcState()) {
  const document = creatorDocument();
  const root = document.createElement('section');
  const saves = [];
  return {
    document,
    root,
    saves,
    controller: mountVirtualPc(root, { onPersist(next) { saves.push(next); } }),
    state,
  };
}

test('boot state leads to a desktop whose ft studio icon appears only after installation', () => {
  const { controller, root, state } = createController();

  controller.boot(state);
  assert.equal(root.dataset.pcStage, 'booting');
  controller.showDesktop(state);
  assert.equal(Boolean(find(root, element => element.getAttribute?.('aria-label') === 'FT Studio')), false);

  controller.showDesktop(createVirtualPcState({ download: { status: 'installed' } }));
  assert.equal(root.dataset.pcStage, 'desktop');
  assert.equal(Boolean(find(root, element => element.getAttribute?.('aria-label') === 'FT Studio')), true);
});

test('my computer shows an empty projects folder before a project exists', () => {
  const { controller, root, state } = createController();

  controller.showDesktop(state);
  controller.open('computer');

  assert.equal(hasText(root, 'Мои проекты · пусто'), true);
  assert.equal(hasText(root, 'Windows'), true);
});

test('underweb renders a local error instead of following an unknown address', () => {
  const { controller, root, state } = createController();

  controller.showDesktop(state);
  controller.open('underweb');
  controller.navigateUnderweb('https://example.com/real-internet');

  assert.equal(hasText(root, 'Такой адрес в Underweb не найден.'), true);
});

test('torent exposes its ft studio download control in Russian', () => {
  const { controller, root, state } = createController();

  controller.showDesktop(state);
  controller.open('torent');

  const download = find(root, element => element.tagName === 'BUTTON' && element.textContent === 'Скачать FT Studio');
  assert.ok(download);
  assert.equal(download.getAttribute('aria-label'), 'Скачать FT Studio через torent');
});

test('the desktop controller accepts reconciled game-time download state before the next action', () => {
  const initial = createVirtualPcState({ power: 'on', lastGameMinute: 720, download: { status: 'downloading', receivedBytes: 0 } });
  const reconciled = createVirtualPcState({ power: 'on', lastGameMinute: 810, download: { status: 'downloading', receivedBytes: 200000000 } });
  const { controller, root } = createController(initial);

  controller.showDesktop(initial);
  controller.open('torent');
  controller.syncState(reconciled);

  assert.equal(hasText(root, '200.0 / 800 МБ · 37 КБ/с · осталось 270 игровых мин.'), true);
});

test('game-time reconciliation does not replace an in-progress Underweb address', () => {
  const downloading = createVirtualPcState({ power: 'on', lastGameMinute: 720, download: { status: 'downloading', receivedBytes: 0 } });
  const advanced = createVirtualPcState({ power: 'on', lastGameMinute: 721, download: { status: 'downloading', receivedBytes: 2222222 } });
  const { controller, root, document } = createController(downloading);

  controller.showDesktop(downloading);
  controller.open('underweb');
  const address = find(root, element => element.getAttribute?.('aria-label') === 'Адрес или поиск Underweb');
  address.value = 'underweb://мой-адрес';
  address.focus();
  controller.syncState(advanced);

  assert.equal(address.value, 'underweb://мой-адрес');
  assert.equal(document.activeElement, address);
});

test('a clock-only torent update retains the focused install control', () => {
  const ready = createVirtualPcState({ power: 'on', lastGameMinute: 720, download: { status: 'ready-to-install' } });
  const nextMinute = createVirtualPcState({ power: 'on', lastGameMinute: 721, download: { status: 'ready-to-install' } });
  const { controller, root, document } = createController(ready);

  controller.showDesktop(ready);
  controller.open('torent');
  const install = find(root, element => element.tagName === 'BUTTON' && element.textContent === 'Установить FT Studio');
  install.focus();
  controller.syncState(nextMinute);

  assert.equal(find(root, element => element.tagName === 'BUTTON' && element.textContent === 'Установить FT Studio'), install);
  assert.equal(document.activeElement, install);
});

test('an Underweb brief routes an uninstalled studio to torent instead of creating a project', () => {
  const { controller, root, state } = createController();

  controller.showDesktop(state);
  controller.open('underweb');
  find(root, element => element.getAttribute?.('aria-label')?.startsWith('Выбрать баттл ')).click();

  assert.equal(hasText(root, 'FT Studio 1.0 · 800 МБ'), true);
  assert.equal(hasText(root, 'Сначала установи FT Studio через torent.'), true);
});

test('closing an edited studio project opens a save, discard, or cancel guard', () => {
  const installed = createVirtualPcState({ download: { status: 'installed' } });
  const { controller, root } = createController(installed);
  const project = createStudioProject({ id: 'close-guard', name: 'Проверка', battleId: BATTLE_BRIEFS[0].id }).project;

  controller.showDesktop(installed);
  controller.openProject(project);
  find(root, element => element.tagName === 'BUTTON' && element.dataset.track === 'kick' && element.dataset.step === '0').click();
  controller.closeWindow();

  assert.equal(hasText(root, 'Сохранить проект перед закрытием?'), true);
  assert.equal(hasText(root, 'Сохранить'), true);
  assert.equal(hasText(root, 'Не сохранять'), true);
  assert.equal(hasText(root, 'Отмена'), true);
});

test('power-off asks before discarding an edited studio project', () => {
  const installed = createVirtualPcState({ download: { status: 'installed' } });
  let shutdowns = 0;
  const document = creatorDocument();
  const root = document.createElement('section');
  const controller = mountVirtualPc(root, { onShutdown() { shutdowns++; } });
  const project = createStudioProject({ id: 'power-guard', name: 'Питание', battleId: BATTLE_BRIEFS[0].id }).project;

  controller.showDesktop(installed);
  controller.openProject(project);
  find(root, element => element.tagName === 'BUTTON' && element.dataset.track === 'kick' && element.dataset.step === '0').click();
  controller.requestShutdown();

  assert.equal(shutdowns, 0);
  assert.equal(hasText(root, 'Сохранить проект перед закрытием?'), true);
  find(root, element => element.tagName === 'BUTTON' && element.textContent === 'Не сохранять').click();
  assert.equal(shutdowns, 1);
});

test('a visible close guard blocks a second close request', () => {
  const installed = createVirtualPcState({ download: { status: 'installed' } });
  const { controller, root } = createController(installed);
  const project = createStudioProject({ id: 'double-close', name: 'Охрана', battleId: BATTLE_BRIEFS[0].id }).project;

  controller.showDesktop(installed);
  controller.openProject(project);
  find(root, element => element.dataset.track === 'kick' && element.dataset.step === '0').click();
  controller.closeWindow();
  controller.closeWindow();

  assert.equal(hasText(root, 'Сохранить проект перед закрытием?'), true);
});

test('a close guard moves focus into its own dialog and traps reverse Tab there', () => {
  const installed = createVirtualPcState({ download: { status: 'installed' } });
  const { controller, root, document } = createController(installed);
  const project = createStudioProject({ id: 'dialog-focus', name: 'Диалог', battleId: BATTLE_BRIEFS[0].id }).project;

  controller.showDesktop(installed);
  controller.openProject(project);
  const step = find(root, element => element.dataset.track === 'kick' && element.dataset.step === '0');
  step.focus();
  step.click();
  controller.closeWindow();
  const save = find(root, element => element.dataset.focusId === 'guard-save');
  const cancel = find(root, element => element.dataset.focusId === 'guard-cancel');
  assert.equal(document.activeElement, save);
  root.dispatchEvent(keydown('Tab', true));

  assert.equal(document.activeElement, cancel);
});

test('switching applications cannot discard a dirty studio project without a choice', () => {
  const installed = createVirtualPcState({ download: { status: 'installed' } });
  const { controller, root } = createController(installed);
  const project = createStudioProject({ id: 'guard-navigation', name: 'Переход', battleId: BATTLE_BRIEFS[0].id }).project;

  controller.showDesktop(installed);
  controller.openProject(project);
  find(root, element => element.dataset.track === 'kick' && element.dataset.step === '0').click();
  controller.open('underweb');

  assert.equal(hasText(root, 'Сохранить проект перед закрытием?'), true);
});

test('cancelling shutdown does not make a later ordinary save turn off the pc', () => {
  const installed = createVirtualPcState({ download: { status: 'installed' } });
  let shutdowns = 0;
  const document = creatorDocument();
  const root = document.createElement('section');
  const controller = mountVirtualPc(root, { onShutdown() { shutdowns++; } });
  const project = createStudioProject({ id: 'cancel-shutdown', name: 'Отмена', battleId: BATTLE_BRIEFS[0].id }).project;

  controller.showDesktop(installed);
  controller.openProject(project);
  find(root, element => element.dataset.track === 'kick' && element.dataset.step === '0').click();
  controller.requestShutdown();
  find(root, element => element.tagName === 'BUTTON' && element.textContent === 'Отмена').click();
  controller.saveProject();

  assert.equal(shutdowns, 0);
});

test('saving a project stops active studio audio', () => {
  const installed = createVirtualPcState({ download: { status: 'installed' } });
  const document = creatorDocument();
  const root = document.createElement('section');
  let stops = 0;
  const controller = mountVirtualPc(root, { audio: { stop() { stops++; }, dispose() {}, async play() { return { ok: true }; } } });
  const project = createStudioProject({ id: 'save-stops-audio', name: 'Стоп', battleId: BATTLE_BRIEFS[0].id }).project;

  controller.showDesktop(installed);
  controller.openProject(project);
  stops = 0;
  controller.saveProject();

  assert.equal(stops, 1);
});

test('a blocked durable write is labelled as an in-memory save', () => {
  const installed = createVirtualPcState({ download: { status: 'installed' } });
  const document = creatorDocument();
  const root = document.createElement('section');
  const controller = mountVirtualPc(root, { onPersist() { return false; } });
  const project = createStudioProject({ id: 'memory-save', name: 'Память', battleId: BATTLE_BRIEFS[0].id }).project;

  controller.showDesktop(installed);
  controller.openProject(project);
  controller.saveProject();

  assert.equal(hasText(root, 'Проект сохранён только в памяти: браузер не подтвердил запись.'), true);
});

test('a failed guarded save keeps shutdown pending instead of hiding the storage warning', () => {
  const installed = createVirtualPcState({ download: { status: 'installed' } });
  let shutdowns = 0;
  const document = creatorDocument();
  const root = document.createElement('section');
  const controller = mountVirtualPc(root, { onPersist() { return false; }, onShutdown() { shutdowns++; } });
  const project = createStudioProject({ id: 'blocked-shutdown-save', name: 'Хранилище', battleId: BATTLE_BRIEFS[0].id }).project;

  controller.showDesktop(installed);
  controller.openProject(project);
  find(root, element => element.dataset.track === 'kick' && element.dataset.step === '0').click();
  controller.requestShutdown();
  find(root, element => element.dataset.focusId === 'guard-save').click();

  assert.equal(shutdowns, 0);
  assert.equal(hasText(root, 'Сохранить проект перед закрытием?'), true);
  assert.equal(hasText(root, 'Проект сохранён только в памяти: браузер не подтвердил запись.'), true);
});

test('host storage warnings remain visible after state synchronization', () => {
  const installed = createVirtualPcState({ download: { status: 'installed' } });
  const { controller, root } = createController(installed);

  controller.showDesktop(installed);
  controller.setPersistenceWarning('Сохранение виртуального ПК недоступно.');
  controller.syncState(createVirtualPcState({ download: { status: 'installed' }, lastGameMinute: 900 }));

  assert.equal(hasText(root, 'Сохранение виртуального ПК недоступно.'), true);
});

test('editing a sequencer step restores keyboard focus to the replacement control', () => {
  const installed = createVirtualPcState({ download: { status: 'installed' } });
  const { controller, root, document } = createController(installed);
  const project = createStudioProject({ id: 'focus-step', name: 'Фокус', battleId: BATTLE_BRIEFS[0].id }).project;

  controller.showDesktop(installed);
  controller.openProject(project);
  const step = find(root, element => element.dataset.track === 'kick' && element.dataset.step === '0');
  step.focus();
  step.click();

  assert.equal(document.activeElement?.dataset.track, 'kick');
  assert.equal(document.activeElement?.dataset.step, '0');
});
