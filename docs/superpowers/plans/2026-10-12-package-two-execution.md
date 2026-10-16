# Package Two — Ordered Execution Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. No implementer subagents. Steps use checkbox syntax.

**Goal:** Продолжить готовую квартиру/соцсеть до честного финала турнира и исследования соперников; отдельно показать нехватку голосовых материалов.

**Architecture:** Расширять текущие ES-модули и единое сохраняемое состояние ПК. Чистый турнир выдаёт датированные события, публичные селекторы скрывают будущие/закрытые данные. Текст, анализ и социальные сценарии связываются через неизменяемые версии и RoundKey.

**Tech Stack:** Vanilla JS, Three.js, Web Audio, Node tests, localStorage, isolated Edge/Playwright. Рабочие файлы на D:.

**Spec:** `docs/backlog/2026-10-12-implementation-handoff-v2.md`, `BACKLOG_V2.md`. Три исходных плана ниже являются обязательными частями этого плана: их блоки Files, Interfaces и все шаги исполняются полностью, не заменяются кратким индексом.

## Authority and execution

Пользователь прямо поручил после текущих исправлений самостоятельно прочитать готовый бэклог чата «Найти аналоги Battle Life» и сразу реализовать его без обращений к нему. Это разрешение на реализацию и технические решения, но не разрешение выдавать рабочую калибровку за авторское подтверждение. Исходные планы/спеки сохраняются; данный документ задаёт общий порядок и адаптации к rev39.

Исходные планы:

- R: `docs/superpowers/plans/2026-10-12-package-two-research.md`.
- T: `docs/superpowers/plans/2026-10-12-package-two-tournament.md`.
- S: `docs/superpowers/plans/2026-10-12-package-two-social-content.md`.

До каждой задачи прочитать её полный R/T/S блок, связанные обязательные спецификации и актуальный код. Каждая задача: воспроизводящий RED → минимальная реализация → GREEN всех перечисленных проверок → точечный commit → запись в `docs/backlog/implementation-v2-status.md`. Тяжёлый общий прогон после интеграции и исправлений; native проверки по риску задачи. Не менять старые ожидания только ради зелёного вывода.

## Global Constraints

- Существующий checkout `codex/sloboda-workflow-design` на D:, без push/reset/публикации. Никаких новых пользовательских чатов или сообщений людям.
- 32 места: 32 NPC плюс герой на реальном отборе. Нет гарантированного прохода героя, скрытого ослабления или пересева.
- 5 оценок до 10 с шагом 0.5 на отборе; нечётные полные панели, бинарные голоса в парах, без ничьих. Исторический архив не меняется.
- `contentMix={topic,diss,lyric}`, сумма100; effectiveWritingSkill<25 — случайно один раз, от25 — ручное управление. Это доли, не качество.
- Пары открыты ровно7×1440 минут. Судьи:6hтишины,7h3%,далее+3п.п./час до100%; не позже40h. Следующий анонс+24hпосле последнего судьи, не после чтения результата.
- Двойная несдача: оба выбывают, красные строки обоих, пустая ветка распространяется, история сохраняется. NPC не пропускают полуфинал/финал.
- Новые правила версионируются. Опубликованные старые аудио/оценки/темы не пересчитываются; загрузка не перебрасывает результат. Ошибка persist не публикует неподтверждённое событие.
- Голоса NPC отсутствуют: не присваивать им54геройские партии. Предпросмотр бита явно подписан; BL-026/039 по аудио остаются незавершёнными до материала. BL-002 зависит от автора; удалённые FL-лупы не возвращать.
- Досье/таблицы показывают только публичные факты и субъективные гипотезы, не истинные статы или будущие отзывы. Установка/удаление приложения не стирает знания.
- Параметры §5 спеки принимаются как первая настраиваемая политика, все изменения фиксируются в журнале. Вне пакета сюжет, экономика, аудитория, оборудование и карьера после турнира.

## Review Focus

1. Старый опубликованный результат при загрузке и отказе quota остаётся неизменным; повреждённая часть изолируется, весь ПК не сбрасывается. Задачи2–5/15.
2. Отправка/набор переживают смену раунда: одна попытка на RoundKey, прошлое сообщение не блокирует новую работу и не попадает в новый раунд. Задачи3/15.
3. Крупный скачок времени равен мелким шагам, включая пустые ветки, последнего судью и +24hанонс; нет утечек будущих событий. Задачи3–6/11–12/15.
4. Отчёт/профиль/таблица не раскрывают скрытые значения через DOM, сортировку, tooltip, экспорт; повтор источника не даёт опыт. Задачи6–10/15.
5. Отсутствующий голос/обложка не объявляются готовым контентом; старый recipe не заменяется после появления файлов, NPCvoice не берётся из героя. Задачи2/14–15.

### Task 1: R1 — бюджет текста и первая политика (P0/P1)

**Files/Interfaces/steps:** полный блок R1 исходного плана R; дополнительные UI-тесты `test/text-content-mix-view.test.js`, политика `data/analysis/demo-v2-policy.json`.

- [ ] Записать базовый HEAD,23/23 исходных проверок и решения §5. Прочитать полный R1.
- [ ] RED для суммы100, порога24/25 с практикой, связанных ползунков, замороженной версии и симметрии штрафа. Пример: `assert.equal(textMixRetention({topic:40,diss:35,lyric:25},{topic:50,diss:30,lyric:20},1),.9)`.
- [ ] Реализовать R1. Новый текст получает один mix от сохранённого seed; ручные правки только до начала работы. Для готового/частично написанного текста явное создание новой содержательной версии с повторной работой, без изменения старого snapshot и без бесплатного роста качества.
- [ ] Legacy без mix сохраняется без выдуманной доли; отдельный новый черновик переводит на новые правила. До25 UI не показывает ползунки/пресеты, после25 показывает связанный бюджет с шагом10.
- [ ] Run `node --test test/text-content-mix.test.js test/text-content-mix-view.test.js test/lyric-production.test.js test/judge-evaluation.test.js test/track-version.test.js test/lyric-work.test.js`; Expected:0fail. Native24/25 и сохранённая заявка. Commit+журнал.

### Task 2: T1 — стабильные участники и работы NPC (P2)

**Files/Interfaces/steps:** полный T1 плана T. Consumes Task1 facts/contentMix; produces persisted NPC TrackVersion.

- [ ] Прочитать T1 и его локальный пул; выполнить все RED/GREEN шаги, сохранять спорные алиасы отдельно.
- [ ] Run `node --test test/battle-npc.test.js test/battle-npc-audio.test.js`; Expected:0fail. Реальный playback доступного бита и missing voice. Commit+журнал.

### Task 3: T2 — отбор, сетка, окна, несдачи (P3)

**Files/Interfaces/steps:** полный T2 плана T. Также расширить новые `social-upload.js`, `social-composer.js`, `social-submission-validation.js`: их selection-only guards теперь должны принимать текущий валидный RoundKey, не произвольную строку.

- [ ] Все T2 RED/GREEN шаги, плюс вторая загрузка/набор/сдача после первого раунда и deadline change.
- [ ] Run `node --test test/battle-seeding.test.js test/battle-tournament.test.js test/battle-no-show.test.js test/social-submission.test.js test/social-upload.test.js test/social-composer.test.js test/battle-roster.test.js test/virtual-pc-recovery.test.js`; Expected:0fail. Commit+журнал.

### Task 4: T3 — почасовая публикация судей (P3)

**Files/Interfaces/steps:** полный T3 плана T. Durable boundary сохраняет и внутренние решения, не только видимые события.

- [ ] Все T3 RED/GREEN шаги, включая6/7/40/64h, catch-up, quota и старое расписание.
- [ ] Run `node --test test/battle-judging-clock.test.js test/social-judging-events.test.js test/phone-notifications.test.js test/phone-social-queue.test.js test/social-runtime.test.js test/virtual-pc-runtime.test.js`; Expected:0fail. Commit+журнал.

### Task 5: T4 — бинарные голоса и LTR (P3)

**Files/Interfaces/steps:** полный T4 плана T. Consumes Task1 retention and Task2 frozen qualities.

- [ ] Все T4 RED/GREEN шаги, в том числе exact tie и LTR8.59>8.51 до округления.
- [ ] Run `node --test test/judge-pair-decision.test.js test/battle-round-awards.test.js test/judge-evaluation.test.js test/judge-comments.test.js`; Expected:0fail. Commit+журнал.

### Task 6: T5 — публичная таблица и история (P4)

**Files/Interfaces/steps:** полный T5 плана T; единая filtered public projection.

- [ ] Все T5 RED/GREEN шаги, обе красные строки и история двойной несдачи после reload.
- [ ] Run `node --test test/battle-results-table.test.js test/battle-history.test.js test/social-result-view.test.js test/social-routing.test.js`; Expected:0fail. Native маршрут таблицы. Commit+журнал.

### Task 7: R2 — доступ к профилям (P4)

**Files/Interfaces/steps:** полный R2 плана R. Six of32personal profiles as working rounding; photos supplied Task14.

- [ ] Все R2 RED/GREEN шаги, общая identity человека-судьи/участника и calendar visibility.
- [ ] Run `node --test test/social-profile-policy.test.js test/npc-social-profiles.test.js test/social-routing.test.js test/social-view.test.js`; Expected:0fail. Native переходы. Commit+журнал.

### Task 8: R3 — изучение трека за время (P5)

**Files/Interfaces/steps:** полный R3 плана R.45game minutes, persisted heroSnapshot/reports; no new skill.

- [ ] Все R3 RED/GREEN шаги, pause/resume, unique-source credit, novice/advanced perception and supersedes.
- [ ] Run `node --test test/rap-analysis.test.js test/rap-analysis-runtime.test.js test/creative-chain-runtime.test.js test/virtual-pc-recovery.test.js`; Expected:0fail. Native paid study+reload. Commit+журнал.

### Task 9: R4 — устанавливаемое Рэп-досье (P5)

**Files/Interfaces/steps:** полный R4 плана R. Software id dossier, app rap-dossier; shared existing installer.

- [ ] Все R4 RED/GREEN шаги, uninstall keeps observations/history; reinstall no duplicates.
- [ ] Run `node --test test/rap-dossier.test.js test/rap-dossier-software.test.js test/rap-dossier-view.test.js test/pc-software.test.js test/pc-software-lifecycle.test.js test/rap-notebook-integration.test.js`; Expected:0fail. Native installation/source return. Commit+журнал.

### Task 10: R5 — гипотезы о судье (P5)

**Files/Interfaces/steps:** полный R5 плана R. Only same-version published review+finished analysis evidence.

- [ ] Все R5 RED/GREEN шаги, zero insight at low competence, contradictions, no hidden values or repeat credit.
- [ ] Run `node --test test/judge-dossier-analysis.test.js test/rap-analysis.test.js test/rap-dossier.test.js test/battle-results-table.test.js`; Expected:0fail. Native evidence study. Commit+журнал.

### Task 11: S1 — темы, авторы и анонсы (P6)

**Files/Interfaces/steps:** полный S1 плана S; exact30+30catalog, same theme across all consumers.

- [ ] Все S1 RED/GREEN шаги, grammar/cover word matching, no future author or post.
- [ ] Run `node --test test/round-topics.test.js test/battle-tournament.test.js test/social-runtime.test.js`; Expected:0fail. Native announcement→judge→text. Commit+журнал.

### Task 12: S2 — малые социальные сценарии (P6)

**Files/Interfaces/steps:** полный S2 плана S;240+16existing and80new replies, fixed audiences.

- [ ] Все S2 RED/GREEN шаги; A100/H80 gives8reader comments;H20 gives2;25background votes, no future counters.
- [ ] Run `node --test test/social-reactions.test.js test/social-reaction-timeline.test.js test/social-wall.test.js test/social-view.test.js test/social-runtime.test.js`; Expected:0fail. Native early/late days. Commit+журнал.

### Task 13: S3 — безопасная реакция героя (P6)

**Files/Interfaces/steps:** полный S3 плана S; extend existing queue, one scene/post per actual outcome.

- [ ] Все S3 RED/GREEN шаги, modal/work/transition and failed persistence, actual quote/audio only.
- [ ] Run `node --test test/social-result-reaction.test.js test/result-autopost.test.js`; Expected:0fail. Native good/bad/off-PC outcome. Commit+журнал.

### Task 14: S4 — обложки, фото и голосовой реестр (P7)

**Files/Interfaces/steps:** полный S4 плана S. Read imagegen skill before creating20covers; game model for NPCphotos.

- [ ] Все доступные S4 шаги;20realimages,3–4photos each personal appearance; inspect every asset. Do not invent recordings or rights.
- [ ] Run `node --test test/battle-content-manifest.test.js test/battle-npc-audio.test.js`; Expected:0fail for available manifest, explicitly reported missing voices. Commit+журнал with BL-026/039 audio waiting.

### Task 15: S5 — сквозная приёмка и калибровка (P8)

**Files/Interfaces/steps:** полный S5 плана S. Also coherent client cache update and native QA script under tools/.

- [ ] Все S5 сценарии,50works/comments sample, strong and novice fixtures without rule exceptions, legacy recovery.
- [ ] Run `node --test test/package-two-demo.test.js`, then `npm test`; Expected:0fail. Real-browser full path, no personal browser storage changes.
- [ ] One independent read-only review of this package, fix Important/Critical with RED→GREEN and fullsuite; ledger Minor separately.
- [ ] Record exact commits, evidence, chosen calibration and missing assets in journal/BACKLOG_V2/README. Local commits only; report completed mechanics separately from unavailable voices. Do not call missing material completed.

## Self-review

All22cards map to the original R/T/S tasks. The only ordering wrapper is R1→T1–T5→R2–R5→S1–S5. New current-package upload/composer guards were added explicitly to Task3; they did not exist when the neighboring plan was written. Domain clocks, identity, versions and public selectors are shared. P0 is folded into Task1, not a separate product feature. Content dependency does not stop independent mechanics.
