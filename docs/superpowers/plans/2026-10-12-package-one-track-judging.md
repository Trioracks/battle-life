# Пакет №1: версии треков и судейство — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Выполнить BL-008–BL-013: импорт, профили, культурные мотивы, подтверждаемые свойства треков и индивидуальное судейство.

**Architecture:** Исходные данные компилируются в проверяемый локальный архив. Производство создаёт результаты и факты; прикрепление замораживает их вместе с воспроизводимым рецептом. Судья читает только версию и собственный профиль, принимает решение, затем выбирает допустимый отзыв.

**Tech Stack:** ES modules, JSON, Node node:test, текущий Web Audio DSP; без серверного генератора текста.

**Spec:** BL-008–BL-013 в `D:/Project/Battle/BACKLOG_V1.md`; `2026-10-12-judge-behavior-guide.md`, `2026-10-12-live-judge-comments.md`, `judge-comment-policy-v0.2.json` в `D:/Project/Battle/docs/backlog/`; [общий план](2026-10-12-package-one-remaining.md).

## Global Constraints

Все ограничения общего плана обязательны. BL-002 вне исполнения. Качества 0–10; качество бита 100→10 и 110→10; вокальные 44 не означают идеальные 10. null означает неизвестное, не ноль. Исторические numericWeights:null не заменять придуманными измерениями.

## Review Focus

1. Ноль, пустая ячейка, формула итога и перекрёстный адресат отзыва — J1.
2. Высокие ползунки при слабом навыке, legacy без фактов, текст изменён после записи — J4/J6.
3. Источник из будущего, незнакомая отсылка, исчерпание мотивов — J3/J6.
4. Одинаковый округлённый балл при различном raw, два штрафа за один факт — J5.
5. 50 похожих работ, reload между отзывами, нехватка допустимых свежих фраз — J6.

## Общие контракты

J4 определяет JSDoc в `src/track-version.js`, J5 — в `src/judge-evaluation.js`; TypeScript toolchain не добавлять.

- **TrackVersion:** `{schemaVersion:1,id,trackId,createdAtMinute,sourceRevision:{beat,lyrics,vocal},recipe,qualities,facts,legacy}`.
- recipe `{beat,lyrics,descriptor,dspVersion}` — глубокие JSON-копии; descriptor совместим с текущим resolveBeatPlayback. qualities `{text,performance,music,sound}` — 0–10 либо null у неизвестных старых данных.
- facts `[{id,key,value,origin,evidence}]`; origin: production-simulation / audio-recipe / source-metadata / legacy-observed. Evidence — конкретное поле/стадия/версия, не мнение судьи.
- ID версии повторно используется при неизменной канонической подписи recipe+facts. Для сравнения хранить полную подпись, не доверять только 32-битному hash. Название проекта не ID.
- **JudgeProfile:** `{id,weights:{text,performance,music,sound},strictnessOffset,formatAdherence,attention,voice,lengthWeights,knowledge,sourceRefs,hypothesisNotes}`. Веса положительные, нормированные; formatAdherence0–1; knowledge — игровое знание, не биография реального человека.
- **JudgeResult:** `{id,judgeId,battleId,roundId,trackVersionId,opponentTrackVersionId,personalQuality,formatPenalty,raw,grade,decision,evidenceIds,comment,templateIds,families,seed}`. decision.kind: grade / pair_vote / tie; точное равенство не превращать в придуманный голос. Рендер не меняет результат.

## J1. Архив, идентичности и нечётные панели — BL-008

**Files:** Create `tools/import-battle-archive.mjs`, `data/battle-archive/manifest.json`, `data/battle-archive/makarevich-1.json`, `src/battle-roster.js`, `test/battle-archive.test.js`, `test/battle-roster.test.js`.

**Inputs:** JSON battle-judging-source, battle-participants-source, judge-observations, judge-review-corpus, judge-comment-attribution, judge-profiles и demo-opponent-pool-v0.1 из основного checkout. XLSX повторно не скачивать.

**Interfaces:**
- `importBattleArchive(inputDirectory) -> {archive,manifest,diagnostics}`; импорт модуля не пишет файлы.
- `battleRoster(roundId) -> {judgeIds,excludedJudgeIds,collectiveChannels}`.
- `rankSelection(entries,results,{limit:32}) -> {qualifiedIds,tiedAtBoundary}`; число заявок не ограничено 32, герой без привилегии.

IDs этапов: selection, round-2, round-3, round-4, round-5, final. Числовое равенство и отсутствующий результат — разные состояния.

- [ ] Написать tests: null !==0; 0/1 = pair_vote; 101/100 — два представления одного отбора; 1430raw и 1031+6canonical не удваиваются. Финальные C3/C4, U3/U4, V3/V4 меняют адресата текста, не голос строки. Спорные B12/B13 не исправляются догадкой.
- [ ] Run `node --test test/battle-archive.test.js test/battle-roster.test.js` → RED: отсутствует реализация, не внешний сервис.
- [ ] Реализовать sourceRefs и явную карту алиасов с unresolved. «ок» не объединять с «охуенно культурный». Панели `[5,13,17,19,23,21]`; НАРОД отдельно; все исходные участия сохраняются, каждому не создаётся активная социальная жизнь.
- [ ] Test rank на 201 заявке: герой на 20 месте проходит, на 40 нет; qualified ровно 32 без граничной ничьей. Равенство на 32/33 возвращает tiedAtBoundary, не выбирает по имени/порядку входа.
- [ ] Повторный импорт идентичен, все sourceRefs разрешаются. GREEN; commit `feat: import battle archive and odd judge rosters`.

## J2. Все индивидуальные игровые профили — BL-009

**Files:** Create `src/judge-profiles.js`, `data/judges/profiles.json`, `docs/qa/package-one-judge-provenance.md`, `test/judge-profiles.test.js`.

**Interfaces:** `judgeProfile(id) -> JudgeProfile|null`; `validateJudgeCoverage(rounds,profiles) -> Diagnostic[]`. ID только из J1, без нечёткого сравнения имён в рантайме.

- [ ] Tests: каждый ID активных панелей имеет ровно один профиль; finite веса>0, сумма 1; adherence∈[0,1]. Нет performerSkills, выведенных из судейства; похожий тон не требует одинакового adherence.
- [ ] Run `node --test test/judge-profiles.test.js` → RED.
- [ ] Прочитать подробные карточки и sourceRefs. Стартовые четыре вектора: епархия 40/25/25/10, Клим 20/35/35/10, свиноферма 50/30/10/10, 33-й 25/30/30/15. Для остальных заполнить различимые внимание/манеру/длины/веса с объяснением и уверенностью. При недостатке данных, особенно у атаки трупа, явно обозначить авторскую игровую настройку.
- [ ] Записать formatAdherence/strictness в data+provenance, не случайно при оценивании и не из количества мата. Знания J3 расширяют конфигурацию с номером версии; не исследовательскую биографию.
- [ ] GREEN, ручная сверка индивидуальности и полного состава; commit `feat: add evidence-linked game judge profiles`.

## J3. Культурные мотивы и история использования — BL-012

**Files:** Create `data/references/catalog.json`, `docs/research/package-one-reference-sources.json`, `src/cultural-references.js`, `test/cultural-references.test.js`, `tools/audit-cultural-references.mjs`.

**Interfaces:**
- `availableReferences({gameDate,knownTopics,theme},catalog) -> Reference[]`.
- `chooseTrackReferences({seed,gameDate,knownTopics,theme,history,limit},catalog) -> {uses,history}`.
- Reference `{id,sourceId,group,title,motif,themes,mood,availableFrom,obviousness,uses:{organic,strained}}`; provenance/проверенные URL отдельно от save.
- Saved use `{referenceId,sourceId,fit,clarity,placement,origin:'production-simulation'}`; новый источник при судействе не выбирается.

- [ ] Tests: ≥200 смысловых записей; 8 групп, каждая≥15: литература, кино/сериалы, музыка, игры, анимация, история/мифология, интернет-культура, быт/масскультура. IDs и sourceId+motif уникальны, organic/strained различимы; будущее недоступно на 2012-09-01.
- [ ] Run `node --test test/cultural-references.test.js` → RED.
- [ ] Наполнить каталог реально разными мотивами. Проверить название/смысл/дату по надёжным источникам через web и записать происхождение; спорное исключить. Не копировать большие фрагменты произведений; перестановка слов не новая запись. Runtime работает офлайн.
- [ ] Подбор учитывает тему, известные герою области и историю. Если подходящий выбор есть, мотив не чаще 2 раз в последних 50 работах; при исчерпании допустим текст без отсылки, а не из будущего. Стартовые knownTopics явные и не равны всей библиотеке.
- [ ] Прогон 50 работ по темам района/денег/соперничества/памяти: одинаковый seed+history воспроизводим, мотивы допустимы, reload сохраняет историю. Ручная проверка смысловых дублей сверх проверки строк. GREEN+audit; commit `feat: add dated cultural references and selection history`.

## J4. Производственные факты и замороженная версия — BL-013

**Files:** Create `src/production-outcomes.js`, `src/track-version.js`, `src/track-version-audio.js`, `test/production-outcomes.test.js`, `test/track-version.test.js`, `test/track-version-audio.test.js`; Modify `src/lyric-production.js`, `src/beat-result.js`, `src/beat-production.js`, `src/vocal-result.js`, `src/vocal-production.js`, `src/beat-playback.js`, `src/beat-audio.js`, `src/virtual-pc-state.js`, `test/helpers/submission-fixtures.js`.

**Interfaces:**
- `lyricOutcomes({project,stage,seed,referenceUses}) -> ProductionOutcome`.
- `beatOutcomes({result,recipe,descriptor}) -> ProductionOutcome`.
- `vocalOutcomes({take,recording,descriptor}) -> ProductionOutcome`.
- `captureTrackVersion(state,{projectId,nowMinute}) -> {ok,state,versionId,reason}` сохраняет state.trackVersions, не mutable project.
- `normalizeTrackVersions(raw) -> {byId,recovery}` без случайности/современных навыков.
- `playTrackVersion(audio,version) -> Promise<{ok,reason}>` воспроизводит frozen descriptor через текущий BeatAudio и проверенные asset IDs, без state.projects.

- [ ] Tests: attach→edit text/add master/delete project/train/reload не меняет версию/descriptor; повторный attach неизменного проекта даёт тот же ID; изменение записи — новый. Внешняя мутация не меняет deep copy.
- [ ] Assertions: music100→10,110→10; merged vocal44 не превращается в 10 по двум осям; поздние skills100 не меняют inputs. Run `node --test test/production-outcomes.test.js test/track-version.test.js test/track-version-audio.test.js` → RED.
- [ ] Девять текстовых результатов сохранять по окончании стадии: `skill*(.55+.45*(1-abs(slider-target)/10))`, targets `[8,7,6]`, `[8,8,5]`, `[8,7,5]`. Сюжет/тип рифмы/образы — детерминированные факты симуляции только при соответствующем действии; не буквально услышанные слова пользовательского вокала.
- [ ] Музыкальные/технические факты брать из recipe/DSP/form: стадии, окна формы, timing warp, detune, уровень вокала, обработка. При извлечении общего DSP-helper доказать тождество samples до/после. Не заявлять клиппинг/исчезновение мелодии по общему quality. Для 21 семейства хранить known/unknown; неизвестное не активирует отзыв.
- [ ] Разделить художественное исполнение и запись: timing/diction/delivery — по сохранённым flow/musicality/confidence и решениям дубля, аппаратный потолок — technical sound. Сохранить слышимый текущий DSP и −2/−1/+0,5dB; новый баланс эффектов вне этого пакета.
- [ ] Вычислить четыре оси из произведённого результата с evidence. Legacy — ограниченные подтверждаемые свойства, missing axis=null. Новый сохранённый дубль не пересчитывать по современным константам в normalizer; версионировать результат, сохранить reader старого.
- [ ] Backup-before-write: valid старая сдача становится frozen version; retired-source остаётся недоступным с recoveryData, без подмены. Ошибка quota не уничтожает исходный save. Проверить, что production normalizers сохраняют новые поля/refs при продолжении цепочки и не начисляют XP снова.
- [ ] GREEN профильных и старых beat/vocal/creative/submission тестов; native decode сохранённого рецепта; commit `feat: persist production evidence and immutable track versions`.

## J5. Формат, Анализ и личная математика — BL-011/010

**Files:** Create `src/battle-format.js`, `src/battle-knowledge.js`, `src/judge-evaluation.js`, `test/battle-format.test.js`, `test/battle-knowledge.test.js`, `test/judge-evaluation.test.js`; Modify `src/virtual-pc-state.js` для знаний.

**Interfaces:**
- `battleFormat(battleId,roundId) -> FormatProfile` с осями diss_addressing/text_approach/genre_profile/sound_aesthetic и отдельными hardRules.
- `revealBattleKnowledge(knowledge,{battleId,roundId,analysisSkill,evidenceId}) -> knowledge`; evidenceId идемпотентен, профиль не меняется.
- `evaluateTrack(version,judge,format,{opponent=null}) -> JudgeResultWithoutComment`.
- `perceiveTrack(version,judge,history,catalog) -> {observations,knownFactIds,recognizedReferences}`.

- [ ] Math tests: neutral[9,5,3,2]→4.75 и[4,6,6,5]→5.25; weights.6/.2/.1/.1 дают 6.9>4.7; .1/.2/.6/.1 дают 3.9<5.7. Q7.2,mismatch.8,cap1.5,adherence0/.3/1→7.2/6.84/6.0.
- [ ] Run `node --test test/battle-format.test.js test/battle-knowledge.test.js test/judge-evaluation.test.js` → RED.
- [ ] Реализовать weighted mean → один суммарный penalty → display clamp/half-step/strictness. Pair сравнивает raw, без случайного шума. Missing axis исключается из среднего с limitedEvidence; все missing — ошибка оценивания, не ноль.
- [ ] Tests: отсутствие дисса/адресности не дублируется; жанр не дисс, эстетика не technical quality, мат не penalty. Перестановка пары не меняет победителя; точное равенство возвращает tie. Незнакомый источник сам по себе не снижает оценку.
- [ ] Скрытый профиль не отдавать в DOM; показывать качественные подсказки/уверенность по знаниям. Временный analysisSkill — существующий интеллект. Grade до/после изучения идентичен, repeated evidence не добавляет знание дважды.
- [ ] GREEN; commit `feat: evaluate saved tracks with judge taste and battle format`.

## J6. Отзывы всех панелей и разнообразие — BL-010/009

**Files:** Create `src/judge-comments.js`, `src/judge-comment-conditions.js`, `data/judges/comments.json`, `tools/audit-judge-comments.mjs`, `test/judge-comments.test.js`, `test/judge-comment-novelty.test.js`; Modify `src/virtual-pc-state.js` для истории результатов.

**Interfaces:**
- `eligibleJudgeComments({version,judge,evaluation,perception,history},bank) -> CommentTemplate[]`.
- `generateJudgeReview(input,{seed,history}) -> {result:JudgeResult,history,diagnostics}`.
- `finalizeJudgePanel({battleId,roundId,versionIds,judgeIds,results}) -> {complete,resultsByVersion,totals,events}`; complete только после всех ожидаемых решений.
- Template `{id,judgeId,trigger,conditions,family,length,text,sourceRef}`; именованные предикаты, не eval строк из JSON.

- [ ] Tests для каждого requires исходных банков: unknown не good/bad; «читал» только при knownSource; история только после известной версии; дикция требует слышимости; нет выдуманных строк/таймкодов. Использовать реальные результаты fixtures J4.
- [ ] Run `node --test test/judge-comments.test.js test/judge-comment-novelty.test.js` → RED.
- [ ] Перевести условия 324 авторских строк в предикаты; сохранить row sourceRef, не историческую цитату. Карта 62triggers→facts/observations. Неподдержанные факты блокируют строку; не упрощать requires ради количества.
- [ ] Наполнить индивидуальные банки всех остальных активных судей по J2. Перед активацией проверить каждую панель: четыре исходных банка не закрывают остальных. Частые условия расширять содержательно, не суффиксами одинаковой фразы.
- [ ] Сначала решение, затем фокус/манера/длина/история. Часто одна реакция; нет обязательного перечисления критериев/совета. На поздних этапах средняя длина выше, индивидуальность сохраняется. Сохранить result, templateIds/families/focus/length/text/knownFacts и seed один раз.
- [ ] Прогнать 50 разных и 50 повторяющихся fixtures для каждого активного судьи: неподтверждённых утверждений 0, placeholders0, нет templateId вокне 12; одна family≤2 подряд при нескольких доступных фактах. Если факт единственный, не выдумывать другой ради новизны: diagnostic и расширение банка до приёмки.
- [ ] Отчёт: точные/близкие повторы (token shingles), фокус/длина/refs, ограниченные legacy. Отдельный длинный прогон четырёх исходных судей. Reload и повторное открытие не расходуют историю/не меняют отзыв. GREEN+`node tools/audit-judge-comments.mjs`; commit `feat: add grounded judge reviews with persisted novelty history`.

## Минимальные числовые assertions для RED-шагов

Эти проверки дополняют сценарии соответствующих задач, не заменяют их. `assert` — node:assert/strict; остальные имена — интерфейсы выше. ProductionOutcome имеет `{schemaVersion:1,components,qualities,facts,availability}`; components содержит результат и evidence для каждого поддержанного аспекта, availability явно помечает остальные unknown.

J1, `odd panels preserve archive sizes separately`:

```js
const ids = ['selection','round-2','round-3','round-4','round-5','final'];
assert.deepEqual(ids.map(id => battleRoster(id).judgeIds.length), [5,13,17,19,23,21]);
assert.equal(battleRoster('round-2').excludedJudgeIds.length, 1);
```

J2, `one stable valid profile for every panel member`:

```js
const p = judgeProfile('eparhiya');
assert.deepEqual(p.weights, {text:.4, performance:.25, music:.25, sound:.1});
assert.equal(validateJudgeCoverage(rounds, profiles).length, 0);
assert.ok(profiles.every(p => p.formatAdherence >= 0 && p.formatAdherence <= 1));
```

Здесь rounds — игровые составы J1, profiles — полный авторский набор J2, а не четыре исходные карточки.

J3, `dated meaningful catalog and eight covered groups`:

```js
assert.ok(catalog.length >= 200);
const groups = new Set(catalog.map(r => r.group));
assert.ok(groups.size >= 8);
for (const group of groups) assert.ok(catalog.filter(r => r.group === group).length >= 15);
assert.equal(new Set(catalog.map(r => r.id)).size, catalog.length);
```

J4, `repeat attachment reuses snapshot but later editing cannot mutate it`:

```js
const saved = captureTrackVersion(submissionFixture(), {projectId:'beat', nowMinute:600});
assert.equal(saved.ok, true);
const frozen = JSON.stringify(saved.state.trackVersions.byId[saved.versionId]);
const again = captureTrackVersion(saved.state, {projectId:'beat', nowMinute:601});
assert.equal(again.versionId, saved.versionId);
saved.state.projects.find(p => p.id === 'lyrics').name = 'Другая работа';
assert.equal(JSON.stringify(saved.state.trackVersions.byId[saved.versionId]), frozen);
```

J5, `personal mean before bounded format penalty`:

```js
const personal = [.6,.2,.1,.1].reduce((sum, w, i) => sum + w * [9,5,3,2][i], 0);
assert.ok(Math.abs(personal - 6.9) < 1e-9);
// В тесте функции проверить те же значения через evaluateTrack на версии J4.
assert.ok(Math.abs(evaluation.personalQuality - 7.2) < 1e-9);
assert.ok(Math.abs(evaluation.formatPenalty - .36) < 1e-9);
assert.ok(Math.abs(evaluation.raw - 6.84) < 1e-9);
```

Для последнего evaluation использовать fixture с четырьмя качествами 7.2, всеми мягкими несовпадениями .8 и judge.formatAdherence=.3; это тест реального evaluateTrack, не только повтор формулы внутри теста.

J6, `comment evidence belongs to the submitted version`:

```js
const reviewed = generateJudgeReview(input, {seed:41, history});
assert.equal(reviewed.result.trackVersionId, input.version.id);
assert.ok(reviewed.result.evidenceIds.every(id => input.version.facts.some(f => f.id === id)));
assert.equal(reviewed.diagnostics.unsupportedClaims.length, 0);
assert.ok(!/\{\{.*?\}\}/.test(reviewed.result.comment));
```

Diagnostics содержит unsupportedClaims и noveltyShortages. Для safe legacy допустим общий субъективный отзыв без evidenceIds, но не конкретный выдуманный дефект. Неизвестная dspVersion при воспроизведении возвращает понятное ограничение и сохраняет версию, а не молча пересчитывается новым DSP.
