# В кругу и исправления рабочего стола Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Метод из утверждённой спецификации: последовательная реализация основным исполнителем в текущем чате и одна итоговая независимая проверка.

**Goal:** Вернуть читаемые действия браузера и довести существующий путь от работы за ПК до личных сообщений и надёжной сдачи трека, сохранив персонажа, проекты и записанное звучание.

**Architecture:** Изменения разделены на проверяемые части, но используют общий существующий профиль и состояние виртуального ПК. Чистые функции отвечают за миграцию, даты, диалоги, байты загрузки и прогресс набора; рендереры отвечают только за представление. Владение музыкой переносится на уровень приложения, пространственный выход добавляется после DSP, а камеры не управляют производством и XP.

**Tech Stack:** JavaScript ES modules, Node `node:test`, Three.js из существующего vendor, Web Audio, Blender 4.5, JSON, CSS, локальный Playwright с установленным Edge. Новые зависимости не требуются.

**Spec:** `docs/superpowers/specs/2026-10-12-v-krugu-browser-camera-design.md`, утверждена пользователем 12.10.2026. База плана `de7e7f5` в `codex/sloboda-workflow-design`.

## Global Constraints

- Имя **«В кругу»** хранится в одном источнике; собственный знак, без логотипа ВКонтакте.
- Миграция `flipflops → ankleboots`, `sandals → highcanvas` применяется к внешности и гардеробу **до** строгой валидации.
- Имя, навыки, проекты, инвентарь, даты, XP и старые TrackVersion не меняются от косметической миграции.
- 2D: персонаж примерно на 25–30% крупнее текущего; та же сцена. Пролёт к монитору — 0,8 секунды; BIOS и загрузку ОС не сокращать.
- Камера бита/вокала: расстояние около 1,1–1,4 м; текст: мягкий наклон до 4°. Общий прогресс цепочки, без сброса на каждом этапе.
- Виртуальный MP3: 192 кбит/с, отдача 10 000 байт/с. Одна исходящая загрузка, активное реальное время; набор 5–7 секунд.
- Срок проверяется при фактической отправке. Ответ администратора — по прежним правилам через 1–30 игровых минут.
- Эпоха календаря: 01.09.2012. Формулировка: «Приём заявок и треков до ДД.ММ.ГГГГ ЧЧ:ММ».
- Расширения сохранений аддитивные, миграции идемпотентные, резервная копия до преобразования. Ошибка записи не является успехом.
- Артефакты, временные картинки, рендеры и кэши — только D:. Никаких внешних публикаций, загрузок записей или изменений пользовательского браузерного сохранения при QA.
- Пользовательские `README.md`, `BACKLOG.md`, `BACKLOG_V1.md`, `docs/backlog/`, `stems/` не включать в коммиты исполнителя.
- Десять новых MP3 уже находятся в `stems/janres/non/drums/90bpm/user-2026-10-12/`. Их подключение к генератору — отдельное дополнение: предложенные доля 1/3 и порог <50 ещё не утверждены. Этот план не переобрабатывает и не регистрирует их.
- Не добавлять экономику займов, свободный чат, квестовый движок, новые жанровые DSP или следующие раунды турнира. Другие сообщества не развивать.

## Review Focus

1. Старое сохранение содержит открытые туфли только в гардеробе, не на герое, и хранилище переполнено: сохранить исходные данные, показать ошибку, не сбросить героя. Тесты задачи 2.
2. Музыка ещё загружается, а владелец закрыт или заменён: поздний Promise не должен запустить старый трек; закрытие другой программы не останавливает текущую. Задачи 4–5.
3. Перезагрузка, сон через срок и блокировка происходят между двумя личными сообщениями: ни повторных событий, ни обхода блокировки, ни ложного прочтения через телефон. Задачи 9–10.
4. Во время загрузки/набора изменён исходный проект, истёк срок или отказало сохранение: использовать зафиксированную версию, не расходовать попытку, не сообщать об успехе. Задачи 12–13.
5. Широкий или узкий экран, сон, открытый гардероб и отказ рендера портрета: камера/поза/прогресс остаются прежними, нет обрезанного действия или пустой страницы. Задачи 3, 6, 8 и 14.

## Среда исполнения и общие правила проверки

После утверждения этого плана применить `using-git-worktrees`: проверить существующие attachments/worktrees, при отсутствии подходящего создать из **текущего коммита**, не из удалённой default branch. Использовать D:; не переносить пользовательские незакоммиченные файлы. На старте зафиксировать `git status --short` и хеши защищённых файлов.

Для каждого шага тестирования ниже: сначала добавить описанный тест, запустить и увидеть **содержательную** ошибку на старом поведении; затем минимальная реализация; затем зелёный целевой запуск. Ошибка отсутствующего пакета или неверного пути не считается воспроизведением бага. Имена новых функций ниже — контракты этого плана, не утверждение, что они уже существуют.

Node-команды выполняются из корня рабочего checkout. Перед браузерным QA задать:

```powershell
$env:npm_config_cache='D:\Codex\Caches\npm'
$env:PLAYWRIGHT_BROWSERS_PATH='D:\Codex\Caches\playwright'
$env:PLAYWRIGHT_MODULE_PATH='C:\Users\zubko\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\playwright'
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE='C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$env:FT_QA_DIR='D:\Project\Battle\artifacts\v-krugu-qa'
$env:TEMP=$env:TMP='D:\Project\Battle\artifacts\v-krugu-qa\browser-temp'
$env:BATTLE_QA_URL='http://127.0.0.1:4175'
```

Создать только нужные каталоги. Для 4175 использовать локальный статический сервер из рабочего checkout (например установленный Python `-m http.server 4175 --bind 127.0.0.1 --directory <checkout>`); перед запуском проверить порт, не останавливать пользовательский 4173. Фоновый запуск PowerShell — `-WindowStyle Hidden`. Ни один QA-сценарий не подключается к пользовательскому профилю Edge/localStorage.

Коммит каждой задачи включает только перечисленные изменённые исходники, тесты и предназначенные для игры assets. Перед коммитом `git diff --check`; не использовать `git add .`. Полная проверка `npm test` обязательна на старте и перед интеграцией; новые проверки не подменяют её.

## Карта модулей и порядок

Существующие крупные `apartment-app.js` и `virtual-pc-ui.js` получают только вызовы новых контроллеров; не переносить в них алгоритмы камеры, загрузки или личных сообщений.

| Части | Владение |
|---|---|
| 1 | CSS браузера и native-проверка реального рабочего стола |
| 2–3 | Геометрия/миграция обуви и камера головы/2D |
| 4–5 | Сеанс проигрывания приложения и выход звука в комнату |
| 6 | Постановочная камера работы |
| 7–8 | Название/архив сети и портреты/альбомы |
| 9–10 | Личные диалоги, события, блокировка и UI |
| 11 | Общая регистрация, календарь и сроки |
| 12–13 | Фоновая загрузка и атомарная отправка после набора |
| 14 | Сквозная приёмка, независимый review, локальная интеграция |

---

### Task 1: Восстановить кнопки всех сайтов

**Files:** Modify `desktop-apps.css`, `virtual-pc.css`; Create `tools/verify-v-krugu-browser.mjs`; Modify `tools/verify-social-shell.mjs`.

**Interfaces:** Native-сценарий монтирует `mountVirtualPc` в `#virtual-pc` с настоящими CSS; принимает `BATTLE_QA_URL`/`FT_QA_DIR` и возвращает exit 0 только после проверок. Не подменяет продуктовые стили.

- [ ] **1. Добавить воспроизведение.** На 800×600, 1280×900, 1920×1080 открыть Искру, `underweb://dump/client`, `dump/ft-studio`, `dump/notebook`, `underweb://battles/makarevich-1`, установщик и шесть разделов сети. Установить в тестовой фикстуре состояния, в которых действия доступны. Проверить computed styles и реальный клик:

```js
assert.notEqual(search.backgroundColor, 'rgba(0, 0, 0, 0)');
assert.ok(download.height >= 28);
assert.ok(parseFloat(download.borderTopWidth) >= 1);
assert.ok(parseFloat(download.paddingLeft) >= 7);
assert.ok(registration.height >= 28);
assert.equal(pageOverflow, false);
```

Проверить disabled и keyboard focus, а текстовым ссылкам оставить отсутствие заливки. `verify-social-shell` должен использовать оболочку ОС и `virtual-pc.css`, иначе регрессия останется невидимой.

- [ ] **2. Красный запуск:** `node tools/verify-v-krugu-browser.mjs`. Ожидаем ошибку внешнего вида обычных кнопок, в частности прозрачную кнопку «Найти»/нулевые отступы загрузки.
- [ ] **3. Исправить каскад:** заменить усиление `:not(.sn-network button)` на исключение с нулевой специфичностью `:not(:where(.sn-network button))` в обоих местах; не вводить глобальный `!important`. Локальные стили править только при оставшемся доказанном конфликте.
- [ ] **4. Зелёный запуск:** тот же native-сценарий, `node --test test/underweb-community-view.test.js test/virtual-pc-ui.test.js test/social-view.test.js`. Открыть скриншоты каждой группы страниц, а не только проверить их наличие.
- [ ] **5. Коммит:** `fix: restore browser button affordances across desktop sites`, точные четыре файла задачи.

### Task 2: Закрытая обувь и безопасная миграция

**Files:** Create `src/avatar-footwear-migration.js`, `test/avatar-footwear-migration.test.js`; Modify `src/avatar-v3-profile.js`, `src/home-wardrobe.js`, `tools/build-mannequin-v3.py`, `tools/avatar-wardrobe-v3.py`, `test/avatar-v3-wardrobe.test.js`, `test/avatar-v3-profile.test.js`. Generated: `assets/apartment/v3/mannequin.glb`, `assets/apartment/v3/rig.json`, `assets/source/mannequin-v3.blend`.

**Interfaces:** `migrateClosedFootwear(input) -> {profile, changed}` — чистая функция, не мутирует input, не импортирует профиль/гардероб (избежать цикла). `reserveFootwearBackup(storage, raw) -> void` использует отдельный ключ `SAVE_KEY+'-before-closed-footwear-v1'`; ошибка пробрасывается до записи нового профиля.

- [ ] **1. Тесты.** Оба старых ID во внешности и в разных элементах гардероба, совпадающие новые ID, разные цвета, v3/v4, миграция только гардероба; повторный проход. Отказ backup и основной записи сохраняет оригинал.

```js
const before = structuredClone(oldProfile);
const once = migrateClosedFootwear(before);
assert.equal(once.profile.appearance.footwear, 'ankleboots');
assert.deepEqual(once.profile.skills, before.skills);
assert.deepEqual(migrateClosedFootwear(once.profile).profile, once.profile);
assert.deepEqual(before, oldProfile);
assert.equal(failingStorage.getItem(SAVE_KEY), originalRaw);
```

Для wardrobe сверять каждую пару ID/цвет; не терять другие предметы. GLB/rig-тесты требуют новые пять вариантов, закрытые верх/носок и tintChannel footwear.

- [ ] **2. Красный запуск:** `node --test test/avatar-footwear-migration.test.js test/avatar-v3-profile.test.js test/avatar-v3-wardrobe.test.js`.
- [ ] **3. Реализовать миграцию перед `validateProfile`.** Никакого вызова novice-reset. При загрузке сохранить raw backup до преобразования; при ошибке вернуть существующий явный failure, не нового героя. Нормализация внешности понимает старые ID, но меню и модель предлагают только sneakers/canvas/boots/ankleboots/highcanvas. Закрытые ботинки — короткий кожаный верх, высокие кеды — тканевый верх выше щиколотки; оба со сплошным носком и своими силуэтами.
- [ ] **4. Собрать и проверить.** Запустить существующий Blender из D: через `--background --python tools/build-mannequin-v3.py -- --out <checkout>/assets/apartment/v3 --source-out <checkout>/assets/source`. Перегенерацию иных файлов builder проверить diff и не включать случайные изменения сцены. Запустить тесты шага 2 плюс `test/avatar-v3-rig.test.js` и `test/home-wardrobe.test.js`. Посмотреть обувь на пяти цветах, с джинсами и шортами: редактор → шкаф → квартира.
- [ ] **5. Коммит:** `fix: replace open footwear and migrate saved wardrobes safely`.

### Task 3: Приблизить 2D и сократить переход к монитору

**Files:** Modify `src/apartment-v3-camera.js`, `src/apartment-v3-scene.js`, `src/apartment-v3-computer.js`, `src/virtual-pc-transition.js`, `src/virtual-pc-lifecycle.js`; Create `src/apartment-head-pose.js`, `test/apartment-head-pose.test.js`; Modify `test/apartment-v3-camera-comfort.test.js`, `test/apartment-v3-computer.test.js`, `test/virtual-pc-transition.test.js`, `test/virtual-pc-lifecycle.test.js`.

**Interfaces:** `headCameraPose({position, quaternion, eyeOffset}) -> {position, quaternion, fov:60, near:.03}` использует мировой transform настоящего head после обновления анимации. Scene `getHeadCameraPose()` и `beginComputerView()` используют его при любом режиме. Мировые координаты — Three.js Y-up.

- [ ] **1. Тесты.** Независимо от старой overview camera, начало/конец перехода лежат у головы сидящего героя; смена режима не использует stale firstCamera. Изменение роста на экране в пределах 1.25–1.30. Прежний возврат 2D/3D после сна сохранён.

```js
transition.enter({alreadyOn:true});
transition.tick(.8);
assert.equal(transition.snapshot.phase, 'desktop');
transition.leave(); transition.tick(.8);
assert.equal(transition.snapshot.phase, 'room');
assert.ok(projectedScale >= 1.25 && projectedScale <= 1.30);
assert.ok(distanceToHead < .2);
```

Проверить midpoint overlay и все work/reaction in/out, cold start сохраняет BIOS1.2/loading6/welcome1.4; отмена при смене сцены не воскрешает старую камеру.

- [ ] **2. Красный запуск:** `node --test test/apartment-head-pose.test.js test/apartment-v3-camera-comfort.test.js test/apartment-v3-computer.test.js test/virtual-pc-transition.test.js test/virtual-pc-lifecycle.test.js`.
- [ ] **3. Реализация.** Высоту 2D начать с `5.025/1.275`; вертикальную цель подобрать проекцией верхней границы стен, без смены сцены/масштаба мебели. Head pose получать из свежего world transform, исключить голову героя из собственного first-person кадра. Шесть zoom/work/reaction переходов =.8; overlay по нормализованному progress с прежней относительной зоной 0.9375, не elapsed2.25.
- [ ] **4. Проверка:** тесты шага2 плюс `test/apartment-shared-scene.test.js test/pc-cutscene.test.js`; видео/кадры входа/выхода, обе комнаты и сон при трёх разрешениях. Верх среза не открывает наружную пустоту; соседняя комната доступна при следовании.
- [ ] **5. Коммит:** `fix: frame the apartment closer and anchor PC transitions to the hero`.

### Task 4: Музыка принадлежит приложению, а не странице

**Files:** Create `src/pc-audio-session.js`, `test/pc-audio-session.test.js`; Modify `src/virtual-pc-ui.js`, `src/social-audio-view.js`, `src/underweb-view.js`, `src/social-view.js`, `src/apartment-app.js`, `test/beat-audio.test.js`, `test/social-view.test.js`.

**Interfaces:** `createPcAudioSession(audio) -> {forOwner(ownerId), isOwner(ownerId), stopOwner(ownerId), stopAll(), dispose()}`. Владелец `ft-studio|underweb|creative-work`. `forOwner` возвращает совместимый адаптер `play/playProject/playDescriptor/unlock/getSnapshot/pause/stop` и read-only `error`; `stop(options)` сохраняет fadeSeconds. Не-владелец видит stopped snapshot и не может остановить текущий чужой трек. Смена владельца останавливает прежнее проигрывание. Поле owner внутри сохранённого descriptor не переписывать. Generation-token и отмена pending-запуска принадлежат сеансу/BeatAudio, не DOM.

- [ ] **1. Тесты.** Play сети → смена раздела → уход от ПК оставляет источник и позицию; закрытие FT при владельце underweb не останавливает звук. Закрытие владельца/выключение останавливает. Pending fetch → закрытие/другой Play → resolve не даёт позднего старта.

```js
const session = createPcAudioSession(fakeAudio);
await session.forOwner('underweb').playDescriptor(descriptor);
session.stopOwner('ft-studio');
assert.equal(session.isOwner('underweb'), true);
assert.equal(fakeAudio.stopsSincePlay, 0);
session.stopOwner('underweb');
assert.equal(fakeAudio.status, 'stopped');
```

- [ ] **2. Красный запуск:** `node --test test/pc-audio-session.test.js test/social-view.test.js test/beat-audio.test.js`.
- [ ] **3. Реализация.** Один session в virtualPc; социальные row dispose снимают DOM-listeners, не Stop. `leave` не останавливает приложение. Close/PowerOff/NewGame/Dispose вызывают правильный scope. Отдельный creative-work adapter сохраняет нынешнее включение рабочего звука. При autoplay failure показывать ошибку, без отложенного самозапуска.
- [ ] **4. Проверка:** тесты шага2 плюс `test/beat-work-audio.test.js test/virtual-pc-ui.test.js`. Native: Play→friends→kitchen→back, Pause/Resume, закрыть постороннее окно, закрыть владельца.
- [ ] **5. Коммит:** `fix: keep PC music alive across page and room navigation`.

### Task 5: Плавный пространственный выход колонок

**Files:** Create `src/pc-room-audio.js`, `test/pc-room-audio.test.js`; Modify `src/beat-audio.js`, `src/apartment-v3-scene.js`, `src/apartment-app.js`, `src/virtual-pc-ui.js`, `test/beat-audio.test.js`, `test/track-version-audio.test.js`.

**Interfaces:** `roomAudioParameters({source, listener, right, desktop, occluded}) -> {gain, cutoffHz, pan}`, vectors = finite xyz triples. `createPcRoomOutput(context) -> {input, update(frame), dispose()}`. Опциональный constructor `BeatAudio({outputFactory})` сохраняет default destination для offline/старых callers; `setRoomFrame(frame)` кэширует последнюю рамку до unlock. Scene `getComputerAudioFrame({desktop})` возвращает источник колонок, логическую голову героя и right-vector; кино-камера не участвует.

- [ ] **1. Тесты.** Фикстура у стола против кухни, поворот головы180°, 2D camera distance, плавные AudioParam, повторный dispose. Нет изменения descriptor/recipe/PCM.

```js
assert.ok(kitchen.gain < near.gain * .2);
assert.ok(kitchen.cutoffHz < near.cutoffHz);
assert.ok(facingRight.pan * facingLeft.pan < 0);
assert.deepEqual(roomAudioParameters({...frame,desktop:true}), {gain:1,cutoffHz:18000,pan:0});
assert.equal(JSON.stringify(version.recipe), frozenRecipe);
assert.equal(source.playbackRate.value, 1);
```

- [ ] **2. Красный запуск:** `node --test test/pc-room-audio.test.js test/beat-audio.test.js test/track-version-audio.test.js`.
- [ ] **3. Реализация.** После существующего master: lowpass→gain→StereoPanner→destination; не изменять мастеринг. Начальная кривая `gain=max(.02,1/(1+(distance/2)^2))*(occluded?.35:1)`, cutoff `max(1000,16000/(1+distance*.3))*(occluded?.25:1)`; clamp cutoff≥700. Pan — dot направления к колонкам и right головы, clamp[-1,1]. В desktop gain1/cutoff18000/pan0. Параметры `setTargetAtTime` с constant .1sec; без Doppler. Перегородку учитывать по пересечению отрезка источник–голова с её габаритами, а не по месту кино-камеры.
- [ ] **4. Проверка:** тесты шага2 и `test/beat-work-audio.test.js`. Записать короткие native-аудиопримеры у ПК/на кухне/при повороте, прослушать доступным способом, сравнить RMS/спектр и непрерывность позиции. Если аудиопрослушивание инструментами недоступно — отметить отдельно, не выдавать числа за прослушивание.
- [ ] **5. Коммит:** `feat: spatialize PC speakers without changing saved mixes`.

### Task 6: Отдельные камеры работы над музыкой и текстом

**Files:** Create `src/work-camera.js`, `test/work-camera.test.js`; Modify `src/apartment-v3-scene.js`, `src/apartment-app.js`, `test/beat-work-scene.test.js`, `test/apartment-v3-animation.test.js`.

**Interfaces:** `workCameraPose({kind, progress, headPose, desk, bed, lamp, bounds}) -> {position,target,roll}`, kind `beat|vocal|lyrics`, progress[0,1]. Scene `setWorkCamera({kind,progress}|null)`. Host берёт `creativeWorkDescriptor().chainProgress.overall` для бита/текста, `job.elapsed/job.total` для вокала; не пишет прогресс из камеры.

- [ ] **1. Тесты.** Точки 0/.25/.5/.75/1, непрерывность на границах стадий, paused/resumed одинаковый pose, каждый путь в границах комнаты; конечная точка headPose. Текст отличается от музыкальной дуги, roll≤4°.

```js
assert.ok(Math.abs(lyrics.roll) <= 4*Math.PI/180);
assert.deepEqual(workCameraPose({...input,progress:1}).position, input.headPose.position);
assert.deepEqual(poseBeforePause, poseAfterResume);
assert.equal(JSON.stringify(productionState), untouchedState);
```

Проверить draft/clean сохраняют rapping, текст/бит typing, final camera не проваливается через героя на возврате.
- [ ] **2. Красный запуск:** `node --test test/work-camera.test.js test/beat-work-scene.test.js test/apartment-v3-animation.test.js`.
- [ ] **3. Реализация.** Локальная дуга вокруг desk на1.25м от начального ракурса11часов, затем smooth blend к голове. Текст: со стороны bed→вправо/за спину→подъём, мягкий roll и малая sway, детерминированные от progress. Обход мебели/стен проверить габаритами и fallback на безопасную точку; не выполнять полный круг через стену.
- [ ] **4. Проверка:** тесты шага2 плюс `test/creative-workflow.test.js`; кадры/видео день/вечер, три разрешения, остановка в каждой стадии и возобновление, голод/отмена. Полная цепочка не перезапускает проезд с первого ракурса.
- [ ] **5. Коммит:** `feat: add progress-driven work cameras for music and lyrics`.

### Task 7: В кругу и единый архив Макаревича

**Files:** Modify `src/social-identity.js`, `src/underweb-view.js`, `src/virtual-pc-catalog.js`, `src/social-community-view.js`, `data/social/communities.json`, `underweb-world.css`, `social-network.css`, `test/social-catalog.test.js`, `test/social-view.test.js`; Create `test/social-identity.test.js`.

**Interfaces:** Existing `SOCIAL_IDENTITY` становится `{name:'В кругу',mark:'в',year:2012}`; знак оформляется собственным круговым мотивом. Каталог фоновых demo сохраняет ID, исходный seed по возможности, добавляет `author` и `archive:true`; seed меняется только при доказанном совпадении звуковых сборок. Descriptor не берёт автора из реального архива.

- [ ] **1. Тесты.** Имя в шапке/поиске/уведомлениях, network entry перед новостями, bookmark сразу после Искры. Всего6 demo, все в Makarevich, уникальные имена/авторы/сборки, ни одной текущей заявки от переноса.

```js
assert.equal(SOCIAL_IDENTITY.name, 'В кругу');
assert.equal(demos.length, 6);
assert.ok(demos.every(d => d.communityId === 'makarevich-1' && d.archive));
assert.equal(new Set(demos.map(d => JSON.stringify(backgroundAudioDescriptor(d).parts))).size, 6);
assert.equal(state.battleSubmissions.length, beforeCount);
```

- [ ] **2. Красный запуск:** `node --test test/social-identity.test.js test/social-catalog.test.js test/social-view.test.js`.
- [ ] **3. Реализация.** Вход «В кругу — найди друзей и одноклассников» над новостями. Архив подписать «Игровые фоновые записи · прошлый сезон» отдельно от текущих работ. Названия: «Свет в окне», «До последнего автобуса», «Лестничная клетка», «Сторона Б», «После смены», «Соседний двор»; авторы — шесть разных вымышленных имён из каталога. Сохранить исходные ID, seed и аудио, не переатрибутировать реальным артистам. Проверить distinct descriptor и, если seed дают одинаковую сборку, выбрать следующий свободный seed.
- [ ] **4. Проверка:** тесты шага2, `node tools/verify-v-krugu-browser.mjs`; поиск `Рифмосеть` в продуктовых src/data/styles не находит старый display-name; старые сохранённые сообщения не переписывать.
- [ ] **5. Коммит:** `feat: introduce V krugu and consolidate Makarevich archive demos`.

### Task 8: Портрет героя и отдельные фото знакомых

**Files:** Create `src/social-portraits.js`, `src/avatar-portrait-renderer.js`, `test/social-portraits.test.js`, `tools/render-social-portraits.mjs`, `assets/social/photos/manifest.json`; Modify `src/apartment-v3-scene.js`, `src/apartment-app.js`, `src/social-state.js`, `src/social-profile-view.js`, `src/social-dom.js`, `data/social/profiles.json`, `social-network.css`. Generated `assets/social/photos/{anya,vitya,dasha}-{avatar,01,02}.jpg`.

**Interfaces:** `portraitKey(appearance) -> string`; `normalizePlayerPortrait(raw) -> {key,url}|null`; `renderAvatarPortrait({appearance,variant,sceneAssets,size:256}) -> Promise<{url,width:256,height:256}>`. Scene exposes `capturePlayerPortrait(appearance)` using isolated renderer/clone, not live actor. В social добавляется `playerPortrait`, не заменяющий остальные поля; максимум JPEG 256×256 и 96 KiB декодированных байтов. NPC presets use same model style plus portrait-only hair/clothes/face shaping, not a new player gender editor.

- [ ] **1. Тесты.** Portrait key changes with relevant appearance, same appearance caches; malicious URL, oversized data URI, wrong MIME rejected. Render failure leaves profile and retry intact. Capturing does not alter camera, pose, time, clothing or owned geometry/materials.

```js
assert.equal(normalizePlayerPortrait(oversizedJpeg), null);
assert.equal(captureCountAfterTwoEqualRequests, 1);
assert.deepEqual(liveSceneStateAfter, liveSceneStateBefore);
assert.equal(npc.photos.length >= 2, true);
assert.ok(npc.photos.every(p => !p.src.includes('wallpaper')));
```

- [ ] **2. Красный запуск:** `node --test test/social-portraits.test.js test/social-view.test.js`.
- [ ] **3. Реализация.** Отдельная clone+render-target композиция своего стола, герой seated с фронтальным/¾лицом; не переключать live animation. Новый герой — capture после редактора; старый — lazy request при профиле; после смены одежды invalidate. Atomic save маленькой картинки, при отказе placeholder «Фото ещё не готово» и «Повторить снимок». Социальные аватары поддерживают img с alt/error fallback. NPC: Анна/Дарья женские, Витя небритый/изношенная одежда. Сделать три avatar и шесть разных кадров тех же моделей во дворе/дома/на прогулке, низкое разрешение/умеренный JPEG, собственная игровая сцена, без настоящих людей и desktop wallpaper.
- [ ] **4. Проверка:** тесты шага2; native capture/reload/wardrobe/quota/WebGLfailure; открыть все9NPC изображений и минимум2разных героя. У всех видны лица; два альбома не дублируют одну картинку. Размеры/sha256/generated source фиксирует manifest.
- [ ] **5. Коммит:** `feat: render character portraits and period-style personal albums`.

### Task 9: Домен личных диалогов и событий знакомых

**Files:** Create `src/social-personal.js`, `data/social/conversations.json`, `test/social-personal.test.js`; Modify `src/social-state.js`, `src/social-runtime.js`, `src/social-routing.js`, `src/social-submission.js`, `src/virtual-pc-state.js`, `test/social-routing.test.js`, `test/social-migration.test.js`, `test/phone-social-queue.test.js`.

**Interfaces:** Dialog adds `peer:{kind:'person'|'community',id}`; old community keys/routes remain. Personal keys are existing profile IDs. `seedPersonalDialogs(state) -> state`; `advancePersonalDialogs(state,nowMinute) -> {state,events}`; `blockAndRemoveFriend(state,profileId) -> {ok,state,reason}`; `unreadDialogCount(state) -> number`; `searchDialogs(state,query) -> Array<{id,peer,lastMessage,unread}>`. State adds `blockedProfileIds`; `social.schemaVersion=2`. Runtime event IDs provide dedupe.

- [ ] **1. Тесты.** Load schema1 preserves organizer messages/drafts/audio and seeds exactly once. Исторические сообщения содержат `dateLabel` до старта игры, `at:null` и `archived:true`; новые at — absolute game minute. Анна ~2011; Дарья август2012; Витя два эпизода займов в августе, без снятия денег. Два новых события Вити: minute600(день1,10:00) и3480(день3,10:00).

```js
assert.equal(unreadDialogCount(advancePersonalDialogs(seed,600).state), 1);
assert.equal(advancePersonalDialogs(once,600).events.length, 0);
assert.equal(advancePersonalDialogs(blocked,3480).events.length, 0);
assert.equal(addSocialFriend(blocked,'vitya').ok, false);
assert.deepEqual(afterMigration.trackVersions, before.trackVersions);
```

IDs каталога: `anya`, `dasha`, `vitya`; не заводить дубликатов. Пропущенные события на старом save — по одному разу, телефонные записи могут появиться, звук catch-up не множится.
- [ ] **2. Красный запуск:** `node --test test/social-personal.test.js test/social-routing.test.js test/social-migration.test.js test/phone-social-queue.test.js`.
- [ ] **3. Реализация.** Allowlist person/community в нормализаторе; хранить старые community keys. Блокировка монотонна, очищает friendship и запрещает addFriend, историю не удаляет. Для schema<2 reserve raw PC backup `VIRTUAL_PC_STORAGE_KEY+'-before-personal-dialogs-v2'` до записи; отказ не обнуляет state. Event publication сохраняется через существующий durable runtime, только после успешного persist уведомлять телефон.
- [ ] **4. Проверка:** тесты шага2 плюс `test/social-state.test.js test/social-runtime.test.js test/virtual-pc-recovery.test.js`; oldsave→sleepday3→reload→block→repeat, quotas.
- [ ] **5. Коммит:** `feat: add persistent personal histories and blockable friend events`.

### Task 10: Личные сообщения, поиск и непрочитанность в UI

**Files:** Create `src/social-messages-view.js`, `test/social-messages-view.test.js`; Modify `src/social-view.js`, `src/social-dialog-view.js`, `src/social-profile-view.js`, `src/underweb-view.js`, `src/virtual-pc-ui.js`, `social-network.css`, `test/social-view.test.js`.

**Interfaces:** `mountSocialMessages(d,{getState,navigate}) -> {root,update,dispose}`. `mountSocialDialog` получает peer из task9, `isVisible()` и `onRead(id)`; `isVisible` истинно только для выбранного диалога в активном не свёрнутом Underweb и режиме desktop. `markDialogRead` работает с обоими видами. Подписка на телефон не является read.

- [ ] **1. Тесты.** Поиск по имени и body с ё/е/case; человеческая история открывается без controls сдачи. Витя — только block/remove, доступно чтение. После нового сообщения badge+1 на диалог, несколько сообщений того же друга не+2; видимый диалог автоматически читается, скрытый нет.

```js
assert.equal(searchDialogs(state,'верну').some(d=>d.peer.kind==='person'), true);
assert.equal(unreadDialogCount(twoMessagesSamePerson), 1);
assert.equal(visibleDialogAfterDelivery.unread, false);
assert.equal(hiddenDialogAfterDelivery.unread, true);
assert.equal(friendDialog.querySelector('[data-submit-track]'), null);
```

- [ ] **2. Красный запуск:** `node --test test/social-messages-view.test.js test/social-view.test.js test/phone-social-queue.test.js`.
- [ ] **3. Реализация.** Список аватар/имя/последняя реплика/дата/бейдж, поле «Поиск по сообщениям». Убрать организаторскую пустую заглушку из личного списка. Историческую дату выводить из dateLabel; новые даты — calendar helper задачи11 после его появления, до того использовать нынешний gameMinuteLabel. Не свободный input чата. Блокировка подтверждается UI только после atomic save; не терять scroll/focus при каждом tick.
- [ ] **4. Проверка:** тесты шага2 и расширенный `verify-v-krugu-browser`: все три чата, поиск, телефонdismiss, minimise/restore, block/reload.
- [ ] **5. Коммит:** `feat: expose personal conversations search and unread badges`.

### Task 11: Общая регистрация, календарь и календарные сроки

**Files:** Create `src/social-registration.js`, `src/pc-calendar-view.js`, `test/social-registration.test.js`, `test/pc-calendar-view.test.js`; Modify `src/home-calendar.js`, `src/virtual-pc-shell.js`, `src/virtual-pc-ui.js`, `src/underweb-view.js`, `src/social-community-view.js`, `src/social-dialog-view.js`, `virtual-pc.css`, `test/home-calendar.test.js`.

**Interfaces:** `gameDateTimeLabel(absoluteMinute) -> string`; `gameMonthGrid(gameDay) -> {year,month,days:[{day,gameDay,current}]}`, Monday-first leading blanks. `registerBattle(state,{battleId,playerName,nowMinute}) -> {ok,state,reason,alreadyRegistered}` использует existing ensureBattleWindow/applyToBattle. `battleDeadlineLabel(window,nowMinute) -> {text,open}`. `mountPcCalendar({document,anchor,getGameDay,onClose}) -> {root,update,dispose}`.

- [ ] **1. Тесты.** День1=01.09.2012, day31=01.10.2012, midnight; реальный timezone не влияет. Повторная заявка одна, nickname из героя, no success при atomic-save false. Сайт↔сообщество синхронны; подписка не регистрация.

```js
assert.equal(gameDateTimeLabel(0), '01.09.2012 00:00');
assert.equal(gameDateTimeLabel(30*1440), '01.10.2012 00:00');
assert.equal(twice.state.battleApplications.length, once.state.battleApplications.length);
assert.equal(registerBattle(state,{...options,nowMinute:window.closesAt}).ok, false);
assert.equal(afterFailedPersist.battleApplications.length, beforeCount);
```

- [ ] **2. Красный запуск:** `node --test test/social-registration.test.js test/pc-calendar-view.test.js test/home-calendar.test.js`.
- [ ] **3. Реализация.** Оба UI вызывают одну доменную регистрацию и atomic persist; после успеха «Ваша заявка принята, [ник]. Ожидаем вашего трека». Уже зарегистрированного направлять к сдаче. Срок из сохранённого window, не новый от текущего render. Часы — button с time внутри, календарь текущего game month; Escape/outside close и фокус к часам, дата readonly. Закрытый приём явный; формулировка едина на сайте/в сообществе/диалоге.
- [ ] **4. Проверка:** тесты шага2 плюс `test/virtual-pc-shell.test.js test/underweb-midnight.test.js test/social-view.test.js`; native calendar/dayrollover/registersite/registercommunity/quota. Обновить даты личных сообщений из task10 через helper.
- [ ] **5. Коммит:** `feat: unify battle registration deadlines and desktop calendar`.

### Task 12: Надёжная фоновая загрузка вложения

**Files:** Create `src/social-upload.js`, `test/social-upload.test.js`; Modify `src/social-submission.js`, `src/battle-submission-view.js`, `src/social-dialog-view.js`, `src/virtual-pc-state.js`, `src/virtual-pc-runtime.js`, `src/apartment-app.js`, `test/social-submission.test.js`.

**Interfaces:** Root state `outgoingUpload:null|{version:1,communityId,windowId,versionId,totalBytes,uploadedBytes,status:'uploading'|'ready',fractionalBytes}`. `startSubmissionUpload(state,{communityId,projectId,nowMinute}) -> {ok,state,reason}`; `advanceSubmissionUpload(state,{activeSeconds,powered,paused}) -> {state,changed,completed}`; `cancelSubmissionUpload(state) -> {ok,state,reason}`; `uploadPresentation(state) -> {percent,totalBytes,uploadedBytes,bytesPerSecond,remainingSeconds,status}`; `normalizeOutgoingUpload(raw,trackVersions) -> Upload|{issue,recoveryData}|null` сохраняет повреждённую передачу в recovery без изменения версий. `uploadPresentation` возвращает status:'error' и reason для recovery; отправка при таком состоянии закрыта.

- [ ] **1. Тесты.** 64/3sec audio =512000bytes; за10sec=100000; после51.2sec ready. При выключении, pause и hidden dt0; sleep увеличивает только game clock. Reload сохраняет bytes, отсутствие offline accrual. Частичные шаги сохраняют дробный остаток. Другой upload отклоняется до cancel, уже отправленный track не меняется.

```js
assert.equal(upload.totalBytes, 512000);
assert.equal(advanceSubmissionUpload(start,{activeSeconds:10,powered:true,paused:false}).state.outgoingUpload.uploadedBytes,100000);
assert.deepEqual(advanceSubmissionUpload(start,{activeSeconds:100,powered:false,paused:false}).state, start);
assert.equal(beforeReady.social.personalAudioIds.includes(versionId), false);
assert.equal(afterReady.social.personalAudioIds.includes(versionId), true);
assert.equal(sendSubmission(beforeReady,{communityId,nowMinute}).ok, false);
```

Использовать захваченный recipe после изменений/удаления исходного проекта. Отказ сохранения начала/completion/checkpoint не публикует готовый draft/личное аудио.
- [ ] **2. Красный запуск:** `node --test test/social-upload.test.js test/social-submission.test.js test/track-version.test.js`.
- [ ] **3. Реализация.** Capture immutable version при выборе, totalBytes=ceil(duration*192000/8). Перед началом валидировать регистрацию/window/source. Existing `attachSubmissionTrack` делегирует новому start, чтобы picker не обходил transfer. При ready atomically добавить personalAudio и draftVersionId; до него ни Play ни Send. Старые готовые draftVersionId без upload считаются ready, старые отправки нетронуты. Host tick принимает active real dt отдельным путём от `advanceVirtualPc(clock)`; не измерять upload игровыми минутами или Date.now-offline. Commit checkpoint раз/сек и на phasechange/pagehide, ошибка держит прежний durable state и видимый warning. Cancel не удаляет shared TrackVersion/старый draft и не тратит попытку.
- [ ] **4. Проверка:** тесты шага2 плюс `test/virtual-pc-runtime.test.js test/virtual-pc-recovery.test.js`; native run действительно ~51–53active sec, уход на кухню/закрытыйдиалог/powercycle/reload/cancel/deadline. В test-run допускается controlled clock для edge cases, но один real-time прогон обязателен.
- [ ] **5. Коммит:** `feat: upload frozen track attachments in active real time`.

### Task 13: Набор полного сообщения и атомарная отправка

**Files:** Create `src/social-composer.js`, `test/social-composer.test.js`; Modify `src/social-submission.js`, `src/social-dialog-view.js`, `src/virtual-pc-state.js`, `src/apartment-app.js`, `src/lyric-work-audio.js`, `test/social-submission.test.js`, `tools/verify-package-one-social.mjs`, `tools/verify-social-submission.mjs`.

**Interfaces:** Root `outgoingMessage:null|{version:1,communityId,windowId,versionId,body,elapsedSeconds,totalSeconds:6}`. `submissionMessageBody(version) -> string`; `startSubmissionMessage(state,{communityId,nowMinute}) -> {ok,state,reason}`; `advanceSubmissionMessage(state,{activeSeconds,visible,powered,paused}) -> {state,readyToSend}`. Final existing `sendSubmission(state,{communityId,nowMinute})` commits bound composer body/version only after elapsed6; supports old drafts by passing through the new composer, not bypass. `normalizeOutgoingMessage(raw,trackVersions) -> Message|{issue,recoveryData}|null` проверяет версию, счётчики и размер текста; повреждённый набор не отправляется, raw остаётся в recovery. Нормализация не меняет frozen recipe.

- [ ] **1. Тесты.** Все сохранённые words.text символического текста в исходном порядке; заголовки/разрывы и notes не генерировать заново. Greeting+trackname+lyrics, без другого произведения.6sec, повторный click, hidepause/resume/reload; deadline во время typing отклоняет финал, attempt0, draft retained.

```js
assert.ok(submissionMessageBody(version).includes(savedSymbolSequence));
assert.equal(advanceSubmissionMessage(start,{activeSeconds:5,visible:true,powered:true,paused:false}).readyToSend, false);
assert.equal(advanceSubmissionMessage(start,{activeSeconds:6,visible:true,powered:true,paused:false}).readyToSend, true);
assert.equal(sendSubmission(expired,{communityId,nowMinute:window.closesAt}).ok, false);
assert.equal(persistFailure.state.battleSubmissions.length, 0);
assert.equal(sent.state.battleSubmissions.length, 1);
```

Квота финальной записи сохраняет draft/composer; повторная успешная попытка не добавляет второй msg. Уже отправленные старые rows/messages/reviews побайтно прежние.
- [ ] **2. Красный запуск:** `node --test test/social-composer.test.js test/social-submission.test.js test/social-migration.test.js`.
- [ ] **3. Реализация.** Body из snapshot.sections.lines.words; prose сохраняет абзацы, verse сохраняет строки; текст через textContent/white-space:pre-wrap, не HTML. Показ части body по elapsed6, тихая клавиатура отдельным синтезированным cue, не захватывает music owner. Outside desktop/hidden dialog/pause freeze. На elapsed6 повторно проверить deadline/регистрацию/version, один atomic persist сообщения+аудиоссылки+attempt. При ошибке остановить автоматические повторы, оставить явную повторную отправку; на повторе законченный набор не печатать заново. ACK1–30gameMin без изменения судейства.
- [ ] **4. Проверка:** тесты шага2 и native old-script adaptation: дождаться upload ready, clickSend, проверить промежуточный текст и завершение за6active sec, выключение/close/hide/reload, ACK и unread после сохранения. `node tools/verify-package-one-social.mjs` и `node tools/verify-social-submission.mjs` проходят обновлённый реальный путь, не вызывают send напрямую вместо UI.
- [ ] **5. Коммит:** `feat: type and atomically deliver complete battle messages`.

### Task 14: Сквозная приёмка и локальная интеграция

**Files:** Create `tools/verify-v-krugu-flow.mjs`, `docs/qa/2026-10-12-v-krugu.md`; Modify `tools/verify-v-krugu-browser.mjs`; new screenshots/audio/video/logs only in ignored `artifacts/v-krugu-qa/`. При необходимости mechanical cache revision в `index.html` и затронутых imports обновить согласованно, не ломая fixture imports.

**Interfaces:** `verify-v-krugu-flow` принимает те же QA env, строит свежие профили и legacy fixtures сам; не читает userlocalStorage. Выход0 только после UI/state assertions и отсутствия pageerror. Отчёт разделяет automated, observed visual/audio и not checked.

- [ ] **1. Составить исполняемый сквозной сценарий:** новый герой→ПК→Вкругу/диалоги→регистрация→текст/бит/вокал→upload→typing→send→ACK. Второй: oldsave footwear/старыйsend, quota errors, sleep/read/block/reload. Полная матрица spec sections1–9 привязана к task numbers; неподтверждённые визуальные/аудио пункты нельзя отметить выполненными.
- [ ] **2. Запуски:** `npm test` (0fail); `node tools/verify-v-krugu-browser.mjs`, `node tools/verify-v-krugu-flow.mjs`, `node tools/verify-package-one-social.mjs`. Убедиться в наличии плановых тестов, не считать прежние915проверок доказательством нового патча. Не запускать конкурирующие screenshot/binary builds в один output.
- [ ] **3. Наблюдаемая приёмка:** открыть screenshots800/1280/1920, обувь/профиль/альбомы/календарь; посмотреть короткие видео2D/sleep/PC/work; прослушать roomaudio где возможно. Зафиксировать конкретные картинки и результаты, найденные баги исправить с regressiontests и повторить соответствующие команды.
- [ ] **4. Один независимый review** полной ветки против spec/plan; применить `requesting-code-review`, scope read-only. Проверяющий отдельно смотрит schema migration/order, async ownership, durable upload/send и CSSspecificity. Исправить подтверждённые замечания, rerun targeted и `npm test`. Не создавать отдельные чаты/массовых исполнителей.
- [ ] **5. Интеграция:** `verification-before-completion` и `finishing-a-development-branch`. При чистых проверках локально слить в пользовательскую `codex/sloboda-workflow-design` безreset/force; сверить защищённые файлы/хеши; сохранить нужныеignoredQAизworktree наDдоархивации. Запустить mergedtree `npm test`, обновить QAотчёт фактическими hash/exitcode. Пользовательский4173 перезапустить только если требуется подхват checkout, не сбрасывая save. В handoff явно назвать то, что реально проверено и что остаётся непроверенным.

## Самопроверка плана и границы готовности

Покрытие спецификации: кнопки — задача 1; обувь — 2; обзор и переход к ПК — 3; музыка в комнате — 4–5; камеры работы — 6; название сети и архив — 7; изображения — 8; личные диалоги — 9–10; регистрация и даты — 11; загрузка — 12; набор и отправка — 13; приёмка — 14. Контракты задачи 9 используются задачей 10, календарные функции задачи 11 — диалогами, неизменяемые TrackVersion — задачами 12–13. Музыкальная библиотека не смешана с пространственным проигрыванием; файлы пользователя не заменяются.

Ни один checkbox не означает уже выполненную продуктовую работу. План передаётся на проверку; после подтверждения исполнять последовательно без новых согласований каждого технического шага, пока не обнаружится реальная неоднозначность, риск потери пользовательских данных или изменение согласованного поведения.
