import test from 'node:test';
import assert from 'node:assert/strict';
import { creatorDocument } from './helpers/creator-dom.js';
import { mountVirtualPc } from '../src/virtual-pc-ui.js';
import { createVirtualPcState } from '../src/virtual-pc-state.js';
import { createStudioProject } from '../src/ft-studio-project.js';
import { BATTLE_BRIEFS } from '../src/virtual-pc-catalog.js';

const nodes = root => root.children.flatMap(child => [child, ...nodes(child)]);
const find = (root, label) => nodes(root).find(node => node.getAttribute?.('aria-label') === label || node.textContent === label);
const project = (id, name = id) => createStudioProject({ id, name, battleId: BATTLE_BRIEFS[0].id }).project;
function setup(state) {
  const document = creatorDocument(), root = document.createElement('section');
  const controller = mountVirtualPc(root);
  controller.showDesktop(createVirtualPcState({ power: 'on', download: { status: 'installed' }, ...state }));
  return { controller, root, document };
}

test('native Window timers keep their receiver while the PC boots and closes', t => {
  const timers = new Map(); let id = 0;
  t.mock.method(globalThis, 'setTimeout', function (callback) {
    if (this !== globalThis) throw new TypeError('Illegal invocation');
    timers.set(++id, callback); return id;
  });
  t.mock.method(globalThis, 'clearTimeout', function (timer) {
    if (this !== globalThis) throw new TypeError('Illegal invocation');
    timers.delete(timer);
  });
  const { controller, root } = setup();
  assert.doesNotThrow(() => controller.boot(createVirtualPcState({ power: 'on' })));
  assert.equal(root.dataset.pcStage, 'booting');
  for (let stage = 0; stage < 4; stage++) {
    const [timer, callback] = timers.entries().next().value;
    timers.delete(timer); callback();
  }
  assert.equal(root.dataset.pcStage, 'desktop');
  assert.ok(find(root, 'Мой компьютер'));
  controller.dispose();
});

test('a new-game reset clears the previous controller project and pending shutdown', () => {
  const { controller, root } = setup({ draft: project('old') });
  controller.open('ft-studio');
  controller.requestShutdown();
  assert.equal(typeof controller.reset, 'function');
  controller.reset(createVirtualPcState());
  controller.showDesktop(controller.state);
  assert.equal(controller.project, null);
  assert.equal(controller.confirmClose, false);
  assert.equal(controller.pendingAction, null);
  assert.equal(controller.window, null);
  assert.equal(controller.state.download.status, 'idle');
  assert.equal(find(root, 'FT Studio'), undefined);
});

test('an Underweb project cannot silently overwrite the draft recovered after reload', () => {
  const { controller, root } = setup({ draft: project('unsaved', 'Черновик') });
  controller.open('underweb');
  find(root, `Выбрать баттл ${BATTLE_BRIEFS[1].title}`).click();
  assert.ok(find(root, 'Восстановить черновик'));
  assert.equal(controller.state.draft.id, 'unsaved');
  find(root, 'Восстановить черновик').click();
  assert.equal(controller.project.id, 'unsaved');
  controller.closeWindow();
  assert.equal(controller.confirmClose, true);
});

test('opening a saved project first protects an orphan draft and can save it before proceeding', () => {
  const saved = project('saved');
  const { controller, root } = setup({ draft: project('unsaved'), projects: [saved] });
  controller.open('computer');
  controller.openProject(saved);
  assert.equal(controller.confirmClose, true);
  find(root, 'Сохранить').click();
  assert.equal(controller.project.id, 'saved');
  assert.deepEqual(controller.state.projects.map(item => item.id), ['saved', 'unsaved']);
  assert.equal(controller.state.draft, null);
});

test('explicitly discarding the recovered draft allows the selected new brief', () => {
  const { controller, root } = setup({ draft: project('unsaved') });
  controller.startStudio(BATTLE_BRIEFS[1].id);
  assert.equal(controller.confirmClose, true);
  find(root, 'Не сохранять').click();
  find(root, 'Создать проект FT Studio').click();
  assert.equal(controller.project.battleId, BATTLE_BRIEFS[1].id);
  assert.notEqual(controller.state.draft.id, 'unsaved');
});

test('dragging a mixer fader preserves the live control across consecutive input events', () => {
  const { controller, root, document } = setup();
  controller.openProject(project('mix'));
  const gain = find(root, 'Громкость kick');
  gain.focus();
  for (const value of ['.5', '.25']) {
    gain.value = value;
    gain.dispatchEvent(new Event('input'));
    assert.ok(find(root, 'Громкость kick') === gain, 'input must retain its DOM node');
    assert.ok(document.activeElement === gain, 'fader must retain focus');
  }
  assert.equal(controller.state.draft.tracks[0].gain, .25);
});

test('keyboard navigation enters an opened window and wraps inside it', () => {
  const { controller, root, document } = setup();
  controller.open('underweb');
  const first = find(root, 'Закрыть окно'), last = find(root, `Выбрать баттл ${BATTLE_BRIEFS.at(-1).title}`);
  assert.ok(root.contains(document.activeElement));
  last.focus();
  const event = new Event('keydown', { cancelable: true });
  Object.defineProperty(event, 'key', { value: 'Tab' });
  root.dispatchEvent(event);
  assert.equal(event.defaultPrevented, true);
  assert.ok(document.activeElement === first, 'Tab must wrap to the first window control');
});

test('boot shows intermediate progress before reaching the desktop at 5.5 seconds', () => {
  const document = creatorDocument(), root = document.createElement('section'), timers = [];
  const pc = mountVirtualPc(root, { setTimeoutFn(fn, delay) { timers.push({ fn, delay }); return timers.length; }, clearTimeoutFn() {} });
  pc.boot(createVirtualPcState({ power: 'on' }));
  const seen = [], labels = new Set();
  let elapsed = 0;
  while (pc.phase === 'booting' && timers.length) {
    seen.push(nodes(root).find(node => node.tagName === 'PROGRESS').value);
    labels.add(nodes(root).find(node => node.className === 'pc-boot-status').textContent);
    const timer = timers.shift(); elapsed += timer.delay; timer.fn();
  }
  assert.equal(pc.phase, 'desktop');
  assert.equal(elapsed, 5500);
  assert.ok(new Set(seen).size >= 3, 'boot must visibly advance before completion');
  assert.ok(labels.size >= 3, 'boot must describe the current stage');
  pc.dispose();
});

test('projects are opened by navigating through the virtual disk and folder', () => {
  const saved = project('on-disk');
  const { controller, root } = setup({ projects: [saved] });
  controller.open('computer');
  assert.ok(!find(root, 'Открыть проект on-disk'));
  assert.ok(find(root, 'Открыть диск C:'));
  find(root, 'Открыть диск C:').click();
  find(root, 'Открыть папку Windows').click();
  assert.ok(!find(root, 'Открыть проект on-disk'));
  find(root, 'Назад').click();
  find(root, 'Открыть папку Мои проекты').click();
  find(root, 'Открыть проект on-disk').click();
  assert.equal(controller.project.id, 'on-disk');
});

test('insufficient disk space disables download with a Russian explanation', () => {
  const { controller, root } = setup({ download: { status: 'idle' }, projects: Array.from({ length: 351 }, (_, i) => ({ id: 'p-' + i })) });
  controller.open('torent');
  assert.equal(find(root, 'Скачать FT Studio через torent').disabled, true);
  assert.ok(nodes(root).some(node => /недостаточно места/i.test(node.textContent ?? '')));
  assert.equal(controller.state.download.status, 'idle');
});

test('a full disk blocks a new project save but allows updating an existing one', () => {
  const projects = Array.from({ length: 350 }, (_, i) => project('p-' + i));
  const { controller, root } = setup({ projects });
  controller.openProject(project('new'));
  assert.equal(find(root, 'Сохранить проект в Мои проекты').disabled, true);
  assert.ok(nodes(root).some(node => /недостаточно места/i.test(node.textContent ?? '')));
  controller.openProject(projects[0]);
  assert.notEqual(find(root, 'Сохранить проект в Мои проекты').disabled, true);
});
