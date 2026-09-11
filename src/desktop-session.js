import { getDesktopApp } from './desktop-apps.js';

export const desktopShellLabels = Object.freeze({
  system: 'Каликфорния OS',
  start: 'Пуск',
  shutdown: 'Выключить',
});

export function startDesktopSession() {
  return { state: 'booting', window: null };
}

export function finishDesktopBoot(session) {
  return session?.state === 'booting' ? { state: 'ready', window: null } : session;
}

export function openDesktopWindow(session, appId) {
  if (session?.state !== 'ready' || !getDesktopApp(appId)) return session;
  return { state: 'ready', window: appId };
}

export function closeDesktopWindow(session) {
  return session?.state === 'ready' ? { state: 'ready', window: null } : session;
}

export function resumeDesktopWindow(session, appId) {
  return openDesktopWindow(session, appId);
}

export function desktopTaskbarLabel(session) {
  return getDesktopApp(session?.window)?.label ?? 'Рабочий стол';
}

export function shutdownDesktopSession() {
  return { state: 'off', window: null };
}
