import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_APPEARANCE, STAT_KEYS } from '../src/avatar-v3-profile.js?rev=25';
import { loadHomeTime } from '../src/apartment-v3-time.js?rev=25';
import { loadVirtualPcState, saveVirtualPcState, createVirtualPcState, setPcPower, startFtDownload } from '../src/virtual-pc-state.js?rev=25';
import { advanceVirtualPc } from '../src/virtual-pc-runtime.js?rev=25';

const draft = { name: 'Новый герой', appearance: DEFAULT_APPEARANCE, allocations: Object.fromEntries(STAT_KEYS.map((key, i) => [key, i === 0 ? 2 : 1])) };
function storage() {
  const values = new Map();
  return { getItem(key) { return values.get(key) ?? null; }, setItem(key, value) { values.set(key, value); } };
}
async function factory() {
  const module = await import('../src/apartment-v3-new-game.js?rev=25').catch(() => ({}));
  assert.equal(typeof module.createNewGameSession, 'function', 'confirmed new game must own all home state resets');
  return module.createNewGameSession;
}

test('confirming a new character resets the persisted PC and its old game clock', async () => {
  const createSession = await factory(), saved = storage();
  saveVirtualPcState(saved, createVirtualPcState({ power: 'on', wallpaper: 'room', lastGameMinute: 6480, projects: [{ id: 'old-project' }], draft: { id: 'old-draft' }, download: { status: 'installed' } }));
  let entered;
  const session = createSession(null, saved, { enter(profile, home) { entered = home; }, restore() {} });
  assert.equal(session.submit(draft).ok, true);
  assert.equal(entered.homeTime.day, 1);
  assert.equal(entered.pcState.lastGameMinute, null);
  assert.equal(loadHomeTime(saved).day, 1);
  const pc = loadVirtualPcState(saved).state;
  assert.equal(pc.power, 'off');
  assert.equal(pc.download.status, 'idle');
  assert.deepEqual(pc.projects, []);
  assert.equal(pc.draft, null);
  let downloading = createVirtualPcState({...pc,software:undefined,power:'on',download:{status:'downloading',receivedBytes:0}});
  downloading = advanceVirtualPc(downloading, { day: 1, minutes: 600 }).state;
  assert.ok(advanceVirtualPc(downloading, { day: 1, minutes: 660 }).advancedBytes > 0);
});

test('cancelling or submitting an invalid character preserves the old PC', async () => {
  const createSession = await factory(), saved = storage();
  const old = createVirtualPcState({ lastGameMinute: 6480, download: { status: 'installed' } });
  saveVirtualPcState(saved, old);
  const session = createSession(null, saved, { enter() { assert.fail('must not enter'); }, restore() {} });
  assert.equal(session.submit({ ...draft, name: '' }).ok, false);
  session.cancel();
  assert.deepEqual(loadVirtualPcState(saved).state, old);
});

test('failed new-game persistence is reported while the in-memory PC starts fresh', async () => {
  const createSession = await factory();
  let entered;
  const session = createSession(null, { setItem() { throw Error('denied'); } }, { enter(profile, home) { entered = home; }, restore() {} });
  const result = session.submit(draft);
  assert.equal(result.ok, true);
  assert.equal(result.saved, false);
  assert.equal(entered.pcSaved, false);
  assert.deepEqual(entered.pcState.projects, []);
});
