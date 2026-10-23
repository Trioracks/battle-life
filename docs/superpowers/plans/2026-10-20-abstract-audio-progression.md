# Abstract Audio and Progression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить локальный жанр Abstract, голос Даниила, исправленную Kapa, новые экспериментальные лиды, нулевой старт, тестовые повышения и замедляющуюся прокачку.

**Architecture:** Импорт и подготовка аудио выполняются отдельно от игры, по явному списку исходников. Согласованные четырёхтактовые рецепты подключаются к существующему проигрывателю. Версионированные снимки исполнения, бюджеты практики и очереди голосов сохраняют воспроизводимость новых работ и совместимость старых сохранений.

**Tech Stack:** JavaScript ES modules, Node.js 24, `node:test`, существующие Web Audio и PCM worker, PowerShell для проверенного завершения переноса, установленный FFmpeg без новых загрузок.

**Spec:** [Согласованная спецификация](../specs/2026-10-20-abstract-audio-progression-design.md), локальный коммит `a77d2517829fa1ad6fc32a4ea2655dbd603c119c`.

## Global Constraints

- Работа относится к `D:\Project\Battle`; публикация на GitHub и изменение `D:\Project\Battle-web` в неё не входят.
- Все исходники, производное аудио, временные данные и отчёты остаются на D:. Не устанавливать новые зависимости без необходимости.
- Импортируется 255 оригиналов: 141 инструментальный фрагмент Abstract, 101 запись голосов и 13 экспериментальных лидов.
- Нельзя захватывать `FL.flp`, ZIP-архивы, вложенные архивные фрагменты и корневой файл `Генерация минуса и голосов.mp3`.
- Старые аудиобанки не удаляются: они нужны для сохранённых проектов и обратимости замены.
- Пустые файлы Kapa: `Капа - REC_9.wav` и `Капа - Track 1.wav`.
- Новый жанр имеет идентификатор `abstract` и название «Абстрактный хип-хоп».
- Все открытые жанры имеют предел 100.
- Новый герой начинает с 0 по всем девяти основным характеристикам.
- Существующие сохранения не обнуляются и не получают новые очки.
- Завершённые треки и тексты не пересчитываются.
- Браузер не должен зависеть от Node.js или локального FFmpeg.
- Для каждой задачи: отдельный исполнитель, затем независимые проверки соответствия и качества согласно `subagent-driven-development`. Проверяющий получает исходную задачу, diff и результаты тестов, а не только отчёт исполнителя.
- В рабочем дереве до этой задачи имеются 102 изменённых отслеживаемых файла и дополнительные неотслеживаемые файлы. Перед реализацией сохранить инвентарь и хеши текущего состояния. Не считать чистый HEAD актуальной версией игры, не откатывать и не включать чужие изменения в коммиты задачи.
- Выбор рабочей копии выполняется по `using-git-worktrees` в начале исполнительской фазы. Изолированная копия обязана учитывать текущие локальные правки и аудиобанки; перенос проверенных изменений обратно не должен затирать параллельную работу.
- Каждый шаг commit ниже означает локальный коммит только проверенного изменения задачи. Никаких `git add .`, push, release или изменения настроек GitHub.

## Review Focus

- Исходник изменился между копированием и удалением либо путь является junction: сохранить источник, не обходить разрешённые корни. Тесты задач 1 и 9.
- MP3 имеет задержку кодировщика, хвост или неподходящую длину, WAV пустой: не терять активный звук и не подключать ошибочный источник. Тесты задачи 2.
- В сохранении есть незавершённая запись старой Kapa или повреждённая очередь: не сбрасывать историю и не подменять выбранный дубль. Тесты задачи 3.
- Старый частичный этап загружается после обновления, новые тики дробятся или навык достигает 100: не начислять опыт дважды и не останавливать жанровую практику. Тесты задач 4 и 6.
- Хранилище отклоняет запись либо браузер держит старый модуль: не показывать фиктивное повышение и не смешивать версии каталогов. Тесты задач 8 и 9.

## Карта файлов и порядок

| Задача | Основные новые файлы | Результат |
| --- | --- | --- |
| 1 | `tools/abstract-intake.mjs`, `tools/finalize-abstract-intake.ps1` | Проверяемый импорт без удаления источников |
| 2 | `tools/prepare-abstract-audio.mjs`, `tools/audio/adjacent-stems.mjs` | Манифесты и подготовленные слои |
| 3 | `src/voice-bank-migration.js` | Шесть голосов и безопасная смена банка Kapa |
| 4 | Новые тесты нулевого старта | Нулевой новый герой и сохранённые старые карьеры |
| 5 | `src/beat-abstract-bank.js`, `src/beat-experimental-leads-bank.js` | Выбор нового жанра и согласованных рецептов |
| 6 | `src/beat-practice-curve.js` | Новая кривая и учёт опыта |
| 7 | `src/beat-execution-snapshot.js` | Ограничение исполнения слабейшим навыком |
| 8 | `src/test-skills.js`, `src/test-skills-view.js`, `test-skills.css` | Тестовая кнопка и отдельные повышения |
| 9 | `docs/qa/2026-10-20-abstract-audio-progression.md` | Сквозная проверка и подтверждённый перенос |

Порядок выполнения — 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9. Между задачами завершать ревью; исполнители не редактируют общие файлы одновременно. Самопроверка этого плана не делегируется.

### Task 1: Безопасный импорт разрешённых исходников

**Files:** создать `tools/abstract-intake.mjs`, `tools/finalize-abstract-intake.ps1`, `test/abstract-intake.test.mjs`, `test/helpers/abstract-intake-fixture.mjs`. Использовать существующие правила проверок из `tools/archive-gans-kapa-local.ps1`, не изменяя старую партию.

**Interfaces:**
- `planIntake({abstractRoot, experimentalRoot, libraryRoot}) → Promise<IntakeManifest>`.
- `copyIntake(manifest) → Promise<{ok, manifest, errors}>`, без удаления источников.
- `IntakeManifest = {version:1,batch:'abstract-20261020-v1',sources:[{source,destination,role,family,index,bytes,sha256}],excluded:[{path,bytes,sha256}]}`. Все файловые пути абсолютные; `family` и `index` допускают `null` для неинструментальных записей.
- CLI `node tools/abstract-intake.mjs --mode inspect|copy` использует согласованные два исходных корня и библиотеку проекта. Тесты задают собственные корни.
- `makeAbstractIntakeFixture(root) → {abstractRoot,experimentalRoot,libraryRoot,excludedPaths}` создаёт разрешённые имена в нужном количестве и отдельные исключения только внутри тестового каталога D:.

- [ ] Написать тест `intake selects exactly the approved originals`: `assert.equal(manifest.sources.length,255)`; число ролей Abstract — 141, голосов — 101, лидов — 13; `drumm 7.mp3` включён; архивы, FL и дополнительные экспериментальные bass/drums отсутствуют.
- [ ] Запустить `node --test test/abstract-intake.test.mjs`; получить FAIL из-за отсутствующего импортера.
- [ ] Реализовать оба JS-интерфейса: не следовать ссылкам, разрешать только прямых детей согласованных папок, сортировать численно, запрещать дубли целевых путей и неполные тройки. Повторное копирование совпадающих байтов допустимо, перезапись других байтов запрещена.
- [ ] Написать PowerShell-финализатор с параметрами `-ManifestPath`, `-VerificationPath`, `-Apply`. Без `-Apply` только отчёт. При применении проверять абсолютные корни, отсутствие reparse points, исходный и конечный SHA-256, ссылку отчёта проверки на хеш манифеста. Удалять по одному через `Remove-Item -LiteralPath`, никогда рекурсивно.
- [ ] Добавить тесты `changed source survives finalization`, `junction is rejected`, `different destination is never overwritten`, `excluded files remain identical`; выполнять финализатор только на тестовых каталогах. Повторный запуск после удаления подтверждённого источника не удаляет ничего другого.
- [ ] Повторить тесты до PASS, выполнить реальный `--mode inspect`, затем `--mode copy`. Сохранить манифест в `stems/source-library/batches/abstract-20261020-v1.json`; реальные источники пока не удалять.
- [ ] Независимое ревью и локальный commit `feat: add verified abstract audio intake`. Не добавлять оригинальные аудиобинарники в Git.

### Task 2: Подготовка Abstract, голосов и экспериментальных лидов

**Files:** создать `tools/prepare-abstract-audio.mjs`, `tools/audio/adjacent-stems.mjs`, `test/abstract-audio-preparation.test.mjs`. Результаты: `assets/audio/ft/abstract-v1/manifest.json`, `npc-daniel-v1/manifest.json`, `npc-kapa-v2/manifest.json`, `experimental-leads-v1/manifest.json` в том же родительском каталоге.

**Interfaces:**
- Потребляет `IntakeManifest` задачи 1, `decodeAudio` из `experimental-analysis.mjs` и существующие PCM-утилиты.
- `assembleAdjacentStems(first,second,{sampleRate,firstTrimFrames,secondTrimFrames}) → {channels,sampleRate,frames,seamFrame,tailPolicy}`; входы — декодированный stereo PCM на общей частоте. Четырёхтактовый результат при 44100 Hz содержит 470400 кадров, граница соседних комплектов — 235200.
- `prepareAbstractAudio({manifestPath,workspaceRoot,ffmpegPath}) → Promise<PreparationReport>`.
- Манифест Abstract: `{version:1,batch,families:[{id,count}],parts,recipes}`; `parts` совместимы с `beginnerById` и содержат исходные хеши, `family`, `indices:[n,n+1]`, измерения и `calibration.gainDb`. `recipes` содержат `{id,family,indices,drumsId,themeId,arrangementId}`.
- Голосовые манифесты сохраняют формат существующих `parts`, добавляя `catalogVersion` и `usable`. Идентификатор Даниила — `npc-voice:daniel-20261020`; новый Kapa сохраняет `npc-voice:kapa-20261018`, но использует новые source IDs `npc-kapa-v2-01`…`50`.

- [ ] Написать тест `adjacent stems preserve the common boundary`: на синтетическом PCM проверить `frames===470400`, `seamFrame===235200`, совпадение границ всех трёх ролей, сохранение хвоста первого фрагмента и отсутствие перестановки каналов.
- [ ] Запустить `node --test test/abstract-audio-preparation.test.mjs`; получить FAIL отсутствующего сборщика.
- [ ] Реализовать сборку без изменения темпа и высоты: измеренный тихий префикс убирается одинаково обоснованным способом, хвост переносится через стык; неподходящая длина и неизвестное начало дают диагностическую ошибку. Нет автоматической обрезки активной речи. Оригиналы не изменяются.
- [ ] Подготовить 129 слоёв для 43 рецептов, 51 голос Даниила, 50 записей Kapa с двумя `usable:false` и 13 лидов. Для лидов зафиксировать измеренную длину, тональную совместимость и хотя бы один допустимый рецепт с существующим басом/ударными; не объявлять все исходники A minor по умолчанию. Уровни калибровать по существующим правилам, не трогая старые коэффициенты.
- [ ] Добавить тесты `silent takes excluded`, `active oversized fragment rejected`, `preparation rerun preserves hashes`: `usable` Даниила = 51, Kapa = 48; `recipes.length===43`, `parts.length===129`; все 13 лидов имеют проверенный рецепт; все значения PCM и коэффициенты конечны.
- [ ] Выполнить реальные измерения и подготовку установленным `H:\Codex Dist\FFmpeg\8.1.1\bin\ffmpeg.exe` после проверки его наличия. Запустить тесты до PASS; сохранить полный отчёт и hashes под `artifacts/abstract-20261020/`.
- [ ] Независимое ревью и локальный commit `feat: prepare paired abstract stems and refreshed voices`. Коммитить код и текстовые манифесты, не аудиобинарники.

### Task 3: Даниил и версионированная история Kapa

**Files:** создать `src/voice-bank-migration.js`, `test/voice-bank-migration.test.js`; изменить `src/vocal-catalog.js`, `src/npc-vocal-catalog.js`, `src/vocal-production.js`, `src/virtual-pc-state.js`, `src/battle-npc-audio.js`, `test/voice-choice.test.js`. Старые манифесты остаются неизменными.

**Interfaces:**
- Сохраняются сигнатуры `selectNpcVocal`, `selectPlayerVocal`, `normalizePlayerVocalBag`, `vocalById`.
- `voiceCatalog(voiceId,catalogVersion) → {parts,version}|null` разрешает историческую и текущую очередь отдельно; объединённый каталог источников разрешает старые замороженные записи.
- `migrateVoiceBag(bag,{voiceId,targetVersion}) → {ok,bag,changed,reason}` не мутирует вход и проверяет старую очередь до миграции.
- Новые очереди сохраняют `catalogVersion`; отсутствие поля означает старый каталог, а не новый случайный выбор. Кэш исторических каталогов не зависит от текущего списка `usable`.

- [ ] Написать тест `six silent voice choices exclude the hero from new opponents`: проверить точные пять старых названий плюс «Даниил», отсутствие загрузки аудио при выборе и исключение голоса героя для каждого из шести вариантов.
- [ ] Написать тест `kapa migration preserves consumed identical takes`: на фиксированной старой очереди и общих SHA-256 проверить неизменность голоса, отсутствие повторной выдачи уже использованного совпадающего контента и `deepEqual(migrate(migrate(bag)),migrate(bag))`.
- [ ] Запустить `node --test test/voice-bank-migration.test.js test/voice-choice.test.js`; получить FAIL новых требований.
- [ ] Подключить новые каталоги и детерминированную очередь. Старые IDs остаются в каталоге разрешения источников, но не в новом выборе. Зафиксировать хеши совпадений в отчёте миграции; повреждённая очередь возвращает ошибку.
- [ ] Обработать старый pending draft Kapa: валидировать и закончить его со старой версией очереди и тем же источником; переходить на новый банк только при следующем выборе после завершения. Добавить тесты `pending legacy take survives reload`, `forged pending bag stays blocked`, `all usable takes precede next cycle`, `new cycle does not repeat last take`, `failed commit does not consume voice`.
- [ ] Запустить тесты предыдущего шага вместе с `test/vocal-production.test.js` и `test/battle-npc-audio.test.js` до PASS. Проверить, что нормализация замороженных старых треков не меняет JSON-рецепт.
- [ ] Независимое ревью и локальный commit `feat: add Daniel and migrate Kapa voice queues`.

### Task 4: Нулевой новый герой без сброса старых карьер

**Files:** изменить `src/avatar-v3-profile.js`, `src/apartment-v3-new-game.js`, `src/home-profile-migration.js`, `src/virtual-pc-state.js`, `src/beat-production.js`, `src/lyric-production.js`, `src/vocal-production.js`, `src/vocal-result.js`; создать `test/zero-skill-start.test.js`; обновить `test/avatar-v3-profile.test.js`, `test/apartment-v3-creator-flow.test.js`, `test/home-profile-migration.test.js`, `test/home-wardrobe.test.js`.

**Interfaces:**
- `createProfile(input)` сохраняет формат version 4 и добавляет `skillSchema:2` для нового нулевого старта; `noviceSchema:1` и существующий wardrobe-контракт остаются совместимыми.
- Для `skillSchema:2` все девять значений обязательны, конечны и находятся в 0…100. Старые профили читаются по их прежним диапазонам.
- Сигнатуры `prepareNoviceNewGame`, `migrateNoviceSave`, `saveProfile` и `loadProfile` не меняются. Новый журнал и его восстановление принимают нулевой профиль; старая миграция больше не обнуляет практику или навыки существующей карьеры.

- [ ] Написать тест `new game starts at genuine zero`: `assert.deepEqual(Object.values(createProfile({name:'Тест'}).skills),Array(9).fill(0))`; после штатного submit и reload итоговые письмо, флоу, звук, битмейкинг и экспериментальный жанр равны 0.
- [ ] Добавить `old profile migration preserves earned progress` для профилей v3/v4 и `interrupted journal recovers without resetting skills`: навыки, practice, голос, гардероб, проекты и замороженные версии до/после идентичны по содержанию, кроме необходимых полей схемы.
- [ ] Запустить `node --test test/zero-skill-start.test.js test/home-profile-migration.test.js`; получить FAIL нулевого старта.
- [ ] Реализовать новый старт и валидацию; исправить скрытые fallback 10 на живом пути нового героя в `beat-production`, `lyric-production`, `vocal-production`, `vocal-result`, не меняя чтение архивных снимков. Отсутствующий обязательный навык нового профиля отклоняется, а не подставляется.
- [ ] Прогнать тесты задачи и `test/apartment-new-game.test.js test/avatar-v3-profile.test.js test/apartment-v3-creator-flow.test.js test/home-wardrobe.test.js` до PASS. Проверить, что ресурсы сытости/энергии не стали нулевыми и отмена создания не меняет старую игру.
- [ ] Независимое ревью и локальный commit `feat: start new careers with zero skills`.

### Task 5: Abstract в выборе жанра и реальном генераторе

**Files:** создать `src/beat-abstract-bank.js`, `src/beat-experimental-leads-bank.js`, `test/abstract-generation.test.js`; изменить `src/beat-catalog.js`, `src/genre-progression.js`, `src/beat-beginner-bank.js`, `src/beat-production.js`, `src/beat-song-form.js`, `src/beat-studio-view.js`, `src/source-levels.js`; обновить `test/genre-progression.test.js`, `test/genre-ui.test.js`, `test/beat-song-form.test.js`.

**Interfaces:**
- `ABSTRACT_BANK` и `ABSTRACT_RECIPES` читают манифест задачи 2 без изменения старых источников.
- `chooseAbstractRecipe(random) → {id,family,indices,drumsId,themeId,arrangementId}`: первый random выбирает одну из четырёх семей, второй — пару внутри неё; каждый вход должен быть конечным числом, за пределами 0…1 применяется существующий безопасный clamp.
- `chooseBeginnerParts(random,context)` возвращает существующие три ID и для Abstract дополнительно `abstractRecipe:{version:1,id,family,indices}`.
- `normalizeBeat` сохраняет и валидирует `audio.abstractRecipe`: три ID обязаны точно соответствовать этому рецепту. Повреждённый новый рецепт не превращается в другой допустимый бит.
- `EXPERIMENTAL_LEAD_BANK` и `EXPERIMENTAL_LEAD_RECIPES` подключают 13 проверенных лидов из задачи 2.

- [ ] Написать `abstract unlocks at 25 with zero genre experience`: при 24,99 выбор запрещён, при 25 успешен; после выбора `xp.abstract===0`, три части нового бита принадлежат Abstract.
- [ ] Написать `all 43 recipes keep family and consecutive indices`: проверить 43 рецепта, доступность всех четырёх семейств, отсутствие перемешанных троек; round-trip проекта сохраняет recipe ID, хеши и порядок.
- [ ] Запустить `node --test test/abstract-generation.test.js test/genre-progression.test.js test/genre-ui.test.js`; получить FAIL новых требований.
- [ ] Подключить каталоги, дополнительный жанр, источники gain и ограничение intro/outro тем же рецептом. Сохранить соответствие внутренних ролей: drums → ударные, theme → Lead, arrangement → Bass. Не переименовывать старые stage IDs и не подменять общий банк для старых жанров.
- [ ] Поднять genre cap до 100, сохранив слоты 25/50/75 и старые chosen/primary. В интерфейсе Abstract первый среди кандидатов; убрать обещание «только специализация до 100». Ошибка свободного слота остаётся штатной. Добавить тест `old chosen genres survive cap removal`.
- [ ] Подключить экспериментальные лиды к выбору новых experimental-проектов; проверить достижимость каждого из 13 рецептов фиксированными random-значениями, не меняя уже сохранённые проекты.
- [ ] Добавить инвариант intro/outro в существующий `test/beat-song-form.test.js`. Запустить `node --test test/abstract-generation.test.js test/genre-progression.test.js test/genre-ui.test.js test/genre-audio.test.js test/beat-production.test.js test/beat-song-form.test.js`; результат — PASS.
- [ ] Независимое ревью и локальный commit `feat: generate paired abstract hip hop beats`.

### Task 6: Кривая практики и защита от повторного опыта

**Files:** создать `src/beat-practice-curve.js`, `test/beat-practice-curve.test.js`, `test/beat-practice-ledger.test.js`; изменить `src/beat-production.js`, `src/creative-workflow.js`, `src/beat-work-view.js`, `test/beat-production.test.js`, `test/creative-workflow.test.js`, `test/creative-chain-runtime.test.js`.

**Interfaces:**
- `beatPracticeBudget(skill:number) → number`: проверяет конечный диапазон 0…100; геометрическая интерполяция по точкам спецификации.
- Новый проект хранит `practicePolicy:2`; при первом старте получает `practicePlan:{version:2,startSkill,totalBudget}`. Отсутствие маркера у архивного проекта сохраняет старый бюджет 1/3 за этап.
- Job сохраняет `stageBudget`, `practiceCredit` и `genreCredit`. Credit относится к заслуженной доле бюджета до ограничения основного навыка, а не к уже обрезанному приросту.
- `normalizeMusic` и `normalizeCreativeWork` сохраняют план и кредиты активного и paused job. `advanceBeatWork` использует разницу новой и старой заслуженной доли; жанр получает её ×2.

- [ ] Написать `curve hits agreed anchors`: `budget(0)===3`, `budget(25)===Math.sqrt(3)`, `budget(50)===1`, `budget(75)===0.3`; для 90 и 100 сравнение с `1/(10*Math.log(2))` и `1/(20*Math.log(2))` с допуском 1e−12.
- [ ] Написать `ninety to one hundred takes one hundred beats`: повторять `s=Math.min(100,s+budget(s))` начиная с 90; `assert.equal(count,100)`. Проверить монотонность на сетке 0,01 и отказ для NaN/Infinity.
- [ ] Запустить `node --test test/beat-practice-curve.test.js test/beat-practice-ledger.test.js`; получить FAIL.
- [ ] Реализовать кривую и замороженный бюджет. Новый первый бит даёт суммарно +3 и +6 experimental; при старте на 50 — +1 и +2 жанра. На 100 основной прирост 0, жанровый положителен. Изменение тестового навыка после паузы не меняет бюджет этого бита.
- [ ] Добавить `split ticks equal continuous work`, `pause and reload never duplicate credit`, `legacy partial project keeps old rewards`, `near cap genre uses unclamped budget`. Восстановить потребности между этапами тестового полного бита; сравнивать численные результаты с допуском 1e−9.
- [ ] Запустить `node --test test/beat-practice-curve.test.js test/beat-practice-ledger.test.js test/beat-production.test.js test/genre-progression.test.js test/creative-workflow.test.js test/creative-chain-runtime.test.js` до PASS. Старые ожидания фиксированного +1 оставить для явных legacy fixtures; новые проекты проверять по новой формуле.
- [ ] Независимое ревью и локальный commit `feat: add diminishing beat practice and faster genre learning`.

### Task 7: Жанровый предел исполнения без изменения архивного звука

**Files:** создать `src/beat-execution-snapshot.js`, `test/beat-execution-snapshot.test.js`; изменить `src/beat-result.js`, `src/beat-result-dsp.js`, `src/beat-production.js`, `src/beat-playback.js`, `src/track-version.js` и при необходимости `src/beat-pcm-runtime.js`.

**Interfaces:**
- `createBeatExecutionSnapshot({beatmaking,genreXP}) → {version:1,beatmaking,genreXP,effective}` с `effective=Math.min(beatmaking,genreXP)`.
- `normalizeBeatExecutionSnapshot(value) → snapshot|null`; отклоняет неверный диапазон и effective, не совпадающий с минимумом.
- Для новых слоёв `result.execution` содержит snapshot. `beatExecutionSkill(result)` возвращает его effective или старый `result.skills.beatmaking`, если маркера нет.
- Основной skill остаётся доступен для UI и опыта; новые DSP-ошибки используют effective. Решения слайдеров и звук не должны повышать технический уровень сверх effective. Сохранённые quality и оценки старых версий не пересчитываются.

- [ ] Написать `genre only limits execution`: для пар `[50,10],[10,50],[50,100],[100,100],[25,0]` ожидается `[10,10,50,100,0]`; отрицательные, отсутствующие и нечисловые значения отклоняются.
- [ ] Написать `legacy result remains byte equivalent` на фиксированном PCM и архивном result без execution: выход до/после не отличается. Для новых результатов `[50,10]` и `[10,50]` при одинаковых seed/решениях/звуке техническая обработка одинакова.
- [ ] Запустить `node --test test/beat-execution-snapshot.test.js`; получить FAIL.
- [ ] Реализовать и сохранять execution при старте каждого нового этапа. Применить ограничение в существующих фильтрах и временной обработке, не импортируя Node/FFmpeg-модули из демо в браузер. Для старых проектов без новой политики execution не добавлять.
- [ ] Добавить round-trip snapshot в проекте, descriptor, экспорте и track version; повреждённый новый snapshot блокирует соответствующий проект с сохранением исходных данных. Снимок не меняется после роста жанра.
- [ ] Запустить тесты задачи и существующие `test/genre-audio.test.js test/beat-result.test.js test/pc-audio-exports.test.js`; проверить одинаковый результат обработки основным потоком и worker на фиксированных отсчётах. Добиться PASS.
- [ ] Независимое ревью и локальный commit `feat: cap new beat execution by genre proficiency`.

### Task 8: Тестовая кнопка с повышением отдельного навыка

**Files:** создать `src/test-skills.js`, `src/test-skills-view.js`, `test-skills.css`, `test/test-skills.test.js`, `test/test-skills-view.test.js`; изменить `index.html`, `src/apartment-app.js`.

**Interfaces:**
- `testSkillRows(profile,pc) → [{kind:'skill'|'genre',id,label,value,canRaise}]` возвращает девять основных характеристик и только открытые жанры.
- `raiseTestSkill(profile,pc,{kind,id}) → {ok,profile,pc,store:'profile'|'pc'|null,reason}`: чистая функция, только один изменяемый объект. Основной навык повышает базовую часть на `min(1,100-currentEffective)` без повторного включения practice; жанр меняет только свой xp.
- `mountTestSkills(root,{getProfile,getState,onRaise,onClose,returnFocus}) → {open,close,update,isOpen,dispose}`; `onRaise` сообщает успех только после штатного успешного сохранения.
- Блокировка применяется к активным music/writing/recording jobs и активному изучению. Paused job не меняется и не запрещает настройку последующих этапов.

- [ ] Написать `plus one preserves practice and other skills`: база beatmaking 20 + practice 5,4 → итог 26,4, practice по-прежнему 5,4; остальные поля deepEqual. Для 99,7 результат 100; для 100 действие без изменения.
- [ ] Написать `locked genre and active job reject edits`, `paused snapshot remains unchanged`, `storage failure shows no success`. Тестировать profile-save и pc-save отдельно: функция меняет только один store, двухфазная запись обоих не нужна.
- [ ] Запустить `node --test test/test-skills.test.js test/test-skills-view.test.js`; получить FAIL.
- [ ] Реализовать reducer и панель по существующему DOM-подходу проекта: верхняя кнопка «+», accessible name «Тестовые навыки», заголовок с явной пометкой тестового режима, «+1» у строк, фокус, Escape, возврат фокуса.
- [ ] Встроить сохранение через `saveProfile(nextProfile)` или `persistPc(nextPc,{atomic:true})` по store; обновлять `profile`/`pcState`, UI и метаданные только после успеха. Добавить панель в `homeModalOpen`, закрывать при смене режима/новой игре; блокировать клик сквозь неё в сцену.
- [ ] Прогнать тесты до PASS; проверить повторные нажатия, дробные значения, открытие жанров на 25 и сохранение после перезагрузки. Готовые проекты и версии до/после повышения должны иметь одинаковые сериализованные данные.
- [ ] Независимое ревью и локальный commit `feat: add local per skill test controls`.

### Task 9: Сквозная проверка, версия клиента и завершение переноса

**Files:** создать `test/abstract-integration.test.js`, `docs/qa/2026-10-20-abstract-audio-progression.md`; обновить `test/client-module-version.test.js`, `index.html` и замыкание затронутых импортов. Отчёты и демо — `artifacts/abstract-20261020/`, без включения медиа в Git.

**Interfaces:**
- Использует существующие `createBeat`, `startCreativeChain`, `startVocalWork`, `captureTrackVersion`, `createAudioExport`, `ensureNpcRoundTrack`, `npcPlaybackDescriptor`.
- Проверка реестра: каждый reachable source ID разрешается в файл с ожидаемым хешем; старые источники остаются доступными.
- `verification.json` содержит `{batch,manifestSha256,preparedManifestHashes,testsPassed,browserPassed,assetsVerified,approvedSourceRows}`. Финализатор задачи 1 принимает только отчёт этой партии, соответствующий текущим байтам; наличие JSON само по себе не заменяет проверки.

- [ ] Написать `abstract recording survives submit export and reload`: четыре фиксированных семейства, нулевой и высокий жанровый навык, Даниил и новая Kapa; сравнить family/indices/source IDs/execution/duration до и после сохранения, экспорта и захвата версии. Архивные версии неизменны.
- [ ] Написать `new npc voice is persistent and never the hero voice`: пройти штатный генератор соперников для каждого голоса героя и двух раундов; проверять постоянство голоса и разные дубли. Совместимость Abstract с NPC проверять через общий createBeat/descriptor-контракт, не переназначая стиль существующим участникам.
- [ ] Запустить `node --test test/abstract-integration.test.js` до исправлений. Если обнаружены разрывы контрактов, сохранить исходный FAIL, исправить их и повторить до PASS. Если предыдущие задачи уже обеспечивают интеграцию, сохранить успешный результат; не создавать искусственный дефект ради красного теста.
- [ ] Повысить клиентскую ревизию до 49 для изменённых модулей, импортирующего замыкания и новых стилей. Не менять ревизию не затронутых ресурсов; каждый модуль должен иметь один канонический URL. Проверить `test/client-module-version.test.js` и отсутствие Node-only импортов в браузерном графе.
- [ ] Запустить полный `npm test` с логом на D:. Требуется exit 0 и ноль failing tests; прежний результат тестов не засчитывается. Отдельно проверить исходные hashes, все манифесты, 43 рецепта, 13 лидов, 51/48 пригодных дублей и отсутствие неразрешённых изменений.
- [ ] Через доступное браузерное управление открыть изолированный тестовый origin, не очищая localStorage пользователя. Проверить создание героя, шесть голосов, нули, «+1», отказ активной работы, паузу, выбор Abstract на 25, четыре семейства, сохранение/загрузку, публикацию и воспроизведение вложения. Зафиксировать ошибки консоли/ресурсов доступными средствами.
- [ ] Подготовить локальные примеры четырёх семейств с Даниилом и исправленной Kapa, проверить стыки и соотношение громкости. Если прослушивание инструментально недоступно, явно отметить это ограничение и дать примеры пользователю; не выдавать измерения за прослушивание.
- [ ] Выполнить итоговое независимое ревью всех изменений относительно сохранённого рабочего baseline. Устранить замечания, повторить затронутые проверки и полный suite при изменениях общих контрактов.
- [ ] Только после успешных технических и браузерных проверок сформировать `verification.json`; выполнить финализатор сначала без `-Apply`, проверить список, затем с `-Apply` для согласованных исходных путей. При необходимости использовать разрешённое повышение прав для D:\Music, не обходя файловую политику. Отказ удаления отдельного файла не должен отменять сохранённую копию или приводить к удалению соседних файлов.
- [ ] Повторно проверить источники/назначения и все исключения. Записать фактические числа переноса и оставшиеся файлы. Сообщить пользователю, что исходные копии удалены только после проверки и восстанавливаются из `stems/source-library/`.
- [ ] Локальный commit `test: verify abstract audio and progression integration`; финальный ответ с локальной ссылкой, расположением «+», результатами тестов и остаточными ограничениями. Не выполнять push.

## Самопроверка плана

- Исходники и безопасный перенос: задачи 1, 2, 9.
- Согласованные семейства, соседние номера, intro/outro: задачи 2, 5, 9.
- Голоса, очередь без повторов, старая Kapa и pending jobs: задача 3.
- Нулевые навыки и сохранение старых карьер: задача 4.
- Жанровые слоты и предел 100: задача 5.
- Точная кривая, удвоенный жанровый опыт, сохранение кредитов: задача 6.
- Ограничение исполнения и сохранённые версии аудио: задача 7.
- Тестовые повышения, persistence и доступность интерфейса: задача 8.
- Общая проверка, браузер, локальные примеры и отсутствие публикации: задача 9.

Метод исполнения уже выбран пользователем: субагент-исполнитель и независимая проверка каждой задачи. Перед началом реализации требуется просмотр этого плана пользователем согласно `writing-plans`.
