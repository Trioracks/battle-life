# FT Beginner Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Дать новичку полный цикл создания разнообразного бита из трёх этапов, с девятью визуальными дорожками, общим транспортом и озвученной работой персонажа.

**Architecture:** Подготовленный банк содержит три семейства по 15 совместимых четырёхтактовых лупов. Проект фиксирует выбранные идентификаторы; один аудиодвижок обслуживает транспорт, рабочую сцену и совместимое предпрослушивание. DOM и камера отображают состояние, но не принимают музыкальные решения и не начисляют практику.

**Tech Stack:** JavaScript ES modules, Web Audio API, HTML/CSS, node:test; существующий Playwright для браузерных проверок. Новые внешние зависимости не нужны.

**Spec:** `docs/superpowers/specs/2026-10-10-ft-beginner-production-design.md` — одобрена пользователем 10 октября 2026 года.

## Global Constraints

- Новичок: эффективный битмейкинг от 0 до 25 включительно; диапазон 26–39 временно использует тот же автоматический банк. Free от 40 сохраняется.
- Только название, без пользовательского выбора BPM, жанра и ползунков в новом автоматическом сценарии. Темп 90 BPM, 4/4, четыре такта, A minor.
- Ровно 15 ритмов, 15 тем и 15 аранжировочных партий; девять визуальных дорожек представляют три аудиослоя. Mute и solo отсутствуют.
- Новые ползунки не влияют ни на звук, ни на оценку. Старая завершённая работа и звучание v1/v2 не переписываются.
- Старые MP3 остаются неизменными. Новый post-punk-каталог сохранён в контрольной точке, но не подключается к этой задаче.
- Никаких новых числовых правил опыта: существующая практика начисляется один раз за этап. Запись, тексты, жанры, новые покупки и цены не входят в работу.
- Генерация и кэши — только на D:. Результаты проверок: `D:/Codex/Builds/Battle/ft-beginner-20261010`.
- Рабочая ветка `codex/ft-beginner-production`; исходная точка `7a79623`, тег `checkpoint/pre-ft-20261010`. В master идёт только проверенный итог; никаких push, reset --hard и удаления контрольной ветки.
- Встроенное сохранение браузера не является частью Git. Браузерные тесты используют изолированный профиль, не сохранение пользователя.

## Review Focus

1. Позднее декодирование после Stop, Pause, смены проекта или владельца звука не запускает отменённый звук — тесты задачи 3.
2. Рост навыка 25→26 и перезагрузка внутри этапа сохраняют режим, партии, остаток времени и однократную награду — задача 2.
3. Открытие файла проводником поверх формы и нажатие меню после обновления потребностей не откатывают живое состояние — задача 4.
4. Неизвестный идентификатор банка, отсутствующий WAV и заблокированный AudioContext оставляют проект доступным и не расходуют время повторно — задачи 2, 3, 5.
5. Скрытие вкладки во время отъезда, работы или возврата не оставляет звук, не завершает этап в фоне и не дублирует звук после возвращения — задачи 5, 6.

## Файлы и границы

Новые модули: `src/beat-beginner-bank.js` — метаданные; `tools/audio/beginner-patterns.mjs` — авторские рисунки и чистый синтез; `tools/build-beginner-bank.mjs` — WAV; `src/beat-playback.js` — описание слоёв проекта; `src/beat-work-view.js` — панель работы; `src/beat-work-audio.js` — связь фазы камеры и звука. Не переносить несвязанный код из больших существующих модулей.

Изменяются `src/beat-production.js`, `src/beat-audio.js`, `src/beat-studio-view.js`, `src/ft-studio-view.js`, `src/virtual-pc-ui.js`, `src/virtual-pc-state.js`, `src/apartment-app.js`, `desktop-apps.css` и соответствующие тесты. Существующие `src/main.js`, анимации и звуковые сигналы не переписываются.

Сначала выполняются задачи 1–3, затем 4–5 и сквозная задача 6. Каждая задача использует цикл красный тест → минимальная реализация → зелёные тесты → отдельный коммит. После каждого коммита проверять `git status --short`, не захватывая посторонние изменения.

---

### Task 1: Совместимый банк и воспроизводимый синтез

**Files:** Create `src/beat-beginner-bank.js`, `tools/audio/beginner-patterns.mjs`, `tools/build-beginner-bank.mjs`, `test/beat-beginner-bank.test.js`, `assets/audio/ft/beginner-v1/{drums,theme,arrangement}/{01..15}.wav`, `assets/audio/ft/beginner-v1/manifest.json`.

**Interfaces:** `BEGINNER_BANK` — 45 записей `{id,kind,bpm:90,bars:4,key:'A minor',path}`; виды `drums|theme|arrangement`, идентификаторы `beginner-<kind>-01..15`. `beginnerById(id) -> entry|undefined`; `chooseBeginnerParts(random=Math.random) -> {drumsId,themeId,arrangementId}`. В инструментальном модуле `renderBeginnerPart(kind,index,rate=44100) -> Float32Array`, индекс 0–14, детерминированный результат.

- [ ] Написать тесты `bank_has_fifteen_each`, `render_is_deterministic_distinct_and_bounded`, `random_selection_stays_in_family`: по 15 уникальных идентификаторов и хэшей PCM каждого вида; одинаковые входы дают одинаковый PCM; длина 470400 при 44100 Гц; нет NaN/Infinity; peak каждого слоя ≤0.28; выход не пустой. Граничные значения random 0 и 1 не выходят из массива.

```js
for (const kind of ['drums', 'theme', 'arrangement']) {
  assert.equal(BEGINNER_BANK.filter(part => part.kind === kind).length, 15);
  assert.equal(renderBeginnerPart(kind, 0, 44100).length, 470400);
  assert.deepEqual(renderBeginnerPart(kind, 0), renderBeginnerPart(kind, 0));
}
```

- [ ] Запустить `node --test test/beat-beginner-bank.test.js`; убедиться в ожидаемом падении из-за отсутствующей реализации.
- [ ] Реализовать метаданные и 15 различимых рисунков на семейство. Гармоническая опора всех четырёх тактов — Am: бас преимущественно A/E, мелодия Am-пентатоническая, проходящие ноты короткие. Ритмы включают простую басовую опору; третье семейство содержит редкие суб-акценты, переходы и фактурные детали. Огибающие и циклический хвост убирают щелчки, без случайного состояния при прослушивании.
- [ ] Реализовать генератор `node tools/build-beginner-bank.mjs`: писать только указанный каталог банка, WAV mono PCM16 44100 Гц и manifest с идентификаторами, длинами и SHA256. Не обходить и не переписывать stems. Повторный запуск даёт те же хэши. В тесте проверить заголовки и длину каждого созданного WAV после генерации.
- [ ] Выполнить генерацию и `node --test test/beat-beginner-bank.test.js`. Проверить минимум пять комбинаций прослушиванием; аудио не выдавать за прослушанное, если доступна только числовая проверка. Различия должны быть в рисунке и фактуре, не только в громкости.
- [ ] Закоммитить только файлы задачи: `feat: add authored beginner beat bank`.

### Task 2: Проекты v3 и автоматические этапы

**Files:** Modify `src/beat-production.js`, `src/virtual-pc-state.js`, `test/beat-production.test.js`, `test/virtual-pc-state.test.js`; Create `test/beat-v3-state.test.js`.

**Interfaces:** Сохранить `createBeat(input,options,skills={},random=Math.random) -> {state,ok,reason}` и `startBeatStage(input,id,values,skills={},random=Math.random)`; values теперь допускает undefined. Новые проекты v3 сохраняют прежние id/name/genre/bpm/drumId/stages/status и добавляют `productionMode:'beginner'|'automatic'`, `audio:{bankVersion:1,bars:4,themeId,arrangementId}`. drumId — единственный идентификатор ритма, без дублирующего поля. `normalizeBeat` принимает v2 и v3, возвращает новый нормализованный объект, не изменяя исходный.

- [ ] Написать тесты `v3_only_requires_name`, `skill_tier_is_pinned`, `choices_survive_roundtrip_and_resume`, `sliders_do_not_change_quality`, `legacy_job_keeps_sources_and_progress`, `bad_bank_metadata_retains_project`. Проверить навыки 0/24/25/26/39/40; свободный выбор из пяти MP3 начинается только с 40; запрещённый assetId не принимается. Сравнить качество при [0,0,0] и [10,10,10] при одном навыке. После перезагрузки и повторного startBeatStage значение elapsed и практика не сбрасываются.

```js
const created = createBeat(createVirtualPcState(), {id:'a', name:'Первый'}, {beatmaking:25}, () => 0);
assert.equal(created.ok, true);
assert.equal(created.state.projects[0].version, 3);
assert.equal(created.state.projects[0].productionMode, 'beginner');
assert.equal(created.state.projects[0].audio.bars, 4);
assert.deepEqual(createVirtualPcState(JSON.parse(JSON.stringify(created.state))).projects, created.state.projects);
```

- [ ] Запустить `node --test test/beat-v3-state.test.js test/beat-production.test.js test/virtual-pc-state.test.js`; зафиксировать ожидаемые падения новых требований, не маскировать существующие регрессии.
- [ ] Создавать v3: genre по умолчанию boombap — внутренний технический маркер, не выбор игрока; productionMode по навыку при создании. Выбрать три партии через задачу 1 один раз. Сохранить совместимость явно переданного принадлежащего игроку assetId; иначе при навыке ≥40 автоматически взять Free. Старые v2 не мигрировать на случайные новые партии.
- [ ] Для автоматического этапа без values один раз получить три скрытых целых значения 0–10 и сохранить в job. При продолжении использовать прежний job без RNG. Новые quality равны округлённому skill этапа, fit=0 как неиспользуемое совместимое поле; расход времени, потребностей и практика остаются прежними.
- [ ] Нормализовать версии явно. При повреждённых полях банка у структурно читаемого v3 сохранять имя, этапы и проект, пометив `audioIssue:'invalid-bank'`; запретить воспроизведение и дальнейшее завершение этапов такого проекта, не заменять партии случайными. Ошибка получения файла с валидным ID — только ошибка аудио, не данных проекта. Сохранять старые v1 через существующий путь.
  Проверить также повреждённый банк при уже сохранённом job: advanceBeatWork не тратит минуты и не начисляет практику; ошибка остаётся видимой после повторной нормализации.
- [ ] Запустить указанные тесты и `node --test`; все проверки должны пройти. Закоммитить файлы задачи: `feat: persist automatic beginner production projects`.

### Task 3: Транспорт и единое владение звуком

**Files:** Create `src/beat-playback.js`, `test/beat-playback.test.js`; Modify `src/beat-audio.js`, `test/beat-audio.test.js`.

**Interfaces:** `resolveBeatPlayback(beat,{workStage=null}={}) -> {ok,reason,descriptor}`. Descriptor: `{key,owner:'studio'|'work',durationSeconds,parts:[{id,loopSeconds}]}`; null workStage означает все завершённые слои, 0/1/2 — только соответствующий рабочий слой. `BeatAudio.playProject(beat,options) -> Promise<boolean>`, `pause()`, `stop({fadeSeconds=0}={})`, `getSnapshot() -> {status,key,owner,positionSeconds,durationSeconds,error}`. Статусы stopped/loading/playing/paused/error. Старые `play({drumId,stage})`, unlock и dispose остаются совместимыми для магазина и v2.

- [ ] Добавить тесты `pause_resume_keeps_offset`, `stop_rewinds`, `repeated_play_is_idempotent`, `all_layers_share_clock`, `short_drum_loops_inside_four_bars`, `stop_or_pause_cancels_late_decode`, `owner_switch_cancels_previous`, `missing_file_keeps_project`. Поддельный AudioContext фиксирует время старта, offset и вызовы stop; продвинуть currentTime и проверить общую позицию по модулю длины проекта.

```js
audio.pause();
const paused = audio.getSnapshot().positionSeconds;
assert.equal(audio.getSnapshot().status, 'paused');
ctx.currentTime += 10;
assert.equal(audio.getSnapshot().positionSeconds, paused);
audio.stop();
assert.equal(audio.getSnapshot().positionSeconds, 0);
```

- [ ] Запустить `node --test test/beat-playback.test.js test/beat-audio.test.js`; новые тесты сначала падают на отсутствующих методах.
- [ ] Реализовать descriptor только через известные каталоги. Для v3 длина 32/3 секунды, для v2 прежние 16/3; пользовательский MP3 обрезается существующей двухтактовой границей, не полной длительностью с padding. Рабочий слой определяется workStage, а не числом завершённых этапов.
- [ ] Реализовать транспорт с сохранённым offset и временем фактического старта. Каждый BufferSource получает общие часы и свой offset modulo loopSeconds. Pause во время загрузки отменяет запрос; повторный Play не создаёт дубликаты. Generation token проверяется после resume, fetch и decode, включая ошибки устаревших запросов. Кэш ограничен; один source не переживает смену владельца. Dispose окончателен.
- [ ] Плавное завершение рабочего слоя ограничить 0.08 секунды; новый владелец немедленно отменяет старые источники и таймеры. Ошибка не меняет проект и не включает источники частично загруженного микса. Проверить безопасный отказ неизвестным ID и после dispose.
- [ ] Запустить тесты задачи и `node --test`. Закоммитить: `feat: add synchronized FT playback transport`.

### Task 4: Стартовое меню и девять дорожек

**Files:** Modify `src/ft-studio-view.js`, `src/beat-studio-view.js`, `src/virtual-pc-ui.js`, `desktop-apps.css`, `test/beat-ui.test.js`, `test/desktop-rework.test.js`; Create `test/ft-beginner-ui.test.js`.

**Interfaces:** `createStudioWorkspace(document,options) -> HTMLElement` сохраняется. Экспорт `FT_TRACKS` содержит девять `{name,stage,color}`. `mountBeatStudio` сохраняет openProject/update/dispose и принимает необязательный initialProject; явное открытие файла обходит меню. Добавить стабильные data-ft-role для transport, playhead, library, rhythm, dialog, track-label и clip. UI читает аудио через getSnapshot, игровые изменения через свежий getState.

- [ ] Написать тесты `launch_shows_project_menu`, `new_beat_has_name_only`, `cancel_does_not_create`, `completed_stages_fill_three_lanes_each`, `transport_is_above_tracks`, `panels_toggle_independently`, `host_tick_preserves_input_and_focus`. Точные имена: Drum Kit, Bass, Percussion, Lead, Atmosphere, Harmony, Sound Design, Sub Bass, FX. После этапов 0/1/2/3 — 0/3/6/9 клипов. Нет range/select для нового автоматического бита и нет mute/solo.

```js
const workspace = createStudioWorkspace(pcDocument());
assert.deepEqual(allPc(workspace).filter(n => n.dataset.ftRole === 'track-label').map(n => n.textContent),
  ['Drum Kit','Bass','Percussion','Lead','Atmosphere','Harmony','Sound Design','Sub Bass','FX']);
assert.equal(allPc(workspace).find(n => n.dataset.ftRole === 'rhythm').hidden, true);
assert.ok(findButton(workspace, 'Play'));
```

- [ ] Добавить регрессии Review Focus: открыть проводником v1/v2/v3 поверх формы; изменить кошелёк и потребности через syncState перед нажатием «Открыть проект»; данные должны сохраниться. Стартовое меню при новом mount, но не при update после работы и не при восстановлении свёрнутого окна.
- [ ] Запустить `node --test test/ft-beginner-ui.test.js test/beat-ui.test.js test/desktop-rework.test.js` и получить ожидаемые красные новые проверки.
- [ ] Реализовать диалог с двумя действиями, именем и списком проектов; ограничить фокус диалогом, Escape возвращает в текущий сеанс. При запуске через проводник использовать одноразовый pendingStudioProject в контроллере, очищать после передачи, не путать с прошлым активным проектом. Не пересоздавать форму на каждом тике часов.
- [ ] Построить девять дорожек, три цвета, общий транспорт и readout. Сетка содержит 16 тактов: ширина клипа bars/16, начало нулевое; playhead вычисляется в координатах сетки без ширины подписей. Убрать margin-left:5%, старый боковой транспорт и тексты о ползунках/временном одиночном лупе. Состояния кнопок отражают loading, отсутствие результата и ошибку.
- [ ] Сделать библиотеку видимой, ритм-панель скрытой по умолчанию; переключатели aria-expanded не запускают звук. Один animation frame loop обновляет playhead, отменяется при dispose. Результат работы не играет автоматически. На кнопке начала работы вызвать unlock в пользовательском жесте до отъезда камеры, затем остановить результат и вызвать onWork.
- [ ] Запустить тесты задачи и `node --test`. Проверить браузером фокус, начало первого такта и отсутствие горизонтального обрезания транспорта при 640/1280 px. Закоммитить: `feat: add FT project menu and nine-lane workspace`.

### Task 5: Рабочий слой и панель прогресса

**Files:** Create `src/beat-work-view.js`, `src/beat-work-audio.js`, `test/beat-work-audio.test.js`, `test/beat-work-view.test.js`; Modify `src/apartment-app.js`, `desktop-apps.css`, `test/beat-work-scene.test.js`.

**Interfaces:** `createBeatWorkPanel(document,{onCancel,onEnableAudio}) -> {element,update(model),dispose()}`; model содержит beat/job/needs/skill/clockLabel/reward/audioError. `createBeatWorkAudio(audio) -> {sync({phase,hidden,beat,job}),enableAudio(),dispose()}`; key задачи равен beat.id + stage, phase берётся из существующего PcLifecycle.

- [ ] Написать тесты `working_plays_exact_stage_once`, `finish_cancel_and_hidden_stop_audio`, `late_decode_after_work_does_not_play`, `reveal_and_return_do_not_charge_work`, `audio_failure_does_not_block_progress`, `panel_shows_real_progress_and_reward_once`. Первый этап передаёт workStage=0, второй 1, третий 2; повторный кадр той же задачи не вызывает playProject повторно.

```js
const calls = [];
const controller = createBeatWorkAudio({playProject: async (beat, options) => {calls.push(options.workStage); return true;}, stop() {}});
const frame = {phase:'working', hidden:false, beat:{id:'a'}, job:{beatId:'a', stage:1}};
controller.sync(frame);
controller.sync(frame);
assert.deepEqual(calls, [1]);
```

- [ ] Запустить `node --test test/beat-work-audio.test.js test/beat-work-view.test.js test/beat-work-scene.test.js`; убедиться в красном состоянии новых проверок.
- [ ] Реализовать контроллер рабочего звука: запустить только при working и валидном job, остановить на выходе из фазы или скрытии вкладки, менять ключ только с реальной задачей. После скрытия вкладки звук сам не возвращается: доступна явная команда «Включить звук». Отказ аудио не меняет время и потребности. При новом пользовательском запуске этапа разрешение звука обновляется.
- [ ] Заменить создаваемую inline-панель на модуль: заголовок бита, этап 1/3, прогресс, время, компактные шкалы сытости и энергии, навык, отмена. Отметка практики появляется только при реальном finished и очищается при новом этапе. Ожидаемый опыт не показывается как полученный.
- [ ] Подключить sync до обновления рабочего времени и после finished/blocked, чтобы очистка job не теряла текущий звуковой ключ. Сохранить существующие checkpoint-таймеры и возврат в комнату при потребностях. Dispose и pagehide останавливают контроллер и панель без новых глобальных таймеров.
- [ ] Запустить тесты задачи и `node --test`. Проверить вручную в изолированном браузере: работа → голод → еда → продолжение, звук отдельного слоя → полный результат, перезагрузка внутри этапа. Закоммитить: `feat: add audible beat work and progress panel`.

### Task 6: Сквозная проверка и подготовка слияния

**Files:** Create `tools/verify-ft-beginner.mjs`, `docs/superpowers/qa/2026-10-10-ft-beginner-production.md`; Modify `tools/verify-beat-production.mjs`, `tools/verify-beat-review.mjs`, `index.html`, `test/client-module-version.test.js` и versioned import-строки затронутого клиентского графа.

**Interfaces:** `node tools/verify-ft-beginner.mjs` использует `PLAYWRIGHT_MODULE_PATH`, `PLAYWRIGHT_CHROMIUM_EXECUTABLE`, `FT_QA_DIR` и проверяет существующий localhost:4173. Артефакты и browser profile находятся только на D:. Сохранение теста устанавливается через addInitScript с одноразовым sessionStorage-маркером, чтобы pagehide старого приложения не перезаписал подготовленное состояние.

- [ ] Написать браузерные assertions для всей приёмки: чистый запуск/открытие файла, имя новичка, три стадии, 3/6/9 клипов, неизменные ID после reload, Pause/Play/Stop, первый такт, сворачивание панелей, точный рабочий слой, закрытие/скрытие во время decode, потребности и сохранение v2. Не проверять качество звука только скриншотами: записать фактические параметры источников и проверить реальное декодирование WAV в браузере.

```js
assert.equal(await page.locator('[data-ft-role="clip"]').count(), 9);
const startOffset = await page.locator('[data-ft-role="clip"]').first().evaluate(clip =>
  clip.getBoundingClientRect().left - clip.parentElement.getBoundingClientRect().left);
assert.ok(Math.abs(startOffset) <= 1);
```

- [ ] Прогнать сценарий до последних правок, записать конкретные остающиеся ошибки; исправлять их через регрессионные тесты владеющей задачи, не ослаблять assertions ради зелёного результата.
- [ ] Обновить revision 20→21 у актуальных entrypoint/CSS и связанных versioned imports, не переписывая чужую логику; обновить проверки версии и браузерные скрипты. Убедиться, что новый аудиокаталог загружается и после обновления уже открытой страницы.
- [ ] Выполнить `node --test`, `node tools/verify-ft-beginner.mjs`, `node tools/verify-beat-review.mjs`, `git diff --check`. Сравнить `git diff 7a79623 -- stems` — пусто. Проверить 640/1280 px, ошибки страницы и запросов, выборку миксов, отсутствие оставшихся источников. Описать реальные результаты и непройденные проверки без преувеличений.
- [ ] Закоммитить проверенные изменения задачи: `test: verify beginner FT production end to end`. Выполнить итоговое ревью всей разницы от master по выбранному пользователем методу; исправления — отдельными проверенными коммитами.
- [ ] После зелёных проверок и ревью, при чистой рабочей папке, выполнить разрешённое пользователем локальное слияние через `git switch master` и `git merge --no-ff codex/ft-beginner-production`. Повторить тесты на merge-коммите. Сохранить обе контрольные ссылки и feature-ветку; ничего не отправлять в origin. При любой блокирующей ошибке не сливать и сообщить конкретный оставшийся дефект.

## Проверка плана

Покрытие спецификации: меню и дорожки — задача 4; автоматическое создание, ползунки и совместимость — 2; 45 партий — 1; транспорт — 3; работа и потребности — 5; браузерная и итоговая проверка — 6. Направление будущего опыта сохранено без неподтверждённого ребаланса. Все пять Review Focus распределены по тестам. Сигнатуры каталогов, resolveBeatPlayback, транспорта и контроллера работы согласованы между задачами.

План требует просмотра пользователя и выбора исполнения перед изменениями продукта. Рекомендация — Native: задачи тесно связаны схемой проекта и жизненным циклом аудио; реализация одним агентом с итоговым независимым ревью уменьшает накладные расходы на передачу контекста.
