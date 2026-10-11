import test from 'node:test';
import assert from 'node:assert/strict';
import { FT_STUDIO_BYTES, createVirtualPcState, setPcPower, startFtDownload } from '../src/virtual-pc-state.js?rev=28';
import { advanceVirtualPc, downloadPresentation, gameMinuteStamp } from '../src/virtual-pc-runtime.js?rev=28';

function downloadingState(seed = {}) {
  return createVirtualPcState({...seed,power:'on',download:{status:'downloading',receivedBytes:0}});
}

test('eight in-game hours complete ft studio exactly once', () => {
  const started = advanceVirtualPc(downloadingState(), { day: 1, minutes: 0 });
  const completed = advanceVirtualPc(started.state, { day: 1, minutes: 480 });

  assert.equal(completed.advancedBytes, FT_STUDIO_BYTES);
  assert.equal(completed.state.download.status, 'ready-to-install');
  assert.equal(completed.state.download.receivedBytes, FT_STUDIO_BYTES);
});

test('a powered-off pc does not credit game time to a download', () => {
  const state = createVirtualPcState({
    power: 'off',
    lastGameMinute: 120,
    download: { status: 'downloading', receivedBytes: 200000000 },
  });
  const advanced = advanceVirtualPc(state, { day: 1, minutes: 240 });

  assert.equal(advanced.advancedBytes, 0);
  assert.equal(advanced.state.download.receivedBytes, 200000000);
  assert.equal(advanced.state.lastGameMinute, 240);
});

test('reconciling unchanged game time does not advance a download', () => {
  const state = createVirtualPcState({
    power: 'on',
    lastGameMinute: 180,
    download: { status: 'downloading', receivedBytes: 400000000 },
  });
  const advanced = advanceVirtualPc(state, { day: 1, minutes: 180 });

  assert.equal(advanced.advancedBytes, 0);
  assert.equal(advanced.state.download.receivedBytes, 400000000);
});

test('game minutes remain monotonic across midnight', () => {
  const state = createVirtualPcState({
    power: 'on',
    lastGameMinute: 1430,
    download: { status: 'downloading', receivedBytes: 0 },
  });
  const advanced = advanceVirtualPc(state, { day: 2, minutes: 10 });

  assert.equal(gameMinuteStamp({ day: 2, minutes: 10 }), 1450);
  assert.equal(advanced.advancedBytes, 36480000);
  assert.equal(advanced.state.download.receivedBytes, 36480000);
});

test('repeating one reconciled clock position is stable', () => {
  const state = createVirtualPcState({
    power: 'on',
    lastGameMinute: 100,
    download: { status: 'downloading', receivedBytes: 0 },
  });
  const first = advanceVirtualPc(state, { day: 1, minutes: 160 });
  const repeated = advanceVirtualPc(first.state, { day: 1, minutes: 160 });

  assert.equal(first.advancedBytes, 108600000);
  assert.equal(repeated.advancedBytes, 0);
  assert.equal(repeated.state.download.receivedBytes, first.state.download.receivedBytes);
});

test('download presentation reports the agreed fictional speed and remaining game time', () => {
  const state = createVirtualPcState({
    power: 'on',
    download: { status: 'downloading', receivedBytes: 400000000 },
  });
  const presentation = downloadPresentation(state);

  assert.equal(presentation.speedKbPerSecond, 24);
  assert.equal(presentation.totalMb, 800);
  assert.equal(presentation.receivedMb, 400);
  assert.equal(presentation.remainingGameMinutes, 221);
  assert.equal(presentation.percent, 50);
});
