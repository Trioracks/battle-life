import test from 'node:test';
import assert from 'node:assert/strict';
import { pcDocument as creatorDocument, fire } from './helpers/virtual-pc-dom.js';
import { mountVirtualPc } from '../src/virtual-pc-ui.js?rev=26';
import { createVirtualPcState } from '../src/virtual-pc-state.js?rev=26';
import { createStudioProject } from '../src/ft-studio-project.js?rev=26';
import { BATTLE_BRIEFS } from '../src/virtual-pc-catalog.js?rev=26';

const nodes = root => root.children.flatMap(child => [child, ...nodes(child)]);
const find = (root, label) => nodes(root).find(node => node.getAttribute?.('aria-label') === label || node.textContent === label);
const project = (id, name = id) => createStudioProject({ id, name, battleId: BATTLE_BRIEFS[0].id }).project;
function setup(state) {
  const document = creatorDocument(), root = document.createElement('section');
  const controller = mountVirtualPc(root);
  controller.showDesktop(createVirtualPcState({ power: 'on', download: { status: 'installed' }, ...state }));
  return { controller, root, document };
}

test('boot and close do not schedule independent Window timers', t => {
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
  assert.equal(timers.size,0);
  controller.presentTransition({phase:'desktop',progress:0,overlay:1,locked:false});
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

test('battle registration does not overwrite a draft recovered after reload', () => {
  const {controller,root}=setup({draft:project('unsaved','Черновик')});
  const before=structuredClone(controller.state.draft);controller.open('underweb');
  controller.navigateUnderweb('underweb://battles/open-mic-17');find(root,'Подать заявку').click();find(root,'Подтвердить заявку').click();
  assert.deepEqual(controller.state.draft,before);assert.equal(controller.state.battleApplications[0].battleId,'open-mic-17');
  assert.equal(controller.project,null);
});

test('opening an archived project leaves the independent draft untouched', () => {
  const saved=project('saved'),{controller}=setup({draft:project('unsaved'),projects:[saved]});
  const before=structuredClone(controller.state);controller.openProject(saved);
  assert.equal(controller.project.id,'saved');assert.deepEqual(controller.state,before);controller.dispose();
});

test('new game clears registrations without retaining a previous Underweb view', () => {
  const {controller,root}=setup();controller.open('underweb');controller.navigateUnderweb('underweb://battles/concrete-echo');
  find(root,'Подать заявку').click();find(root,'Подтвердить заявку').click();
  controller.reset(createVirtualPcState());controller.showDesktop(controller.state);controller.open('underweb');
  assert.equal(controller.underwebView.snapshot.route.type,'home');assert.deepEqual(controller.state.battleApplications,[]);
});

test('clock updates preserve an unfinished registration and its focused input', () => {
  const {controller,root,document}=setup();controller.open('underweb');controller.navigateUnderweb('underweb://battles/concrete-echo');
  find(root,'Подать заявку').click();const input=find(root,'Имя участника');input.value='Мой псевдоним';input.focus();
  controller.syncState({...controller.state,lastGameMinute:901});controller.syncHost({playerName:'Игрок',clockLabel:'15:01'});
  assert.equal(find(root,'Имя участника'),input);assert.equal(document.activeElement,input);assert.equal(input.value,'Мой псевдоним');
});

test('keyboard navigation enters an opened window and wraps inside it', () => {
  const { controller, root, document } = setup();
  controller.open('underweb');
  const first = find(root, 'Свернуть окно'), last = nodes(controller.focusScope()).filter(n=>n.tagName==='BUTTON'&&!n.disabled).at(-1);
  assert.ok(root.contains(document.activeElement));
  last.focus();
  const event = new Event('keydown', { cancelable: true });
  Object.defineProperty(event, 'key', { value: 'Tab' });
  root.dispatchEvent(event);
  assert.equal(event.defaultPrevented, true);
  assert.ok(document.activeElement === first, 'Tab must wrap to the first window control');
});

test('boot presentation accepts intermediate host progress with no independent timer', () => {
  const document = creatorDocument(), root = document.createElement('section'), timers = [];
  const pc = mountVirtualPc(root, { setTimeoutFn(fn, delay) { timers.push({ fn, delay }); return timers.length; }, clearTimeoutFn() {} });
  pc.boot(createVirtualPcState({ power: 'on' }));
  const seen = [];
  for(const progress of [.1,.4,.8]){pc.presentTransition({phase:'loading',progress,overlay:1,locked:true});seen.push(nodes(root).find(node=>node.tagName==='PROGRESS').value);}
  pc.presentTransition({phase:'desktop',progress:0,overlay:1,locked:false});
  assert.equal(pc.phase, 'desktop');
  assert.equal(timers.length, 0);
  assert.ok(new Set(seen).size >= 3, 'boot must visibly advance before completion');
  pc.dispose();
});

test('projects are opened by navigating through the virtual disk and folder', () => {
  const saved = project('on-disk');
  const { controller, root } = setup({ projects: [saved] });
  controller.open('computer');
  assert.ok(!find(root, 'Открыть проект on-disk'));
  assert.ok(find(root, 'Открыть диск C:'));
  fire(find(root, 'Открыть диск C:'),'dblclick');
  fire(find(root, 'Открыть папку Windows'),'dblclick');
  assert.ok(!find(root, 'Открыть проект on-disk'));
  find(root, 'Назад').click();
  fire(find(root, 'Открыть папку Мои документы'),'dblclick');
  fire(find(root, 'Открыть папку Мои проекты'),'dblclick');
  fire(find(root, 'Открыть проект on-disk'),'dblclick');
  assert.equal(controller.project.id, 'on-disk');
});

test('insufficient disk space rejects forum download with a Russian explanation', () => {
  const { controller, root } = setup({ download: { status: 'idle' }, projects: Array.from({ length: 1000 }, (_, i) => ({ id: 'p-' + i })) });
  controller.open('underweb');controller.navigateUnderweb('underweb://dump/client');find(root,'Скачать установщик torent').click();
  assert.ok(nodes(root).some(node => /недостаточно места/i.test(node.textContent ?? '')));
  assert.equal(controller.state.download.status, 'idle');
});

test('full disk still permits opening an existing project without a save operation', () => {
  const projects=Array.from({length:600},(_,i)=>project('p-'+i));const {controller,root}=setup({projects});
  const before=structuredClone(controller.state);controller.openProject(projects[0]);
  assert.equal(controller.project.id,'p-0');assert.equal(find(root,'Сохранить проект в Мои проекты'),undefined);
  assert.deepEqual(controller.state,before);controller.dispose();
});
