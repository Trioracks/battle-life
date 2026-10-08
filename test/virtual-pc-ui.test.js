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

function createController(state = createVirtualPcState()) {
  const document = creatorDocument();
  const root = document.createElement('section');
  const saves = [];
  return {
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
  controller.syncState(reconciled);
  controller.open('torent');

  assert.equal(hasText(root, '200.0 / 800 МБ · 37 КБ/с · осталось 270 игровых мин.'), true);
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
