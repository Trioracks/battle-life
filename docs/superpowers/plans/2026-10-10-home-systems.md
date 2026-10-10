# Home Systems Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Реализовать оставшиеся замечания к квартире, герою и виртуальному ПК, сохранив рабочую студию и старые проекты.

**Architecture:** Чистые модели состояния отделяются от небольших DOM-представлений и контроллеров квартиры. Миграции выполняются с резервированием и повторяемым восстановлением. Общие файлы меняются последовательно, каждый блок получает тесты, локальный коммит и независимое ревью.

**Tech Stack:** JavaScript ES modules, Three.js, Node test runner, существующий Playwright/Chromium на D:.

**Spec:** `docs/superpowers/specs/2026-10-10-home-studio-backlog.md`; для Task 1 также `docs/superpowers/specs/2026-10-10-home-needs-design.md`.

Пользователь 10.10.2026 прямо поручил выполнить весь записанный список и смотреть результат после реализации. Повторные согласования спецификаций и плана не запрашиваются. Работа идёт в существующей ветке `codex/home-studio-polish`; новая рабочая копия не нужна по ранее выраженному выбору пользователя.

**Status 10.10.2026:** Tasks 1–4 implemented and individually reviewed; Task 5 integration and required serial QA complete on revision 23. Final Node suite: 530/530. Results, exact ledger rulings and deferred limitations: [QA](../qa/2026-10-10-home-systems.md). Whole-branch independent review and integration decision follow the local Task 5 commit; no push or merge performed.

## Global Constraints

- Все создаваемые рабочие данные, кэши, артефакты и временные файлы находятся на D:; новые зависимости без необходимости не устанавливать.
- Исходные MP3 в `stems` и сохранённые проекты, звуки, деньги и бытовой прогресс сохраняются.
- Начальные навыки всех девяти направлений — 10, без классов и распределения очков. Практика после перехода продолжает развивать героя.
- Каждый фрукт восстанавливает 30 сытости, максимум 100. Запасы едины для сырого употребления и будущих рецептов.
- Пригодность к сырому употреблению и использование в рецепте — независимые свойства. Йогурт, рецепты, магазин еды и одежды, вокал и тексты не входят в этот патч.
- Скорость загрузки меняется, максимум 37 КБ/с. Прогресс считается по игровому времени, в том числе во сне. При выключенном ПК прогресс не идёт.
- Всё скачивание, torrent и установка происходят внутри симуляции. Реальные исполняемые файлы, торрент-сети и пиратские сайты не используются.
- Не переписывать историю Git. Коммиты локальные, push и публикация не нужны.
- Тесты пишутся до реализации; каждый блок проходит полный `node --test` перед отчётом. Браузерные тесты работают в изолированных контекстах без сохранения пользователя.

## Review Focus

1. Ошибка localStorage между записями миграции: исходный снимок и восстановление доступны, нет повторного сброса навыков или пополнения продуктов. Task 1/2 тестируют отказ записи и повторный запуск.
2. Клик по далёкому предмету или выход во время камеры: окно появляется только после подхода, ввод в окне не запускает движение. Task 1/2 тестируют фазу started и Escape.
3. Сон, скрытая вкладка и выключение: единый игровой интервал учитывается один раз, системное время не выдаёт скачанные байты. Task 3 сравнивает мелкие шаги с большим интервалом.
4. Заполненный диск, повторный torrent и мастер установки: байты не дублируются, установщик не объявляет успех без места, отмена не теряет архив. Task 3 проверяет эти переходы моделью и DOM.
5. Маленький экран и обновление кэша: бытовые окна доступны с клавиатуры, нет блокирующих невидимых слоёв, изменённые модули реально загружены. Task 5 проверяет браузер и версии импортов.

### Task 1: Реплики и расходуемые продукты

**Files:**
- Create: `src/home-food.js`, `src/home-needs-view.js`, `src/character-speech.js`, `test/home-food.test.js`, `test/home-needs-view.test.js`, `test/character-speech.test.js`, `tools/verify-home-needs.mjs`.
- Modify: `src/virtual-pc-state.js`, `src/apartment-app.js`, `src/apartment-v3-scene.js`, `src/sound-cues.js`, `apartment.css` or the existing apartment stylesheet discovered from index, corresponding tests.

**Interfaces:**
- `FOOD_CATALOG`: immutable apple/pear/banana items, `edibleRaw:true`, `ingredient:true`, `rawSatiety:30`.
- `normalizeHousehold(value) -> {fridge:{apple,pear,banana}}`; missing household gives one each, explicitly empty fridge gives zero each.
- `consumeFood(state, foodId) -> {ok,reason,state}`: immutable change to household and `music.needs.hunger`; raw prohibition, full, unknown and empty are safe no-ops. Check actual needs field names before coding and use the existing hunger/satiety representation.
- Existing `createVirtualPcState` retains household for every normalization; `loadVirtualPcState`/`saveVirtualPcState` reserve legacy raw JSON before overwrite and report failure. Preserve existing exports/return values; additive error metadata is allowed.
- `createCharacterSpeech` manages text position/hold, queue-after-room, dedupe, hidden time and beep budget without scene/DOM assumptions. View exposes one live announcement and head position from scene.
- `mountHomeNeedsView` exposes open/close/update/dispose and consume callback; no independent localStorage writes.

- [x] Write failing unit tests: consume at 50 => 80 and apple 0; at 85 => 100; at 100 unchanged; double eat unchanged; empty fridge survives save/load; missing field seeded once; invalid counts do not create food; backup failure never overwrites legacy JSON; hidden speech does not age or beep; latest speech replaces previous.
- [x] Run `node --test test/home-food.test.js test/home-needs-view.test.js test/character-speech.test.js` and capture expected RED.
- [x] Implement models and integrate popup only on started fridge action. Freeze interaction while dialog is open; remove prior automatic fridge-to-food shortcut so opening alone cannot restore hunger. Existing stove/dining remains. Blocked work queues exact food/sleep phrase until camera is back and actor visible. Immediate refusal repeats bubble without starting PC transition. 2D head anchor / first-person bottom caption, safe area, 2 second print + 3 second hold, max 10 beeps/s, no replay when resumed or audio denied.
- [x] Browser check distant approach, consume/count/reload, keyboard close/focus, PC off, starvation work exit, hidden-tab audio and 2D/3D anchor. Use isolated fixture/save and save screenshots to D:/Codex/Builds/Battle/home-systems-20261010.
- [x] Focused tests, full `node --test`, self-review, commit and detailed report with RED/GREEN and browser evidence.

### Task 2: Единый новичок и шкаф

**Files:**
- Create: `src/home-profile-migration.js`, `src/home-wardrobe.js`, `src/home-wardrobe-view.js`, `test/home-profile-migration.test.js`, `test/home-wardrobe.test.js`, `tools/verify-home-wardrobe.mjs`.
- Modify: `src/avatar-v3-profile.js`, `src/apartment-v3-creator.js`, `src/apartment-v3-creator-session.js`, `src/apartment-v3-new-game.js`, `src/apartment-app.js`, `src/apartment-v3-scene.js`, `index.html`, existing creator stylesheet, relevant creator/profile tests.

**Interfaces:**
- `createProfile({name,appearance})`: all STAT_KEYS 10, profile schema marker for novice migration and owned wardrobe; old allocation input cannot grant bonuses. Profile validation must preserve later legitimate skill changes and ownership.
- `migrateNoviceSave(storage) -> {ok,error?}` before game profile/PC load: journal/backups for both existing keys, target profile all nine 10, target PC music practice/genrePractice reset once. Completed marker on both targets; replay incomplete journal, never repeat after completion or confirmed new game. Preserve all unrelated snapshot fields, household from Task 1 included. Backup or journal failure prevents destructive overwrite.
- `createWardrobe(appearance)`, `canWear(profile, appearance)`, `wearAppearance(profile, appearance) -> {ok,reason,profile}`: own starting choices for hair/beard/mustache and exact outfit/color combinations; face remains immutable. Unknown/locked choices rejected in domain. Future catalog ownership can be added without UI-only enforcement.
- `mountHomeWardrobeView` supports preview/apply/cancel with callbacks, keyboard/focus and locked alternatives. Cancel restores actual outfit, apply saves profile.
- Runtime wardrobe scene group and hit action registered through a focused helper, at a verified free place in living room; visible in 2D and 3D. Existing exported assets need not be rebuilt merely to add interactive furniture, but the runtime/source ownership must be clear.

- [x] RED tests create without allocations => nine 10, ignored old allocation bonuses, practice progresses after one migration, repeated reload preserves new practice, failure after either key resumes same journal, new-game/cancel contracts remain.
- [x] RED tests only owned exact clothing/color can be applied, changed face rejected, cancel restores appearance, distant click waits for approach, locked options cannot trigger callback.
- [x] Implement one-time migration and simplify creator to name/appearance/clothing; remove allocation controls and validation, not the skill system. Update old tests whose required product behavior intentionally changed.
- [x] Add visible wardrobe, ordinary approach and window using existing motion and preview methods. Display unavailable alternatives clearly without creating a shop.
- [x] Browser fresh character + seeded old save, open wardrobe from distance, locked choices, cancel/apply/reload, 2D/3D view and narrow layout.
- [x] Focused tests, full `node --test`, self-review, commit and report.

### Task 3: Форум, загрузки, торрент и установщики

**Files:**
- Create focused `src/pc-software-catalog.js`, `src/pc-software.js`, `src/pc-software-view.js`, `test/pc-software.test.js`, `test/pc-software-ui.test.js`, `tools/verify-pc-software.mjs`.
- Modify: `src/virtual-pc-state.js`, `src/virtual-pc-runtime.js`, `src/virtual-pc-catalog.js`, `src/virtual-pc-ui.js`, `src/underweb-view.js`, `src/virtual-pc-explorer.js`, `src/virtual-pc-explorer-view.js` as required, `desktop-apps.css`, `virtual-pc.css`, relevant PC tests.

**Interfaces and explicit defaults:**
- Catalog: torrent client installer 2,000,000 bytes, installed client 8,000,000 bytes; FT torrent metadata 12,000 bytes; FT archive 800,000,000 bytes, installed FT 800,000,000 bytes. These are simulation defaults, not real product measurements. Disk remains 16,000 MB, system 14,000 MB.
- Normalize additive `software` state without losing household/music/projects. New save has no installed client, no task. Legacy FT downloading/ready preserves bytes and gets installed client; legacy installed FT remains installed but no fictional retained archive is added.
- Pure operations for direct client download, torrent metadata retrieval/open, pause/resume/cancel task, opening/cancelling/advancing/completing installer. Return `{ok,reason,state}`. Existing state/runtime exports remain compatible where possible; user-facing paths must use new gates.
- `advanceVirtualPc(state, clock)` integrates rates 24–37 decimal KB/s by deterministic periodic game-time segments. Subdivision invariant: same interval produces same bytes for sleep and many frames. Clock anchoring on load, off state and reverse timestamps prevents retroactive credit. `downloadPresentation` reports current actual rate, seeds/peers, progress, ETA; off/paused rate is zero.
- Forum routes `underweb://dump`, `underweb://dump/client`, `underweb://dump/ft-studio`; old software URL redirects/renders appropriate topic. Search/home points to «Файловая помойка», forum categories/list/topics, only client and FT downloadable here. Existing battles/market remain accessible; do not remove completed unrelated features.
- Torrent opens as an empty application with sidebar, toolbar, transfer table and details before tasks are added. Opening the downloaded metadata focuses/opens torrent and adds one queue item; missing client explains install prerequisite.
- Wizard: Welcome → destination C path → summary/space check → install → finish. Default paths `C:\Program Files\Field Tone\FT Studio` and `C:\Program Files\torent`; path editable within virtual C with safe normalization. Cancel retains archive and may restart wizard; installation commits bytes once at finish. Normalizer/persistence preserves incomplete wizard or safely restarts at welcome without claiming installed.
- Explorer lists Downloads artifacts and real installed application folder trees (FT: Data, Projects, Plugins, Presets; client executable/config). Download archives and installed sizes counted separately, no fake uninstall/delete needed.
- All byte-producing operations share the disk capacity: replace `createBeat`'s legacy 590-project shortcut with the actual disk budget (touch `src/beat-production.js` and covering tests as needed). New projects and incoming transfer bytes cannot overfill C while another download is active; retain partial downloads and expose a clear no-space reason.

- [x] RED model tests new desktop lacks torrent, missing client cannot open metadata, duplicate metadata no duplicate job/bytes, direct client/FT install chain, disk double accounting, insufficient free space, pause/off/no offline gain, fractional interval and full-sleep equivalence, old installed FT/projects survive.
- [x] RED DOM tests forum→direct download→client wizard→empty client→FT metadata→torrent focus→progress→FT wizard→desktop icon/explorer folders; cancel/back keyboard and narrow window.
- [x] Implement model/catalog/runtime first; keep transfer mathematics out of DOM. No hard-coded two-minute finish or real network.
- [x] Implement forum and classic torrent-like window; reuse XP window management. Speed/seeds/peers change deterministically with game time, ETA matches model. Master installation window owns focus, actions disabled until appropriate state, disk errors shown.
- [x] Browser full chain via game clock/sleep, shutdown pause, reload, old save, disk full, final FT open; isolated save only.
- [x] Focused tests, full suite, self-review, commit and report. Rev cache wiring follows Task 5.

### Task 4: Материалы выключателя

**Files:**
- Create: `src/apartment-switch-style.js` and focused tests if runtime replacement used.
- Modify: `src/apartment-v3-scene.js`, `tools/build-apartment-v3.py`, `test/apartment-v3-switches.test.js`, `tools/verify-home-switch.mjs`.

**Interfaces:**
- Apply a narrowly scoped switch style to the known `switch-living-*` and `switch-kitchen-*` meshes: aged cream backplate/rocker, muted brown-gray recess, no near-black broad outline. Runtime materials must supersede dark baked maps only for switches, with explicit disposal; unrelated environment untouched.
- Update source generator to matching values for later regeneration. Keep hit volumes, contact timing and rocker state animation unchanged.

- [x] RED test material application changes only switch meshes, retains transforms/hit behavior, repeated application does not leak owned materials, disposal preserves shared originals.
- [x] Implement style using existing geometry with small recess/rocker adjustments only where needed; no global brightening and no unrelated GLB re-export.
- [x] Browser screenshot daytime/nighttime, 2D and 3D, switch on/off. Verify new wardrobe from Task 2 does not occlude switches.
- [x] Focused geometry/light tests, full suite, self-review, commit and report.

### Task 5: Интеграция версии и итоговая проверка

**Files:** `index.html`, changed module import revision chains, `test/client-module-version.test.js`, browser verification scripts, `docs/superpowers/qa/2026-10-10-home-systems.md`, backlog status.

**Interfaces:** Runtime revision 23; only changed module chains/styles require invalidation. Preserve calendar and studio behavior from revision 22.

- [x] Add/adjust cache import test before bump, verify RED, update entry/style/module chain to rev=23, verify GREEN.
- [x] Run all Node tests serially, then new household/wardrobe/software/switch browser scripts and existing FT full scenario. Do not run heavy suites concurrently.
- [x] Inspect screenshots at 640/1280 and 2D/3D; verify no page errors, focus traps or loss of saves. Any regression gets a failing test and targeted fix.
- [x] Record truthful QA including limitations, update backlog statuses, commit. Whole-branch independent review follows before integration decision; do not silently push or merge.
