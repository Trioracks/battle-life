# PC Immersion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Связать питание ПК, экран в квартире и плавный вход в XP-подобную оболочку; исправить диск, звуки и указанные пересечения предметов.

**Architecture:** Один чистый контроллер управляет временными фазами, а сохранённое питание остаётся в модели ПК. Сцена и DOM показывают один снимок контроллера; динамическое стекло исключается из статического экспорта и накладывается на обновлённые тёмные 2D-фоны. Действующие окна, сохранения и игровое время сохраняются.

**Tech Stack:** Native ES modules, DOM/CSS, локальный Three.js, WebAudio, Blender/Python, Node node:test, установленный Playwright Chromium. Новые npm-зависимости не нужны.

**Spec:** `docs/superpowers/specs/2026-10-09-pc-immersion-design.md` — все разделы первого этапа; раздел «Очередь остальных принятых правок» сохраняет следующие самостоятельные части, но не реализуется этим планом.

**Status:** Пользователь утвердил native execution и работу на master с сохранением своих изменений. Реализация и браузерная приёмка первого этапа выполнены; независимое финальное ревью перед передачей. Ограничения исходных XP-аудиоклипов и прослушивания записаны в QA. Ledger содержит точные выполненные проверки; чек-лист ниже сохраняет первоначальный план.

## Global Constraints

- «Не меняем стиль квартиры, персонажа, темп игрового времени, длительность скачивания FT Studio, обои и оконные возможности XP. Не запускаем эмулятор настоящей ОС.»
- «Холодный запуск занимает около 11 секунд после посадки.» Точные стадии: 1,2 + 2,4 + 6 + 1,4 секунды; тёплый вход 2,4 секунды.
- Выключение: 2,5 + 0,5 + 2,4 секунды; `off` сохраняется при принятии выключения после защиты проекта.
- «C: — 16 000 МБ; Windows HP — 14 000 МБ; свободно в новой игре — 2000 МБ (2,0 ГБ).» FT Studio 800 МБ, проект 2 МБ, 1 ГБ = 1000 МБ.
- «Миграция сохраняет проекты, черновик, обои, установку и прогресс загрузки.» Storage key `battle-life-virtual-pc-v1` сохраняется.
- «Незакоммиченные изменения пользователя сохраняются; особенно `src/sound-cues.js` и его тесты. Временные файлы, рендеры, кэши и сборки размещаются на D:.»
- Декоративная FT Studio и Underweb остаются следующими частями. Не добавлять музыкальные кнопки/запись/создание бита и не копировать ресурсы FL Studio.
- Системные аудиофайлы только с проверенным происхождением и условиями использования. Отсутствие подходящего клипа фиксируется честно, не заменяется утверждением об оригинальном звуке XP.

## Review Focus

1. Старое сохранение с работающим ПК, незавершённой загрузкой и черновиком: ни принудительного холодного старта, ни потери данных — Task 1, 6.
2. Повторные команды, запоздавший Promise загрузки ассетов после новой игры и отмена диалога: ни второго перехода, ни позднего включения — Task 2, 6.
3. Вход из 3D: существующее событие `swap` переводит камеру в 2D; исходный ракурс должен вернуться только после вставания — Task 4, 6.
4. Потеря WebAudio/локального аудиофайла и закрытая вкладка: интерфейс остаётся управляемым, события не дублируются — Task 2, 5, 6.
5. Портретный viewport и обновление размера в середине наезда: экран заполняет область без щелей и сброса перехода — Task 4, 7.

## Рабочие файлы и порядок

Новые модули: `virtual-pc-transition.js` (чистые фазы), `virtual-pc-presentation.js` (содержимое загрузочного экрана), `apartment-v3-computer.js` (динамический CRT и камера), `virtual-pc-sounds.js` (системные звуки), `indoor-footsteps.js` (домашние шаги), `virtual-pc-disk-view.js` (общее представление ёмкости).

Порядок: 1 → 2 → 3 → 4 → 5 → 6 → 7. Точный интерфейс каждого нового модуля определён в соответствующей задаче. Не проводить несвязанный рефакторинг большого `virtual-pc-ui.js`.

До исполнения: прочитать spec и план полностью; проверить `git status`, текущее место исполнения по using-git-worktrees. Не сбрасывать и не переносить грязные файлы автоматически. Базовый `npm test` должен быть записан до первого изменения; исходные сбои, если появятся, отделить от новых. Коммиты только со списками файлов/собственными hunks, никогда `git add .`.

## Task 1: Ёмкость диска, шкала и удаление дублирующего ярлыка

**Files:** Create `src/virtual-pc-disk-view.js`, `test/virtual-pc-disk-view.test.js`; modify `src/virtual-pc-state.js`, `src/virtual-pc-catalog.js`, `src/virtual-pc-explorer.js`, `src/virtual-pc-explorer-view.js`, `src/virtual-pc-system-windows.js`, `src/virtual-pc-ui.js`, `virtual-pc.css`; tests `test/virtual-pc-state.test.js`, `test/virtual-pc-catalog.test.js`, `test/virtual-pc-explorer.test.js`, `test/virtual-pc-system-windows.test.js`.

**Interfaces:** Existing `diskUsage(state)` retains all fields and adds `systemMb: 14000`. Export `VIRTUAL_DISK_MB = 16000`, `SYSTEM_RESERVED_MB = 14000`. New `formatDiskGb(mb): string` returns Russian decimal, e.g. `16,0 ГБ`; `mountDiskUsage(root): {update(usage), dispose()}` owns a stable labelled meter and text nodes, not an Explorer entry.

Key test `new disk reserves 14 of 16 GB`: `assert.equal(diskUsage(createVirtualPcState()).freeMb, 2000); assert.equal(diskUsage(createVirtualPcState()).systemMb, 14000);`.

- [ ] Add failing tests: `diskUsage(createVirtualPcState())` yields capacity 16000, used 14000, free 2000, system 14000; installed FT Studio gives used 14800/free 1200; installation never doubles its 800 MB; existing project overwrite does not add 2 MB; old on/downloading/draft snapshot survives normalization unchanged except derived disk totals. Oversized imported project lists remain intact with free clamped to zero.
- [ ] Add failing DOM/catalog tests: desktop and Start have no `documents` shortcut; `C:\Мои документы\Мои проекты` still resolves; repeated `update()` retains the same meter, file entry, selection and focus. Assert `formatDiskGb(16000) === '16,0 ГБ'`, meter max 16000 and value 14000.
- [ ] Run `node --test test/virtual-pc-state.test.js test/virtual-pc-catalog.test.js test/virtual-pc-explorer.test.js test/virtual-pc-disk-view.test.js test/virtual-pc-system-windows.test.js`; expect assertion failures, not unrelated setup errors.
- [ ] Implement reserve arithmetic, shared disk presentation in Explorer and disk properties, remove only desktop/Start shortcut and obsolete saved icon placement. Retain folder navigation, damaged-project handling and v1 storage. Meter updates must not affect Explorer listing signature.
- [ ] Repeat focused command and `node --test test/virtual-pc-runtime.test.js test/virtual-pc-recovery.test.js`; expect all pass. Commit only Task 1 changes as `feat: show system-reserved 16 GB virtual disk`.

## Task 2: Один контроллер фаз питания и перехода

**Files:** Create `src/virtual-pc-transition.js`, `test/virtual-pc-transition.test.js`.

**Interfaces:** Export `PcTransition` with `enter({alreadyOn}): boolean`, `leave(): boolean`, `shutdown(): boolean`, `tick(dtSeconds): void`, `cancel(): void`, `drainEvents(): Array<{type}>`, getter `snapshot`. Snapshot fields: `phase`, `progress` (0..1), `zoom` (0..1), `overlay` (0..1), `locked`, `coldStart`. Phases: `room`, `power-on`, `zoom-in`, `loading`, `welcome`, `desktop`, `shutdown`, `fade-out`, `zoom-out`. Events: `power-on`, `power-off`, `bios`, `startup`, `shutdown`, `desktop-ready`, `room-ready`. Persistent power is not held here.

Key test `warm entry never reboots`: `const c = new PcTransition(); c.enter({alreadyOn:true}); c.tick(2.4); assert.equal(c.snapshot.phase, 'desktop'); assert.deepEqual(c.drainEvents().map(e => e.type), ['desktop-ready']);`.

- [ ] Add failing tests: room → power-on at `enter({alreadyOn:false})`, then ticks 1.2/2.4/6/1.4 reach zoom-in/loading/welcome/desktop exactly; BIOS once at enter and startup once at welcome. Warm enter skips power and boot events, reaches desktop after 2.4. Desktop leave reaches room after 2.4; shutdown emits power-off immediately and reaches room after 2.5/0.5/2.4.
- [ ] Test duplicate enter/leave/shutdown returns false while locked; negative/NaN dt makes no change; large dt crosses all required boundaries once; cancel clears phases and queued events, and later tick cannot resurrect them. Snapshot mutation must not mutate the controller.
- [ ] Run `node --test test/virtual-pc-transition.test.js`; expect missing-module/failing assertions for this new API.
- [ ] Implement pure elapsed-time transitions with overshoot carried across boundaries, no browser timers. `locked` excludes room/desktop; zoom is continuous and monotonic along entry/exit. Overlay blends over last 0.15 s of entry zoom and first 0.15 s of exit. `cancel()` does not issue a persistent power command.
- [ ] Run focused tests; expect pass. Commit `feat: add deterministic PC lifecycle transitions`.

## Task 3: Исправленная геометрия и экспорт динамического экрана

**Files:** Modify `tools/build-apartment-v3.py`, `tools/apartment_v3_roles.py`, `tools/audit-apartment-v3.py`, `tools/validate-apartment-v3.mjs`; tests `test/apartment-v3-export-ownership.test.js`, `test/apartment-v3-geometry-audit.test.js`, `test/apartment-v3-bundle.test.js`; create `test/apartment-v3-computer-assets.test.js`. Generated outputs initially only in staged bundle, not production.

**Interfaces:** Manifest adds `computer: {screen:'crt-glass', indicator:'crt-power-led'}`; both uniquely named live mesh nodes are in `interaction.glb`, use `apartment_role='computer-live'`, and are excluded from `static.glb`. Mesh local +Z is screen outward normal and local +Y is screen up; world dimensions come from transformed bounds. This contract is consumed by Task 4, without hard-coded room coordinates.

Key test `manifest declares both live CRT surfaces`: `assert.deepEqual(manifest.computer, {screen:'crt-glass', indicator:'crt-power-led'});`, where `manifest` is parsed from `assetPath('scene.json')` using the existing asset helper. Extend the current Python ownership test fixture with role `computer-live` and assert its result is false even after renaming the object.

- [ ] Add failing tests for dynamic ownership (including renamed object with role), exactly one screen/LED in interaction and zero in static, finite nonzero screen bounds, new manifest references. Audit fixtures must fail on microphone/window-sill overlap, unsupported mouse, pot through cooker top and hood/cabinet intersection, then pass corrected fixtures.
- [ ] Run `node --test test/apartment-v3-export-ownership.test.js test/apartment-v3-geometry-audit.test.js test/apartment-v3-computer-assets.test.js test/apartment-v3-bundle.test.js`; record expected new failures.
- [ ] Build CRT with four bezel rails and inner recess, glass 8–15 mm behind front lip, no solid bezel slab obscuring it. Shift keyboard assembly and mouse/cable 0.10 m right, constrain support to desktop. Move microphone toward front of desk until every part clears sill by at least 0.02 m. Fit pot base to cooker top within 0.003 m; separate hood/trunk from cabinet by at least 0.015 m. Extend named audit semantics for these objects, not indiscriminate AABB collision errors for intentional assemblies.
- [ ] Export screen/LED as live, skip material darkening applied to ordinary live furniture in renderer later. Bake glass dark and LED off in all 2D light states. Remove baked screen-text strips. Add manifest validation and preserve exterior, occluders, rig and existing lamp export ownership.
- [ ] Stage a complete bundle under fresh `D:/Codex/Builds/Battle/pc-immersion-<run-id>/assets` plus adjacent `source`. Seed it by copying existing assets and editable sources (including mannequin) before apartment rebuild; never regenerate avatar unnecessarily. Use `D:/Codex/Tools/Blender/blender-4.5.9-windows-x64/blender.exe --background --python tools/build-apartment-v3.py -- --out <assets> --source-out <source>`. Set TEMP/TMP, XDG_CACHE_HOME, CUDA_CACHE_PATH, OPTIX_CACHE_PATH under D:. No download needed; binary was found during planning.
- [ ] With `APARTMENT_ASSETS_DIR=<assets>`, rerun focused tests and `node tools/validate-apartment-v3.mjs <assets>`; expect zero errors, correct new meshes, all eight day/night-light backgrounds. Save inspection renders on D:. Do not install until Task 7 validates integration. Commit source/test changes only as `fix: recess CRT and correct apartment prop intersections`.

## Task 4: CRT presentation and camera push-in

**Files:** Create `src/apartment-v3-computer.js`, `src/virtual-pc-presentation.js`, `test/apartment-v3-computer.test.js`, `test/virtual-pc-presentation.test.js`; modify `src/apartment-v3-scene.js`, `src/apartment-v3-camera.js`; tests `test/apartment-v3-camera.test.js`.

**Interfaces:** `pcPresentation(snapshot, power, playerName): {screen, title, subtitle, progress, brightness}` is shared by DOM and Canvas; `screen` is `off|bios|loading|welcome|desktop|shutdown`. `createComputerView({THREE,screen,indicator,viewport}): {begin(sourceCamera),update(snapshot,presentation),resize(width,height),end(),dispose(),camera}` owns cloned screen materials/CanvasTexture and camera. Scene exports `prepareComputerView(): Promise<void>`, `beginComputerView(): void`, `setComputerPresentation(snapshot,pcState,playerName): void`, `endComputerView(): void`; prepare uses cached static geometry without changing `modes.mode`.

Key test `shutdown presentation outlives persisted power`: `const c = new PcTransition(); c.enter({alreadyOn:true}); c.tick(2.4); c.shutdown(); assert.equal(pcPresentation(c.snapshot, 'off', 'Игрок').screen, 'shutdown'); assert.equal(pcPresentation(c.snapshot, 'off', 'Игрок').brightness, 1);`.

- [ ] Add failing presentation assertions: room+off means zero brightness; room+on means desktop; shutdown remains luminous despite already persisted off; fade-out linearly dims to zero; BIOS/loading/welcome use exactly the controller phase. Labels include `Windows HP`, `Добро пожаловать`, `Завершение работы`.
- [ ] Add failing camera tests for both source camera types, endpoint screen fill at 1280×720 and 640×900, finite matrices, no penetration behind glass, monotonic zoom, resize at zoom 0.5 preserving phase and final coverage. Assert original cameras/mode/yaw/pitch are not mutated; `end()/dispose()` release owned resources only.
- [ ] Run `node --test test/apartment-v3-computer.test.js test/virtual-pc-presentation.test.js test/apartment-v3-camera.test.js`; expect new failures.
- [ ] Implement source framing → glass-normal endpoint interpolation with smoothstep easing. Derive distance from screen dimensions, viewport aspect and FOV: use the smaller width/height fit distance with 6% overscan, so portrait and landscape fill without borders. Start from a perspective equivalent of the current orthographic framing, blend baked room to prepared live geometry at entry start, reverse at exit end; do not scale the backdrop as the zoom.
- [ ] Integrate scene rendering override and dynamic meshes in both modes, preserving normal occlusion, light-state behaviour and material brightness; darken ordinary furniture only, not emissive CRT. Draw simple desktop texture outside PC, not a DOM screenshot. Failed prepare is retryable and leaves normal camera intact. Background/texture geometry loads cannot install stale results after disposal.
- [ ] Run focused tests and render sample transition frames with staged assets; inspect start/mid/end, avatar/head clipping, frame edges and day/night match. Commit `feat: render dynamic CRT and monitor camera transition`.

## Task 5: Системные звуки, клики и домашние шаги

**Files:** Create `src/virtual-pc-sounds.js`, `src/indoor-footsteps.js`, `test/virtual-pc-sounds.test.js`, `test/indoor-footsteps.test.js`, `assets/audio/pc/manifest.json`; add licensed audio and `assets/audio/pc/README.md` only when provenance permits. Do not alter user-owned `src/sound-cues.js` unnecessarily; host footstep dispatch changes in Task 6.

**Interfaces:** Export class `PcSounds` with constructor `({AudioContext,fetch,clips})` and methods `unlock(): Promise<void>`, `play(cue): Promise<{ok,reason}>`, `stop()`, `dispose()`; cue accepts `bios|startup|shutdown|click`. `playIndoorFootstep(context,variantIndex): {stop()}` produces a quiet filtered-noise sole impact and low thump, with four fixed envelopes for reproducible tests. No change to `FtStudioAudio` music API.

Key test `unavailable audio does not throw`: `const sound = new PcSounds({AudioContext:null, fetch:null, clips:{}}); assert.deepEqual(await sound.play('bios'), {ok:false, reason:'audio-unavailable'}); sound.dispose();`.

- [ ] Add failing audio tests: one cue creates one playback group; four short BIOS pulses; disabled/unavailable AudioContext returns failure without throwing; missing clip returns `missing-clip`; pending resume/decode cannot play after stop/dispose; nodes disconnect after ended. Step variants differ, remain bounded in duration/gain, and are not the existing sine tick.
- [ ] Run `node --test test/virtual-pc-sounds.test.js test/indoor-footsteps.test.js`; expect failures for new modules.
- [ ] Implement separate system audio bus and procedural click/BIOS/indoor steps. Use low gain and short tails; startup/shutdown are clip slots, not synthesized claims of original XP. Verify source and permission before adding files; manifest records path, provenance and status, with null path and `unavailable` if not cleared. Do not fetch installers or ship unverified audio.
- [ ] Listen to available clips/clicks/steps in a real browser, including repeated walking; adjust excessive sharpness or repetition. Missing original XP clips stay a clearly reported unfulfilled asset requirement, while all other work continues. Run focused tests plus `node --test test/sound-cues.test.js test/ft-studio-audio.test.js`; expect pass. Commit `feat: add PC sound bus and indoor footstep variations`.

## Task 6: Lifecycle integration, DOM screens and safe return

**Files:** Modify `src/apartment-app.js`, `src/virtual-pc-ui.js`, `src/apartment-v3-new-game.js`, `virtual-pc.css`, `apartment-v3.css`, `index.html`; add `test/virtual-pc-lifecycle.test.js`; update `test/virtual-pc-ui.test.js`, `test/virtual-pc-xp-entry.test.js`, `test/virtual-pc-integration.test.js`, `test/virtual-pc-recovery.test.js`, `test/apartment-new-game.test.js`.

**Interfaces:** PC UI adds `presentTransition(snapshot): void` and `completeShutdown(): void`; old internal `bootTimer/BOOT_STAGES` cease driving lifecycle. Existing guarded `onLeave/onShutdown` callbacks request the host controller rather than immediately hide the PC. Host consumes Tasks 2/4/5; controller is ticked once per visible frame with dt in seconds, not game minutes.

Key test `presentation cannot persist or clear a draft`: use the existing mounted-PC fixture, capture `before = structuredClone(pc.state)`, call `pc.presentTransition(new PcTransition().snapshot)`, then `assert.deepEqual(pc.state, before)`. Drive accepted lifecycle callbacks separately; only host power events may change persistent power.

- [ ] Add failing lifecycle tests: cold and warm route timings, shutdown off saved only after confirmation/dirty guard, denied save does not leave, orphan draft preserved, cancellation restores focus, no rebuilt app DOM on warm return. Old on/download/draft save bypasses cold boot and downloads advance once, not twice per frame.
- [ ] Add failing race tests: new game during `prepareComputerView()` invalidates late resolution; click while seating/booting ignored; after return, cached 3D mode/yaw/pitch restores only when character is standing. Hidden document/paused frame does not advance transitions; blocked audio never prevents desktop. Shutdown after persisting off still displays luminous shutdown until fade.
- [ ] Run `node --test test/virtual-pc-lifecycle.test.js test/virtual-pc-xp-entry.test.js test/virtual-pc-integration.test.js test/virtual-pc-recovery.test.js test/apartment-new-game.test.js`; record intended failures.
- [ ] At accepted computer action capture `{mode,yaw,pitch}` before existing `swap` forces 2D, unlock audio and prefetch geometry. At seated `started` wait for ready geometry, then enter; hold the seated action for all active PC phases. On prepare failure keep room visible, display retry message and release seated state safely. Guard all awaits with session generation.
- [ ] Drive Canvas and DOM from one snapshot and persist `power-on/power-off` events once. Preserve desktop DOM behind a separate transition layer; block pointer/keyboard interaction while locked. At `desktop-ready` expose/focus shell; at `room-ready` remove camera override and call existing `motion.leaveAction()` once. Restore cached 3D orientation on the first opaque `return-in` frame after `settleReturn()`, before fade-in; normal walking control then resumes.
- [ ] Use `PcSounds` events for BIOS/startup/shutdown; stop music on guarded leave/shutdown, not before cancellation. Delegate one click handler on PC root for enabled actionable buttons/menuitems only, excluding decorations/disabled elements. Route apartment walking cues through `playIndoorFootstep` at existing stride contacts, retaining other cues and chair scrape.
- [ ] New game/reset/dispose cancels controller, view override, pending prepares and audio; no persistent power writes from stale callbacks. Keep existing acceleration/game-time rules and storage warning behaviour. Update only relevant module/CSS/asset revision URLs to rev18, including scene texture/GLB fetches so old cached geometry cannot mix with new backgrounds.
- [ ] Run all focused tests and `npm test`; expect zero new failures. Commit own hunks/files as `feat: connect PC lifecycle to room and XP presentation`.

## Task 7: Install verified bundle and browser acceptance

**Files:** Extend `tools/verify-virtual-pc-browser.mjs`; create `docs/superpowers/qa/2026-10-09-pc-immersion.md`; update `docs/PROJECT_HANDOFF_2026-10-08.md`. Install validated staged files under `assets/apartment/v3` and corresponding editable source only through existing installer, preserving a backup.

**Interfaces:** Existing `APARTMENT_ASSETS_DIR`, `PC_QA_URL`, `PC_QA_OUTPUT`, `PLAYWRIGHT_MODULE_PATH`, `PLAYWRIGHT_CHROMIUM_EXECUTABLE` remain supported. QA contexts must be isolated from the player's browser storage. Add `#virtual-pc[data-pc-transition]` as an observable phase marker, not a bypass that can drive gameplay.

Key browser test `shutdown and reload stay off`: after clicking the final guarded confirmation, wait for `data-pc-transition=shutdown`, then `assert.equal((await state()).power, 'off')`; reload the isolated context, continue and verify the monitor-off frame before approaching the PC again. Keep the existing `assert.deepEqual(errors, [])` page-error gate.

- [ ] Extend browser acceptance before verification: capture the entire cold/warm/leave/shutdown routes and phase boundaries at both sizes; test disk data/meter, missing documents shortcut with preserved folder, cancellation and reload mid-shutdown. Include 3D entry/return, viewport resize mid-zoom, asset/audio failure and repeated input. Accumulate zero `pageerror`s and assert no asset 404s.
- [ ] Verify staged bundle via `APARTMENT_ASSETS_DIR=<staged assets>; npm test` and `node tools/validate-apartment-v3.mjs <staged assets>`. Inspect exported screen uniqueness and geometry audit. Do not install on failure.
- [ ] Run `powershell -File tools/install-apartment-v3.ps1 -Bundle <staged assets> -Project D:/Project/Battle -Backup D:/Codex/Builds/Battle/pc-immersion-backup-<run-id>` with exact fresh paths. Installer validates ownership, backups, server process and manifest-last copy. Do not bypass link/path safety checks. No deletion of backup or unrelated sources.
- [ ] Clear `APARTMENT_ASSETS_DIR`, run `npm test` and verify HTTP 200 for manifest/referenced assets at 127.0.0.1:4173. For browser checks set `PLAYWRIGHT_MODULE_PATH=D:/Codex/Caches/npm/_npx/48b1ca104c3549f4/node_modules/playwright-core`, `PLAYWRIGHT_CHROMIUM_EXECUTABLE=D:/Codex/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-win64/chrome-headless-shell.exe`, `PC_QA_URL=http://127.0.0.1:4173/?rev=18`, `PC_QA_OUTPUT=D:/Codex/Builds/Battle/pc-immersion-qa-<run-id>`; TEMP/TMP use a fresh D: scratch directory. Run `node tools/verify-virtual-pc-browser.mjs`; expect all assertions and zero page errors, without installing browsers.
- [ ] Inspect actual screenshots/transition recording and listen to audio. Document screen-off checks for both views and all light states, corrected props, resource backup location, command outcomes and any missing licensed XP clip. Do not call the complete spec fulfilled if an audio requirement remains blocked. Existing unit success alone does not prove visual quality.
- [ ] Final independent review uses chosen execution workflow; fix findings and rerun affected checks. Commit only verified code/assets/docs, then open `http://127.0.0.1:4173/?rev=18` for the user. Underweb and the original visual-only FT Studio remain explicitly next in the approved request; do not report them implemented by this plan.

## Самопроверка плана

- Покрытие: диск/ярлыки — 1; точные фазы — 2; геометрия/экспорт — 3; экран и камера — 4; звук — 5; питание/защита сохранений/возврат — 6; размер окна/реальный браузер/миграция/визуальная приёмка — 7.
- Все пять Review Focus закреплены тестами в задачах-владельцах; API фаз/событий едины между 2, 4 и 6.
- Нет новых музыкальных механик, внешних заявок, неявной установки зависимостей или сброса существующей игры.
- Аудиопроисхождение — отдельный проверяемый критерий, не обещание наличия файла. Проблема с ним не блокирует независимые исправления и не скрывается в итоговом отчёте.
- Следующие планы: Underweb/каталог/заявка и самостоятельная визуальная FT Studio, без записи трека. Они не потеряны и не подменяются этим этапом.
