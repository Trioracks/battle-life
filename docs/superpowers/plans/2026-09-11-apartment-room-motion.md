# Квартира: комнаты, пол и переходные анимации Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Разделить квартиру на жилую комнату и кухню, вести камеру за героем и сделать все бытовые действия плавными и физически читаемыми.

**Architecture:** `src/apartment-layout.js` описывает комнаты, предметы, пол и маршрут через межкомнатную дверь без Three.js-зависимостей. `src/action-transitions.js` превращает бытовое действие в фазы движения и позы. `src/main.js` потребляет оба модуля для групп сцены, камеры и анимации, а `style.css` только оформляет HUD и подсказки.

**Tech Stack:** ES modules, Node.js built-in test runner, Three.js via CDN, HTML, CSS.

**Spec:** `docs/superpowers/specs/2026-09-11-creator-apartment-desktop-design.md`

## Global Constraints

- Ступни героя визуально стоят на полу; модель не проваливается в пол и текстуры.
- Действие всегда проходит фазы «подойти → остановиться → развернуться → начать → выполнить».
- Кухонные действия выполняются только на кухне; выходная дверь остаётся в жилой комнате.
- Игровые эффекты, стоимость, требования энергии и длительности из существующих доменных модулей не меняются.
- Каждый завершённый блок проходит `npm test`, ручную проверку, отдельный коммит и push.

---

### Task 1: Описать квартиру и маршруты как чистые данные

**Files:**
- Create: `src/apartment-layout.js`
- Create: `test/apartment-layout.test.js`
- Modify: `src/apartment-actions.js:1-20`

**Interfaces:**
- Consumes: apartment action ids from `getApartmentAction(id)`.
- Produces: `getApartmentRoom(id)`, `getApartmentTarget(id)`, `routeBetweenRooms(fromRoom, toRoom)`, `APARTMENT_FLOOR_Y`.

- [ ] **Step 1: Write the failing test**

```js
import { APARTMENT_FLOOR_Y, getApartmentRoom, routeBetweenRooms } from '../src/apartment-layout.js';

test('kitchen actions route through the internal door and actor floor is explicit', () => {
  assert.equal(getApartmentRoom('computer'), 'living');
  assert.equal(getApartmentRoom('stove'), 'kitchen');
  assert.deepEqual(routeBetweenRooms('living', 'kitchen'), ['living-door', 'kitchen-door']);
  assert.equal(APARTMENT_FLOOR_Y, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/apartment-layout.test.js`

Expected: FAIL because `src/apartment-layout.js` does not exist.

- [ ] **Step 3: Write minimal implementation**

```js
export const APARTMENT_FLOOR_Y = 0;
export const APARTMENT_ROOMS = Object.freeze({
  living: { id: 'living', left: -0.3, right: 5.15, doorX: -0.18 },
  kitchen: { id: 'kitchen', left: -5.15, right: -0.42, doorX: -0.42 },
});
const actionRooms = Object.freeze({ computer: 'living', bed: 'living', microphone: 'living', door: 'living', fridge: 'kitchen', stove: 'kitchen', sink: 'kitchen' });
```

Return an empty route for same-room navigation and throw a clear error for an unknown room. Move object positions out of `src/apartment-actions.js` only if doing so does not break its gameplay-only public API.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/apartment-layout.test.js test/apartment-actions.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/apartment-layout.js test/apartment-layout.test.js src/apartment-actions.js
git commit -m "feat: define apartment rooms and routes"
git push origin master
```

### Task 2: Описать фазы действий и запретить скачки позы

**Files:**
- Create: `src/action-transitions.js`
- Create: `test/action-transitions.test.js`
- Modify: `src/character-motion.js:1-18`

**Interfaces:**
- Consumes: target id and target room from `src/apartment-layout.js`.
- Produces: `createActionTransition({ actionId, fromRoom, toRoom })`, `transitionPhaseAt(transition, elapsedSeconds)` with phases `walk`, `turn`, `start`, `perform`, `complete`.

- [ ] **Step 1: Write the failing test**

```js
import { createActionTransition, transitionPhaseAt } from '../src/action-transitions.js';

test('sleep cannot jump directly from walking to a lying pose', () => {
  const transition = createActionTransition({ actionId: 'bed', fromRoom: 'living', toRoom: 'living' });
  assert.equal(transitionPhaseAt(transition, 0).id, 'walk');
  assert.equal(transitionPhaseAt(transition, 1.01).id, 'turn');
  assert.equal(transitionPhaseAt(transition, 1.30).id, 'start');
  assert.equal(transitionPhaseAt(transition, 1.65).id, 'perform');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/action-transitions.test.js`

Expected: FAIL because the transition module does not exist.

- [ ] **Step 3: Write minimal implementation**

```js
const phases = Object.freeze([
  { id: 'walk', seconds: 1 },
  { id: 'turn', seconds: .28 },
  { id: 'start', seconds: .36 },
  { id: 'perform', seconds: Infinity },
]);

export function transitionPhaseAt(transition, elapsedSeconds) {
  let remaining = Math.max(0, elapsedSeconds);
  for (const phase of transition.phases) {
    if (remaining < phase.seconds) return phase;
    remaining -= phase.seconds;
  }
  return { id: 'complete', seconds: 0 };
}
```

`createActionTransition` must prepend the room-door route for cross-room actions and return immutable phase data. Keep free walking independent from action transitions.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/action-transitions.test.js test/character-motion.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/action-transitions.js test/action-transitions.test.js src/character-motion.js
git commit -m "feat: model apartment action transitions"
git push origin master
```

### Task 3: Собрать две комнаты, следящую камеру и предметы

**Files:**
- Modify: `src/main.js:50-70,720-796,1040-1095,1527-1545`
- Modify: `style.css:1-90`
- Modify: `index.html:9-20`

**Interfaces:**
- Consumes: `APARTMENT_ROOMS`, `APARTMENT_FLOOR_Y`, `getApartmentRoom`, `createActionTransition` and existing `getApartmentAction`.
- Produces: `apartmentGroups.living`, `apartmentGroups.kitchen`, `actor.transition`, clamped `cameraTargetX`.

- [ ] **Step 1: Add a visual regression check list before changing the scene**

Add this exact manual scenario under a new `## Apartment visual regression` section in `docs/qa/2026-09-10-four-day-smoke.md`:

```markdown
1. Start a new MC; idle and walking feet touch the floor.
2. Walk from the desk to the kitchen; camera follows and the internal door visibly opens.
3. Hover fridge, stove and sink in the kitchen; all three tooltips describe the matching object.
4. Return to the living room; window is compact and reads as a window, not a wall painting.
```

- [ ] **Step 2: Make the scene implementation**

Create `living` and `kitchen` Three.js groups. Add a full-height partition and a hinged inter-room door at `x ≈ -0.3`; apply visibly different wall materials to each group. Move fridge, stove, sink and eating table into `kitchen`; keep bed, desk, microphone, exit door and compact framed window in `living`.

Set every actor mesh group at `y = APARTMENT_FLOOR_Y`; calculate body offsets upward from the foot mesh rather than shifting the actor below zero. Use a smoothed `camera.position.x` toward `actor.group.position.x`, clamped to the active room width, so the hero stays near the centre but scene limits never reveal empty space.

- [ ] **Step 3: Run automated tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 4: Run manual visual regression**

Run the documented apartment visual regression at `http://localhost:4173` and verify no object remains clickable from the wrong room.

- [ ] **Step 5: Commit**

```bash
git add src/main.js style.css index.html docs/qa/2026-09-10-four-day-smoke.md
git commit -m "feat: split apartment into living room and kitchen"
git push origin master
```

### Task 4: Привязать переходы к сну, ПК, вокалу и кухне

**Files:**
- Modify: `src/main.js:100-324,1040-1095,1527-1545`
- Modify: `test/action-progress.test.js:1-40`
- Modify: `docs/qa/2026-09-10-four-day-smoke.md`

**Interfaces:**
- Consumes: `transitionPhaseAt(actor.transition, actor.actionElapsed)` and existing game-effect functions `sleep`, `cookMeal`, `washDishes`, `recordAtMicrophone`.
- Produces: action rendering that only uses the target pose during `perform` and invokes the original game-effect function once on completion.

- [ ] **Step 1: Write the failing test**

```js
import { transitionPhaseAt, createActionTransition } from '../src/action-transitions.js';

test('perform phase starts only after approach, turn and start animation', () => {
  const transition = createActionTransition({ actionId: 'computer', fromRoom: 'living', toRoom: 'living' });
  assert.notEqual(transitionPhaseAt(transition, 0.5).id, 'perform');
  assert.equal(transitionPhaseAt(transition, 1.7).id, 'perform');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/action-transitions.test.js`

Expected: FAIL until the actual timing data is used by all action entry points.

- [ ] **Step 3: Implement the phase-driven animator**

Before starting `sleep`, `cookMeal`, `washDishes`, desktop boot or microphone recording, set `actor.transition` and walk the actor to its route points. In `turn`, interpolate `actor.group.rotation.y`; in `start`, use a neutral reach/seat/bed-start pose; only in `perform` enable `seatPose`, cooking, washing, recording or lying-longwise pose. Make the sleep mattress longer than the actor and align its head and feet along the mattress. Unlock the next UI state only after the action completes.

- [ ] **Step 4: Run all tests and manual check**

Run: `npm test`

Expected: PASS.

Manual browser check:

1. Sleep: approach, turn, lie down lengthwise, darken, then wake.
2. Computer: approach, sit and touch the power state before boot screen.
3. Microphone: record at the small desk microphone, not at a floor stand.
4. Stove and sink: both begin only after entering the kitchen.

- [ ] **Step 5: Commit**

```bash
git add src/main.js test/action-progress.test.js test/action-transitions.test.js docs/qa/2026-09-10-four-day-smoke.md
git commit -m "feat: animate continuous apartment actions"
git push origin master
```
