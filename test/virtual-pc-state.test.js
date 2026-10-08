import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VIRTUAL_PC_STORAGE_KEY,
  cancelFtDownload,
  createVirtualPcState,
  diskUsage,
  installFtStudio,
  loadVirtualPcState,
  markFtDownloadComplete,
  saveVirtualPcState,
  saveStudioProject,
  setPcPower,
  setWallpaper,
  startFtDownload,
} from '../src/virtual-pc-state.js';

function mapStorage(seed = new Map()) {
  return {
    getItem(key) { return seed.get(key) ?? null; },
    setItem(key, value) { seed.set(key, value); },
  };
}

test('a new virtual pc has all 1500 MB free', () => {
  const usage = diskUsage(createVirtualPcState());
  assert.deepEqual(usage, {
    capacityMb: 1500,
    usedMb: 0,
    freeMb: 1500,
    downloadMb: 0,
    installedMb: 0,
    projectsMb: 0,
  });
});

test('power and wallpaper changes are persistent immutable pc choices', () => {
  const initial = createVirtualPcState();
  const powered = setPcPower(initial, 'on');
  const decorated = setWallpaper(powered, 'factory');
  const memory = new Map();

  assert.equal(initial.power, 'off');
  assert.equal(powered.power, 'on');
  assert.equal(decorated.wallpaper, 'factory');
  assert.equal(saveVirtualPcState(mapStorage(memory), decorated), true);

  const restored = loadVirtualPcState(mapStorage(memory));
  assert.equal(restored.ok, true);
  assert.equal(restored.state.power, 'on');
  assert.equal(restored.state.wallpaper, 'factory');
  assert.ok(memory.has(VIRTUAL_PC_STORAGE_KEY));
});

test('corrupt or blocked storage falls back to an untouched default pc', () => {
  const corrupt = new Map([[VIRTUAL_PC_STORAGE_KEY, '{not json']]);
  const restored = loadVirtualPcState(mapStorage(corrupt));

  assert.equal(restored.ok, false);
  assert.equal(restored.state.power, 'off');
  assert.equal(diskUsage(restored.state).freeMb, 1500);
  assert.equal(saveVirtualPcState({ setItem() { throw Error('blocked'); } }, restored.state), false);
});

test('cancelling an unfinished package frees its partial virtual payload', () => {
  const downloading = createVirtualPcState({
    power: 'on',
    download: { status: 'downloading', receivedBytes: 200000000 },
  });
  const cancelled = cancelFtDownload(downloading);

  assert.equal(diskUsage(downloading).freeMb, 1300);
  assert.equal(cancelled.download.status, 'idle');
  assert.equal(cancelled.download.receivedBytes, 0);
  assert.equal(diskUsage(cancelled).freeMb, 1500);
});

test('installing a completed ft studio package consumes 800 MB once', () => {
  const started = startFtDownload(setPcPower(createVirtualPcState(), 'on'));
  const completed = markFtDownloadComplete(started);
  const installed = installFtStudio(completed);

  assert.equal(completed.download.status, 'ready-to-install');
  assert.equal(diskUsage(completed).downloadMb, 800);
  assert.equal(diskUsage(completed).freeMb, 700);
  assert.equal(installed.download.status, 'installed');
  assert.equal(diskUsage(installed).downloadMb, 0);
  assert.equal(diskUsage(installed).installedMb, 800);
  assert.equal(diskUsage(installed).freeMb, 700);
});

test('saving a project reserves two virtual megabytes', () => {
  const state = createVirtualPcState({ projects: [{ id: 'first' }, { id: 'second' }] });
  const saved = saveStudioProject(state, { id: 'third' });
  const usage = diskUsage(saved.state);

  assert.equal(saved.ok, true);
  assert.equal(usage.projectsMb, 6);
  assert.equal(usage.usedMb, 6);
  assert.equal(usage.freeMb, 1494);
});

test('saving a project does not overfill the virtual disk', () => {
  const full = createVirtualPcState({
    download: { status: 'installed', receivedBytes: 0 },
    projects: Array.from({ length: 350 }, (_, index) => ({ id: `project-${index}` })),
  });
  const result = saveStudioProject(full, { id: 'one-too-many' });

  assert.equal(diskUsage(full).freeMb, 0);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'insufficient-space');
  assert.equal(result.state.projects.length, 350);
});
