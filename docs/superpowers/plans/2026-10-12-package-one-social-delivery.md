# Пакет №1: соцсеть, сдача и телефон — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Выполнить BL-003–BL-007 и сквозную проверку пакета: от готовой работы до ответа, судейства и поста с тем же аудио.

**Architecture:** Отдельная соцсеть внутри Underweb, не переименование форума. Действия возвращают новое сериализуемое состояние; один обработчик игровых событий действует и без питания ПК. UI только отображает/отправляет действия, без генерации новых сроков и результатов при render.

**Tech Stack:** Текущие ES modules/DOM/CSS, Web Audio, Node node:test, существующий Playwright+Edge на D:.

**Spec:** BL-003–BL-007 в `D:/Project/Battle/BACKLOG_V1.md`; четыре PNG в `D:/Project/Battle/docs/backlog/references/2026-10-12/`; явные поправки раздела 12 demo-battle-loop; [общий план](2026-10-12-package-one-remaining.md), [контракты трека/судейства](2026-10-12-package-one-track-judging.md).

## Global Constraints

Ровно шесть верхних разделов. Около 20 сообществ,10 ответов администратора, около 20 автопостов — три разных набора. Свободных редакторов сообщений/стены/граффити нет. Attach добавляет личное аудио, send расходует единственную попытку, deadline публикует общественное аудио. Телефон не читает/не удаляет сообщение из диалога. Все ограничения общего плана обязательны; BL-002 вне поставки.

## Review Focus

1. Двойной клик send и неудачная запись localStorage не расходуют две попытки — S3.
2. Ответ запланирован после дедлайна, ПК выключен, сон пересёк оба срока — S3/S4/S5.
3. Чужой закрытый профиль не раскрывает будущие работы через прямой URL — S1/S2.
4. Наведение на телефон не теряется при перерисовке, очередь и непрочитанность независимы — S4.
5. Итог пришёл во время работы/записи: реакция ждёт, не сбрасывает работу/камеру/фокус и не повторяется — S5.

## Общие контракты состояния

- `state.social = {schemaVersion:1,subscriptions,friends,accessibleProfiles,personalAudioIds,dialogs,posts,reactions}`; audio IDs ссылаются на TrackVersion J4, не на projectId.
- `state.battleWindows = [{id,battleId,roundId,opensAt,closesAt,judgeIds,judgingOffsets}]`. opensAt/closesAt — абсолютные игровые минуты `(day-1)*1440+minutes`, окно `[opensAt,closesAt)`.
- `state.battleSubmissions` новая запись `{version:2,id,windowId,battleId,roundId,playerId,trackVersionId,sentAt,ackAt,ackTemplateId,status}`. Отправка после начала окна и строго до deadline. ACK не открывает новую попытку.
- `state.judging = {results,historyByJudge,panelEvents}`; JudgeResult из J5/J6, не новая формула.
- `state.phone = {schemaVersion:1,queue,activeId,hoveredIds,dismissedIds}`; queue содержит ссылки на DomainEvent.
- `DomainEvent = {id,type,dueAt,source,sender,text,entityId,trackVersionId}`; ID постоянный, запись события и доменное изменение — одна транзакция. Сортировка dueAt, затем стабильный ID; timestamps не Date.now.
- `ActionResult = {ok,state,reason}`. Все persist-dependent UI-эффекты включать только после успешного атомарного сохранения. На ошибке оставлять прежний persisted-state и показывать причину.
- `gameMinuteStamp(clock) -> number|null` вынести из virtual-pc-runtime.js в `src/game-minute.js`, старый модуль реэкспортирует для совместимости. Передавать `gameMinutes` через virtualPc.syncHost, не разбирать строку часов.

## S1. Модель общей соцсети и контент — BL-003/004

**Files:** Create `src/social-catalog.js`, `src/social-state.js`, `data/social/communities.json`, `data/social/profiles.json`, `test/social-state.test.js`, `test/social-catalog.test.js`; Modify `src/virtual-pc-state.js`.

**Interfaces:**
- `normalizeSocial(raw) -> SocialState`; defaults не выбирают новые случайные данные.
- `listCommunities(state,{query}) -> Community[]`; subscribed-first, затем стабильная сортировка.
- `subscribeCommunity(state,id,subscribed) -> ActionResult`.
- `profileAccess(state,profileId) -> {allowed,reason}`; `addSocialFriend(state,profileId) -> ActionResult` не обходит приватность.

- [ ] Написать тесты каталога 20 сообществ с разными темами, минимум 8 не о рэпе/баттлах; уникальные IDs, свой avatar/description/members/history, связь makarevich-1 ровно одна. Записи датированы не позже доступной игровой даты.
- [ ] Run `node --test test/social-state.test.js test/social-catalog.test.js` → RED.
- [ ] Реализовать общую сеть с обычными людьми и музыкантами, стартовыми знакомыми, фото и wall history. У большинства birthday скрыто, education может быть скрыто, languages явные. Незнакомые NPC закрыты; известные связи/назначенный соперник дают доступ, а не кнопка дружбы сама по себе.
- [ ] Поиск охватывает весь каталог, подписки наверху; subscribe/reload не удваивают членов/события. Старый `state.community` остаётся форумом. Новый normalizer не трогает проекты, creativeWork и recoveryData BL-001.
- [ ] GREEN включая save/load; commit `feat: add general social network state and communities`.

## S2. Шесть разделов и маршруты Underweb — BL-003/004/011

**Files:** Create `src/social-view.js`, `src/social-profile-view.js`, `src/social-community-view.js`, `src/social-audio-view.js`, `social-network.css`, `test/social-view.test.js`, `test/social-routing.test.js`; Modify `src/virtual-pc-catalog.js`, `src/underweb-view.js`, `src/virtual-pc-ui.js`, `index.html`.

**Interfaces:**
- `resolveSocialRoute(address) -> SocialRoute|null`, routes `underweb://social/me|friends|photos|audio|messages|groups`, `profile/<id>`, `community/<id>`, `dialog/<id>`.
- `mountSocial(root,{route,getState,getMetadata,onChange,navigate,audio,onResultViewed}) -> {update,dispose}`.
- Audio view использует `playTrackVersion(audio,version)` J4; onResultViewed только сообщает факт просмотра, не запускает катсцену самостоятельно.

- [ ] DOM tests: ровно 6 разделов, карточка профиля с нужными полями, список фото/друзей/аудио, нет textarea свободного поста/чата. Прямой URL закрытого NPC не раскрывает данные. История браузера back/forward сохраняет ожидаемый маршрут.
- [ ] Run `node --test test/social-view.test.js test/social-routing.test.js` → RED.
- [ ] Создать светлую компактную сине-серую компоновку начала 2010-х по референсам, со своим знаком/названиями и без логотипов VK/рекламных кабинетов/лишних меню. Разделить узкие views, не добавлять весь рендер в большой underweb-view.js.
- [ ] Добавить вход из Искры/закладок/поиска, ссылку агрегатора в сообщество; в сообществе подписка рядом со «Сдать трек», участники, анонсы, история, аудио. Исторический/фоновый материал помечен отдельно от закрытого приёма текущих работ.
- [ ] После J5 подключить блок «Изучить площадку»: qualitative hints из знания, без точных скрытых коэффициентов. Пока модуль не готов, кнопку не показывать как работающую.
- [ ] Audio tests: один владелец воспроизведения, смена/закрытие маршрута гасит старый звук, rejected fetch не вызывает unhandled rejection. Views не пересоздают форму/фокус при каждом тике времени. GREEN; commit `feat: render social profiles communities and audio in Underweb`.

## S3. Сдача через сообщения и игровые события — BL-005/004

**Files:** Create `src/social-submission.js`, `src/social-dialog-view.js`, `src/social-runtime.js`, `src/battle-windows.js`, `src/game-minute.js`, `test/social-submission.test.js`, `test/social-runtime.test.js`, `test/social-migration.test.js`; Modify `src/battle-submission.js`, `src/battle-submission-view.js`, `src/virtual-pc-state.js`, `src/virtual-pc-runtime.js`, `src/virtual-pc-ui.js`, `src/apartment-app.js`, `src/underweb-view.js`.

**Interfaces:**
- `ensureBattleWindow(state,{battleId,nowMinute}) -> ActionResult`; создаёт один раз 7 дней и выбранную нечётную панель J1.
- `attachSubmissionTrack(state,{communityId,projectId,nowMinute}) -> ActionResult` использует captureTrackVersion, сохраняет draft attachment и personalAudioIds, не submission.
- `sendSubmission(state,{communityId,nowMinute}) -> ActionResult` фиксирует versionId и ackAt.
- `advanceSocial(state,nowMinute) -> {state,events}` обрабатывает due-события без зависимости от state.power.
- `markDialogRead(state,dialogId) -> ActionResult` независимо от телефона.

- [ ] Tests: attach добавляет личное аудио без wall post; повтор attach дедуп по versionId; смена draft не расходует попытку. send только registered+ready+openWindow; второй send и replace=true отклоняются. Тематически чужой готовый трек разрешён с отметкой, как прежде.
- [ ] Tests времени: seeded ackAt-sentAt∈[1,30]; `now===closesAt` уже поздно; отправленное до deadline принимается даже при ack после него; typing только перед ожидающим ответом. Пауза/закрытая игра без движения часов не приближают ответ.
- [ ] Run `node --test test/social-submission.test.js test/social-runtime.test.js test/social-migration.test.js` → RED.
- [ ] Реализовать десять авторских ACK-фраз, стабильный выбор по submissionID, typing интервал последней игровой минуты перед ack. Диалог: история/время/аватары/аудиовложение, кнопки Attach/Send, без свободного ввода. Перенести старый picker в attach flow, не оставлять старый обход из агрегатора.
- [ ] Пропуск ПК-питания оставить только у software downloads. advanceVirtualPc вызывает advanceSocial при валидных часах перед power gate, за пределами render. Большой скачок обрабатывает ACK/deadline в порядке дат; публикация communityAudio один раз при deadline. Новые judged events подключаются S5 через тот же scheduler.
- [ ] Миграция v1 submissions: существующая попытка занята, frozen audio сохранено; не отправлять заново, не выдумывать прежнее точное время. Если оно неизвестно — migration marker, ACK один раз послеактивации; архив даты не переписывать. Damaged/retired-source recovery не расходуется повторно и не «лечится» подменой звука.
- [ ] Tests: сон через 2 события, ПК off, полуночь, reload beforeACK, повтор stamp, обратный stamp, storagequota на send. При failedpersist нет UI подтверждения и второй timeline. GREEN+existingsoftwaretests; commit `feat: submit immutable tracks once through community messages`.

## S4. Телефон и независимая очередь — BL-006

**Files:** Create `src/phone-hud.js`, `phone-hud.css`, `test/phone-hud.test.js`, `test/phone-social-queue.test.js`; Modify `src/phone-notifications.js`, `src/apartment-app.js`, `src/sound-cues.js`, `src/virtual-pc-state.js`, фактический HTML entry.

**Interfaces:** `normalizePhone(raw) -> PhoneState`; `receivePhoneEvents(phone,events) -> PhoneState`; `hoverPhoneNotice(phone,eventId,inside) -> PhoneState`; `mountPhoneHud(root,{getState,onChange,playVibration}) -> {update,dispose}`. Сохранить старые enqueue/dequeue exports для старого прототипа, не подключать его часы.

- [ ] Tests: outside до mouseenter не закрывает; любое время ожидания не закрывает; enter→leave закрывает; очередь FIFO по dueAt/id; повтор eventID не дублируется; reload не теряет active/hovered; dismissal не меняет unread диалога.
- [ ] Run `node --test test/phone-hud.test.js test/phone-social-queue.test.js` → RED.
- [ ] Сделать небольшой собственный телефон слева внизу в игровой сцене и ПК, не в редакторе персонажа/главном меню. Экран включается, короткая вибрация и негромкий звук; ограничение preferred-reduced-motion. Не открывает приложения/переписку на телефоне.
- [ ] Плашка source+sender+body с максимум 3 строками текста и ellipsis; полная запись доступна ПК. Pointer enter/leave основной сценарий, клавиатурный focus/blur эквивалент для доступности. Смена состояния других окон не сбрасывает hover.
- [ ] Звук optional при autoplay/AudioContext restriction: очередь и экран работают всё равно, нет позднего повторного залпа после unlock. На новый activeID вибрация один раз в текущем отображении, не каждый frame.
- [ ] GREEN+браузерная проверка 800×600/1280×900: телефон не перекрывает нужные кнопки,3 строки подтверждены высотой; работаетпри ПК off. Commit `feat: add persistent phone notices with hover dismissal`.

## S5. Результаты, стена и безопасная реакция — BL-007/010

**Files:** Create `src/social-judging-events.js`, `src/social-wall.js`, `src/social-result-view.js`, `src/social-result-reaction.js`, `data/social/post-templates.json`, `test/social-judging-events.test.js`, `test/social-wall.test.js`, `test/social-result-reaction.test.js`; Modify `src/social-runtime.js`, `src/social-community-view.js`, `src/apartment-app.js`, `src/virtual-pc-lifecycle.js`, `src/virtual-pc-transition.js`.

**Interfaces:**
- `scheduleSubmissionJudging(state,submissionId) -> ActionResult` фиксирует resultIDs+dueAt once; использует J5/J6, не архивные оценки.
- `publishJudgeEvents(state,nowMinute) -> {state,events}`; full panel event только после всех expected judges.
- `createResultPost(state,panelEventId) -> ActionResult` с реально подходящим reviewId и тем же trackVersionId.
- `requestResultReaction(state,panelEventId) -> ActionResult`; `nextSafeResultReaction(state,{atDesktop,creativeJob,transitionPhase}) -> Reaction|null`; `completeResultReaction(state,id) -> ActionResult`.

- [ ] Tests: до dueAt результат не опубликован; итог один и только после всей панели. Большой скачок сохраняет каждый result, телефон объединяет пачку отзывов и отдельно показывает итог. Повторный render/reload не создаёт новые результаты, seed или текст.
- [ ] Run `node --test test/social-judging-events.test.js test/social-wall.test.js test/social-result-reaction.test.js` → RED.
- [ ] Подключить сохранённое расписание трёх игровых дней после дедлайна. Итог включает состав, оценки и готовность панели. passed/eliminated показывать только при существующем решении квалификации, не выводить из одного хорошего отзыва. Будущую игровую сетку не подменять архивом.
- [ ] Создать 20 авторских шаблонов стены: радость, облегчение, удивление, обида, злость, самоирония, уважение. Выбор основан на реальном отзыве/событии, без несуществующей похвалы. Один пост на version+round+event, вложение — snapshot J4.
- [ ] Реакции зависят от сохранённой audienceCount; зависимость проверяется средним по 100 seed. Стартовые средние: likes=.08*audience, comments=.01*audience; ограничения вынести в настройки. Негатив оппонента возможен, не обязателен. Собственные простые SVG/canvas-граффити нескольких тональностей; без редактора и скачивания чужих материалов.
- [ ] Первый просмотр полного итога за ПК ставит реакцию в ожидание. Во время работы/записи/перехода ждать безопасного desktop. Отдельная короткая последовательность «камера назад → реплика → возврат», без creative job и расхода игровых минут/XP. Восстановить окно, прокрутку, фокус и направление взгляда. После успешного завершения отметить эпизод и создать пост; reload посередине сохраняет один ожидающий эпизод, не создаёт вторую публикацию.
- [ ] Tests: проигрыш с единственным добрым отзывом допускает пост о нём; неизвестный проход не озвучивается. На 100 seed большая аудитория даёт больше средней активности. busy→idle сохраняет job/progress; повторный просмотр даёт один пост. GREEN; commit `feat: publish judge results and contextual social reactions`.

## S6. Сквозная проверка и интеграционная готовность

**Files:** Create `tools/verify-package-one-social.mjs`, `tools/verify-package-one-judging.mjs`, `docs/qa/2026-10-12-package-one.md`; Modify `docs/qa/2026-10-12-package-one-status.md` (отдельно от незакоммиченного журнала соседнего чата), соответствующие client revision imports/HTML, `test/client-module-version.test.js`, `test/virtual-pc-xp-entry.test.js` при изменении entry revision.

**Interfaces:** QA пользуется реальными экспортами/DOM и отдельным origin/save, не изменяет пользовательские сохранения. Артефакты `D:/Project/Battle/artifacts/sloboda-track-qa/package-one`.

- [ ] Run `npm test`; ожидается 0 fail. Проверить единый граф версий импортов без устаревшего кэша. Повторить `node tools/verify-retired-drums.mjs`: магазин пуст, запросов удалённых лупов нет.
- [ ] Реальный путь: текст → бит → черновая/чистовая запись → сведение/мастеринг → сообщество → вложение → личное аудио → отправка → уход/выключение ПК → телефон → наведение/уход → чтение на ПК → дедлайн → аудио сообщества → отзывы → результаты → пост с тем же аудио.
- [ ] Негативные пути: повторная и поздняя отправки запрещены; изменение исходника не подменяет вложение; legacy не получает выдуманных фактов; ошибка сохранения не теряет данные. Разные сообщества/окна не пересекают submissions.
- [ ] Проверить отчёты J3/J6 на 50 работах и native Web Audio playback; сверить DSP с используемыми фактами. Не утверждать субъективную красоту по числовому assert.
- [ ] Скриншоты 800×600, 1280×900 и широкого desktop: шесть разделов, профиль, сообщество, диалог, три строки телефона, результаты и стена. Открыть изображения, исправить обрезания/перекрытия, проверить клавиатуру и закрытие во время загрузки аудио.
- [ ] Итоговая независимая проверка по requesting-code-review, затем повтор затронутых тестов. В журнале для каждого BL указать файлы, команды, результаты и ограничения. BL-002 остаётся исключённым, не блокирующим.
- [ ] Commit `test: verify package one end-to-end flow`. Локальная интеграция — без перезаписи грязных документов соседнего чата. При конфликте остановить именно merge, не объявлять пакет слитым. Без push/PR.

## Контрольные assertions для RED-шагов

Это минимальные фрагменты дополнительно к сценариям задач. Fixture `state` создаётся через существующий submissionFixture и соответствующее действие инициализации окна; не подставлять произвольные DOM-заглушки вместо доменной модели.

S1, `subscriptions sort first and survive normalization`:

```js
const sub = subscribeCommunity(state, 'makarevich-1', true);
assert.equal(sub.ok, true);
assert.equal(listCommunities(sub.state, {query:''})[0].id, 'makarevich-1');
assert.equal(normalizeSocial(sub.state.social).subscriptions.length, 1);
```

Community ID основного баттла также makarevich-1; battleId — отдельное явное поле связи. Публичные карточки обычных стартовых знакомых не являются обходом приватности незнакомых соперников.

S2, `six sections and no unrestricted composer`:

```js
assert.equal(root.querySelectorAll('[data-social-section]').length, 6);
assert.equal(root.querySelector('[data-free-message-input]'), null);
assert.equal(root.querySelector('[data-wall-editor]'), null);
```

Тест также проходит по каждой видимой кнопке, проверяет назначение маршрута и видимый контент; отсутствие специальных data-атрибутов само по себе не доказывает отсутствие свободного ввода.

S3, `attachment is not submission and submission cannot be replaced`:

```js
const attached = attachSubmissionTrack(state, {communityId:'makarevich-1',projectId:'beat',nowMinute:600});
assert.equal(attached.state.social.personalAudioIds.length, 1);
assert.equal(attached.state.battleSubmissions.length, 0);
const sent = sendSubmission(attached.state, {communityId:'makarevich-1',nowMinute:601});
assert.equal(sent.ok, true);
const row = sent.state.battleSubmissions[0];
assert.ok(row.ackAt - row.sentAt >= 1 && row.ackAt - row.sentAt <= 30);
assert.equal(sendSubmission(sent.state, {communityId:'makarevich-1',nowMinute:602}).ok, false);
```

S4, `hover then leave is required to dismiss`:

```js
const queued = receivePhoneEvents(normalizePhone(null), [event]);
assert.equal(hoverPhoneNotice(queued, event.id, false).activeId, event.id);
const entered = hoverPhoneNotice(queued, event.id, true);
assert.equal(entered.activeId, event.id);
assert.equal(hoverPhoneNotice(entered, event.id, false).activeId, null);
```

S5, `busy work blocks reaction but repeated post action is idempotent`:

```js
assert.equal(nextSafeResultReaction(state, {atDesktop:true,creativeJob:{},transitionPhase:'working'}), null);
const once = createResultPost(state, panelEventId);
const twice = createResultPost(once.state, panelEventId);
assert.deepEqual(twice.state.social.posts, once.state.social.posts);
assert.equal(once.state.social.posts.at(-1).trackVersionId, submittedVersionId);
```
