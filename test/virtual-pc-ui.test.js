import test from 'node:test';
import assert from 'node:assert/strict';
import { createVirtualPcState } from '../src/virtual-pc-state.js';
import { mountVirtualPc } from '../src/virtual-pc-ui.js';
import { pcDocument as creatorDocument, fire } from './helpers/virtual-pc-dom.js';

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
  fire(find(root, element => element.getAttribute?.('aria-label') === 'Открыть диск C:'),'dblclick');
  assert.equal(hasText(root, 'Windows'), true);
  fire(find(root, element => element.getAttribute?.('aria-label') === 'Открыть папку Мои документы'),'dblclick');
  fire(find(root, element => element.getAttribute?.('aria-label') === 'Открыть папку Мои проекты'),'dblclick');
  assert.equal(hasText(root, 'Объектов: 0'), true);
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

test('a failed durable application write keeps a visible in-memory warning', () => {
  const document = creatorDocument(), root = document.createElement('section');
  const controller = mountVirtualPc(root, { onPersist() { return false; } });
  controller.showDesktop(createVirtualPcState());controller.open('underweb');
  controller.navigateUnderweb('underweb://battles/concrete-echo');
  find(root, n => n.textContent === 'Подать заявку').click();
  find(root, n => n.textContent === 'Подтвердить заявку').click();
  assert.equal(controller.state.battleApplications.length, 1);
  assert.equal(hasText(root, 'Сохранение браузера недоступно: изменения останутся только до закрытия страницы.'), true);
  assert.equal(hasText(root, 'Заявка подана'), true);
});

test('empty application names are rejected without mutating saved data', () => {
  const {controller,root,state,saves}=createController();controller.showDesktop(state);controller.open('underweb');
  controller.navigateUnderweb('underweb://battles/concrete-echo');
  find(root, n => n.textContent === 'Подать заявку').click();
  find(root,n=>n.getAttribute?.('aria-label')==='Имя участника').value='   ';
  find(root,n=>n.textContent==='Подтвердить заявку').click();
  assert.equal(hasText(root,'Укажи имя участника.'),true);assert.equal(saves.length,0);
  assert.deepEqual(controller.state.battleApplications,[]);
});

test('host storage warnings remain visible after state synchronization', () => {
  const installed = createVirtualPcState({ download: { status: 'installed' } });
  const { controller, root } = createController(installed);

  controller.showDesktop(installed);
  controller.setPersistenceWarning('Сохранение виртуального ПК недоступно.');
  controller.syncState(createVirtualPcState({ download: { status: 'installed' }, lastGameMinute: 900 }));

  assert.equal(hasText(root, 'Сохранение виртуального ПК недоступно.'), true);
});
