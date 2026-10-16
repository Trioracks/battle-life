# Apartment Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Расширить квартиру, завершить объёмный интерьер и двор, оставить две камеры, ускорить ходьбу и добавить обеденный стол с действием еды.

**Architecture:** Единая конфигурация планировки питает Blender и экспорт действий. Сохраняются рендеренный боковой вид и полноценная геометрия первого лица; время и движение остаются в существующих контроллерах. Дым — отдельный живой слой, а не часть неподвижного фона.

**Tech Stack:** ES modules, vendored Three.js, Node `node:test`, Blender 4.5.9 Python, HTML/CSS, PowerShell.

**Spec:** `docs/superpowers/specs/2026-10-08-apartment-expansion-creator-design.md`, разделы квартиры, камер, движения, еды и проверки. Редактор реализуется соседним планом `2026-10-08-souls-creator.md`; последующий компьютер сохранён в `2026-10-08-delivery-queue.md`.

Статус: утверждён пользователем; реализация установлена, автоматические проверки пройдены. Браузерная приёмка открыта из-за сбоя инструмента, см. `../qa/2026-10-08-apartment-expansion.md`. Корень: `D:/Project/Battle`.

## Global Constraints

- Правая стена X=8,5; левая X=−8,0; проход X=0; глубина около 3,5 м; свободная зона 1,8 × 0,8 м справа от стола.
- Только 2D и первое лицо; боковой разворот 0°, наклон 8°; обзор ПКМ и клики ЛКМ по прежним маршрутам.
- Скорость 1,326 вместо 1,02; длина шага 0,9; время мира и другие анимации не ускоряются.
- Еда: одна порция, 6 реальных секунд, 15 игровых минут при завершении; ранняя отмена сохраняет порцию.
- Минимум две пятиэтажки, завод и движущийся дым; общее время квартиры управляет наружным освещением.
- Квартира расширяется до окончательной отделки и экспорта. Геометрия героя и принятые клипы сохраняются, добавляется только клип еды.
- Все сборки, кеши, записи и временные данные на D:. Не затрагивать незакоммиченные изменения старой версии в `src/main.js`, `style.css`, `src/action-transitions.js` и связанных файлах.
- Сохранения не сбрасывать; сервер текущей версии оставлять доступным во время сборки. Короткая остановка допустима только для установки проверенного комплекта ресурсов, с последующим запуском и HTTP-проверкой.

## Review Focus

- Загрузка первого лица завершается во время сна/посадки: поздний ответ не должен включить запрещённую камеру; Task 1.
- Клик/пауза в последнем кадре еды: ровно одно расходование порции и начисление 15 минут, без расхода при раннем уходе; Task 3.
- Перенос выхода: глазок, порог, возврат и коллизии должны переехать вместе, без старых X=6,5 в поведении; Task 2.
- Дым при боковой камере не рисуется поверх обоев, героя и ближних домов; настоящий проём не считается ошибкой замкнутости комнаты; Task 4.
- Сбой экспорта или установки не оставляет сервер с новым манифестом и старыми ресурсами; Task 5.

## Файлы и границы ответственности

Новые `tools/apartment-v3-layout.json` и `tools/apartment_v3_layout.py` задают планировку и выводят базовую конфигурацию движения. `tools/apartment_v3_exterior.py` строит двор; `src/apartment-v3-smoke.js` управляет дымом. `tools/audit-apartment-v3.py` проверяет исходную геометрию до объединения мешей. Остальной код меняется в существующих модулях; не переписывать всю сцену ради выделения файлов.

У новых JSON-позиций единая система координат браузера: X вправо, Y вверх, Z к наблюдателю. `to_blender(position)` переводит её в `(x, -z, y)`. Старые локальные координаты мебели конвертируются на границе, не смешиваются с новым форматом.

## Task 1 Две камеры и скорость

**Files:** Modify `src/apartment-v3-camera.js`, `src/apartment-v3-scene.js`, `src/apartment-app.js`, `tools/apartment_v3_cameras.py`, `tools/build-apartment-v3.py`, `assets/apartment/v3/scene.json`; Test `test/apartment-v3-camera.test.js`, `test/apartment-v3-camera-assets.test.js`, `test/apartment-v3-motion.test.js`, `test/apartment-v3-animation.test.js`.

**Interfaces:** Preserve `CameraModes.cycle(state, load, transition): Promise<boolean>`, `cameraPose(mode,state,eyeHeight,look)` and `cameraAllowsFirstPerson(state)`. Modes become `2D | 3D`; a stale unsupported mode normalizes to 2D. Keep `ApartmentAnimation.update(state,dt,paused)` distance driven.

- [ ] Write regression assertions: `cycle` yields `['3D','2D','3D']`, loads only `['3D']`, failed load retains 2D; a delayed load interrupted by `swap/computer` returns false. `cameraPose('2D',...)` has yaw 0 and pitch 8. Real manifest speed equals `1.02*1.3` within 1e-12; stride equals 0.9. Two already-facing walkers over the same 0.5 seconds have distance ratio 1.3, not just different config values.

```js
test('camera has two modes and loads only first person', async () => {
  const modes = new CameraModes(), loads = [];
  for (const expected of ['3D', '2D', '3D']) {
    assert.equal(await modes.cycle({clip:'idle',phase:'idle'}, async id => loads.push(id)), true);
    assert.equal(modes.mode, expected);
  }
  assert.deepEqual(loads, ['3D']);
});
```

- [ ] Run `node --test test/apartment-v3-camera.test.js test/apartment-v3-motion.test.js test/apartment-v3-animation.test.js`; verify failures are new mode/speed assertions, not syntax errors.
- [ ] Implement two-state cycle and loading guard; derive disabled button from the next mode, not the removed 2.5D state. Remove angled exports and runtime requests; keep old files unreferenced. Change generator and manifest speed together. Remove only tests whose requirement was the angled mode; retain centering, door rays and state-preservation checks.
- [ ] Run the command above plus `node --test test/apartment-v3-camera-assets.test.js`; expect zero failures. Inspect button copy and computer/sleep fade in browser; bump relevant module revisions so the served entry loads new code.
- [ ] Commit only these camera/speed changes: `feat: simplify cameras and increase walking speed`.

## Task 2 Расширенная планировка и отделка

**Files:** Create `tools/apartment-v3-layout.json`, `tools/apartment_v3_layout.py`, `tools/audit-apartment-v3.py`, `test/apartment-v3-layout.test.js`, `test/apartment-v3-geometry-audit.test.js`, `test/helpers/apartment-assets.js`; Modify `tools/build-apartment-v3.py`, `tools/build-mannequin-v3.py` (output arguments only), `tools/apartment_v3_cameras.py`, `tools/apartment_v3_details.py`, `src/apartment-v3-scene.js`, asset-reading `test/apartment-v3-*.test.js`, `test/helpers/glb-pose.js`; generated editable source and scene bundle remain in staging until Task 5.

**Interfaces:** `load_layout(path=None): dict`, `motion_config(layout): dict`, `to_blender(position): tuple` in the new Python module. `motion_config` returns bounds, spawn, speed, stride, doorX/doorSweep, actions, entryDoor, entryExit, peepholeCamera. Builder merges in actual lighting and rig metadata. JSON top-level keys: `rooms`, `railZ`, `furnitureReserve`, `anchors`, `windows`; manifest adds `layout` with room extents and window openings. Existing action object shape stays unchanged.

Before the first staged export, both builders accept `-- --out <absolute-directory> --source-out <absolute-directory>`. Defaults preserve repo destinations. `assetPath(name): string` in `test/helpers/apartment-assets.js` resolves `APARTMENT_ASSETS_DIR` when set, otherwise the current v3 folder; all asset-reading tests and GLB helpers use it. Stage under `D:/Codex/Builds/Battle/apartment-v12/assets` and adjacent `source`; prepare a matching copy of the current rig until Task 3 adds eat. Run the browser preview against a separate staged bundle configuration, not by replacing production assets mid-task. Task 5 installs the complete result.

- [ ] Write tests with assertions: kitchen extents `[-8,0]`, living `[0,8.5]`, railZ `.85`; entry hinge X `8.5`, threshold `8.55`, closedBounds `8.15`, exit X `10.35`; copied old profile/time still load. Confirm every action approach lies inside walking bounds `[-7.6,8.15]`, except the deliberate outside exit. Floor/wall extents cover the added areas and dining anchor X is −7.25.

```js
test('exported layout and door anchors agree', () => {
  const c = JSON.parse(fs.readFileSync(assetPath('scene.json'), 'utf8'));
  assert.deepEqual(c.layout.rooms.kitchen.x, [-8, 0]);
  assert.deepEqual(c.layout.rooms.living.x, [0, 8.5]);
  assert.deepEqual(c.bounds, [-7.6, 8.15]);
  assert.equal(c.entryDoor.hinge[0], 8.5);
  assert.equal(c.entryExit.position[0], 10.35);
});
```

- [ ] Run `node --test test/apartment-v3-layout.test.js`; expect missing source configuration or mismatched extents. Test JSON values and Python `motion_config` output, not source-text regex alone.
- [ ] Implement staging output arguments and the test asset-root helper before any Blender export; existing default paths remain compatible. Implement configuration and route generation. Translate the entry/landing assembly +2m as a root, including peephole and reveal geometry. Preserve bedroom and workstation dimensions, reserve X=[5.95,7.75], rear depth Z=[−1.5,−.7] for future furniture. Place dining table at X=−7.25 against rear side and chair facing it. Make full rear walls from segments around window openings; extend wallpaper/tiles, skirting and flooring across the new shell. Build front closure separately by room material, not one plaster box.
- [ ] Implement `audit_scene(scene, layout): dict` in `tools/audit-apartment-v3.py`, report `{errors,warnings,objects}` with world bounds, material names and semantic assembly IDs. Errors: unsupported chair legs, furniture inside reserved zone, monitor/keyboard unsupported by desktop, independent furniture penetrating walls; warnings: other AABB overlaps requiring inspection. Ignore documented joints within the same assembly. Sample door sweeps and chair/body pose clearance; persist report as `geometry-audit.json`.
- [ ] Reposition offending props from actual audit and first-person observations; do not move only hitboxes. Add tests for chair/floor contact, room-specific front materials, window rays passing through their openings, opaque wall/ceiling rays blocked, new door/landing anchors. Update image-brightness test to use exported camera width/target and room extents instead of hardcoded 16.8/.85/6.2.
- [ ] Run `node --test test/apartment-v3-layout.test.js test/apartment-v3-geometry-audit.test.js test/apartment-v3-environment.test.js test/apartment-v3-assets.test.js test/apartment-v3-camera-assets.test.js` against the generated bundle. Expect no audit errors; manually classify remaining warnings. Save Blender and first-person views of workstation, table, both wall interiors and door sweeps.
- [ ] Commit scoped source/geometry changes with their report: `feat: expand and finish the apartment interior`.

## Task 3 Еда за столом

**Files:** Modify `src/apartment-v3-time.js`, `src/apartment-v3-runtime.js`, `src/apartment-v3-camera.js`, `src/apartment-v3-scene.js`, `src/apartment-app.js`, `tools/build-mannequin-v3.py`, `tools/apartment-v3-layout.json`; Test `test/apartment-v3-time.test.js`, `test/apartment-v3-runtime.test.js`, `test/apartment-v3-camera.test.js`; Create `test/apartment-v3-dining.test.js`; generated rig and scene metadata.

**Interfaces:** `ApartmentTime.mealReady: boolean` with snapshot default false; `canStartHomeAction(id, clock): {allowed:boolean, reason:string}` exported from runtime. Completion remains the existing `{type:'completed',id}` event; action ID `dining`, clip `eat`, `fade:true`, `duration:6`, yaw PI. Renderer hides standing contact shadow during `eat`, and shows the table plate only while dining. No meal inventory elsewhere.

- [ ] Write assertions: old snapshots produce `mealReady===false`; `completeAction('stove')` sets true, repeating never creates count 2; `completeAction('dining')` consumes true once and adds exactly 15 minutes once; when false it adds 0. Snapshot/reload preserves true; denied dining leaves actor idle and reports `Сначала приготовь еду на плите`.

```js
test('a portion is saved and consumed at most once', () => {
  const clock = new ApartmentTime({day:2, minutes:600});
  assert.equal(clock.mealReady, false);
  clock.completeAction('stove');
  const resumed = new ApartmentTime(clock.snapshot()), before = resumed.minutes;
  assert.equal(resumed.mealReady, true);
  resumed.completeAction('dining'); resumed.completeAction('dining');
  assert.equal(resumed.mealReady, false);
  assert.equal(resumed.minutes - before, 15);
});
```

- [ ] Write integration assertions: early floor click during `eat` does not emit a dining completion or consume a portion; an uninterrupted six-second perform emits one completion. A click at/after completion cannot emit another. Camera stays first-person during approach, becomes 2D only at opaque swap, cannot return to first-person during `eat`; exiting under fade restores feet to rail.
- [ ] Run `node --test test/apartment-v3-dining.test.js test/apartment-v3-runtime.test.js test/apartment-v3-time.test.js`; verify new assertions fail before implementation.
- [ ] Implement meal state and guard in the existing event path, not UI-only inventory. Add a new skinned `eat` clip based on seated pelvis/feet with restrained spoon-hand motion; do not regenerate a differently shaped wardrobe. Add dish/spoon presentation to dining scene, register action button/name/message. Extend first-person restrictions and `swap` IDs with dining.
- [ ] Regenerate rig; run targeted tests plus `node --test test/avatar-v3-rig.test.js test/avatar-v3-wardrobe.test.js test/apartment-v3-cover.test.js test/apartment-v3-animation.test.js`. Inspect dining front/profile frames for knees, seat and tabletop clearance with trousers and shorts. Confirm sleep and workstation seat did not change.
- [ ] Commit: `feat: let the character eat prepared meals at the table`.

## Task 4 Двор заводы и дым

**Files:** Create `tools/apartment_v3_exterior.py`, `src/apartment-v3-smoke.js`, `test/apartment-v3-exterior.test.js`, `test/apartment-v3-smoke.test.js`; Modify `tools/build-apartment-v3.py`, `tools/apartment_v3_cameras.py`, `src/apartment-v3-outside.js`, `src/apartment-v3-scene.js`, `test/apartment-v3-camera.test.js`; generated `exterior.glb`, `exterior-occluders.glb` and updated manifest/backdrops.

**Interfaces:** `add_exterior(scene, factories, layout): dict` in Python; `factories` supplies the existing cube/cylinder/material constructors. Returns export roots and metadata `{geometry,occluders,buildings,emitters,farPlane}`. Each building has `{id,floors,bounds}`, emitter `{id,position,seed}` in browser coordinates; manifest property `exterior`. `createSmoke(THREE, exterior): {root,update(elapsedSeconds,daylight),dispose()}` is renderer-independent except injected Three.js.

- [ ] Write assertions: at least two buildings with floors=5 and depth >4m, separate five storey rows and side facades; emitters placed on chimney tops; first-person far plane includes factory depth (use 200m). Day/night changes exterior window visibility without tinting interior brass. Same elapsed time/seed yields same smoke positions; pause leaves them still.

```js
test('courtyard contains deep five-storey blocks', () => {
  const {exterior} = JSON.parse(fs.readFileSync(assetPath('scene.json'), 'utf8'));
  assert.ok(exterior.buildings.length >= 2);
  for (const b of exterior.buildings) {
    assert.equal(b.floors, 5);
    assert.ok(b.bounds.max[2] - b.bounds.min[2] > 4);
  }
  assert.equal(exterior.farPlane, 200);
});
```

- [ ] Run `node --test test/apartment-v3-exterior.test.js test/apartment-v3-smoke.test.js`; expect absent geometry/controller failures.
- [ ] Replace miniature window reliefs and opaque fake glass with the shared courtyard. Put its ground 4.5m below apartment floor, building depth about 15–35m behind windows, factory 60–100m. Export real depth and materials separately; keep sky backdrop behind all geometry. Update Blender light-state rendering and runtime daylight treatment from the same `homeLight` result.
- [ ] Implement bounded low-poly or billboard smoke particles from a seeded analytic animation, no accumulating timers/meshes. In 2D render backdrop without depth write and use real wall/frame/building depth-only occluders to clip smoke; exclude front closure/ceiling from the cutaway mask. In first person use visible geometry depth. Do not bake smoke into backgrounds and do not draw exterior geometry twice. Dispose geometry/materials on scene disposal.
- [ ] Run targeted tests and actual rays through each window into the exterior. In browser compare two horizontal hero positions for parallax, inspect smoke against window frames and walls in both modes at dawn/noon/night. Capture a short in-game rotation/movement recording, not only still renders.
- [ ] Commit: `feat: add a volumetric courtyard and animated factory smoke`.

## Task 5 Проверенная сборка и установка

**Files:** Create `tools/install-apartment-v3.ps1`, `tools/validate-apartment-v3.mjs`, `test/apartment-v3-bundle.test.js`, `docs/superpowers/qa/2026-10-08-apartment-expansion.md`; Modify relevant module revision URLs in `index.html`/`src/apartment-app.js`/scene imports; install final generated resources/source and audit reports.

**Interfaces:** Consumes builder output arguments and `assetPath` from Task 2. `validateApartmentBundle(root): {ok:boolean,errors:string[],files:string[]}` in `tools/validate-apartment-v3.mjs` is also available as a CLI with exit 0 only for a valid bundle. Installer parameters `-Bundle <dir> -Project D:/Project/Battle -Backup <new-dir>` and standard `-WhatIf`; refuses any path outside D:/Codex/Builds for bundle/backup and outside the explicit project asset targets for writes. Validate manifest-relative paths stay within the bundle before reading/copying.

- [ ] Write tests that reject an absent/truncated GLB, missing referenced background, absent eat clip, unexpected source destination or mismatched manifest/action roots. Test installer validation in `-WhatIf` with invalid and valid fixture paths before any replacement; failure must leave installed hashes unchanged.

```js
test('incomplete bundle is rejected before installation', () => {
  const empty = fs.mkdtempSync('D:/Codex/Temp/battle-bundle-test-');
  const result = validateApartmentBundle(empty);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(error => error.includes('scene.json')));
});
```

Clean only the exact test-created temporary directory after the assertion; do not use a parent/glob cleanup target.
- [ ] Run `node --test test/apartment-v3-bundle.test.js`; expect missing validator/helper failures. Implement reference validation, scoped recoverable backup and rollback on copy failure; stop only the server process verified to serve this exact project, restart hidden and verify HTTP 200. Do not stop an unrelated listener. No broad cleanup/deletion commands.
- [ ] Generate the complete staged bundle at `D:/Codex/Builds/Battle/apartment-v12/assets` with editable sources under the adjacent `source` folder. Blender executable: `D:/Codex/Tools/Blender/blender-4.5.9-windows-x64/blender.exe`; run `--background --python tools/build-mannequin-v3.py -- --out ... --source-out ...`, then the apartment builder with the same arguments. Keep all dependency, GPU and temporary caches on D:.
- [ ] Set `APARTMENT_ASSETS_DIR` to the staged assets; run full `npm test` and geometry audit. All tests must pass before installing. Then install verified bundle, clear that test override, rerun `npm test`, and verify HTTP 200 for manifest and referenced files. Keep the exact previous bundle in the validated backup location.
- [ ] Complete the spec's browser matrix, record actual FPS and first-load time at 1280×720 compared with baseline, and inspect 640×900. Record unresolved limitations honestly; no visual acceptance claim if browser inspection is unavailable. Review code and asset diffs, then commit exact source/assets/QA files only: `test: verify and deliver the expanded apartment`.

## Handoff

After user review choose execution method. Recommended native execution: most tasks share the scene builder and export bundle, so sequential ownership avoids conflicting rebuilds; finish with independent whole-change review. Subagent-driven execution is also possible, with tasks sequential at asset boundaries. Do not start the later virtual computer implicitly while this plan is still being verified.
