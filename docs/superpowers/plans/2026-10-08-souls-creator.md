# Souls Creator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перестроить редактор по композиции референса Dark Souls, сохранив рабочую кастомизацию, навыки и предпросмотр того же героя, который появляется в квартире.

**Architecture:** Существующий `CreatorSelection` остаётся источником выбранной внешности. Отдельные области DOM показывают категории слева, варианты по центру и живую модель справа; обработчики приложения связывают это с неизменным форматом профиля. Только стили редактора меняются на тёмные рамки и бумажную центральную панель.

**Tech Stack:** Native DOM/ES modules, CSS, SVG icons, existing Three.js preview, Node `node:test`; без нового UI-фреймворка.

**Spec:** `docs/superpowers/specs/2026-10-08-apartment-expansion-creator-design.md`, раздел редактора и общие проверки. Очередь: `docs/superpowers/plans/2026-10-08-delivery-queue.md`.

Статус: утверждён пользователем; реализация установлена, автоматические проверки пройдены. Браузерная приёмка открыта, см. `../qa/2026-10-08-souls-creator.md`. Корень `D:/Project/Battle`.

## Global Constraints

- Три колонки: имя/категории/характеристики слева, варианты/описание/цвета по центру, крупный герой справа; действия внизу.
- Три вкладки: «Внешность», «Одежда», «Характеристики». Категории внешности: лицо, волосы, борода, усы; одежды: верх, низ, обувь.
- Сохранить три формы лица, восемь причёсок, независимые бороды и усы, все варианты одежды и цвета, четыре ракурса, вращение и приближение.
- Имя и 10 очков навыков обязательны; распределение по прежним правилам. Запись профиля только при подтверждении, отмена не меняет сохранение.
- Собственные иконки/орнаменты; не копировать надпись Dark Souls, готовые текстуры или изображение персонажа из референса.
- Стилизованные шрифты имеют кириллицу; текст вне низкоразрешённого прохода рендера. Остальной интерфейс и ретрорендер квартиры не переделывать.
- Проверить 1280×720 и 640×900, отсутствие горизонтального скролла, доступность клавиатурой и видимый фокус.
- Никаких кешей/сгенерированных медиа на C:. Незакоммиченные файлы старой игры не менять.

## Review Focus

- Выбор бороды, усов и цвета теряется при возврате на вкладку: сохранить независимые значения и выбранную категорию каждой вкладки; Task 1.
- Клик по цвету выбивает клавиатурный фокус и прокрутку: не заменять на каждом выборе сам активный DOM-узел; Task 1.
- Длинные русские названия, ошибка имени и узкий экран перекрывают героя/подтверждение: проверить переносы и вертикальный скролл; Task 2.
- Статистика позволяет обойти 10 очков через Enter/повторный клик: одна проверяемая отправка через существующий `createProfile`; Task 3.
- Отмена после поворота/смены одежды или отказ localStorage портят текущий профиль: восстановить исходную внешность, не очищать сохранение; Task 3.

## Task 1 Навигация и состояние редактора

**Files:** Modify `src/apartment-v3-creator.js`, `src/apartment-app.js`, `test/apartment-v3-creator.test.js`; Create `test/helpers/creator-dom.js` by extracting the existing small DOM adapter without replacing browser QA.

**Interfaces:** Extend `CreatorSelection` with `section: 'appearance'|'clothing'|'stats'`, `selectSection(section):void`, `categories():Array<{id,label}>`; retain category/select/options/swatches/frame/setZoom/reset. Extend `mountCreator(root,onChange,{categoryRoot=root}={}): {selection,reset,selectSection}`. `root` holds current description/options/palette; `categoryRoot` allows the left column. DOM nodes expose existing `data-category`, `data-option`, `data-color` attributes. `selectSection` changes navigation only, never calls the appearance mutation callback.

- [ ] Add tests: fresh selection section is appearance and selected category face; clothing categories equal `['top','bottom','footwear']`; selecting top hoodie/red then appearance/hair/parted and returning retains hoodie/red and last clothing category top. Reset restores default white tee and appearance/face. Unknown section/category does not mutate valid state.

```js
test('section navigation preserves clothing and dye', () => {
  const selection = new CreatorSelection();
  selection.selectSection('clothing'); selection.category('top');
  selection.select('top', 'hoodie'); selection.select('topColor', 'red');
  selection.selectSection('appearance'); selection.category('hair');
  selection.selectSection('clothing');
  assert.equal(selection.selected, 'top');
  assert.equal(selection.appearance.top, 'hoodie');
  assert.equal(selection.appearance.topColor, 'red');
});
```

- [ ] Mount into separate category and option roots with the test adapter. Click category/option/swatch and assert original focused option/swatch identity remains, callbacks fire only on an appearance change, and the selected state has accessible labels. Verify shared root fallback still works.
- [ ] Run `node --test test/apartment-v3-creator.test.js`; expect failures in new section API and separate-root mounting.
- [ ] Implement the state/API extension with a saved last category for appearance and clothing. Section stats keeps current appearance and frames full body. Add local `selectCreatorSection(section)` in app to control three panels and CTA progression appearance→clothing→stats. Keep live preview through `view.setAppearance` and existing renderPreview framing.
- [ ] Re-run creator tests and `node --test test/avatar-v3-profile.test.js`; expect no failures. Commit exact files: `feat: add grouped creator navigation without losing selections`.

## Task 2 Компоновка и визуальное оформление

**Files:** Modify `index.html`, `apartment-v3.css`, `src/apartment-v3-creator.js`, `src/apartment-app.js`; Create `assets/ui/creator-symbols.svg`, `test/apartment-v3-creator-layout.test.js`.

**Interfaces:** Preserve existing form/input/preview IDs used by app; add `#clothing-tab` and `#creator-categories`. Keep `#appearance-fields` for central choices, `#preview-stage` for the measured canvas viewport. `#stats-panel` remains the editable characteristics view; left summary uses outputs without duplicate IDs. Icon sprite IDs: face, hair, beard, mustache, top, bottom, footwear, stats, rotate, back, confirm.

- [ ] Add structural assertions: exactly one character-name/creator-form/preview-stage, three labelled section buttons, separate category and choice areas, no duplicate IDs, submit CTA belongs to creator-form and buttons that navigate have type=button. Mounted tests verify icon decoration does not replace a text accessible name.

```js
test('creator exposes three sections and a single preview', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const id of ['appearance-tab','clothing-tab','stats-tab','creator-categories','preview-stage']) {
    assert.equal((html.match(new RegExp('id="'+id+'"', 'g')) ?? []).length, 1);
  }
});
```

- [ ] Run `node --test test/apartment-v3-creator-layout.test.js test/apartment-v3-creator.test.js`; verify new markup-contract assertions fail.
- [ ] Implement three-column desktop layout with roughly 25% summary, 32% choices, remaining preview. Use dark umber/charcoal, thin double bronze borders, restrained corner ornaments and a parchment central panel. The selected option uses amber/brown contrast rather than relying on colour alone. Use local system Georgia/Times New Roman serif fallbacks for Cyrillic creator text; keep sizes legible. Do not download fonts or use the screenshot as a panel background.
- [ ] Add original SVG icons with text labels, compact variant descriptions and named colour swatches. Move preview to right and footer below all columns. At widths below 900px stack preview then parameters; cap preview height so parameters remain reachable. Respect reduced motion and visible focus. Keep all rules under creator-specific selectors so apartment HUD/menu do not inherit the redesign.
- [ ] Run targeted tests. In actual browser test 1280×720 and 640×900, long Cyrillic name/option, largest error message, zoom limits and all four rotations. Confirm preview stays within its real bounding rectangle, not old screen coordinates. No horizontal document overflow; footer is reachable. Save real screenshots to D:/Project/Battle/artifacts/v12/.
- [ ] Commit: `feat: redesign character creator with dark framed panels`.

## Task 3 Создание сохранение и итоговая проверка

**Files:** Modify `src/apartment-app.js`, relevant HTML/module revision URLs; Create `src/apartment-v3-creator-session.js`, `test/apartment-v3-creator-flow.test.js`, `docs/superpowers/qa/2026-10-08-souls-creator.md`; extend profile and mounted creator tests only if a missing regression is found.

**Interfaces:** Preserve `createProfile({name,allocations,appearance})`, `saveProfile(storage,profile)`, `loadProfile(storage)` and v3 profile schema. In the new session module, `validateCreatorDraft({name,allocations,appearance}): {ok,profile?,errors:{name?,allocations?}}` delegates to existing profile validation. `createCreatorSession(savedProfile,storage,{enter,restore}): {submit(draft),cancel()}` owns the one-shot confirmation guard: submit returns validation/storage result and enters once on a valid draft, even if storage denies writing; cancel restores original appearance without writing. A fresh session is created on New Game. Form and keyboard submission use this same production controller, which tests invoke with spy callbacks.

- [ ] Write tests: whitespace name rejects; 9 or 11 allocated points reject; exactly 10 valid points and nonblank name produce a v3 profile with selected appearance. Invalid input does not call storage or enterApartment. Cancellation does not write storage and restores saved appearance; denied storage reports failure while a valid new profile can still enter the apartment. Repeated UI activation does not create two apartment entries.

```js
test('valid draft cannot enter the apartment twice', () => {
  const draft = {name:'Тест', appearance:DEFAULT_APPEARANCE,
    allocations:Object.fromEntries(STAT_KEYS.map((key,i) => [key,i===0?2:1]))};
  let entries = 0, writes = 0;
  const session = createCreatorSession(null, {setItem(){writes++;}},
    {enter(){entries++;}, restore(){}});
  session.submit(draft); session.submit(draft);
  assert.equal(entries, 1); assert.equal(writes, 1);
});
```

- [ ] Run `node --test test/apartment-v3-creator-flow.test.js test/avatar-v3-profile.test.js`; verify new boundary tests fail before integration.
- [ ] Implement field-local errors and a guarded single submit path. Preserve allocations across all tabs. Confirm new character uses chosen wardrobe in the apartment and starts under the existing blanket; do not change sleep behavior. Raise only relevant revision URLs to invalidate old creator code.
- [ ] Run full `npm test`. Browser path: menu→new game→all tabs→edit colours→stats→back→same selections→cancel→existing profile unchanged. Then create a test profile using isolated browser storage so the user's real save is not overwritten; test reload, room entry and localStorage failure handling without clearing user's data.
- [ ] Review all changed files, current save semantics and responsive screenshots. Record evidence and any untested condition in QA; commit `test: verify redesigned creator and profile preservation`.

## Handoff

Use the same execution method selected for the apartment plan. Native sequential execution is recommended because both plans share `src/apartment-app.js` and the live preview; finish with an independent review across both plans. Computer/FT Studio remain the next entries in the queue, not part of these creator commits.
