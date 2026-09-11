# Создатель MC: визуальный образ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Сделать образ MC читаемым до старта игры: профильное лицо на стороне взгляда, отдельные силуэты одежды и управляющие стрелки вне модели.

**Architecture:** `src/creator.js` остаётся единственным местом нормализации и смены значений образа. `src/main.js` рисует все три варианта одежды как реально разные группы Three.js и синхронизирует модель предпросмотра с квартирным актёром. `index.html` и `style.css` переносят управление по краям кадра, не накрывая модель.

**Tech Stack:** ES modules, Node.js built-in test runner, Three.js via CDN, HTML, CSS.

**Spec:** `docs/superpowers/specs/2026-09-11-creator-apartment-desktop-design.md`

## Global Constraints

- Кепки в первом срезе нет; сохранённый образ содержит только `hair`, `face`, `top`, `pants`.
- Базовые навыки и лимит распределения статов не меняются: 10 очков, максимум 50 у одного навыка.
- Вымышленные интерфейсы и имена не копируют визуальные детали оригинальных ОС или сервисов.
- Каждый завершённый блок проходит `npm test`, ручную проверку в браузере, отдельный коммит и push в `Trioracks/battle-life`.

---

### Task 1: Семантика вариантов образа

**Files:**
- Modify: `src/creator.js:3-39`
- Modify: `test/creator.test.js:5-48`

**Interfaces:**
- Consumes: `normalizeLook(look)`, `cycleLookPart(look, part, direction)`.
- Produces: варианты `top: tee|hoodie|jacket`, `pants: cargo|jeans|shorts`; все функции по-прежнему возвращают объект с четырьмя ключами.

- [ ] **Step 1: Write the failing test**

```js
test('creator keeps only four visual parts and exposes real clothing silhouettes', () => {
  const look = cycleLookPart(
    { hair: 'bald', face: 'clean', top: 'tee', pants: 'shorts' },
    'top',
    1,
  );

  assert.equal(look.top, 'hoodie');
  assert.deepEqual(Object.keys(look).sort(), ['face', 'hair', 'pants', 'top']);
  assert.deepEqual(normalizeLook({ top: 'missing', pants: 'missing' }), {
    hair: 'bald', face: 'clean', top: 'tee', pants: 'cargo',
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/creator.test.js`

Expected: FAIL because `tee` is not yet a valid top option and the expected fallback differs.

- [ ] **Step 3: Write minimal implementation**

```js
export const LOOK_OPTIONS = Object.freeze({
  hair: Object.freeze(['bald', 'crop', 'mohawk']),
  face: Object.freeze(['clean', 'beard', 'mustache']),
  top: Object.freeze(['tee', 'hoodie', 'jacket']),
  pants: Object.freeze(['cargo', 'jeans', 'shorts']),
});
```

Keep `normalizeLook` and `cycleLookPart` generic; do not add a `cap` fallback.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/creator.test.js`

Expected: PASS with all creator tests green.

- [ ] **Step 5: Commit**

```bash
git add src/creator.js test/creator.test.js
git commit -m "feat: define creator clothing silhouettes"
git push origin master
```

### Task 2: Профильная модель с различимой одеждой

**Files:**
- Modify: `src/main.js:721-796,956-1005`
- Modify: `index.html:46-49`

**Interfaces:**
- Consumes: `creatorLook` from `src/creator.js` and existing `applyAvatarLook(actor, look)`.
- Produces: `createCharacter()` attaches named child groups `avatar-face`, `avatar-top`, `avatar-pants`, `avatar-legs`; `applyAvatarLook()` can swap their visibility without changing campaign state.

- [ ] **Step 1: Write the failing browser-visible assertion helper**

Create the pure helper at the end of `src/creator.js` and test it:

```js
export function appearanceGeometry(look) {
  const normalized = normalizeLook(look);
  return {
    top: normalized.top === 'tee' ? 'short-sleeve' : normalized.top,
    lowerLegsVisible: normalized.pants === 'shorts',
    facialHair: normalized.face,
  };
}

test('shorts reveal lower legs while jeans remain full length', () => {
  assert.equal(appearanceGeometry({ pants: 'shorts' }).lowerLegsVisible, true);
  assert.equal(appearanceGeometry({ pants: 'jeans' }).lowerLegsVisible, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/creator.test.js`

Expected: FAIL because `appearanceGeometry` does not exist.

- [ ] **Step 3: Write minimal implementation**

Implement `appearanceGeometry`, then update `createCharacter()` and `applyAvatarLook()` to use it:

```js
const topGroup = new THREE.Group();
topGroup.name = 'avatar-top';
const lowerLegs = new THREE.Group();
lowerLegs.name = 'avatar-legs';
const faceGroup = new THREE.Group();
faceGroup.name = 'avatar-face';
```

Create profile eyes, brow, nose and mouth on the actual side of the face, while ears remain on the head's lateral surface. Build distinct meshes: a short-sleeve shirt, a hooded torso with hood, and a jacket with open lapels. Make shorts end above the knee and toggle `avatar-legs` visible only for shorts. Keep the actor and the creator preview in the same sideways orientation; a back-facing actor does not display facial details.

- [ ] **Step 4: Run tests and manual visual check**

Run: `npm test`

Expected: PASS.

Manual browser check at `http://localhost:4173`:

1. Open the creator and cycle every face variant; verify two eyes remain visible and facial hair overlays the front of the face.
2. Cycle `Футболка → Худи → Куртка`; verify mesh shape changes, not only material color.
3. Cycle `Карго → Джинсы → Шорты`; verify legs appear only for shorts.

- [ ] **Step 5: Commit**

```bash
git add src/creator.js src/main.js test/creator.test.js index.html
git commit -m "feat: render distinct MC appearance options"
git push origin master
```

### Task 3: Управление вокруг, а не поверх модели

**Files:**
- Modify: `src/main.js:366-401`
- Modify: `style.css:145-157`
- Test: `test/creator.test.js:1-70`

**Interfaces:**
- Consumes: `LOOK_PART_LABELS`, `lookValueLabel(part, value)`, `[data-look-part]` events.
- Produces: visual controls with one left arrow and one right arrow per selected part; the preview canvas remains completely visible between them.

- [ ] **Step 1: Write the failing test**

```js
test('creator exposes each visual part as a left-right selector', () => {
  assert.deepEqual(Object.keys(LOOK_PART_LABELS), ['hair', 'face', 'top', 'pants']);
  assert.equal(lookPartAtPreviewHeight(.2), 'hair');
  assert.equal(lookPartAtPreviewHeight(.86), 'pants');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/creator.test.js`

Expected: FAIL only if the visual-part ordering has drifted while moving the control markup.

- [ ] **Step 3: Write minimal implementation**

Render a single selected row outside the canvas instead of four absolute bands above it:

```js
creatorLookControls.innerHTML = `<button data-look-part="${selectedPart}" data-direction="-1">‹</button>
  <span>${LOOK_PART_LABELS[selectedPart]}<strong>${lookValueLabel(selectedPart, creatorLook[selectedPart])}</strong></span>
  <button data-look-part="${selectedPart}" data-direction="1">›</button>`;
```

Use clicks on the preview zones only to set `selectedPart`; do not cycle an option on the first click. Style `#creator-preview` as an unobscured central canvas, with the arrow row beneath it and no absolute overlay above the model.

- [ ] **Step 4: Run tests and manual visual check**

Run: `npm test`

Expected: PASS.

Manual browser check: click head, face, torso and legs in turn. Verify the corresponding label changes, the arrows cycle only that part, and no control obscures the actor.

- [ ] **Step 5: Commit**

```bash
git add src/main.js style.css test/creator.test.js
git commit -m "feat: clarify creator appearance controls"
git push origin master
```
