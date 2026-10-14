# Playtest Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Выполнить утверждённый пакет замечаний и вернуть стабильную работу накопленной игры без потери сохранений.

**Architecture:** Сначала устранить квадратичный обход истории и тяжёлое кадровое обновление UI, сохранив валидацию на границах. Затем добавить независимые модели загрузок и аудиоэкспорта в существующую виртуальную ОС, изменить представления и творческие операции. Исторические версии звука остаются неизменяемыми.

**Tech Stack:** JavaScript ES modules, Three.js, Web Audio/Workers, DOM/CSS, node:test, установленный Edge/Playwright; Python/Blender только для существующей сборки сцены.

**Spec:** `docs/superpowers/specs/2026-10-14-playtest-repair-design.md`, подтверждена пользователем 14 октября 2026 года.

## Global Constraints

- Сохраняются старые проекты, история, записанные версии, заявки и результаты баттлов.
- Не удалять историю ради FPS и не снижать качество картинки или звука как подмену исправления.
- Проверки выполнять в отдельном профиле/на другом порту, не перезаписывая пользовательское сохранение на 127.0.0.1:4173.
- Все временные файлы и кэши на D:. Не устанавливать новые браузеры/зависимости без необходимости. Не трогать чужие untracked backlog-файлы.
- Первое уведомление через 15 игровых секунд после первого пробуждения; загрузка установщика/метаданных около 1 реальной секунды; запуск мастера около 1 секунды; вложение около 2 активных реальных секунд.
- Три доработки и отдельно три адаптации на текст; доработка 60 игровых минут, максимум +2 качества и 1/9 опыта полного создания, с ограничением навыком.
- Нативная проверка: p95 кадра ≤25 мс, p95 основного обновления ≤20 мс; отдельно записывать максимумы. Разрешения 1280×720, 1366×768, 1920×1080.

## Review Focus

1. Старое сохранение с повреждённой работой и приостановленным заданием: исходные данные и возможность восстановления остаются — задачи 1, 5, 7.
2. Ошибка хранилища при завершении загрузки/экспорта/отправки: не показывать недолговечный результат как сохранённый и не повторять тяжёлую операцию каждый кадр — задачи 7–9.
3. Обновление времени/фона при открытом модальном окне: фокус, ввод имени, выбранный файл и прокрутка не сбрасываются — задачи 2, 4, 8.
4. Перезагрузка после улучшения, экспорта или выбора интро: лимиты, ссылки вокала и сохранённый звук не изменяются — задачи 5–7, 9.
5. Прерывание записи, выключение ПК и reduced motion: не остаются скрытые звуки, REC, вибрация или циклы отрисовки — задачи 2, 3, 10.

## Execution

Пользователь утвердил план и выбрал реализацию через субагентов: отдельный исполнитель и независимая проверка каждой задачи, затем одна общая проверка всей ветки. Контроллер последовательно ведёт задачи, сохраняет единый контроль модели сохранения и журнал выполнения.

Каждая задача заканчивается отдельным коммитом только относящихся к ней файлов. Тесты сначала должны воспроизвести старую ошибку; затем выполняется минимальное изменение и повторная проверка. Не ослаблять проверки ради зелёного результата.

### Task 1: Прогресс текущей работы без обхода архива

**Files:** изменить `src/creative-workflow.js`, `src/home-creative-work.js`, при необходимости `src/beat-production.js` и `src/lyric-production.js`; дополнить `test/creative-workflow.test.js`, `test/creative-chain-runtime.test.js`; создать `test/helpers/long-campaign-fixture.js`, `test/creative-performance.test.js`, `tools/verify-long-campaign.mjs`.

**Interfaces:** сохранить `creativeChainProgress(state,projectId) -> {overall,stage,index,count}`, `advanceCreativeWork(state,seconds,clock,skills)` и нормализацию при загрузке. Создать тестовый `longCampaignFixture({tracks=20,day=8}) -> {state,skills}` из реальных команд создания/завершения битов и текстов; сохранить исторические планы.

- [ ] Написать тесты `progress reads only the requested plan` (`assert.equal(unrelatedPausedJobReads,0)`), `twenty completed works retain plans and exact progress`, `resume retains previously earned practice`, `malformed archived project stays recoverable`.
- [ ] Запустить `node --test test/creative-performance.test.js test/creative-workflow.test.js test/creative-chain-runtime.test.js`; подтвердить FAIL нового теста на старом вложенном обходе.
- [ ] До исправления снять исходный профиль через `node tools/verify-long-campaign.mjs --performance-only`: этот режим сеет fixture в изолированном браузере, измеряет ходьбу/творческую работу/открытый FT и пишет отдельный baseline, не требуя ещё не реализованных UI.
- [ ] Читать только целевой проект/план для прогресса; не вызывать полную нормализацию истории из кадрового дескриптора. В заданиях нормализовать выбранную запись, а не все проекты для поиска одного ID. Сохранить проверку всего входа при load/команде.
- [ ] Повторить команду до PASS; отдельно замерить 1/5/10/20 работ, сравнить прогресс и историю до/после, не вводя нестабильный лимит времени в unit-тест.
- [ ] Закоммитить относящиеся файлы: `fix: keep creative progress independent of archived work`.

### Task 2: Кадровые обновления рабочего стола

**Files:** изменить `src/virtual-pc-ui.js`, `src/virtual-pc-runtime.js`, `src/virtual-pc-state.js`, `src/beat-studio-view.js`, `src/rap-notebook-view.js`, `src/pc-software-view.js`; создать `test/desktop-update-budget.test.js`; дополнить `test/virtual-pc-ui.test.js`.

**Interfaces:** сохранить `pc.syncState(state)`, `pc.syncHost(metadata)`, `view.update()` и `downloadPresentation(state,appId)`. Часы/транспорт обновляются отдельно; валидированные ссылки на проекты служат границей инвалидации. Не кешировать изменяемые данные без корректной инвалидации.

- [ ] Тестировать 120 обновлений дробной минуты: тяжёлое содержимое неизменного окна не строится повторно (`assert.equal(contentRenderCount,1)`), часы обновляются; скрытые окна не читают чужие проекты; открытый ввод и фокус сохраняются; закрытие окна отменяет его RAF.
- [ ] Запустить `node --test test/desktop-update-budget.test.js test/virtual-pc-ui.test.js test/virtual-pc-runtime.test.js`, подтвердить FAIL расходов/перестроения.
- [ ] Убрать полную нормализацию сохранения из read-only представлений загрузки/диска; разделить обновление shell, структурного содержимого и транспорта. Ограничить ресурсы неактивных окон, не останавливая нужное фоновое аудио/торрент.
- [ ] Повторить тесты до PASS; открыть FT, блокнот, браузер и torent на fixture задачи 1 и снять CPU/RAF-профиль, проверить 30 циклов открытия/закрытия без роста живых обработчиков/аудиоузлов.
- [ ] Коммит: `fix: update visible desktop views only when their data changes`.

### Task 3: Компактный HUD и телефон

**Files:** `index.html`, `apartment-v3.css`, `phone-hud.css`, `src/apartment-app.js`, `src/phone-hud.js`, `src/sound-cues.js`; создать `src/phone-presentation.js`, `test/phone-presentation.test.js`; дополнить `src/virtual-pc-state.js`, `test/phone-hud.test.js`, `test/phone-social-queue.test.js`, `tools/verify-phone-hud.mjs`.

**Interfaces:** `normalizePhonePresentation(raw) -> {firstWakeAtMinute,announcedIds}`; `phonePresentation(state,{nowMinute,sleeping,mode,pcPhase}) -> {visible,canNotify,time,needs}`. Состояние представления хранить отдельно от принадлежащей social Worker очереди. `mountPhoneHud` получает `getContext()` и callback устойчивого подтверждения показа.

- [ ] Добавить тесты отсутствия сигнала во сне и на ПК, порога `firstWakeAtMinute + .25`, одного сигнала после reload, сохранения очереди при скрытии, открытия/закрытия потребностей, отказа autoplay и persistence.
- [ ] Запустить `node --test test/phone-presentation.test.js test/phone-hud.test.js test/phone-social-queue.test.js`, подтвердить FAIL новых условий.
- [ ] Реализовать gate и панель; убрать постоянные полосы HUD, оставить контекстный выход из сна/действия, иконки камеры и меню, спрятать инспектор за debug. Сохранить управление предметами и клавиатурные подписи; добавить тройной тихий сигнал с reduced motion.
- [ ] Повторить тесты до PASS и `node tools/verify-phone-hud.mjs` на отдельном порту; снять квартиру/сон/ПК/работу.
- [ ] Коммит: `feat: replace apartment control strips with contextual phone HUD`.

### Task 4: Браузер, группы и компактная таблица

**Files:** `src/underweb-view.js`, `underweb-world.css`, `virtual-pc.css`, `src/social-view.js`, `src/social-messages-view.js`, `src/social-community-view.js`, `src/social-reactions-view.js`, `src/social-catalog.js`, `src/social-dom.js`, `src/battle-results-table-view.js`, `social-network.css`; тесты `test/social-messages-view.test.js`, `test/social-view.test.js`, `test/battle-results-table.test.js`; создать `test/playtest-browser-layout.test.js`, `tools/verify-playtest-layout.mjs`.

**Interfaces:** сохранить существующие `underweb://` маршруты и модель таблицы. Страницы таблицы — представление, не изменение состава/результатов турнира; выбор страницы и места игрока локальный UI-state.

- [ ] Проверить порядок поиск/новость/ярлыки, первый ярлык «В кругу», всю кликабельную строку диалога, «Мои группы», отсутствие «Изучить площадку», выделение ровно одного актуального анонса, доступные подписи thumbs. Проверить наличие всех оценок и переход к игроку при смене размера таблицы.
- [ ] Запустить `node --test test/playtest-browser-layout.test.js test/social-messages-view.test.js test/social-view.test.js test/battle-results-table.test.js`, подтвердить FAIL старой разметки.
- [ ] Переделать оболочку/главную и группу по ТЗ; использовать подходящую существующую обложку Макаревича как аватар после визуального просмотра. Поднять стену над архивом, заменить вспомогательные кнопки ссылками. Пагинировать таблицу по доступной высоте без вложенного скролла и скрытых колонок.
- [ ] Повторить тесты до PASS; `node tools/verify-playtest-layout.mjs` проверяет три разрешения, `scrollWidth <= clientWidth`, отсутствие вертикального переполнения самой таблицы, сохранение фокуса/пагинации при фоновом обновлении.
- [ ] Коммит: `feat: simplify Underweb and group navigation`.

### Task 5: Доработки, версии и уникальные названия

**Files:** `src/lyric-production.js`, `src/rap-notebook-view.js`, `src/recording-studio-view.js`, `src/beat-names.js`, `src/beat-studio-view.js`, `rap-notebook.css`; создать `src/project-picker-view.js`, `test/lyric-refinement.test.js`, `test/project-picker.test.js`, `test/beat-names.test.js`; дополнить `test/lyric-production.test.js`, `test/vocal-production.test.js`.

**Interfaces:** `startLyricWork(...,{kind:'refine'|'adapt',...})` использует ту же работу/ID; `refinementCount` и `adaptationCount` в normalizeLyric, legacy по умолчанию неотрицательные 0 (существующую adaptation учитывать как минимум один использованный раз). `randomBeatName(day,previous,random,existingNames=[])` обратно совместим; сравнение имени без даты. `mountProjectPicker(root,{items,onSelect,onCancel})` с поиском и датой. Новые записи выбирают последнюю ревизию одной линии `contentSource`.

- [ ] Тесты: три refine/три adapt проходят, четвёртые отклоняются; отмена не тратит лимит; завершение прибавляет revision один раз; 60 минут/≤2 качества/≤1/9 полного XP; reload не сбрасывает счётчики; уже записанный вокал не меняется; генератор исключает старое базовое имя на другой дате и завершает поиск при исчерпании словаря.
- [ ] Запустить `node --test test/lyric-refinement.test.js test/project-picker.test.js test/beat-names.test.js test/lyric-production.test.js test/vocal-production.test.js`, подтвердить FAIL новых правил.
- [ ] Заменить UI полного переписывания на refine, сохранить старые версии и их связи; добавить «Вне баттла»/случайное имя, текущую версию в подборе вокала, компактный фильтруемый список битов. Нельзя бесплатно обойти лимит через старую команду создания содержательной версии.
- [ ] Повторить тесты до PASS; в браузере выбрать нужный бит среди 20, завершить доработку, reload и новую запись с последней версией.
- [ ] Коммит: `feat: refine existing lyrics with bounded revisions and searchable projects`.

### Task 6: Сохранённые альтернативные интро и аутро

**Files:** `src/beat-song-form.js`, `src/beat-playback.js`, `src/beat-production.js`, `src/beat-pcm-runtime.js`, `src/ft-studio-view.js`, `src/vocal-production.js`; тесты `test/beat-song-form.test.js`, `test/beat-pcm-background.test.js`, `test/track-version.test.js`.

**Interfaces:** новая сохранённая `songForm` с версией, окнами и `introSourceId/outroSourceId`; `chooseSongForm(beat,{pool,seed}) -> form` вызывается один раз при создании формы. `resolveBeatPlayback` выдаёт отдельные parts для альтернативных источников; старые проекты без нового поля сохраняют прежнее вычисление формы.

- [ ] Тесты совместимого альтернативного барабана, отказа несовместимой тональной партии, fallback без альтернатив, стабильности после reload/clean/master, сохранения старого descriptor; `assert.deepEqual(exportedRecipeAfter,exportedRecipeBefore)`.
- [ ] Запустить `node --test test/beat-song-form.test.js test/beat-pcm-background.test.js test/track-version.test.js`; подтвердить FAIL отсутствующей сохранённой альтернативы, не старых инвариантов.
- [ ] Выбирать только существующий доступный пул с тем же BPM/совместимой тональностью, сохранять источник и source window; обновить PCM и таймлайн из одной формы, сохранив уровни громкости.
- [ ] Повторить тесты до PASS, PCM parity и `node tools/verify-song-form.mjs`; прослушать/визуально сверить начало и конец нескольких фиксированных seeds.
- [ ] Коммит: `feat: preserve compatible alternate intro and outro sources`.

### Task 7: Неизменяемые аудиофайлы и экспорт

**Files:** создать `src/pc-audio-exports.js`, `src/pc-audio-export-view.js`, `test/pc-audio-exports.test.js`; изменить `src/virtual-pc-state.js`, `src/virtual-pc-explorer.js`, `src/virtual-pc-explorer-view.js`, `src/beat-studio-view.js`, `src/virtual-pc-ui.js`, `src/pc-software.js`; дополнить `test/virtual-pc-explorer.test.js`, `test/virtual-pc-recovery.test.js`.

**Interfaces:** `normalizeAudioExports(raw,trackVersions) -> {version:1,files:[],recovery:[]}`; `createAudioExport(state,{id,projectId,kind,folderId,filename,nowMinute}) -> {ok,state,fileId,reason}`. `kind` = beat/vocal/track. Файл хранит descriptor, sourceRevision, байты, папку/имя, время и `trackVersionId` для полного трека. Для full использовать существующий captureTrackVersion; для stems фильтровать сохранённый playback descriptor, не менять его форму. Добавить виртуальные папки music/exports, writable destinations documents/music/exports/downloads/projects. Размер WAV: `44 + ceil(durationSeconds*44100)*4` байт, никакого PCM в localStorage.

- [ ] Тесты трёх видов файлов, отсутствующего вокала, независимости от последующих правок/удаления проекта, неизменного snapshot, безопасного имени/папки, коллизий, свободного места, recovery повреждённого файла и отказа persistence; `assert.deepEqual(previousSavedBytes,afterFailureBytes)`.
- [ ] Запустить `node --test test/pc-audio-exports.test.js test/virtual-pc-explorer.test.js test/virtual-pc-recovery.test.js`, подтвердить FAIL нового файла/экспорта.
- [ ] Реализовать модель, сохранение, учёт диска и окно экспорта с выбором папки; Explorer отображает и проигрывает экспорт отдельно от FT-проекта. Не создавать новый голос/аранжировку при повторном открытии.
- [ ] Повторить тесты до PASS; экспортировать все варианты, изменить исходный проект, открыть старые файлы и reload; убедиться в неизменном звуке и сохранении версии.
- [ ] Коммит: `feat: export immutable audio files to the virtual disk`.

### Task 8: Загрузки браузера и запуск установщика

**Files:** создать `src/pc-browser-downloads.js`, `src/pc-browser-downloads-view.js`, `test/pc-browser-downloads.test.js`; изменить `src/underweb-view.js`, `src/pc-software-view.js`, `src/virtual-pc-ui.js`, `src/virtual-pc-state.js`, `src/apartment-app.js`, `src/virtual-pc-explorer.js`; дополнить `test/torrent-routing.test.js`, `test/pc-software-ui.test.js`, `tools/verify-pc-software.mjs`.

**Interfaces:** `startBrowserDownload(state,{appId,kind}) -> {ok,state,reason}`, `advanceBrowserDownloads(state,{activeSeconds,powered,paused}) -> {state,changed,completed}`; kind = installer/metadata, длительность 1 секунда. `browserDownloads` хранит очередь и прогресс, готовность публикуется через существующие software receivedBytes/metadata. Открытие файлов использует прежние `openMetadata`/`openInstaller`; UI задерживает показ мастера на 1 активную секунду и отменяет устаревший запуск.

- [ ] Тесты 0/.5/1 секунды, скачивания metadata без клиента, отсутствия auto-open, отказа открытия без ассоциации, открытия после установки, двух торрент-передач, reload частичного скачивания, заполнения диска, закрытия во время запуска и quota failure.
- [ ] Запустить `node --test test/pc-browser-downloads.test.js test/torrent-routing.test.js test/pc-software-ui.test.js`, подтвердить FAIL нового маршрута.
- [ ] Оставить на сайте Download; добавить верхнюю панель, прогресс, ручное открытие файлов. Не смешивать браузерную секунду с игровыми минутами основного торрента; не удваивать учёт готового файла.
- [ ] Повторить тесты до PASS и браузерный сценарий установки из панели и Explorer; проверить, что ввод и выбранный файл не теряются от обновления прогресса.
- [ ] Коммит: `feat: route software downloads through browser files`.

### Task 9: Прикрепление экспорта и короткая передача

**Files:** `src/social-upload.js`, `src/social-submission.js`, `src/social-submission-validation.js`, `src/social-dialog-view.js`, `src/battle-submission-view.js`, `src/virtual-pc-runtime.js`; создать `src/pc-audio-file-picker.js`, `test/export-submission.test.js`; дополнить `test/social-upload.test.js`, `test/social-submission.test.js`, `tools/verify-social-upload.mjs`.

**Interfaces:** `attachSubmissionTrack(state,{communityId,fileId,nowMinute})` делегирует `startSubmissionUpload(state,{communityId,fileId,nowMinute})`; UI принимает fileId, не projectId. Full-файл задачи 7 указывает готовый trackVersionId. Новая версия outgoingUpload хранит elapsedSeconds/totalSeconds=2 и fileId; старые uploading записи мигрируют с сохранением уже достигнутой доли и versionId. Ошибочные исходники сохраняются в recovery.

- [ ] Тесты отклонения beat/vocal/project, приёма full export без повторного capture исходного проекта, 1 секунда ≈50%, 2 секунды ready, paused=без изменений; дедлайн, повторная сдача, регистрация, quota failure и старый upload после reload.
- [ ] Запустить `node --test test/export-submission.test.js test/social-upload.test.js test/social-submission.test.js`, подтвердить FAIL fileId/двухсекундной передачи.
- [ ] Подключить файловый выбор с папками и метаданными; переводить bytes/progress из elapsedSeconds. Сохранить набор текста сообщения и существующие проверки отправки. Удаление/правка проекта не меняет вложенный экспорт.
- [ ] Повторить тесты до PASS и `node tools/verify-social-upload.mjs`; полный путь экспорт → файл → 2 секунды → отправка → ответ → reload, включая отказ хранилища.
- [ ] Коммит: `feat: submit exported files with a two-second upload`.

### Task 10: Посадка, кастрюля и запись

**Files:** `src/apartment-v3-animation.js`, `src/apartment-v3-scene.js`, `src/work-camera.js`, `src/apartment-app.js`, `src/virtual-pc-ui.js`, `src/ft-studio-view.js`, `src/beat-work-view.js`, `tools/build-apartment-v3.py`, `tools/build-mannequin-v3.py`, `tools/apartment-v3-layout.json`, `tools/audit-apartment-v3.py`; пересобрать затронутые `assets/apartment/v3/mannequin.glb`, `rig.json`, `scene.json`, `static.glb`, `interaction.glb` и соответствующие фоны из тех же builders, сохранив исходники `assets/source`; создать `src/recording-shots.js`, `test/recording-shots.test.js`; дополнить `test/work-camera.test.js`, `test/apartment-v3-animation.test.js`, `test/apartment-v3-geometry-audit.test.js`.

**Interfaces:** `recordingShot({elapsedSeconds,durationSeconds,bpm=90,reducedMotion=false}) -> {phase:'mic'|'screen'|'rear',progress,bob}`. Первые четыре доли (8/3 секунды) — mic, screen до 80% работы, остаток rear; для короткого задания сжать границы без выхода за duration. Запись берёт прогресс из существующего job; screen REC не создаёт второе задание и не возобновляет пользовательский transport.

- [ ] Тесты порядка трёх фаз, 90 BPM, paused=неподвижно, reducedMotion bob=0, отмены без REC, восстановленного прогресса; обе кисти внутри зоны клавиатуры в крайних позах, дно кастрюли выше опоры без пересечения соседей.
- [ ] Запустить `node --test test/recording-shots.test.js test/work-camera.test.js test/apartment-v3-animation.test.js test/apartment-v3-geometry-audit.test.js`, подтвердить FAIL новых требований.
- [ ] Согласовать посадку/руки в rig и сцене; исправить положение/форму кастрюли. Убрать печать из vocal-позы, связать три композиции и появление waveform с одним job clock. Собирать существующим локальным builder без новых зависимостей; сохранить происхождение изменённых ассетов.
- [ ] Повторить тесты до PASS, существующий аудит геометрии и `node tools/verify-work-cameras.mjs`; визуально проверить обе руки и кастрюлю с двух сторон, черновую/чистовую запись, паузу/отмену.
- [ ] Коммит: `fix: align desk poses and stage vocal recording shots`.

### Task 11: Сквозная приёмка и независимая проверка

**Files:** расширить `tools/verify-long-campaign.mjs` из задачи 1; создать `docs/qa/2026-10-14-playtest-repair.md`; изменить `tools/verify-battle-fps.mjs`, `tools/bump-package-client-revision.mjs`, `test/v-krugu-revision.test.js`; обновить связанные cache keys до ревизии 42.

**Interfaces:** использовать fixture задачи 1, неизменяемые files задачи 7 и существующую isolated QA-инструментацию. Основной origin пользователя остаётся нетронутым; диагностика не попадает в production API.

- [ ] Расширить браузерную проверку из задачи 1 новыми рабочими процессами и 30 повторными открытиями; сохранить отдельно baseline старого состояния, падения и длинные кадры, не заменять их только удачным повтором.
- [ ] Выполнить все targeted-тесты и `npm test`; новые требования/регрессии должны давать FAIL до соответствующих исправлений, весь набор должен давать PASS после них.
- [ ] Выполнить `node tools/verify-long-campaign.mjs`, `node tools/verify-battle-fps.mjs`, `node tools/verify-playtest-layout.mjs` последовательно без конкурирующей нагрузки. Проверить итоговый маршрут ТЗ и все три размера, старые/новые/повреждённые сохранения, отказ хранилища. Записать FPS, p95/max, ресурсы и скриншоты на D:.
- [ ] Обновить клиентские ключи и проверить граф импортов, отсутствие старых Worker-ключей и доступность через существующий сервер. Провести одну независимую проверку всей ветки по выбранному execution skill, устранить находки и повторить соответствующие проверки.
- [ ] Коммит отчёта и QA. Передача: перечислить выполненные требования, результаты замеров и ограничения; ничего из плана не отмечать выполненным без проверки. Не push/merge автоматически.
