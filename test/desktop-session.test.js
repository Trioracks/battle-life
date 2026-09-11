import test from 'node:test';
import assert from 'node:assert/strict';
import { closeDesktopWindow, desktopShellLabels, desktopTaskbarLabel, finishDesktopBoot, openDesktopWindow, resumeDesktopWindow, shutdownDesktopSession, startDesktopSession } from '../src/desktop-session.js';

test('desktop follows boot, window and shutdown states', () => {
  const booting = startDesktopSession();
  assert.deepEqual(booting, { state: 'booting', window: null });

  const ready = finishDesktopBoot(booting);
  assert.deepEqual(openDesktopWindow(ready, 'battles'), { state: 'ready', window: 'battles' });
  assert.deepEqual(closeDesktopWindow({ state: 'ready', window: 'battles' }), { state: 'ready', window: null });
  assert.deepEqual(shutdownDesktopSession(ready), { state: 'off', window: null });
});

test('invalid desktop windows do not change a ready session', () => {
  const ready = finishDesktopBoot(startDesktopSession());
  assert.deepEqual(openDesktopWindow(ready, 'missing'), ready);
});

test('completed archive research resumes the requested application window', () => {
  assert.deepEqual(resumeDesktopWindow({ state: 'ready', window: null }, 'battles'), { state: 'ready', window: 'battles' });
});

test('desktop shell identifies the desktop and opened fictional app', () => {
  assert.deepEqual(desktopShellLabels, { system: 'Каликфорния OS', start: 'Пуск', shutdown: 'Выключить' });
  assert.equal(desktopTaskbarLabel({ state: 'ready', window: null }), 'Рабочий стол');
  assert.equal(desktopTaskbarLabel({ state: 'ready', window: 'battles' }), 'Рэп-Сеть');
});
