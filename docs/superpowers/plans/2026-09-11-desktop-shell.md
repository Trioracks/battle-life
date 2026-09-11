# Вымышленный домашний ПК Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Превратить полноэкранный компьютер в ясный вымышленный рабочий стол со стадией загрузки, панелью задач и оконной навигацией.

**Architecture:** `src/desktop-session.js` хранит чистое конечное состояние сессии ПК. `src/main.js` запускает переход к столу только после анимации сидения, отображает стадии загрузки и монтирует окно текущего приложения. HTML даёт семантический каркас, CSS создаёт собственный ретро-современный визуальный язык без копирования конкретной ОС.

**Tech Stack:** ES modules, Node.js built-in test runner, Three.js via CDN, HTML, CSS.

**Spec:** `docs/superpowers/specs/2026-09-11-creator-apartment-desktop-design.md`

## Global Constraints

- Компьютер открывается только после подхода, разворота, начала посадки и включения ПК.
- Рабочий стол занимает игровую область и закрывается действием «Выключить».
- Имена и точные визуальные детали реальных ОС или сервисов не используются.
- Доменная логика заявок, времени, денег и трека остаётся в существующих чистых модулях.
- Каждый завершённый блок проходит `npm test`, ручную проверку, отдельный коммит и push.

---

### Task 1: Чистая модель сессии ПК

**Files:**
- Create: `src/desktop-session.js`
- Create: `test/desktop-session.test.js`
- Modify: `src/desktop-apps.js:1-35`

**Interfaces:**
- Consumes: app ids from `desktopApps`.
- Produces: `startDesktopSession()`, `finishDesktopBoot(session)`, `openDesktopWindow(session, appId)`, `closeDesktopWindow(session)`, `shutdownDesktopSession(session)`.

- [ ] **Step 1: Write the failing test**

```js
import { finishDesktopBoot, openDesktopWindow, shutdownDesktopSession, startDesktopSession } from '../src/desktop-session.js';

test('desktop follows boot, window and shutdown states', () => {
  const booting = startDesktopSession();
  assert.deepEqual(booting, { state: 'booting', window: null });
  const ready = finishDesktopBoot(booting);
  assert.deepEqual(openDesktopWindow(ready, 'battles'), { state: 'ready', window: 'battles' });
  assert.deepEqual(shutdownDesktopSession(ready), { state: 'off', window: null });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/desktop-session.test.js`

Expected: FAIL because the session module does not exist.

- [ ] **Step 3: Write minimal implementation**

```js
export function startDesktopSession() { return { state: 'booting', window: null }; }
export function finishDesktopBoot(session) { return session.state === 'booting' ? { state: 'ready', window: null } : session; }
export function openDesktopWindow(session, appId) {
  return getDesktopApp(appId) && session.state === 'ready' ? { ...session, window: appId } : session;
}
export function closeDesktopWindow(session) { return { ...session, window: null }; }
export function shutdownDesktopSession() { return { state: 'off', window: null }; }
```

Import `getDesktopApp` from `desktop-apps.js`; invalid ids must not mutate a ready session.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/desktop-session.test.js test/desktop-apps.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/desktop-session.js test/desktop-session.test.js src/desktop-apps.js
git commit -m "feat: model desktop session state"
git push origin master
```

### Task 2: Каркас рабочего стола и загрузка

**Files:**
- Modify: `index.html:22-27`
- Modify: `style.css:115-143`
- Modify: `src/main.js:168-248`

**Interfaces:**
- Consumes: desktop session functions from `src/desktop-session.js` and `desktopApps`.
- Produces: `renderDesktopSession()`, a `desktop-screen` with boot mode, desktop mode, taskbar, Start menu and application window container.

- [ ] **Step 1: Write the failing DOM contract test**

Create `test/desktop-shell-contract.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { desktopShellLabels } from '../src/desktop-session.js';

test('desktop shell uses fictional labels and exposes shutdown', () => {
  assert.deepEqual(desktopShellLabels, { system: 'Каликфорния OS', start: 'Пуск', shutdown: 'Выключить' });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/desktop-shell-contract.test.js`

Expected: FAIL because `desktopShellLabels` does not yet exist.

- [ ] **Step 3: Implement the shell**

Export:

```js
export const desktopShellLabels = Object.freeze({ system: 'Каликфорния OS', start: 'Пуск', shutdown: 'Выключить' });
```

Replace the current one-line desktop header with a boot panel, desktop background, application icon area, taskbar, Start button, clock and `Выключить`. Render a short fake boot progress after the actor has completed the computer `start` phase. Use `session.window` to render the app frame title and close control, never a full-screen page per application.

- [ ] **Step 4: Run automated and manual checks**

Run: `npm test`

Expected: PASS.

Manual browser check: sit at the PC, see the loading state, wait for desktop, open an icon, close its window, open the Start menu and shut down back to the seated actor.

- [ ] **Step 5: Commit**

```bash
git add index.html style.css src/main.js src/desktop-session.js test/desktop-shell-contract.test.js
git commit -m "feat: add fictional desktop shell"
git push origin master
```

### Task 3: Долгие действия из окна возвращают к герою

**Files:**
- Modify: `src/main.js:231-324`
- Modify: `test/desktop-session.test.js`
- Modify: `docs/qa/2026-09-10-four-day-smoke.md`

**Interfaces:**
- Consumes: `getDesktopAction('research-archive')`, `startDesktopSession`, `closeDesktopWindow`.
- Produces: a single route for desktop actions: close window → show actor progress → run existing completion callback → reopen requested app window.

- [ ] **Step 1: Write the failing test**

```js
import { resumeDesktopWindow } from '../src/desktop-session.js';

test('completed archive study resumes the Repset window', () => {
  assert.deepEqual(resumeDesktopWindow({ state: 'ready', window: null }, 'battles'), { state: 'ready', window: 'battles' });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/desktop-session.test.js`

Expected: FAIL because `resumeDesktopWindow` does not exist.

- [ ] **Step 3: Implement the completion route**

```js
export function resumeDesktopWindow(session, appId) {
  return session.state === 'ready' && getDesktopApp(appId) ? { ...session, window: appId } : session;
}
```

Before archive research, use `closeDesktopWindow` and hide the desktop only after it closes. Reuse the existing actor bubble and `presentActionProgress`; after the campaign completion function runs, call `resumeDesktopWindow(session, action.returnView)` and show the existing phone notification.

- [ ] **Step 4: Run tests and manual check**

Run: `npm test`

Expected: PASS.

Manual browser check: register in Repset, choose archive research, observe the seated actor and accelerated time, then return to the Repset window with the discovered hint and notification.

- [ ] **Step 5: Commit**

```bash
git add src/main.js src/desktop-session.js test/desktop-session.test.js docs/qa/2026-09-10-four-day-smoke.md
git commit -m "feat: return desktop tasks to the actor"
git push origin master
```
