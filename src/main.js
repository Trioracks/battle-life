import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { easeInOut, keyboardArmPose, seatPose, turnAngle } from './animation-timing.js';
import { GESTURE_STYLES, PERFORMANCE_SECONDS, performanceStyleAt, shuffledStyles } from './battle-director.js';
import { clickIntent } from './click-intent.js';
import { stepCharacter } from './character-motion.js';
import { presentActionProgress } from './action-progress.js';
import { advanceCampaign, createCampaign, loadCampaign, saveCampaign } from './game-state.js';
import { newGameState, startScreenState } from './start-screen.js';
import { allocationsFromSkills, appearanceGeometry, createRapper, cycleLookPart, frontFacingFaceLayout, LOOK_PART_LABELS, lookOptionLabel, lookPartAtPreviewHeight, normalizeLook, profileFaceLayout, selectAppearancePart, STAT_KEYS, statLabels, validateAllocations } from './creator.js';
import { canStartApartmentAction, describeApartmentAction, getApartmentAction } from './apartment-actions.js';
import { APARTMENT_ACTOR_FOREGROUND_Z, APARTMENT_DESK, APARTMENT_ENTRY_DOOR, APARTMENT_FLOOR_Y, APARTMENT_INTERIOR_DOOR, APARTMENT_MICROPHONE, APARTMENT_ROOMS, APARTMENT_SPAWN, apartmentWalkTargets, cameraTargetX, getApartmentRoom } from './apartment-layout.js';
import { actionUsesDeskSeat, createActionTransition, phaseAfterApproach } from './action-transitions.js';
import { actionYaw, avatarFacingForYaw, cameraYaw, shouldPauseWalkForTurn, walkYaw } from './apartment-orientation.js';
import { playSoundCue } from './sound-cues.js';
import { desktopApps, getDesktopAction, openDesktopApp } from './desktop-apps.js';
import { closeDesktopWindow, desktopShellLabels, desktopTaskbarLabel, finishDesktopBoot, openDesktopWindow, resumeDesktopWindow, shutdownDesktopSession, startDesktopSession } from './desktop-session.js';
import { getBankOverview, getBattleDetail, getBattleList, getJobListing, getMarketCatalog } from './desktop-view-models.js';
import { dequeueNotification, enqueueNotification } from './phone-notifications.js';
import { districts, getDistrictLocations, startLocationAction, travelTo } from './calikfornia.js';
import { jobIds } from './jobs.js';
import { buyFood, cookMeal, eatMeal, sleep, washDishes } from './household.js';
import { MAKAREWITCH_VI, registerForTournament, researchTournament } from './tournament.js';
import { chooseBeat, getTrackStepStatus, masterTrack, mixTrack, polishDraft, recordAtMicrophone, startDraft, submitTrack } from './track-project.js';
import { scoreSelection } from './selection.js';

const canvas = document.querySelector('#game');
const status = document.querySelector('#status');
const sceneTitle = document.querySelector('#scene-title');
const controls = document.querySelector('.controls');
const campaignClock = document.querySelector('#campaign-clock');
const campaignCash = document.querySelector('#campaign-cash');
const campaignRent = document.querySelector('#campaign-rent');
const needElements = {
  energy: document.querySelector('#need-energy'),
  hunger: document.querySelector('#need-hunger'),
  health: document.querySelector('#need-health'),
  leisure: document.querySelector('#need-leisure'),
};
const startScreen = document.querySelector('#start-screen');
const startNewGame = document.querySelector('#start-new-game');
const startContinue = document.querySelector('#start-continue');
const creatorModal = document.querySelector('#creator-modal');
const creatorForm = document.querySelector('#creator-form');
const creatorStats = document.querySelector('#creator-stats');
const creatorPoints = document.querySelector('#creator-points');
const creatorError = document.querySelector('#creator-error');
const creatorPreviewCanvas = document.querySelector('#creator-preview');
const creatorLookControls = document.querySelector('#creator-look-controls');
const creatorOpen = document.querySelector('#creator-open');
const interactionDock = document.querySelector('#interaction-dock');
const worldTooltip = document.querySelector('#world-tooltip');
const actorBubble = document.querySelector('#actor-bubble');
const desktopScreen = document.querySelector('#desktop-screen');
const desktopContent = document.querySelector('#desktop-content');
const desktopClose = document.querySelector('#desktop-close');
const desktopSystem = document.querySelector('#desktop-system');
const desktopTaskbar = document.querySelector('#desktop-taskbar');
const phonePanel = document.querySelector('#phone-panel');
const mapScreen = document.querySelector('#map-screen');
const mapDistricts = document.querySelector('#map-districts');
const mapLocationPanel = document.querySelector('#map-location-panel');
const mapClose = document.querySelector('#map-close');
let campaign = loadCampaign() ?? createCampaign();
let creatorAllocations = campaign.player ? allocationsFromSkills(campaign.player.skills) : Object.fromEntries(STAT_KEYS.map((key) => [key, 0]));
let creatorLook = campaign.player?.look ?? normalizeLook({ hair: 'bald', face: 'clean', top: 'hoodie', pants: 'cargo', footwear: 'sneakers' });
let creatorSelectedPart = 'hair';
let audioContext = null;
let desktopOpen = false;
let desktopBootTimer = null;
let desktopSession = shutdownDesktopSession();
let desktopSubView = 'home';
let desktopStartMenuOpen = false;
let desktopBattleId = null;
let desktopJobId = null;
let desktopMarketStore = 'shesterochka';
let desktopCartItem = null;
let desktopBankTab = 'overview';
const room = { left: APARTMENT_ROOMS.kitchen.left, right: APARTMENT_ROOMS.living.right };
const livingRoomOffset = 2.2;
const kitchenRoomOffset = -1;
const deskX = APARTMENT_DESK.x;
const exitZoneX = 7.64;
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const walkPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

function formatGameClock(clock) {
  const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  return `${clock.day} ${months[clock.month - 1]} · ${String(Math.floor(clock.minutes / 60)).padStart(2, '0')}:${String(clock.minutes % 60).padStart(2, '0')}`;
}

function renderCampaignHud(displayClock = campaign.clock) {
  campaignClock.textContent = formatGameClock(displayClock).toUpperCase();
  campaignCash.textContent = `${campaign.cash.toLocaleString('ru-RU')} ₽`;
  campaignRent.textContent = campaign.rent.status === 'due'
    ? `Аренда к оплате · ${campaign.rent.amount.toLocaleString('ru-RU')} ₽`
    : `Аренда ${campaign.rent.amount.toLocaleString('ru-RU')} ₽ · 1 окт`;
  for (const [name, element] of Object.entries(needElements)) {
    element.style.width = `${campaign.needs[name]}%`;
  }
}

function renderInteractionDock(content = '<span class="interaction-dock__hint">Подойди к предмету</span>') {
  interactionDock.innerHTML = content;
}

function clearWorldTooltip() {
  worldTooltip.classList.add('is-hidden');
}

function showWorldTooltip(actionId, event) {
  const action = getApartmentAction(actionId);
  const description = describeApartmentAction(action, campaign.needs);
  if (!action) return clearWorldTooltip();
  worldTooltip.innerHTML = `<strong>${description.title}</strong><span>${description.detail}</span>${description.allowed ? '' : `<small>${description.reason}</small>`}`;
  worldTooltip.classList.toggle('is-blocked', !description.allowed);
  worldTooltip.style.left = `${Math.min(window.innerWidth - 242, Math.max(14, event.clientX + 16))}px`;
  worldTooltip.style.top = `${Math.min(window.innerHeight - 98, Math.max(14, event.clientY - 12))}px`;
  worldTooltip.classList.remove('is-hidden');
}

function actionMinutesForProgress(action) {
  if (action.id === 'bed') return 7 * 60;
  if (action.id === 'fridge') return 15;
  return action.minutes;
}

function actionVisualDuration(action) {
  return actionMinutesForProgress(action) >= 30 ? 2.8 : 1.25;
}

function renderActorBubble(content) {
  if (!content) {
    actorBubble.classList.add('is-hidden');
    return;
  }
  const position = actor.group.getWorldPosition(new THREE.Vector3());
  position.y += 3.12;
  position.project(camera);
  actorBubble.style.left = `${(position.x * .5 + .5) * window.innerWidth}px`;
  actorBubble.style.top = `${(-position.y * .5 + .5) * window.innerHeight}px`;
  actorBubble.innerHTML = content;
  actorBubble.classList.remove('is-hidden');
}

function updateActorBubble() {
  if (entryMode !== 'apartment' || gameMode !== 'apartment') return renderActorBubble(null);
  if (actor.computerTask) {
    const task = actor.computerTask;
    const progress = presentActionProgress(task, actor.actionElapsed, 2.45);
    const previewMinutes = Math.max(1, Math.round(task.minutes * progress.ratio));
    const preview = advanceCampaign(campaign, { id: 'preview', label: task.label, minutes: previewMinutes }).state;
    renderCampaignHud(preview.clock);
    return renderActorBubble(`<strong>${task.label}</strong><span>${progress.percent}% · анализирует прошлые раунды</span><i><b style="width:${progress.percent}%"></b></i>`);
  }
  if (actor.mode === 'apartmentAction' && actor.activeApartmentAction) {
    const action = actor.activeApartmentAction;
    const progress = presentActionProgress({ ...action, minutes: actionMinutesForProgress(action) }, actor.actionElapsed, actionVisualDuration(action));
    if (progress.observed) {
      const previewMinutes = Math.max(1, Math.round(progress.minutes * progress.ratio));
      const preview = advanceCampaign(campaign, { id: 'preview', label: action.label, minutes: previewMinutes }).state;
      renderCampaignHud(preview.clock);
      return renderActorBubble(`<strong>${progress.label}</strong><span>${progress.percent}% · время идёт</span><i><b style="width:${progress.percent}%"></b></i>`);
    }
    return renderActorBubble(`<strong>${progress.label}</strong><span>${action.tooltip}</span>`);
  }
  if (actor.bubble?.expiresAt > performance.now()) return renderActorBubble(`<strong>${actor.bubble.title}</strong><span>${actor.bubble.message}</span>`);
  actor.bubble = null;
  return renderActorBubble(null);
}

function renderPhone() {
  const notification = campaign.notifications[0];
  if (!notification) {
    phonePanel.classList.add('is-hidden');
    return;
  }
  phonePanel.innerHTML = `<button type="button" aria-label="Закрыть уведомление">×</button><strong>${notification.sender}</strong><p>${notification.text}</p>`;
  phonePanel.classList.remove('is-hidden');
}

function notify(sender, text) {
  campaign = { ...campaign, notifications: enqueueNotification(campaign.notifications, { sender, text }) };
  saveCampaign(campaign);
  cue('notification');
  renderPhone();
}

function desktopStartMenuMarkup() {
  if (!desktopStartMenuOpen) return '';
  return `<aside class="desktop-start-menu"><p>${desktopShellLabels.start.toUpperCase()}</p>${desktopApps.map((app) => `<button type="button" data-desktop-start-app="${app.id}"><b>${app.icon}</b><span>${app.label}</span></button>`).join('')}</aside>`;
}

function renderDesktopTaskbar() {
  desktopSystem.textContent = `${desktopShellLabels.system.toUpperCase()} / ДОМАШНИЙ ПК`;
  desktopClose.textContent = `${desktopShellLabels.shutdown} ×`;
  const now = new Date();
  desktopTaskbar.innerHTML = `<button type="button" data-desktop-start>${desktopShellLabels.start}</button><span>${desktopTaskbarLabel(desktopSession)}</span><time>${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}</time>`;
}

function desktopWindowMarkup(title, body) {
  return `<section class="desktop-window"><header class="desktop-window__bar"><span>${title}</span><button type="button" data-desktop-window-close aria-label="Закрыть окно">×</button></header><div class="desktop-window__body">${body}</div></section>${desktopStartMenuMarkup()}`;
}

function desktopProfileMarkup() {
  const player = campaign.player;
  return `<aside class="repset-profile"><b>${player?.nickname?.slice(0, 2).toUpperCase() ?? 'MC'}</b><strong>${player?.nickname ?? 'Новый MC'}</strong><span>${campaign.tournament.registered ? 'Участник MAKAREWITCH VI' : 'Ищет первый баттл'}</span><small>Письмо ${player?.skills?.writing ?? 10} · Флоу ${player?.skills?.flow ?? 10}</small></aside>`;
}

function renderBattlesBody() {
  if (!desktopBattleId) {
    const battles = getBattleList(campaign);
    return `<section class="desktop-page repset-layout">${desktopProfileMarkup()}<div><p>Доступные баттлы и следы прошлых раундов. Открой карточку, чтобы увидеть тему и подать заявку.</p><div class="battle-list">${battles.map((battle) => `<button type="button" class="desktop-card" data-battle-detail="${battle.id}"><small>${battle.registered ? 'ЗАЯВКА ПРИНЯТА' : 'ПРИЁМ ОТКРЫТ'}</small><strong>${battle.title}</strong><span>${battle.description}</span><em>Дедлайн: ${battle.deadline}</em></button>`).join('')}</div></div></section>`;
  }
  const detail = getBattleDetail(campaign, desktopBattleId);
  if (!detail) {
    desktopBattleId = null;
    return renderBattlesBody();
  }
  const registeredActions = !detail.canApply
    ? `<div class="desktop-grid"><button class="desktop-icon" data-battle="research"><b>⌕</b><span>Изучить архив</span><small>1 ч · комментарии и скрытые предпочтения</small></button><button class="desktop-icon" data-battle="track"><b>♫</b><span>Моя заявка</span><small>Сделать и сдать трек</small></button>${campaign.tournament.submitted && !campaign.tournament.selection ? '<button class="desktop-icon" data-battle="results"><b>!</b><span>Судьи отсудили</span><small>Открыть комментарии и баллы</small></button>' : ''}</div>`
    : `<button class="primary-button desktop-primary" type="button" data-battle-apply="${detail.id}">${detail.applyLabel}</button>`;
  return `<section class="desktop-page"><button class="desktop-back" data-battle-detail-back>← К списку баттлов</button><div class="battle-detail"><div><small>ОНЛАЙН-ОТБОР · ЛОКАЛЬНЫЙ ДИВИЗИОН</small><h2>${detail.title}</h2><p>${detail.description}</p><p><strong>Тема:</strong> ${detail.theme}<br><strong>Дедлайн:</strong> ${detail.deadline}</p></div><aside><strong>Участники</strong>${detail.participants.map((name) => `<span>${name}</span>`).join('')}</aside></div><section class="archive-panel"><strong>Архив и комментарии</strong>${detail.archiveComments.map((comment) => `<p>${comment}</p>`).join('')}${detail.visibleHints.length ? `<small>Открыто анализом: ${detail.visibleHints.join(', ')}</small>` : '<small>Изучи архив после регистрации, чтобы открыть скрытый фокус.</small>'}</section>${registeredActions}${campaign.tournament.selection ? `<p class="selection-result"><strong>${campaign.tournament.selection.passed ? 'Ты прошёл отбор.' : 'Ты не прошёл отбор.'}</strong> ${campaign.tournament.selection.total}/30</p>` : ''}</section>`;
}

function renderJobsBody() {
  if (desktopJobId) {
    const job = getJobListing(desktopJobId);
    if (!job) {
      desktopJobId = null;
      return renderJobsBody();
    }
    return `<section class="desktop-page"><button class="desktop-back" data-job-detail-back>← Все вакансии</button><div class="job-detail"><b>${job.employer.avatar}</b><div><small>РАБОТОДАТЕЛЬ</small><h2>${job.label}</h2><p>${job.employer.name}</p></div></div><dl class="desktop-facts"><div><dt>Район</dt><dd>${job.district}</dd></div><div><dt>График</dt><dd>${job.schedule}</dd></div><div><dt>Оплата</dt><dd>${job.payLabel}</dd></div><div><dt>Нужно бодрости</dt><dd>${job.minEnergy}</dd></div></dl><blockquote>${job.employer.review}</blockquote><button type="button" class="primary-button desktop-primary" data-job-map="${job.id}">Показать на карте</button></section>`;
  }
  return `<section class="desktop-page"><p>Выбери вакансию и прочитай условия. Смена начинается только после поездки к месту на карте.</p><div class="desktop-grid">${jobIds.map((id) => { const job = getJobListing(id); return `<button class="desktop-icon" data-job-detail="${id}"><b>${job.employer.avatar}</b><span>${job.label}</span><small>${job.schedule} · ${job.payLabel}</small></button>`; }).join('')}</div></section>`;
}

function renderMarketBody() {
  const catalog = getMarketCatalog(campaign);
  const store = catalog.stores.find((item) => item.id === desktopMarketStore) ?? catalog.stores[0];
  const product = desktopCartItem ? store.products.find((item) => item.id === desktopCartItem) : null;
  const cart = product ? `<aside class="market-cart"><strong>Корзина</strong><span>${product.label} · ${product.price} ₽</span><small>После оплаты: ${catalog.balanceAfter(product.id).toLocaleString('ru-RU')} ₽ · курьер через ${product.deliveryMinutes} мин</small><button type="button" class="primary-button desktop-primary" data-market-checkout="${product.id}">Оформить заказ</button></aside>` : '<aside class="market-cart"><strong>Корзина пуста</strong><small>Добавь продукт, чтобы увидеть точную сумму и время доставки.</small></aside>';
  return `<section class="desktop-page"><p><strong>Наличные: ${catalog.cash.toLocaleString('ru-RU')} ₽.</strong> В холодильнике: ${catalog.inventory.ingredients} ингредиентов, ${catalog.inventory.cookedMeals} готовых порций; посуды: ${catalog.inventory.dirtyDishes}.</p><div class="desktop-tabs">${catalog.stores.map((item) => `<button type="button" class="${item.id === store.id ? 'is-active' : ''}" data-market-store="${item.id}">${item.name}</button>`).join('')}</div><div class="market-layout"><div class="desktop-grid">${store.products.map((item) => `<button class="desktop-icon" data-market-add="${item.id}"><b>▣</b><span>${item.label}</span><small>${item.price} ₽ · +${item.ingredients} ингредиента · ${item.deliveryMinutes} мин</small></button>`).join('')}</div>${cart}</div></section>`;
}

function renderBillsBody() {
  const bank = getBankOverview(campaign);
  const bill = bank.bills[0];
  const panel = desktopBankTab === 'bills'
    ? `<div class="bank-bill"><strong>${bill.label}</strong><span>${bill.amount.toLocaleString('ru-RU')} ₽ · ${bill.status === 'due' ? 'к оплате' : 'ещё не наступил'}</span><small>Общий долг: ${bill.debt.toLocaleString('ru-RU')} ₽. При просрочке доходы гасят его автоматически.</small></div>`
    : `<div class="bank-bill"><strong>Переводы</strong><span>В первом срезе переводы недоступны.</span><small>Этот раздел появится вместе с платежами знакомым и услугами звукарей.</small></div>`;
  return `<section class="desktop-page"><h2>Карта и счета</h2><p class="bank-balance">${bank.balance.toLocaleString('ru-RU')} ₽</p><div class="desktop-tabs"><button type="button" class="${desktopBankTab === 'overview' ? 'is-active' : ''}" data-bank-tab="overview">Переводы</button><button type="button" class="${desktopBankTab === 'bills' ? 'is-active' : ''}" data-bank-tab="bills">Счета</button></div>${panel}</section>`;
}

function renderDesktop(view = 'home') {
  if (desktopSession.state !== 'ready') return;
  if (view === 'home') {
    desktopSession = closeDesktopWindow(desktopSession);
    desktopSubView = 'home';
  } else if (view === 'track') {
    desktopSession = openDesktopWindow(desktopSession, 'battles');
    desktopSubView = 'track';
  } else {
    desktopSession = openDesktopWindow(desktopSession, view);
    desktopSubView = view;
  }
  renderDesktopTaskbar();
  if (view === 'track') {
    const steps = getTrackStepStatus(campaign);
    const track = campaign.track;
    const ready = steps.find((step) => step.state === 'ready' && step.id !== 'register');
    const controls = ready?.id === 'draft'
      ? `<p>Выбери фокус черновика.</p><div class="desktop-grid">${[1, 2, 3, 4, 5].map((focus) => `<button class="desktop-icon" data-track-step="draft" data-focus="${focus}"><b>${focus}</b><span>${['Тема', 'Лирика', 'Баланс', 'Панчи', 'Дисс'][focus - 1]}</span><small>Черновик · 2 ч</small></button>`).join('')}</div>`
      : ready?.id === 'research'
        ? `<p>Архив поможет не промахнуться по формату баттла.</p><div class="desktop-grid"><button class="desktop-icon" data-track-step="research"><b>⌕</b><span>Изучить архив</span><small>1 ч · открыть скрытый тег</small></button></div>`
        : ready?.id === 'beat'
        ? `<p>Черновик готов. Самооценка: ${track.confidence}/10; реальное качество пока скрыто.</p><div class="desktop-grid"><button class="desktop-icon" data-track-step="polish"><b>✎</b><span>Доработать</span><small>1 ч · небольшое улучшение</small></button><button class="desktop-icon" data-track-step="beat"><b>♫</b><span>Выбрать бум-бэп</span><small>20 мин</small></button></div>`
        : ready?.id === 'record'
          ? `<p>Бит выбран. Компьютер больше не нужен: встань и запиши вокал у микрофона.</p><div class="desktop-grid"><button class="desktop-icon" data-track-step="record"><b>●</b><span>Идти к микрофону</span><small>Несколько дублей · 2 ч 30 мин</small></button></div>`
          : ready?.id === 'mix'
            ? `<p>Демка записана. Теперь доступно сведение.</p><div class="desktop-grid"><button class="desktop-icon" data-track-step="mix"><b>≋</b><span>Свести</span><small>2 ч</small></button></div>`
            : ready?.id === 'master'
              ? `<p>Сведение готово. Остался мастеринг.</p><div class="desktop-grid"><button class="desktop-icon" data-track-step="master"><b>◆</b><span>Смастерить</span><small>2 ч</small></button></div>`
              : ready?.id === 'submit'
                ? `<p>Трек готов. После отправки изменить его нельзя.</p><div class="desktop-grid"><button class="desktop-icon" data-track-step="submit"><b>↥</b><span>Сдать заявку</span><small>10 мин</small></button></div>`
                : `<p>Заявка уже отправлена. Ожидай судейство в уведомлениях телефона.</p>`;
    desktopContent.innerHTML = desktopWindowMarkup('Рэп-Сеть / МОЯ ЗАЯВКА', `<section class="desktop-page"><button class="desktop-back" data-desktop-back>← Рабочий стол</button><h2>Трек для MAKAREWITCH VI</h2><ol class="track-steps">${steps.map((step) => `<li class="track-steps__item track-steps__item--${step.state}"><strong>${step.label}</strong><span>${step.minutes ? `${step.minutes} мин` : 'сразу'}</span><small>${step.state === 'done' ? 'готово' : step.reason || 'следующий шаг'}</small></li>`).join('')}</ol>${controls}</section>`);
    return;
  }
  if (view === 'home') {
    desktopContent.innerHTML = `<div class="desktop-grid">${desktopApps.map((app) => `<button class="desktop-icon" data-desktop-app="${app.id}"><b>${app.icon}</b><span>${app.label}</span><small>${app.description}</small></button>`).join('')}</div>${desktopStartMenuMarkup()}`;
    return;
  }
  const opened = openDesktopApp(desktopSession.window);
  if (!opened) return renderDesktop();
  const body = view === 'jobs'
    ? renderJobsBody()
    : view === 'market'
      ? renderMarketBody()
      : view === 'battles'
        ? renderBattlesBody()
        : view === 'bills'
        ? renderBillsBody()
        : `<p>${opened.app.description}. Этот раздел готов к игровому действию.</p>`;
  desktopContent.innerHTML = desktopWindowMarkup(opened.app.label, `<section class="desktop-page"><button class="desktop-back" data-desktop-back>← Рабочий стол</button><h2>${opened.app.label}</h2>${body}<div id="desktop-page-actions"></div></section>`);
}

function openDesktop() {
  desktopOpen = true;
  desktopSession = startDesktopSession();
  desktopSubView = 'home';
  desktopStartMenuOpen = false;
  desktopScreen.classList.remove('is-hidden');
  desktopScreen.classList.add('is-booting');
  desktopContent.innerHTML = '<section class="desktop-boot"><b>КАЛИКФОРНИЯ OS</b><span>Включение рабочего стола…</span><i><em></em></i></section>';
  clearTimeout(desktopBootTimer);
  desktopBootTimer = setTimeout(() => {
    if (!desktopOpen) return;
    desktopSession = finishDesktopBoot(desktopSession);
    desktopScreen.classList.remove('is-booting');
    renderDesktop();
  }, 460);
}

function closeDesktop() {
  clearTimeout(desktopBootTimer);
  desktopOpen = false;
  desktopSession = shutdownDesktopSession();
  desktopSubView = 'home';
  desktopStartMenuOpen = false;
  desktopScreen.classList.add('is-hidden');
  desktopScreen.classList.remove('is-booting');
  if (actor.mode === 'typing') beginStandingSequence();
}

function startDesktopAction(actionId, complete) {
  const action = getDesktopAction(actionId);
  if (!action) return;
  clearTimeout(desktopBootTimer);
  desktopOpen = false;
  desktopSession = closeDesktopWindow(desktopSession);
  desktopStartMenuOpen = false;
  desktopScreen.classList.add('is-hidden');
  actor.computerTask = { ...action, complete };
  actor.actionElapsed = 0;
  actor.bubble = null;
}

desktopContent.addEventListener('click', (event) => {
  const app = event.target.closest('[data-desktop-app]');
  if (app) {
    desktopStartMenuOpen = false;
    renderDesktop(app.dataset.desktopApp);
    return;
  }
  const startApp = event.target.closest('[data-desktop-start-app]');
  if (startApp) {
    desktopStartMenuOpen = false;
    renderDesktop(startApp.dataset.desktopStartApp);
    return;
  }
  if (event.target.closest('[data-desktop-back]') || event.target.closest('[data-desktop-window-close]')) {
    desktopStartMenuOpen = false;
    renderDesktop();
    return;
  }
  const battleDetail = event.target.closest('[data-battle-detail]');
  if (battleDetail) {
    desktopBattleId = battleDetail.dataset.battleDetail;
    renderDesktop('battles');
    return;
  }
  if (event.target.closest('[data-battle-detail-back]')) {
    desktopBattleId = null;
    renderDesktop('battles');
    return;
  }
  const battleApply = event.target.closest('[data-battle-apply]');
  if (battleApply) {
    const result = registerForTournament(campaign, battleApply.dataset.battleApply);
    campaign = result.state;
    saveCampaign(campaign);
    renderCampaignHud();
    notify('MAKAREWITCH VI', result.message);
    renderDesktop('battles');
    return;
  }
  const jobDetail = event.target.closest('[data-job-detail]');
  if (jobDetail) {
    desktopJobId = jobDetail.dataset.jobDetail;
    renderDesktop('jobs');
    return;
  }
  if (event.target.closest('[data-job-detail-back]')) {
    desktopJobId = null;
    renderDesktop('jobs');
    return;
  }
  const jobMap = event.target.closest('[data-job-map]');
  if (jobMap) {
    const job = getJobListing(jobMap.dataset.jobMap);
    notify('РАБОТА', `Вакансия «${job.label}» отмечена на карте.`);
    closeDesktop();
    openMap(job.district);
    return;
  }
  const marketStore = event.target.closest('[data-market-store]');
  if (marketStore) {
    desktopMarketStore = marketStore.dataset.marketStore;
    renderDesktop('market');
    return;
  }
  const marketAdd = event.target.closest('[data-market-add]');
  if (marketAdd) {
    desktopCartItem = marketAdd.dataset.marketAdd;
    renderDesktop('market');
    return;
  }
  const marketCheckout = event.target.closest('[data-market-checkout]');
  if (marketCheckout) {
    const result = buyFood(campaign, marketCheckout.dataset.marketCheckout);
    campaign = result.state;
    saveCampaign(campaign);
    renderCampaignHud();
    notify('МАРКЕТ', result.message);
    desktopCartItem = null;
    renderDesktop('market');
    return;
  }
  const bankTab = event.target.closest('[data-bank-tab]');
  if (bankTab) {
    desktopBankTab = bankTab.dataset.bankTab;
    renderDesktop('bills');
    return;
  }
  const battleButton = event.target.closest('[data-battle]');
  if (battleButton) {
    if (battleButton.dataset.battle === 'results') {
      const selection = scoreSelection(campaign.track, MAKAREWITCH_VI);
      campaign = { ...campaign, tournament: { ...campaign.tournament, selection } };
      saveCampaign(campaign);
      selection.scores.forEach((score) => notify(score.judge, `${score.value}/10. ${score.comment}`));
      renderDesktop('battles');
      return;
    }
    if (battleButton.dataset.battle === 'track') {
      renderDesktop('track');
      return;
    }
    if (battleButton.dataset.battle === 'research') {
      startDesktopAction('research-archive', () => researchTournament(campaign));
      return;
    }
    return;
  }
  const trackButton = event.target.closest('[data-track-step]');
  if (trackButton) {
    const step = trackButton.dataset.trackStep;
    if (step === 'research') {
      startDesktopAction('research-archive', () => researchTournament(campaign));
      return;
    }
    if (step === 'record') {
      closeDesktop();
      actor.pendingIntent = { type: 'apartment-action', actionId: 'microphone' };
      return;
    }
    const result = {
      draft: () => startDraft(campaign, { focus: Number(trackButton.dataset.focus), useResearch: campaign.tournament.researchHints.length > 0 }),
      polish: () => polishDraft(campaign),
      beat: () => chooseBeat(campaign, 'boom-bap'),
      mix: () => mixTrack(campaign),
      master: () => masterTrack(campaign),
      submit: () => submitTrack(campaign),
    }[step]();
    campaign = result.state;
    saveCampaign(campaign);
    renderCampaignHud();
    notify('СТУДИЯ', result.message);
    renderDesktop('track');
  }
});
desktopTaskbar.addEventListener('click', (event) => {
  if (!event.target.closest('[data-desktop-start]') || desktopSession.state !== 'ready') return;
  desktopStartMenuOpen = !desktopStartMenuOpen;
  renderDesktop(desktopSubView);
});
desktopClose.addEventListener('click', closeDesktop);
phonePanel.addEventListener('click', () => {
  campaign = { ...campaign, notifications: dequeueNotification(campaign.notifications).queue };
  saveCampaign(campaign);
  renderPhone();
});

function renderMap(selectedDistrictId) {
  const selectedDistrict = districts.find((district) => district.id === selectedDistrictId) ?? districts[0];
  mapDistricts.innerHTML = districts.map((district) => `<button class="map-zone map-zone--${district.id} ${district.id === selectedDistrict.id ? 'is-selected' : ''}" data-district="${district.id}"><strong>${district.name}</strong><span>${district.role}</span><small>${district.minutes ? `${district.minutes} мин` : 'дом'}</small></button>`).join('');
  const locations = getDistrictLocations(selectedDistrict.id);
  mapLocationPanel.innerHTML = `<p class="map-location-panel__eyebrow">${selectedDistrict.name}</p><h2>${selectedDistrict.role}</h2><p>${selectedDistrict.minutes ? `Дорога заняла ${selectedDistrict.minutes} мин.` : 'Ты в домашнем районе.'}</p>${locations.map((location) => `<button class="map-location" data-location="${location.id}"><b>${location.kind === 'job' ? '₽' : location.kind === 'market' ? '▣' : '◌'}</b><span><strong>${location.label}</strong><small>${location.description}</small></span><em>${location.kind === 'job' ? 'Начать смену' : location.kind === 'market' ? 'Заказать' : 'Осмотреть'}</em></button>`).join('')}`;
}

function openMap(selectedDistrictId) {
  const location = selectedDistrictId ?? (campaign.location === 'north-sloboda-home' ? 'north-sloboda' : campaign.location);
  renderMap(location);
  mapScreen.classList.remove('is-hidden');
}

mapDistricts.addEventListener('click', (event) => {
  const button = event.target.closest('[data-district]');
  if (!button) return;
  const result = travelTo(campaign, button.dataset.district);
  campaign = result.state;
  saveCampaign(campaign);
  renderCampaignHud();
  notify('КАРТА', result.message);
  renderMap(button.dataset.district);
});
mapLocationPanel.addEventListener('click', (event) => {
  const button = event.target.closest('[data-location]');
  if (!button) return;
  const result = startLocationAction(campaign, button.dataset.location);
  campaign = result.state;
  saveCampaign(campaign);
  renderCampaignHud();
  notify('КАРТА', result.message);
  const location = campaign.location === 'north-sloboda-home' ? 'north-sloboda' : campaign.location;
  renderMap(location);
});
mapClose.addEventListener('click', () => mapScreen.classList.add('is-hidden'));

function cue(id) {
  audioContext ??= new AudioContext();
  playSoundCue(id, audioContext);
}

function renderCreator() {
  const validation = validateAllocations(creatorAllocations);
  const total = STAT_KEYS.reduce((sum, key) => sum + creatorAllocations[key], 0);
  creatorPoints.textContent = `${10 - total} очков`;
  creatorStats.innerHTML = STAT_KEYS.map((key) => {
    const allocation = creatorAllocations[key];
    const value = 10 + allocation * 10;
    return `<div class="creator-stat"><span>${statLabels[key]}</span><strong>${value}</strong><span><button class="creator-control" type="button" data-stat="${key}" data-delta="-1" ${allocation === 0 ? 'disabled' : ''}>−</button><button class="creator-control" type="button" data-stat="${key}" data-delta="1" ${allocation === 4 || total === 10 ? 'disabled' : ''}>+</button></span></div>`;
  }).join('');
  creatorError.textContent = validation.valid ? '' : validation.message;
  const selectedLabel = LOOK_PART_LABELS[creatorSelectedPart];
  creatorLookControls.innerHTML = `<p>Кликни по части модели, затем выбери вариант.</p><div class="creator-selector"><button type="button" aria-label="Предыдущий вариант: ${selectedLabel}" data-look-part="${creatorSelectedPart}" data-direction="-1">‹</button><span><small>${selectedLabel}</small><strong>${lookValueLabel(creatorSelectedPart, creatorLook[creatorSelectedPart])}</strong></span><button type="button" aria-label="Следующий вариант: ${selectedLabel}" data-look-part="${creatorSelectedPart}" data-direction="1">›</button></div>`;
  if (creatorPreviewActor) applyAvatarLook(creatorPreviewActor, creatorLook);
}

function selectedLook() {
  return { ...creatorLook };
}

function lookValueLabel(part, value) {
  return lookOptionLabel(part, value);
}

function openCreator() {
  const player = campaign.player;
  if (player) {
    creatorForm.elements.name.value = player.name;
    creatorForm.elements.nickname.value = player.nickname;
    creatorAllocations = allocationsFromSkills(player.skills);
    creatorLook = normalizeLook(player.look);
  } else {
    creatorForm.reset();
    creatorForm.elements.name.value = 'Миша';
    creatorForm.elements.nickname.value = '';
    creatorAllocations = Object.fromEntries(STAT_KEYS.map((key) => [key, 0]));
    creatorLook = normalizeLook({ hair: 'bald', face: 'clean', top: 'hoodie', pants: 'cargo', footwear: 'sneakers' });
    creatorSelectedPart = 'hair';
  }
  entryMode = 'creator';
  startScreen.classList.add('is-hidden');
  creatorError.textContent = '';
  renderCreator();
  creatorModal.classList.remove('is-hidden');
  resizeCreatorPreview();
}

function renderStartScreen() {
  const state = startScreenState(campaign);
  startContinue.classList.toggle('is-hidden', !state.canContinue);
  startScreen.classList.remove('is-hidden');
}

function enterApartment() {
  if (!campaign.player) return;
  entryMode = 'apartment';
  startScreen.classList.add('is-hidden');
  creatorModal.classList.add('is-hidden');
  applyAvatarLook(actor, campaign.player.look);
  sceneTitle.textContent = `КВАРТИРА · ${campaign.player.nickname.toUpperCase()}`;
  setStatus();
}

startNewGame.addEventListener('click', () => {
  campaign = newGameState();
  saveCampaign(campaign);
  openCreator();
});

startContinue.addEventListener('click', enterApartment);

creatorStats.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-stat]');
  if (!button) return;
  const key = button.dataset.stat;
  const next = creatorAllocations[key] + Number(button.dataset.delta);
  if (next < 0 || next > 4) return;
  const total = STAT_KEYS.reduce((sum, stat) => sum + creatorAllocations[stat], 0);
  if (next > creatorAllocations[key] && total >= 10) return;
  creatorAllocations = { ...creatorAllocations, [key]: next };
  renderCreator();
});

creatorLookControls.addEventListener('click', (event) => {
  const button = event.target.closest('[data-look-part]');
  const part = button?.dataset.lookPart;
  if (!part) return;
  creatorLook = cycleLookPart(creatorLook, part, Number(button?.dataset.direction ?? 1));
  applyAvatarLook(actor, creatorLook);
  renderCreator();
});

creatorPreviewCanvas.addEventListener('click', (event) => {
  const rect = creatorPreviewCanvas.getBoundingClientRect();
  const clickedPart = lookPartAtPreviewHeight((event.clientY - rect.top) / rect.height);
  creatorSelectedPart = selectAppearancePart(creatorSelectedPart, clickedPart);
  renderCreator();
});

creatorOpen.addEventListener('click', openCreator);

creatorForm.addEventListener('submit', (event) => {
  event.preventDefault();
  try {
    const form = new FormData(creatorForm);
    const player = createRapper({
      name: form.get('name'),
      nickname: form.get('nickname'),
      allocations: creatorAllocations,
      look: selectedLook(),
    });
    campaign = { ...campaign, player };
    saveCampaign(campaign);
    enterApartment();
  } catch (error) {
    creatorError.textContent = error.message;
  }
});

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
// Apartment is presented as a flat 2.5D diorama: no context-dependent real-time shadows.
renderer.shadowMap.enabled = false;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x121a1b, 10, 20);

const camera = new THREE.OrthographicCamera(-8, 8, 4.6, -4.6, 0.1, 30);
camera.position.set(0, 2.75, 11.5);
camera.lookAt(0, 2.15, 0);

const colors = {
  wall: 0x40504b,
  wallDark: 0x263430,
  floor: 0x202b2d,
  floorLine: 0x788067,
  wood: 0x76513b,
  woodDark: 0x38271f,
  teal: 0x2d6470,
  tealLight: 0x65a6a4,
  amber: 0xd6a549,
  red: 0xb94d3d,
  black: 0x172020,
  hoodie: 0x29343d,
  pants: 0x42504b,
  skin: 0xb97d5d,
  shoe: 0xe7dcca,
};

const gestureLabels = {
  'open-hands': 'разводит руки',
  'shoulder-rock': 'качает плечами',
  'crowd-turn': 'поворачивается к залу',
  point: 'выдаёт панч в зал',
};

function material(color, options = {}) {
  const { castShadow: _castShadow, receiveShadow: _receiveShadow, ...materialOptions } = options;
  return new THREE.MeshStandardMaterial({ color, roughness: .83, metalness: 0, ...materialOptions });
}

function box(parent, size, color, position, options = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material(color, options));
  mesh.position.set(...position);
  mesh.castShadow = options.castShadow ?? true;
  mesh.receiveShadow = options.receiveShadow ?? true;
  parent.add(mesh);
  return mesh;
}

function plane(parent, size, color, position, options = {}) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(...size), material(color, options));
  mesh.position.set(...position);
  mesh.receiveShadow = false;
  parent.add(mesh);
  return mesh;
}

function roundedContour(parent, width, height, position, corner = .08) {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const points = [
    new THREE.Vector3(-halfWidth + corner, -halfHeight, 0),
    new THREE.Vector3(halfWidth - corner, -halfHeight, 0),
    new THREE.Vector3(halfWidth, -halfHeight + corner, 0),
    new THREE.Vector3(halfWidth, halfHeight - corner, 0),
    new THREE.Vector3(halfWidth - corner, halfHeight, 0),
    new THREE.Vector3(-halfWidth + corner, halfHeight, 0),
    new THREE.Vector3(-halfWidth, halfHeight - corner, 0),
    new THREE.Vector3(-halfWidth, -halfHeight + corner, 0),
  ];
  const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal');
  const contour = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 48, .027, 6, true),
    new THREE.MeshBasicMaterial({ color: 0xf09a35, transparent: true, opacity: .98 }),
  );
  contour.position.set(...position);
  parent.add(contour);
}

function addRoom() {
  const roomGroup = new THREE.Group();
  scene.add(roomGroup);
  const livingRoom = new THREE.Group();
  livingRoom.name = 'living-room';
  livingRoom.position.x = livingRoomOffset;
  roomGroup.add(livingRoom);
  const kitchenRoom = new THREE.Group();
  kitchenRoom.name = 'kitchen-room';
  kitchenRoom.position.x = kitchenRoomOffset;
  roomGroup.add(kitchenRoom);
  const actionHitAreas = [];
  const actionHighlights = {};
  const actionHit = (id, parent, position, size) => {
    const hit = new THREE.Mesh(
      new THREE.BoxGeometry(...size),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    );
    hit.position.set(...position);
    hit.userData.actionId = id;
    parent.add(hit);
    actionHitAreas.push(hit);
    const highlight = new THREE.Mesh(
      new THREE.BoxGeometry(...size),
      new THREE.MeshBasicMaterial({ color: 0xf0bd59, transparent: true, opacity: .2, depthWrite: false }),
    );
    highlight.position.set(...position);
    highlight.scale.set(1.06, 1.05, 1.08);
    highlight.visible = false;
    parent.add(highlight);
    actionHighlights[id] = highlight;
    return hit;
  };

  box(roomGroup, [16, .24, 3.1], colors.floor, [1, -.12, 0]);
  box(roomGroup, [16, 6.7, .18], colors.wall, [1, 3.25, -1.35]);
  box(roomGroup, [16, .13, .22], colors.floorLine, [1, .08, -1.12]);

  // Кухня читается как отдельная зона: бело-чёрные обои крупной клеткой и светлый кафель.
  plane(kitchenRoom, [5.25, 6.3], 0xefeee6, [-2.6, 3.2, -1.24], { emissive: 0x44443d, emissiveIntensity: .18 });
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 5; row += 1) {
      if ((column + row) % 2 !== 0) continue;
      plane(kitchenRoom, [1.3, 1.26], 0x222825, [-4.55 + column * 1.3, .64 + row * 1.26, -1.225], { emissive: 0x070908, emissiveIntensity: .28 });
    }
  }
  for (let tileX = -5.0; tileX < .3; tileX += .72) {
    for (let tileZ = -1.0; tileZ <= 1.02; tileZ += .68) {
      const alternate = (Math.round((tileX + 5) / .72) + Math.round((tileZ + 1) / .68)) % 2 === 0;
      box(kitchenRoom, [.68, .035, .64], alternate ? 0xf4f2e9 : 0xd9dad2, [tileX, .025, tileZ], { castShadow: false });
    }
  }
  plane(livingRoom, [8.95, 6.3], 0x3c5053, [1.5, 3.2, -1.24], { emissive: 0x122428, emissiveIntensity: .32 });

  for (let x = -2.8; x < 6.5; x += 1.1) {
    box(livingRoom, [.035, 6.2, .04], 0x738070, [x, 3.15, -1.23], { castShadow: false });
  }

  const windowGroup = new THREE.Group();
  windowGroup.position.set(1.15, 3.08, -1.19);
  windowGroup.scale.set(.72, .76, 1);
  livingRoom.add(windowGroup);
  box(windowGroup, [4.1, 2.48, .14], colors.woodDark, [0, 0, 0], { castShadow: false, receiveShadow: false });
  plane(windowGroup, [3.74, 2.12], 0x273c4c, [0, 0, .09], { emissive: 0x122a3a, emissiveIntensity: .75 });
  box(windowGroup, [3.58, .52, .018], 0x9a4841, [0, -.8, .11], { castShadow: false, receiveShadow: false });
  box(windowGroup, [1.12, .84, .018], 0x7c403d, [-1.08, -.36, .115], { castShadow: false, receiveShadow: false });
  box(windowGroup, [.12, 2.26, .1], colors.wood, [0, 0, .14], { castShadow: false, receiveShadow: false });
  box(windowGroup, [3.86, .11, .1], colors.wood, [0, 0, .14], { castShadow: false, receiveShadow: false });
  box(windowGroup, [4.26, .16, .24], 0x8a694b, [0, -1.3, .16], { castShadow: false, receiveShadow: false });

  const divider = new THREE.Group();
  divider.name = 'kitchen-doorway';
  divider.position.set(-.93, 0, -.72);
  roomGroup.add(divider);
  const doorwayWidth = APARTMENT_INTERIOR_DOOR.width;
  const doorwayHeight = APARTMENT_INTERIOR_DOOR.height;
  box(divider, [.18, doorwayHeight, .35], 0x392d27, [-doorwayWidth / 2, doorwayHeight / 2, 0]);
  box(divider, [.18, doorwayHeight, .35], 0x392d27, [doorwayWidth / 2, doorwayHeight / 2, 0]);
  box(divider, [doorwayWidth + .36, .2, .4], colors.woodDark, [0, doorwayHeight, .02]);
  box(divider, [doorwayWidth + .16, .1, .32], 0xb69c70, [0, doorwayHeight - .17, .12], { emissive: 0x3c270d, emissiveIntensity: .4 });
  const interiorDoor = new THREE.Group();
  interiorDoor.name = 'interior-door-panel';
  interiorDoor.position.set(doorwayWidth / 2 - .08, 0, .02);
  divider.add(interiorDoor);
  box(interiorDoor, [doorwayWidth - .16, doorwayHeight - .24, .13], 0x79533c, [-(doorwayWidth - .16) / 2, (doorwayHeight - .24) / 2, 0]);
  box(interiorDoor, [doorwayWidth - .48, doorwayHeight - .58, .04], 0x25312e, [-(doorwayWidth - .16) / 2, (doorwayHeight - .24) / 2, .09]);
  box(interiorDoor, [.08, .08, .08], colors.amber, [-.18, doorwayHeight * .48, .15], { emissive: 0x6c3e09, emissiveIntensity: .85 });

  const bedFrame = new THREE.Group();
  bedFrame.position.set(-.95, 0, -.12);
  livingRoom.add(bedFrame);
  box(bedFrame, [3.05, .65, .92], 0x303b3a, [0, .4, 0]);
  box(bedFrame, [3.15, .2, 1.02], 0x23302f, [0, .79, 0]);
  box(bedFrame, [.82, .12, .82], 0xe0d6bd, [-1.05, .95, .02]);
  box(bedFrame, [1.92, .12, .9], 0xa34d43, [.3, .96, .02]);
  box(bedFrame, [.16, .95, .9], colors.wood, [-1.45, .48, 0]);
  box(bedFrame, [.16, .95, .9], colors.wood, [1.45, .48, 0]);

  const desk = new THREE.Group();
  desk.position.set(deskX - livingRoomOffset, 0, -.25);
  livingRoom.add(desk);
  box(desk, [2.35, .18, .78], colors.wood, [0, 1.32, 0]);
  box(desk, [.13, 1.3, .15], colors.woodDark, [-.95, .65, 0]);
  box(desk, [.13, 1.3, .15], colors.woodDark, [.95, .65, 0]);
  box(desk, [.92, .65, .12], colors.black, [.27, 1.78, -.04]);
  box(desk, [.74, .48, .04], 0x476f72, [.27, 1.78, .04], { emissive: 0x14383a, emissiveIntensity: .65 });
  box(desk, [.78, .08, .34], 0xb7a98a, [-.38, 1.46, .12]);
  box(desk, [.1, .32, .1], colors.black, [.27, 1.39, -.04]);
  box(desk, [.9, .72, .72], 0x2b3534, [-.92, .4, .02]);
  box(desk, [.62, .12, .54], colors.teal, [-.92, .82, .02]);
  box(desk, [.68, .12, .62], 0x293332, [-.45, .72, .42]);
  box(desk, [.68, .62, .12], 0x293332, [-.45, 1.03, .69]);
  box(desk, [.1, .67, .1], colors.black, [-.7, .36, .42]);
  box(desk, [.1, .67, .1], colors.black, [-.2, .36, .42]);

  const computerHitArea = new THREE.Mesh(
    new THREE.BoxGeometry(1.92, 1.08, .82),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  );
  computerHitArea.position.set(.02, 1.7, .08);
  computerHitArea.name = 'computerHitArea';
  computerHitArea.userData.actionId = 'computer';
  desk.add(computerHitArea);
  actionHitAreas.push(computerHitArea);

  const computerHighlight = new THREE.Group();
  roundedContour(computerHighlight, 1.03, .77, [.27, 1.78, .11], .09);
  roundedContour(computerHighlight, .92, .19, [-.38, 1.46, .32], .04);
  computerHighlight.visible = false;
  desk.add(computerHighlight);
  actionHighlights.computer = computerHighlight;

  const shelf = new THREE.Group();
  shelf.position.set(4.28, 1.65, -1.08);
  livingRoom.add(shelf);
  box(shelf, [1.28, 3.3, .31], colors.woodDark, [0, 0, 0]);
  for (const y of [-1.1, -.25, .6, 1.45]) {
    box(shelf, [1.08, .09, .37], colors.wood, [0, y, .1]);
  }
  for (const [x, y, color] of [[-.38, -.75, colors.red], [-.12, -.75, colors.amber], [.18, -.75, colors.teal], [-.22, .1, colors.teal], [.1, .1, colors.red], [.38, .1, colors.amber], [-.35, .94, colors.amber]]) {
    box(shelf, [.15, .48, .17], color, [x, y, .24]);
  }

  const poster = new THREE.Group();
  poster.position.set(.15, 3.7, -1.19);
  livingRoom.add(poster);
  plane(poster, [1.28, 1.85], colors.red, [0, 0, 0], { emissive: 0x220404, emissiveIntensity: .45 });
  plane(poster, [.86, .23], colors.amber, [0, .38, .018], { emissive: 0x3e2204, emissiveIntensity: .6 });
  plane(poster, [.44, .72], colors.black, [0, -.35, .018]);

  const lamp = new THREE.PointLight(0xe6bd6d, 18, 6.5, 2);
  lamp.position.set(-.85, 4.85, 1.05);
  lamp.castShadow = true;
  livingRoom.add(lamp);
  box(livingRoom, [.62, .18, .62], colors.amber, [-.85, 4.55, .78], { emissive: 0x8c5520, emissiveIntensity: 1.8 });
  box(livingRoom, [.035, 1.18, .035], colors.black, [-.85, 5.12, .78]);

  // Everyday objects use simple geometry deliberately: their interaction state, not visual complexity, drives the MVP.
  const fridge = new THREE.Group();
  fridge.position.set(-4.72, 0, -.4);
  kitchenRoom.add(fridge);
  box(fridge, [1.05, 2.28, .72], 0x2b3937, [0, 1.14, 0]);
  box(fridge, [.9, .93, .06], 0x49615f, [0, 1.59, .4], { emissive: 0x16302d, emissiveIntensity: .18 });
  box(fridge, [.9, .02, .05], colors.black, [0, 1.08, .43]);
  box(fridge, [.06, .68, .06], colors.tealLight, [.33, 1.6, .45]);
  box(fridge, [.54, .16, .06], colors.amber, [-.12, 2.16, .44], { emissive: 0x432b11, emissiveIntensity: .8 });

  const kitchen = new THREE.Group();
  kitchen.position.set(-3.12, 0, -.72);
  kitchenRoom.add(kitchen);
  box(kitchen, [2.12, .86, .72], 0x42504c, [0, .43, 0]);
  box(kitchen, [2.18, .13, .77], colors.wood, [0, .88, .02]);
  box(kitchen, [.94, .16, .74], 0x313432, [-.53, .98, .04]);
  for (const [x, y] of [[-.75, .8], [-.35, .8], [-.75, 1.12], [-.35, 1.12]]) cylinder(kitchen, .13, .13, .035, 0x15191b, [x, y, .08]);
  box(kitchen, [.62, .06, .5], 0x31565a, [.63, .95, .04], { emissive: 0x10373a, emissiveIntensity: .5 });
  box(kitchen, [.05, .31, .05], 0xbcc4bb, [.62, 1.13, -.12]);
  box(kitchen, [.26, .04, .04], 0xbcc4bb, [.72, 1.25, -.08]);

  const kitchenTable = new THREE.Group();
  kitchenTable.position.set(-2.15, 0, .12);
  kitchenRoom.add(kitchenTable);
  box(kitchenTable, [1.05, .12, .72], 0x79533c, [0, 1.05, 0]);
  for (const x of [-.4, .4]) box(kitchenTable, [.08, 1.05, .08], colors.woodDark, [x, .5, 0]);
  box(kitchenTable, [.52, .1, .5], 0x52392c, [-.65, .5, .07]);

  const mic = new THREE.Group();
  mic.position.set(APARTMENT_MICROPHONE.x - livingRoomOffset, APARTMENT_MICROPHONE.baseY, .54);
  livingRoom.add(mic);
  box(mic, [.42, .07, .28], 0x1a2223, [0, .08, 0]);
  box(mic, [.035, .34, .035], 0x161d1e, [0, .24, 0]);
  cylinder(mic, .075, .065, .24, 0x8ba19e, [0, .49, 0]);
  box(mic, [.23, .035, .035], 0x33433f, [0, .55, .03]);

  // Входная дверь — самостоятельный объект, а не тёмная полоса у края кадра.
  const exitDoor = new THREE.Group();
  exitDoor.name = 'apartment-entry-door';
  exitDoor.position.set(5.44, 0, -.76);
  livingRoom.add(exitDoor);
  const entryDoorWidth = APARTMENT_ENTRY_DOOR.width;
  const entryDoorHeight = APARTMENT_ENTRY_DOOR.height;
  // The frame stays in the wall; only this panel is allowed to rotate from its hinge.
  box(exitDoor, [.16, entryDoorHeight, .2], 0x2b231f, [-entryDoorWidth / 2, entryDoorHeight / 2, 0]);
  box(exitDoor, [.16, entryDoorHeight, .2], 0x2b231f, [entryDoorWidth / 2, entryDoorHeight / 2, 0]);
  box(exitDoor, [entryDoorWidth + .16, .16, .2], 0x2b231f, [0, entryDoorHeight - .08, 0]);
  const entryDoorPanel = new THREE.Group();
  entryDoorPanel.name = 'apartment-entry-door-panel';
  entryDoorPanel.position.set(entryDoorWidth / 2 - .11, 0, .14);
  exitDoor.add(entryDoorPanel);
  box(entryDoorPanel, [entryDoorWidth, entryDoorHeight - .23, .09], 0x714b37, [-entryDoorWidth / 2, (entryDoorHeight - .23) / 2, 0]);
  box(entryDoorPanel, [entryDoorWidth - .42, 1.2, .035], 0x4d3027, [-entryDoorWidth / 2, entryDoorHeight * .67, .06]);
  box(entryDoorPanel, [entryDoorWidth - .42, 1.2, .035], 0x4d3027, [-entryDoorWidth / 2, entryDoorHeight * .28, .06]);
  box(entryDoorPanel, [.11, .11, .07], 0xe0ae50, [-entryDoorWidth * .23, entryDoorHeight * .47, .1], { emissive: 0x6a4009, emissiveIntensity: .85 });
  box(entryDoorPanel, [.06, .06, .07], 0x1b1c1b, [-entryDoorWidth / 2, entryDoorHeight * .84, .1]);
  box(exitDoor, [entryDoorWidth + .08, .12, .46], 0x1d2221, [0, .07, .1]);
  plane(exitDoor, [.74, .22], 0x3b5f46, [0, entryDoorHeight + .02, .22], { emissive: 0x143821, emissiveIntensity: .9 });

  actionHit('bed', livingRoom, [.15, .82, .1], [3.3, 1.2, 1.15]);
  actionHit('fridge', kitchenRoom, [-4.72, 1.12, .02], [1.2, 2.42, .95]);
  actionHit('stove', kitchenRoom, [-3.66, .95, .02], [.95, .75, .98]);
  actionHit('sink', kitchenRoom, [-2.49, .98, .02], [.84, .78, .98]);
  actionHit('microphone', livingRoom, [APARTMENT_MICROPHONE.x - livingRoomOffset, APARTMENT_MICROPHONE.baseY + .3, .28], [.72, .86, .9]);
  actionHit('door', livingRoom, [5.44, entryDoorHeight / 2, .04], [entryDoorWidth + .35, entryDoorHeight + .2, .8]);
  box(livingRoom, [.12, 4.2, .34], 0x313936, [6.62, 2.08, -.12]);
  return { roomGroup, livingRoom, kitchenRoom, interiorDoor, entryDoorPanel, computerHitArea, computerHighlight, actionHitAreas, actionHighlights };
}

function makeLimb(parent, name, z, color, upperLength, lowerLength) {
  const pivot = new THREE.Group();
  pivot.name = `${name}Pivot`;
  parent.add(pivot);
  const upper = box(pivot, [.28, upperLength, .28], color, [0, -upperLength / 2, z]);
  const lowerPivot = new THREE.Group();
  lowerPivot.position.set(0, -upperLength, z);
  pivot.add(lowerPivot);
  const lower = box(lowerPivot, [.25, lowerLength, .25], color, [0, -lowerLength / 2, 0]);
  return { pivot, lowerPivot, upper, lower };
}

// A complete view is drawn as one 2.5D figure. We never compose a profile
// from a front-facing head and a separately rotated body.
function createAvatarView(parent, id) {
  const group = new THREE.Group();
  group.name = `avatar-view-${id}`;
  parent.add(group);
  const profile = id === 'profile-right' || id === 'profile-left';
  const faceRight = id === 'profile-right';
  const faceLeft = id === 'profile-left';
  const isFront = id === 'front';
  const isBack = id === 'back';
  const topMeshes = [];
  const pantsMeshes = [];
  const lowerLegMeshes = [];
  const hairMeshes = [];

  const headWidth = profile ? .42 : .53;
  const headX = profile ? (faceRight ? -.04 : .04) : 0;
  const head = box(group, [headWidth, .57, .16], colors.skin, [headX, 2.32, .05]);
  const hair = box(group, [headWidth + .02, .09, .18], 0x17151b, [headX, 2.64, .06]);
  hairMeshes.push(hair);
  const face = new THREE.Group();
  face.name = `avatar-view-${id}-face`;
  group.add(face);

  if (isFront) {
    [-.34, .34].forEach((x) => box(face, [.12, .18, .06], colors.skin, [x, 2.32, .16]));
    [-.17, .17].forEach((x) => {
      box(face, [.1, .09, .04], 0xe9eadf, [x, 2.43, .17], { emissive: 0x6b6d60, emissiveIntensity: .16 });
      const brow = box(face, [.15, .035, .045], 0x2a2020, [x, 2.52, .17]);
      brow.rotation.z = x < 0 ? .1 : -.1;
    });
    box(face, [.055, .12, .05], 0xc48769, [0, 2.34, .17]);
    box(face, [.2, .035, .045], 0x994f4b, [0, 2.2, .17]);
  } else if (profile) {
    const sign = faceRight ? 1 : -1;
    box(face, [.1, .17, .055], colors.skin, [-sign * .29, 2.32, .17]);
    box(face, [.09, .09, .045], 0xe9eadf, [sign * .075, 2.43, .17], { emissive: 0x6b6d60, emissiveIntensity: .16 });
    box(face, [.14, .035, .05], 0x2a2020, [sign * .09, 2.52, .17]);
    box(face, [.11, .11, .06], 0xc48769, [sign * .3, 2.34, .17]);
    box(face, [.13, .035, .05], 0x994f4b, [sign * .08, 2.2, .17]);
  } else if (isBack) {
    [-.34, .34].forEach((x) => box(face, [.12, .18, .06], colors.skin, [x, 2.32, .16]));
  }
  let mustache = null;
  let beard = null;
  if (isFront) {
    mustache = box(face, [.26, .055, .05], 0x1b1718, [0, 2.31, .2]);
    beard = box(face, [.37, .2, .055], 0x1b1718, [0, 2.13, .2]);
  } else if (profile) {
    const sign = faceRight ? 1 : -1;
    mustache = box(face, [.13, .055, .055], 0x1b1718, [sign * .18, 2.31, .2]);
    beard = box(face, [.18, .2, .06], 0x1b1718, [sign * .16, 2.13, .2]);
  }
  if (mustache) mustache.visible = false;
  if (beard) beard.visible = false;

  const torsoWidth = profile ? .56 : .78;
  const torso = box(group, [torsoWidth, .96, .18], 0x2e5361, [0, 1.48, .04]);
  topMeshes.push(torso);
  const lapels = new THREE.Group();
  group.add(lapels);
  const leftLapel = box(lapels, [.2, .6, .04], 0x6b8b92, [-.2, 1.6, .15]);
  const rightLapel = box(lapels, [.2, .6, .04], 0x6b8b92, [.2, 1.6, .15]);
  leftLapel.rotation.z = -.3;
  rightLapel.rotation.z = .3;
  lapels.visible = isFront;
  const hoodiePouch = box(group, [.54, .22, .04], colors.hoodie, [0, 1.21, .16]);
  hoodiePouch.visible = false;
  const hood = new THREE.Mesh(new THREE.TorusGeometry(.31, .055, 6, 10, Math.PI), material(colors.hoodie));
  hood.rotation.x = Math.PI / 2;
  hood.position.set(0, 1.95, -.06);
  hood.visible = false;
  group.add(hood);

  const limbs = {};
  const addArm = (key, x) => {
    const limb = makeLimb(group, `${id}-${key}`, .04, 0x2e5361, .62, .52);
    limb.pivot.position.set(x, 1.83, .04);
    box(limb.lowerPivot, [.22, .21, .08], colors.skin, [0, -.6, .04]);
    limbs[key] = limb;
    topMeshes.push(limb.upper, limb.lower);
  };
  if (faceRight) addArm('backArm', -.32);
  else if (faceLeft) addArm('frontArm', .32);
  else {
    addArm('backArm', -.42);
    addArm('frontArm', .42);
  }

  const legXs = profile ? [-.14, .14] : [-.19, .19];
  const addLeg = (key, x) => {
    const limb = makeLimb(group, `${id}-${key}`, .04, colors.pants, .68, .6);
    limb.pivot.position.set(x, 1.03, .04);
    box(limb.lowerPivot, [.39, .16, .1], colors.shoe, [.1, -.64, .04]);
    limbs[key] = limb;
    pantsMeshes.push(limb.upper, limb.lower);
    lowerLegMeshes.push(limb.lower);
  };
  addLeg('backLeg', legXs[0]);
  addLeg('frontLeg', legXs[1]);

  return {
    group,
    id,
    head,
    hairMeshes,
    face,
    mustache,
    beard,
    torso,
    topMeshes,
    pantsMeshes,
    lowerLegMeshes,
    lapels,
    hoodiePouch,
    hood,
    limbs,
  };
}

function createAvatarViews(parent) {
  return Object.fromEntries(['front', 'profile-right', 'back', 'profile-left'].map((id) => [id, createAvatarView(parent, id)]));
}

function createCharacter(parent = scene, { x = APARTMENT_SPAWN.x } = {}) {
  const actor = {
    group: new THREE.Group(),
    model: new THREE.Group(),
    state: { x, facing: 1, moving: false },
    mode: 'walking',
    phase: 0,
    turn: null,
    actionElapsed: 0,
    seatStartX: 0,
    seatStartZ: APARTMENT_ACTOR_FOREGROUND_Z,
    seatTargetX: deskX - .45,
    seatTargetZ: .02,
    standStartZ: APARTMENT_ACTOR_FOREGROUND_Z,
    actionStartZ: APARTMENT_ACTOR_FOREGROUND_Z,
    actionTargetZ: APARTMENT_ACTOR_FOREGROUND_Z,
    destinationX: null,
    interaction: null,
    pendingIntent: null,
    pendingActionSourceRoom: null,
    routePoints: [],
    usesInteriorDoor: false,
    actionTransition: null,
    actionCuePlayed: false,
    bubble: null,
    computerTask: null,
  };
  actor.group.position.x = actor.state.x;
  actor.group.add(actor.model);
  parent.add(actor.group);

  // `model` owns gameplay yaw and poses. Everything visible lives on this
  // single 2.5D panel, which cancels that yaw and switches silhouette instead.
  // That keeps head, body and limbs on one coherent plane in every direction.
  const visual = new THREE.Group();
  visual.name = 'avatar-visual-panel';
  actor.model.add(visual);
  actor.visual = visual;

  const shadow = new THREE.Mesh(new THREE.CircleGeometry(.62, 24), new THREE.MeshBasicMaterial({ color: 0x0a0e0e, transparent: true, opacity: .42 }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.y = .4;
  shadow.position.y = .012;
  actor.group.add(shadow);
  actor.shadow = shadow;

  const topStyles = {};
  const tee = new THREE.Group();
  tee.name = 'avatar-top-tee';
  visual.add(tee);
  const teeTorso = box(tee, [.72, .84, .48], 0x6e7c74, [0, 1.48, 0]);
  const teeSleeveLeft = box(tee, [.24, .28, .5], 0x6e7c74, [-.47, 1.79, 0]);
  const teeSleeveRight = box(tee, [.24, .28, .5], 0x6e7c74, [.47, 1.79, 0]);
  topStyles.tee = { group: tee, meshes: [teeTorso, teeSleeveLeft, teeSleeveRight], torso: teeTorso, sleeves: [teeSleeveLeft, teeSleeveRight] };

  const hoodie = new THREE.Group();
  hoodie.name = 'avatar-top-hoodie';
  visual.add(hoodie);
  const hoodieTorso = box(hoodie, [.76, .98, .52], colors.hoodie, [0, 1.48, 0]);
  const hoodiePouch = box(hoodie, [.54, .22, .08], colors.hoodie, [0, 1.21, .3]);
  const hood = new THREE.Mesh(new THREE.TorusGeometry(.31, .09, 8, 12, Math.PI), material(colors.hoodie));
  hood.rotation.x = Math.PI / 2;
  hood.position.set(0, 1.95, -.27);
  hoodie.add(hood);
  topStyles.hoodie = { group: hoodie, meshes: [hoodieTorso, hoodiePouch, hood], torso: hoodieTorso, frontDetails: [hoodiePouch] };

  const jacket = new THREE.Group();
  jacket.name = 'avatar-top-jacket';
  visual.add(jacket);
  const jacketTorso = box(jacket, [.78, .96, .54], 0x2e5361, [0, 1.48, 0]);
  const jacketLapels = [
    box(jacket, [.2, .6, .09], 0x6b8b92, [-.2, 1.6, .32]),
    box(jacket, [.2, .6, .09], 0x6b8b92, [.2, 1.6, .32]),
  ];
  jacketLapels[0].rotation.z = -.3;
  jacketLapels[1].rotation.z = .3;
  topStyles.jacket = { group: jacket, meshes: [jacketTorso, ...jacketLapels], torso: jacketTorso, frontDetails: jacketLapels };

  const head = box(visual, [.53, .57, .48], colors.skin, [0, 2.32, 0]);
  const hair = box(visual, [.55, .09, .51], 0x17151b, [0, 2.64, 0]);
  const frontFaceHair = new THREE.Group();
  visual.add(frontFaceHair);
  const mustache = box(frontFaceHair, [.26, .055, .05], 0x1b1718, [0, 2.31, .27]);
  const beard = box(frontFaceHair, [.37, .2, .055], 0x1b1718, [0, 2.13, .27]);
  mustache.visible = false;
  beard.visible = false;
  const frontFace = new THREE.Group();
  frontFace.name = 'avatar-front-face';
  visual.add(frontFace);
  const faceLayout = frontFacingFaceLayout();
  faceLayout.earXs.forEach((x) => box(frontFace, [.12, .18, .17], colors.skin, [x, 2.32, .01]));
  const eyeMaterial = material(0xe9eadf, { emissive: 0x6b6d60, emissiveIntensity: .16 });
  faceLayout.eyeXs.forEach((x) => {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(.1, .09, .04), eyeMaterial);
    eye.position.set(x, 2.43, faceLayout.faceZ);
    frontFace.add(eye);
    const brow = box(frontFace, [.15, .035, .045], 0x2a2020, [x, 2.52, faceLayout.faceZ]);
    brow.rotation.z = x < 0 ? .1 : -.1;
  });
  box(frontFace, [.055, .12, .05], 0xc48769, [0, 2.34, faceLayout.faceZ]);
  box(frontFace, [.2, .035, .045], 0x994f4b, [0, 2.2, faceLayout.faceZ]);

  // Profiles are deliberately drawn on the same display panel as the body.
  // They are not side-mounted meshes: the whole panel is the 2.5D silhouette.
  const profileRightFace = new THREE.Group();
  profileRightFace.name = 'avatar-profile-right-face';
  visual.add(profileRightFace);
  box(profileRightFace, [.1, .17, .055], colors.skin, [-.29, 2.32, .27]);
  box(profileRightFace, [.09, .09, .045], 0xe9eadf, [.075, 2.43, .27], { emissive: 0x6b6d60, emissiveIntensity: .16 });
  box(profileRightFace, [.14, .035, .05], 0x2a2020, [.09, 2.52, .27]);
  box(profileRightFace, [.11, .11, .06], 0xc48769, [.3, 2.34, .27]);
  box(profileRightFace, [.13, .035, .05], 0x994f4b, [.08, 2.2, .27]);
  const profileRightMustache = box(profileRightFace, [.13, .055, .055], 0x1b1718, [.18, 2.31, .275]);
  const profileRightBeard = box(profileRightFace, [.18, .2, .06], 0x1b1718, [.16, 2.13, .275]);
  profileRightMustache.visible = false;
  profileRightBeard.visible = false;

  const profileLeftFace = new THREE.Group();
  profileLeftFace.name = 'avatar-profile-left-face';
  visual.add(profileLeftFace);
  box(profileLeftFace, [.1, .17, .055], colors.skin, [.29, 2.32, .27]);
  box(profileLeftFace, [.09, .09, .045], 0xe9eadf, [-.075, 2.43, .27], { emissive: 0x6b6d60, emissiveIntensity: .16 });
  box(profileLeftFace, [.14, .035, .05], 0x2a2020, [-.09, 2.52, .27]);
  box(profileLeftFace, [.11, .11, .06], 0xc48769, [-.3, 2.34, .27]);
  box(profileLeftFace, [.13, .035, .05], 0x994f4b, [-.08, 2.2, .27]);
  const profileLeftMustache = box(profileLeftFace, [.13, .055, .055], 0x1b1718, [-.18, 2.31, .275]);
  const profileLeftBeard = box(profileLeftFace, [.18, .2, .06], 0x1b1718, [-.16, 2.13, .275]);
  profileLeftMustache.visible = false;
  profileLeftBeard.visible = false;

  actor.backArm = makeLimb(visual, 'backArm', -.31, 0x1f2930, .62, .52);
  actor.frontArm = makeLimb(visual, 'frontArm', .31, 0x34444d, .62, .52);
  actor.backArm.pivot.position.set(-.42, 1.83, 0);
  actor.frontArm.pivot.position.set(.42, 1.83, 0);
  box(actor.backArm.lowerPivot, [.22, .21, .22], colors.skin, [0, -.6, 0]);
  box(actor.frontArm.lowerPivot, [.22, .21, .22], colors.skin, [0, -.6, 0]);

  actor.backLeg = makeLimb(visual, 'backLeg', -.19, 0x33423f, .68, .6);
  actor.frontLeg = makeLimb(visual, 'frontLeg', .19, colors.pants, .68, .6);
  actor.backLeg.pivot.position.set(-.19, 1.03, 0);
  actor.frontLeg.pivot.position.set(.19, 1.03, 0);
  box(actor.backLeg.lowerPivot, [.39, .16, .32], colors.shoe, [.1, -.64, .01]);
  box(actor.frontLeg.lowerPivot, [.39, .16, .32], colors.shoe, [.1, -.64, .01]);

  // The old articulated meshes remain as a hidden pose skeleton. The visible
  // actor is one of the four complete views created above the skeleton.
  actor.legacyVisual = visual;
  actor.legacyVisual.visible = false;
  actor.avatarViewPanel = new THREE.Group();
  actor.avatarViewPanel.name = 'avatar-four-view-panel';
  actor.model.add(actor.avatarViewPanel);
  actor.avatarViews = createAvatarViews(actor.avatarViewPanel);
  actor.activeAvatarView = null;

  actor.model.rotation.y = profileFaceLayout().rightYaw;
  actor.lookParts = {
    topStyles,
    head,
    hair,
    mustache,
    beard,
    profileRightMustache,
    profileRightBeard,
    profileLeftMustache,
    profileLeftBeard,
    frontFace,
    frontFaceHair,
    profileRightFace,
    profileLeftFace,
    frontLeg: actor.frontLeg.upper,
    backLeg: actor.backLeg.upper,
    frontShin: actor.frontLeg.lower,
    backShin: actor.backLeg.lower,
    frontArm: actor.frontArm.upper,
    backArm: actor.backArm.upper,
  };
  updateFacePresentation(actor);
  return actor;
}

function applyAvatarLook(target, look = {}) {
  const normalizedLook = normalizeLook(look);
  const geometry = appearanceGeometry(normalizedLook);
  const topColors = { tee: 0x6e7c74, hoodie: colors.hoodie, jacket: 0x2e5361 };
  const pantsColors = { cargo: colors.pants, jeans: 0x303d63, shorts: 0x77715b };
  const topColor = topColors[normalizedLook.top];
  Object.entries(target.lookParts.topStyles).forEach(([id, style]) => {
    style.group.visible = id === normalizedLook.top;
    style.meshes.forEach((mesh) => mesh.material.color.setHex(topColor));
  });
  target.lookParts.frontArm.material.color.setHex(topColor);
  target.lookParts.backArm.material.color.setHex(topColor);
  target.lookParts.frontLeg.material.color.setHex(pantsColors[normalizedLook.pants]);
  target.lookParts.backLeg.material.color.setHex(pantsColors[normalizedLook.pants]);
  target.lookParts.frontShin.material.color.setHex(geometry.lowerLegsVisible ? colors.skin : pantsColors[normalizedLook.pants]);
  target.lookParts.backShin.material.color.setHex(geometry.lowerLegsVisible ? colors.skin : pantsColors[normalizedLook.pants]);
  target.lookParts.hair.visible = normalizedLook.hair !== 'bald';
  target.lookParts.hair.scale.set(1, normalizedLook.hair === 'mohawk' ? 2.2 : 1, normalizedLook.hair === 'mohawk' ? .38 : 1);
  target.lookParts.hair.position.y = normalizedLook.hair === 'mohawk' ? 2.72 : 2.64;
  target.lookParts.mustache.visible = normalizedLook.face === 'mustache';
  target.lookParts.beard.visible = normalizedLook.face === 'beard';
  target.lookParts.profileRightMustache.visible = normalizedLook.face === 'mustache';
  target.lookParts.profileRightBeard.visible = normalizedLook.face === 'beard';
  target.lookParts.profileLeftMustache.visible = normalizedLook.face === 'mustache';
  target.lookParts.profileLeftBeard.visible = normalizedLook.face === 'beard';
  applyAvatarViewLook(target, normalizedLook, geometry);
  updateFacePresentation(target);
}

function setMeshColor(meshes, color) {
  meshes.forEach((mesh) => mesh.material.color.setHex(color));
}

function applyAvatarViewLook(target, look, geometry) {
  if (!target.avatarViews) return;
  const topColors = { tee: 0x6e7c74, hoodie: colors.hoodie, jacket: 0x2e5361 };
  const pantsColors = { cargo: colors.pants, jeans: 0x303d63, shorts: 0x77715b };
  Object.values(target.avatarViews).forEach((view) => {
    setMeshColor(view.topMeshes, topColors[look.top]);
    setMeshColor(view.pantsMeshes, pantsColors[look.pants]);
    setMeshColor(view.lowerLegMeshes, geometry.lowerLegsVisible ? colors.skin : pantsColors[look.pants]);
    view.lapels.visible = look.top === 'jacket' && view.id === 'front';
    view.hoodiePouch.visible = look.top === 'hoodie' && view.id === 'front';
    view.hood.visible = look.top === 'hoodie';
    view.torso.scale.y = look.top === 'tee' ? .86 : 1;
    view.hairMeshes.forEach((hair) => {
      hair.visible = look.hair !== 'bald';
      hair.scale.set(look.hair === 'mohawk' ? .72 : 1, look.hair === 'mohawk' ? 2.2 : 1, look.hair === 'mohawk' ? .38 : 1);
      hair.position.y = look.hair === 'mohawk' ? 2.72 : 2.64;
    });
    if (view.mustache) view.mustache.visible = look.face === 'mustache';
    if (view.beard) view.beard.visible = look.face === 'beard';
  });
}

function copyLimbPose(source, destination) {
  if (!source || !destination) return;
  destination.pivot.rotation.z = source.pivot.rotation.z;
  destination.lowerPivot.rotation.z = source.lowerPivot.rotation.z;
}

function syncAvatarViewPose(target) {
  const view = target.activeAvatarView;
  if (!view) return;
  copyLimbPose(target.backArm, view.limbs.backArm);
  copyLimbPose(target.frontArm, view.limbs.frontArm);
  copyLimbPose(target.backLeg, view.limbs.backLeg);
  copyLimbPose(target.frontLeg, view.limbs.frontLeg);
}

function updateFacePresentation(target) {
  const parts = target.lookParts;
  if (!parts?.frontFace || !parts.profileRightFace || !parts.profileLeftFace) return;
  const presentation = avatarFacingForYaw(target.model.rotation.y);
  if (target.avatarViewPanel) {
    target.avatarViewPanel.rotation.y = presentation.billboardYaw;
    Object.entries(target.avatarViews).forEach(([id, view]) => {
      view.group.visible = id === presentation.face;
    });
    target.activeAvatarView = target.avatarViews[presentation.face];
    syncAvatarViewPose(target);
    return;
  }
  const rig = presentation.rig;
  if (target.visual) {
    target.visual.rotation.y = presentation.billboardYaw;
    target.visual.scale.x = 1;
  }
  parts.head.scale.x = rig.headWidth;
  parts.hair.scale.x = rig.headWidth;
  parts.frontFace.visible = presentation.face === 'front';
  parts.frontFaceHair.visible = presentation.face === 'front';
  parts.profileRightFace.visible = presentation.face === 'profile-right';
  parts.profileLeftFace.visible = presentation.face === 'profile-left';
  Object.values(parts.topStyles).forEach((style) => {
    style.torso.scale.x = rig.torsoWidth;
    style.sleeves?.forEach((sleeve) => {
      sleeve.visible = presentation.face === 'front' || presentation.face === 'back';
    });
    style.frontDetails?.forEach((detail) => {
      detail.visible = rig.frontDetails;
    });
  });
  target.backLeg.pivot.position.x = rig.legXs[0];
  target.frontLeg.pivot.position.x = rig.legXs[1];
  if (presentation.visibleArm === 'front') {
    target.frontArm.pivot.position.x = rig.armXs[0];
  } else if (presentation.visibleArm === 'back') {
    target.backArm.pivot.position.x = rig.armXs[0];
  } else {
    target.backArm.pivot.position.x = rig.armXs[0];
    target.frontArm.pivot.position.x = rig.armXs[1];
  }
  target.backArm.pivot.visible = presentation.visibleArm !== 'front';
  target.frontArm.pivot.visible = presentation.visibleArm !== 'back';
}

function createEggOpponent(parent, x = 3.75) {
  const opponent = {
    group: new THREE.Group(),
    model: new THREE.Group(),
    state: { x, facing: -1, moving: false },
    phase: 0,
  };
  opponent.group.position.x = x;
  opponent.group.add(opponent.model);
  parent.add(opponent.group);

  const shadow = new THREE.Mesh(new THREE.CircleGeometry(.65, 24), new THREE.MeshBasicMaterial({ color: 0x0a0e0e, transparent: true, opacity: .42 }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.y = .4;
  shadow.position.y = .012;
  opponent.group.add(shadow);
  opponent.shadow = shadow;

  const egg = new THREE.Mesh(new THREE.SphereGeometry(.57, 14, 12), material(0xd7cfb5));
  egg.position.set(0, 1.62, 0);
  egg.scale.set(.94, 1.38, .78);
  egg.castShadow = true;
  egg.receiveShadow = true;
  opponent.model.add(egg);
  box(opponent.model, [.92, .15, .58], 0x713444, [0, 1.44, .03]);
  box(opponent.model, [.17, .13, .06], 0x182123, [-.2, 1.88, .43]);
  box(opponent.model, [.17, .13, .06], 0x182123, [.2, 1.88, .43]);
  box(opponent.model, [.43, .06, .06], 0x9b504e, [0, 1.63, .43]);
  box(opponent.model, [.72, .14, .52], 0xd49a3a, [.04, 2.39, 0]);

  opponent.backArm = makeLimb(opponent.model, 'eggBackArm', -.31, 0x713444, .56, .47);
  opponent.frontArm = makeLimb(opponent.model, 'eggFrontArm', .31, 0x854052, .56, .47);
  opponent.backArm.pivot.position.set(0, 1.85, 0);
  opponent.frontArm.pivot.position.set(0, 1.85, 0);
  box(opponent.backArm.lowerPivot, [.2, .2, .2], 0xd7cfb5, [0, -.54, 0]);
  box(opponent.frontArm.lowerPivot, [.2, .2, .2], 0xd7cfb5, [0, -.54, 0]);

  opponent.backLeg = makeLimb(opponent.model, 'eggBackLeg', -.18, 0x4a454b, .58, .48);
  opponent.frontLeg = makeLimb(opponent.model, 'eggFrontLeg', .18, 0x4a454b, .58, .48);
  opponent.backLeg.pivot.position.set(0, .98, 0);
  opponent.frontLeg.pivot.position.set(0, .98, 0);
  box(opponent.backLeg.lowerPivot, [.36, .14, .3], colors.shoe, [.1, -.52, .01]);
  box(opponent.frontLeg.lowerPivot, [.36, .14, .3], colors.shoe, [.1, -.52, .01]);
  opponent.model.rotation.y = -Math.PI;
  return opponent;
}

function cylinder(parent, radiusTop, radiusBottom, height, color, position, options = {}) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 10),
    material(color, options),
  );
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function createAudienceMember(parent, x, z, shirt, phase, scale = 1) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  parent.add(group);
  cylinder(group, .18, .22, .62, shirt, [0, .52, 0]);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.18, 10, 8), material(0xc78866));
  head.position.set(0, .98, 0);
  group.add(head);
  const leftArm = new THREE.Group();
  const rightArm = new THREE.Group();
  leftArm.position.set(-.18, .75, 0);
  rightArm.position.set(.18, .75, 0);
  box(leftArm, [.12, .49, .12], shirt, [0, -.245, 0]);
  box(rightArm, [.12, .49, .12], shirt, [0, -.245, 0]);
  group.add(leftArm, rightArm);
  return { group, leftArm, rightArm, phase };
}

function createJudge(parent, x, phase) {
  const group = new THREE.Group();
  group.position.set(x, 1.48, -.76);
  parent.add(group);
  box(group, [.58, .66, .38], 0x293236, [0, .33, 0]);
  box(group, [.68, .11, .42], 0x76513b, [0, .64, .03]);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.22, 10, 8), material(0xc78866));
  head.position.set(0, .98, 0);
  group.add(head);
  box(group, [.45, .09, .4], phase % 2 === 0 ? colors.red : colors.teal, [0, 1.17, 0]);
  const arm = new THREE.Group();
  arm.position.set(.32, .56, .07);
  box(arm, [.14, .42, .14], 0x293236, [0, -.21, 0]);
  group.add(arm);
  return { group, arm, phase };
}

function createBattleScene() {
  const group = new THREE.Group();
  group.visible = false;
  scene.add(group);

  box(group, [13.2, .3, 3.8], 0x28252a, [0, -.15, 0]);
  box(group, [12.8, 5.9, .18], 0x251d27, [0, 2.85, -1.58]);
  box(group, [11.6, .24, 2.78], 0x5a363e, [0, .2, -.12]);
  box(group, [9.5, .08, 2.2], 0x8d4a3e, [0, .36, -.08]);
  box(group, [5.8, 1.22, .08], 0x17363c, [0, 4.43, -1.42], { emissive: 0x0c262c, emissiveIntensity: .55 });
  box(group, [3.5, .16, .12], colors.amber, [0, 4.42, -1.33], { emissive: 0x5c3a05, emissiveIntensity: 1.1 });

  const stageLightLeft = new THREE.PointLight(0xd44b55, 16, 7.5, 2);
  stageLightLeft.position.set(-4.4, 4.65, 1.3);
  group.add(stageLightLeft);
  const stageLightRight = new THREE.PointLight(0x4aa1a2, 16, 7.5, 2);
  stageLightRight.position.set(4.4, 4.65, 1.3);
  group.add(stageLightRight);
  box(group, [.42, .16, .42], colors.red, [-4.4, 4.35, 1.3], { emissive: 0x641019, emissiveIntensity: 1.1 });
  box(group, [.42, .16, .42], colors.tealLight, [4.4, 4.35, 1.3], { emissive: 0x0b3838, emissiveIntensity: 1.1 });

  const judgeDesk = new THREE.Group();
  judgeDesk.position.set(0, 0, -1.23);
  group.add(judgeDesk);
  box(judgeDesk, [5.05, .3, .55], 0x252224, [0, 1.22, 0]);
  box(judgeDesk, [4.6, .72, .46], 0x1a2022, [0, .72, .06]);
  const judges = [-1.55, 0, 1.55].map((x, index) => createJudge(group, x, index));

  const crowd = [];
  const crowdColors = [0x56665b, 0x704550, 0x3d5962, 0x725f45, 0x4c4b64];
  for (let index = 0; index < 13; index += 1) {
    const x = -5.6 + index * .94;
    crowd.push(createAudienceMember(group, x, -1.34, crowdColors[index % crowdColors.length], index * .83, .78));
  }
  for (let index = 0; index < 8; index += 1) {
    const x = -4.8 + index * 1.35;
    crowd.push(createAudienceMember(group, x, .94, crowdColors[(index + 2) % crowdColors.length], index * 1.13 + .4, .64));
  }

  const microphone = new THREE.Group();
  microphone.position.set(-.42, .12, -.05);
  group.add(microphone);
  cylinder(microphone, .035, .055, 1.96, 0x1b2022, [0, .98, 0]);
  cylinder(microphone, .12, .09, .24, 0x5f7372, [0, 2.06, 0]);
  cylinder(microphone, .38, .04, .06, 0x1a2022, [0, .04, 0]);

  const opponent = createEggOpponent(group);
  return {
    group,
    opponent,
    crowd,
    judges,
    micX: -.42,
    phase: 'idle',
    elapsed: 0,
    playerOrder: GESTURE_STYLES,
    opponentOrder: shuffledStyles(),
  };
}

const { roomGroup, interiorDoor, entryDoorPanel, computerHitArea, computerHighlight, actionHitAreas, actionHighlights } = addRoom();
const interactiveObjects = actionHitAreas;
const actor = createCharacter();
actor.group.position.z = APARTMENT_ACTOR_FOREGROUND_Z;
const actorFootOffset = .37;

function anchorActorToFloor(target, floorY = APARTMENT_FLOOR_Y) {
  target.group.position.y = floorY + actorFootOffset;
  target.shadow.position.y = floorY - target.group.position.y + .012;
}

anchorActorToFloor(actor);
applyAvatarLook(actor, campaign.player?.look);
const creatorPreviewRenderer = new THREE.WebGLRenderer({ canvas: creatorPreviewCanvas, antialias: true, alpha: true });
creatorPreviewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const creatorPreviewScene = new THREE.Scene();
const creatorPreviewCamera = new THREE.OrthographicCamera(-2.1, 2.1, 2.7, -1.2, .1, 20);
creatorPreviewCamera.position.set(0, 1.8, 8);
creatorPreviewCamera.lookAt(0, 1.4, 0);
creatorPreviewScene.add(new THREE.HemisphereLight(0xa7d0c9, 0x1c201c, 2.1));
const creatorPreviewLight = new THREE.DirectionalLight(0xf2d9ab, 2.2);
creatorPreviewLight.position.set(-2, 5, 4);
creatorPreviewScene.add(creatorPreviewLight);
const creatorPreviewActor = createCharacter(creatorPreviewScene, { x: 0 });
anchorActorToFloor(creatorPreviewActor);
creatorPreviewActor.model.rotation.y = profileFaceLayout().previewYaw;
applyAvatarLook(creatorPreviewActor, creatorLook);
const battle = createBattleScene();
let gameMode = 'apartment';
let entryMode = 'start';

scene.add(new THREE.HemisphereLight(0x97c7cf, 0x1d211a, 1.55));
const keyLight = new THREE.DirectionalLight(0xefe0b4, 2.1);
keyLight.position.set(-3.5, 6, 5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
scene.add(keyLight);

function setStatus() {
  if (actor.mode === 'typing') {
    status.textContent = 'Пишет текст. Кликни по комнате, чтобы встать.';
    return;
  }
  if (actor.mode === 'turningToDesk') {
    status.textContent = 'Разворачивается к монитору.';
    return;
  }
  if (actor.mode === 'sittingDown') {
    status.textContent = 'Садится за компьютер.';
    return;
  }
  if (actor.mode === 'turningToRecordDesk' || actor.mode === 'sittingToRecord') {
    status.textContent = 'Садится к настольному микрофону.';
    return;
  }
  if (actor.mode === 'standingUp') {
    status.textContent = 'Встаёт от компьютера.';
    return;
  }
  if (actor.mode === 'apartmentAction') {
    status.textContent = actor.activeApartmentAction.label;
    return;
  }
  status.textContent = 'Кликни по комнате, чтобы отправить героя в нужную точку.';
}

function updatePose(delta, elapsed) {
  if (actor.mode === 'typing') {
    applySeatPose(1, elapsed);
    return;
  }

  actor.model.position.set(0, 0, 0);
  actor.model.rotation.z = 0;
  if (!actor.state.moving) {
    const breath = Math.sin(elapsed * 2.4) * .035;
    actor.model.position.y = breath;
    actor.frontArm.pivot.rotation.z = -.06 + breath;
    actor.backArm.pivot.rotation.z = .04 - breath;
    actor.frontArm.lowerPivot.rotation.z = 0;
    actor.backArm.lowerPivot.rotation.z = 0;
    actor.frontLeg.pivot.rotation.z = 0;
    actor.backLeg.pivot.rotation.z = 0;
    actor.frontLeg.lowerPivot.rotation.z = 0;
    actor.backLeg.lowerPivot.rotation.z = 0;
    actor.shadow.scale.set(1, 1, 1);
    return;
  }

  actor.phase += delta * 13;
  const stride = Math.sin(actor.phase) * .66;
  actor.frontLeg.pivot.rotation.z = stride;
  actor.backLeg.pivot.rotation.z = -stride;
  actor.frontLeg.lowerPivot.rotation.z = Math.max(0, -stride) * .74;
  actor.backLeg.lowerPivot.rotation.z = Math.max(0, stride) * .74;
  actor.frontArm.pivot.rotation.z = -stride * .73;
  actor.backArm.pivot.rotation.z = stride * .73;
  actor.frontArm.lowerPivot.rotation.z = 0;
  actor.backArm.lowerPivot.rotation.z = 0;
  actor.model.position.y = Math.abs(Math.sin(actor.phase * 2)) * .055;
  actor.shadow.scale.set(.96 + Math.abs(stride) * .16, .86, 1);
}

function startTurn(targetAngle, duration = .28) {
  actor.turn = {
    from: actor.model.rotation.y,
    target: targetAngle,
    elapsed: 0,
    duration,
  };
}

function updateTurn(delta) {
  if (!actor.turn) return;
  actor.turn.elapsed = Math.min(actor.turn.elapsed + delta, actor.turn.duration);
  const progress = actor.turn.elapsed / actor.turn.duration;
  actor.model.rotation.y = turnAngle(actor.turn.from, actor.turn.target, progress);
  updateFacePresentation(actor);
  if (progress === 1) actor.turn = null;
}

function applySeatPose(progress, elapsed) {
  const pose = seatPose(progress);
  const arms = keyboardArmPose(progress, elapsed * 11);
  actor.model.position.y = pose.bodyY;
  actor.frontLeg.pivot.rotation.z = pose.thighAngle;
  actor.backLeg.pivot.rotation.z = pose.thighAngle * .92;
  actor.frontLeg.lowerPivot.rotation.z = pose.shinAngle;
  actor.backLeg.lowerPivot.rotation.z = pose.shinAngle;
  actor.frontArm.pivot.rotation.z = arms.frontShoulder;
  actor.backArm.pivot.rotation.z = arms.backShoulder;
  actor.frontArm.lowerPivot.rotation.z = arms.frontElbow;
  actor.backArm.lowerPivot.rotation.z = arms.backElbow;
  actor.shadow.scale.set(1 + progress * .2, 1 - progress * .45, 1);
}

function beginSeatSequence() {
  actor.mode = 'turningToDesk';
  actor.actionElapsed = 0;
  actor.seatStartX = actor.state.x;
  actor.seatStartZ = actor.group.position.z;
  actor.state = { ...actor.state, moving: false };
  startTurn(actionYaw('computer'), .34);
}

function beginStandingSequence() {
  actor.mode = 'standingUp';
  actor.actionElapsed = 0;
  actor.standStartZ = actor.group.position.z;
}

function beginApartmentAction(actionId) {
  const action = getApartmentAction(actionId);
  const availability = canStartApartmentAction(actionId, campaign.needs);
  if (!action || !availability.allowed) {
    renderInteractionDock(`<span class="interaction-dock__hint">${availability.reason}</span>`);
    return;
  }
  if (actionId === 'computer') {
    beginSeatSequence();
    return;
  }
  if (actionUsesDeskSeat(actionId)) {
    actor.activeApartmentAction = action;
    actor.actionTransition = createActionTransition({ actionId, fromRoom: 'living', toRoom: 'living' });
    actor.actionCuePlayed = false;
    actor.actionElapsed = 0;
    actor.seatStartX = actor.state.x;
    actor.seatStartZ = actor.group.position.z;
    actor.state = { ...actor.state, moving: false };
    actor.mode = 'turningToRecordDesk';
    startTurn(actionYaw(actionId), .24);
    return;
  }
  if (actionId === 'door') {
    renderInteractionDock('<strong>Дверь</strong><span class="interaction-dock__hint">Карта Каликфорнии откроется после короткой анимации.</span>');
  }
  actor.activeApartmentAction = action;
  const targetRoom = getApartmentRoom(action.id);
  actor.actionTransition = createActionTransition({
    actionId: action.id,
    fromRoom: actor.pendingActionSourceRoom ?? targetRoom,
    toRoom: targetRoom,
  });
  actor.pendingActionSourceRoom = null;
  actor.actionCuePlayed = false;
  actor.bubble = null;
  actor.mode = 'apartmentAction';
  actor.actionElapsed = 0;
  actor.state = { ...actor.state, moving: false };
  actor.actionStartZ = actor.group.position.z;
  actor.actionTargetZ = action.id === 'bed' ? .14 : .02;
  startTurn(actionYaw(actionId), .22);
}

function completeApartmentAction(action) {
  const trackRecording = action.id === 'microphone' && campaign.track?.stage === 'beat-ready'
    ? recordAtMicrophone(campaign, 'takes')
    : null;
  if (trackRecording) {
    campaign = trackRecording.state;
    saveCampaign(campaign);
    renderCampaignHud();
    renderInteractionDock(`<strong>${action.label}</strong><span class="interaction-dock__hint">${trackRecording.message}. Демка готова.</span>`);
    actor.bubble = { title: action.label, message: 'Демка готова — можно вернуться к ПК.', expiresAt: performance.now() + 3000 };
    notify('СТУДИЯ', 'Вокал записан: демка ждёт сведения.');
    return;
  }
  const householdResult = {
    stove: () => cookMeal(campaign),
    sink: () => washDishes(campaign),
    fridge: () => eatMeal(campaign),
    bed: () => sleep(campaign, 7),
  }[action.id]?.();
  if (householdResult) {
    campaign = householdResult.state;
    saveCampaign(campaign);
    renderCampaignHud();
    renderInteractionDock(`<strong>${action.label}</strong><span class="interaction-dock__hint">${householdResult.message}</span>`);
    actor.bubble = { title: action.label, message: householdResult.message, expiresAt: performance.now() + 2600 };
    return;
  }
  if (action.minutes > 0) {
    const effects = {
      bed: { energy: 8, health: .5 },
      stove: { energy: -2 },
      microphone: { energy: -8, leisure: -1 },
    }[action.id] ?? {};
    campaign = advanceCampaign(campaign, { ...action, effects }).state;
    saveCampaign(campaign);
    renderCampaignHud();
  }
  const suffix = action.minutes ? ` · ${action.minutes} мин` : '';
  renderInteractionDock(`<strong>${action.label}</strong><span class="interaction-dock__hint">Анимация завершена${suffix}</span>`);
  actor.bubble = { title: action.label, message: `Готово${suffix}`, expiresAt: performance.now() + 2600 };
  if (action.id === 'door') openMap();
}

function applyApartmentActionPose(action, elapsed) {
  actor.model.position.y = 0;
  actor.frontLeg.pivot.rotation.z = 0;
  actor.backLeg.pivot.rotation.z = 0;
  actor.frontLeg.lowerPivot.rotation.z = 0;
  actor.backLeg.lowerPivot.rotation.z = 0;
  actor.frontArm.lowerPivot.rotation.z = 0;
  actor.backArm.lowerPivot.rotation.z = 0;
  const beat = Math.sin(elapsed * 7);
  if (action.animation === 'sleep') {
    applySeatPose(.22, elapsed);
    // Rotation happens around the feet; shift the sleeping body back onto the mattress first.
    actor.model.position.set(-1.08, .64, -.04);
    actor.model.rotation.z = -Math.PI / 2;
    actor.shadow.scale.set(1.58, .62, 1);
    return;
  }
  if (action.animation === 'record') {
    // Домашний микрофон стоит на столе: запись идёт из сидячей позы, не стоя перед стойкой.
    applySeatPose(1, elapsed);
    actor.frontArm.pivot.rotation.z = .36 + beat * .05;
    actor.frontArm.lowerPivot.rotation.z = -.46 + beat * .04;
    actor.backArm.pivot.rotation.z = .3 - beat * .04;
    actor.backArm.lowerPivot.rotation.z = -.42;
    actor.model.position.y += Math.abs(beat) * .018;
    return;
  }
  if (action.animation === 'cook' || action.animation === 'wash') {
    actor.frontArm.pivot.rotation.z = .44 + beat * .08;
    actor.backArm.pivot.rotation.z = .34 - beat * .06;
    actor.frontArm.lowerPivot.rotation.z = -.48;
    actor.backArm.lowerPivot.rotation.z = -.43;
    return;
  }
  actor.frontArm.pivot.rotation.z = .4 + beat * .1;
  actor.backArm.pivot.rotation.z = -.2 - beat * .08;
}

function applyApartmentActionStartPose(action, elapsed) {
  updatePose(0, elapsed);
  if (action.animation === 'sleep') {
    applySeatPose(.18, elapsed);
    return;
  }
  if (action.animation === 'record') {
    applySeatPose(.82, elapsed);
    return;
  }
  if (action.animation === 'cook' || action.animation === 'wash') {
    actor.frontArm.pivot.rotation.z = .18;
    actor.backArm.pivot.rotation.z = .14;
  }
}

function requestMove(targetX, interaction = null) {
  if (actor.mode === 'typing') {
    actor.pendingIntent = { type: 'walk', targetX, interaction };
    beginStandingSequence();
    return;
  }
  if (actor.mode !== 'walking') return;
  const clampedTarget = THREE.MathUtils.clamp(targetX, room.left, room.right);
  const sourceRoom = actor.state.x <= APARTMENT_ROOMS.kitchen.right ? 'kitchen' : 'living';
  const targetRoom = clampedTarget <= APARTMENT_ROOMS.kitchen.right ? 'kitchen' : 'living';
  actor.routePoints = apartmentWalkTargets(sourceRoom, targetRoom, clampedTarget);
  actor.destinationX = actor.routePoints.shift() ?? null;
  actor.usesInteriorDoor = sourceRoom !== targetRoom;
  actor.interaction = interaction;
}

function requestFaceCamera() {
  if (actor.mode === 'typing') {
    actor.pendingIntent = { type: 'face-camera' };
    beginStandingSequence();
    return;
  }
  if (actor.mode !== 'walking') return;
  actor.destinationX = null;
  actor.interaction = null;
  actor.state = { ...actor.state, moving: false };
  startTurn(cameraYaw(), .28);
}

function updateApartmentCamera() {
  const targetX = cameraTargetX(actor.state.x);
  camera.position.x = targetX;
  camera.lookAt(targetX, 2.15, 0);
}

function updateInteriorDoor(delta) {
  const doorCentreX = (APARTMENT_ROOMS.kitchen.right + APARTMENT_ROOMS.living.left) / 2;
  const shouldOpen = actor.usesInteriorDoor || (actor.state.moving && Math.abs(actor.state.x - doorCentreX) < .78);
  const interiorTargetYaw = shouldOpen ? -Math.PI / 2 : 0;
  interiorDoor.rotation.y = THREE.MathUtils.lerp(interiorDoor.rotation.y, interiorTargetYaw, 1 - Math.exp(-delta * 10));
  const isLeaving = actor.interaction === 'action:door' || actor.activeApartmentAction?.id === 'door';
  const entryTargetYaw = isLeaving ? -Math.PI / 2 : 0;
  entryDoorPanel.rotation.y = THREE.MathUtils.lerp(entryDoorPanel.rotation.y, entryTargetYaw, 1 - Math.exp(-delta * 10));
}

function applyIntent(intent) {
  if (intent.type === 'apartment-action') {
    const action = getApartmentAction(intent.actionId);
    if (action) {
      actor.pendingActionSourceRoom = actor.state.x <= APARTMENT_ROOMS.kitchen.right ? 'kitchen' : 'living';
      requestMove(action.targetX, `action:${action.id}`);
    }
    return;
  }
  if (intent.type === 'computer') {
    requestMove(actor.seatTargetX, 'computer');
    return;
  }
  if (intent.type === 'face-camera') {
    requestFaceCamera();
    return;
  }
  requestMove(intent.targetX);
}

function updateAction(delta, elapsed) {
  if (actor.mode === 'walking') return false;

  actor.actionElapsed += delta;
  if (actor.mode === 'turningToDesk') {
    const progress = Math.min(actor.actionElapsed / .34, 1);
    actor.state = { ...actor.state, x: THREE.MathUtils.lerp(actor.seatStartX, actor.seatTargetX, easeInOut(progress)), moving: false };
    actor.group.position.x = actor.state.x;
    actor.group.position.z = THREE.MathUtils.lerp(actor.seatStartZ, actor.seatTargetZ, easeInOut(progress));
    updatePose(0, elapsed);
    if (progress === 1) {
      actor.mode = 'sittingDown';
      actor.actionElapsed = 0;
    }
    return true;
  }

  if (actor.mode === 'sittingDown') {
    const progress = Math.min(actor.actionElapsed / .48, 1);
    applySeatPose(progress, elapsed);
    if (progress === 1) {
      actor.mode = 'typing';
      actor.actionElapsed = 0;
    }
    return true;
  }

  if (actor.mode === 'turningToRecordDesk') {
    const progress = Math.min(actor.actionElapsed / .34, 1);
    actor.state = { ...actor.state, x: THREE.MathUtils.lerp(actor.seatStartX, actor.seatTargetX, easeInOut(progress)), moving: false };
    actor.group.position.x = actor.state.x;
    actor.group.position.z = THREE.MathUtils.lerp(actor.seatStartZ, actor.seatTargetZ, easeInOut(progress));
    updatePose(0, elapsed);
    if (progress === 1) {
      actor.mode = 'sittingToRecord';
      actor.actionElapsed = 0;
    }
    return true;
  }

  if (actor.mode === 'sittingToRecord') {
    const progress = Math.min(actor.actionElapsed / .48, 1);
    applySeatPose(progress, elapsed);
    if (progress === 1) {
      actor.mode = 'apartmentAction';
      actor.actionElapsed = .64;
    }
    return true;
  }

  if (actor.mode === 'standingUp') {
    const progress = 1 - Math.min(actor.actionElapsed / .4, 1);
    applySeatPose(progress, elapsed);
    actor.group.position.z = THREE.MathUtils.lerp(APARTMENT_ACTOR_FOREGROUND_Z, actor.standStartZ, progress);
    if (progress === 0) {
      actor.mode = 'walking';
      actor.actionElapsed = 0;
      startTurn(walkYaw(actor.state.facing), .24);
      const pendingIntent = actor.pendingIntent;
      actor.pendingIntent = null;
      if (pendingIntent) applyIntent(pendingIntent);
    }
    return true;
  }

  if (actor.mode === 'typing') {
    if (actor.computerTask) {
      updatePose(0, elapsed);
      if (actor.actionElapsed >= 2.45) {
        const task = actor.computerTask;
        const result = task.complete();
        campaign = result.state;
        saveCampaign(campaign);
        renderCampaignHud();
        notify('РЭП-СЕТЬ', result.message);
        actor.computerTask = null;
        actor.actionElapsed = 0;
        actor.bubble = { title: 'Архив изучен', message: result.message, expiresAt: performance.now() + 2600 };
        desktopOpen = true;
        desktopSession = resumeDesktopWindow(desktopSession, task.returnView);
        desktopSubView = task.returnView;
        desktopStartMenuOpen = false;
        desktopScreen.classList.remove('is-hidden');
        desktopScreen.classList.remove('is-booting');
        renderDesktop(task.returnView);
      }
      return true;
    }
    if (!desktopOpen) openDesktop();
    updatePose(0, elapsed);
    return true;
  }
  if (actor.mode === 'apartmentAction') {
    const depthProgress = Math.min(actor.actionElapsed / .28, 1);
    actor.group.position.z = THREE.MathUtils.lerp(actor.actionStartZ, actor.actionTargetZ, easeInOut(depthProgress));
    const phase = phaseAfterApproach(actor.actionTransition, actor.actionElapsed);
    if (phase.id === 'turn') updatePose(0, elapsed);
    if (phase.id === 'start') applyApartmentActionStartPose(actor.activeApartmentAction, elapsed);
    if (phase.id === 'perform') {
      if (!actor.actionCuePlayed) {
        cue(actor.activeApartmentAction.cue);
        actor.actionCuePlayed = true;
      }
      applyApartmentActionPose(actor.activeApartmentAction, elapsed);
    }
    const actionStartSeconds = .64;
    if (actor.actionElapsed >= actionStartSeconds + actionVisualDuration(actor.activeApartmentAction)) {
      const action = actor.activeApartmentAction;
      actor.activeApartmentAction = null;
      actor.actionTransition = null;
      actor.standStartZ = actor.group.position.z;
      actor.mode = actionUsesDeskSeat(action.id) ? 'standingUp' : 'walking';
      actor.actionElapsed = 0;
      actor.model.rotation.z = 0;
      if (!actionUsesDeskSeat(action.id)) actor.group.position.z = APARTMENT_ACTOR_FOREGROUND_Z;
      completeApartmentAction(action);
    }
    return true;
  }

  return true;
}

function updateApartment(delta, elapsed) {
  updateTurn(delta);
  if (updateAction(delta, elapsed)) {
    updateInteriorDoor(delta);
    updateApartmentCamera(delta);
    setStatus();
    return;
  }
  if (actor.destinationX !== null && shouldPauseWalkForTurn(actor.turn)) {
    updatePose(0, elapsed);
    updateInteriorDoor(delta);
    updateApartmentCamera(delta);
    setStatus();
    return;
  }
  if (actor.destinationX === null) {
    actor.state = { ...actor.state, moving: false };
  } else {
    const difference = actor.destinationX - actor.state.x;
    if (Math.abs(difference) < .04) {
      actor.state = { ...actor.state, x: actor.destinationX, moving: false };
      actor.group.position.x = actor.state.x;
      actor.destinationX = actor.routePoints.shift() ?? null;
      if (actor.destinationX !== null) {
        updatePose(0, elapsed);
        updateInteriorDoor(delta);
        updateApartmentCamera(delta);
        setStatus();
        return;
      }
      actor.usesInteriorDoor = false;
      const interaction = actor.interaction;
      actor.interaction = null;
      if (interaction === 'computer') beginSeatSequence();
      if (interaction?.startsWith('action:')) beginApartmentAction(interaction.slice(7));
    } else {
      const direction = Math.sign(difference);
      const previousFacing = actor.state.facing;
      actor.state = stepCharacter(actor.state, { left: direction < 0, right: direction > 0 }, delta, room);
      if (actor.state.facing !== previousFacing) {
        startTurn(walkYaw(actor.state.facing));
      }
      actor.group.position.x = actor.state.x;
    }
  }
  updatePose(delta, elapsed);
  updateInteriorDoor(delta);
  updateApartmentCamera(delta);
  setStatus();
}

function resetStagePose(performer, facing) {
  performer.model.position.set(0, 0, 0);
  performer.model.rotation.set(0, facing === 1 ? 0 : -Math.PI, 0);
  performer.frontArm.pivot.rotation.z = 0;
  performer.backArm.pivot.rotation.z = 0;
  performer.frontArm.lowerPivot.rotation.z = 0;
  performer.backArm.lowerPivot.rotation.z = 0;
  performer.frontLeg.pivot.rotation.z = 0;
  performer.backLeg.pivot.rotation.z = 0;
  performer.frontLeg.lowerPivot.rotation.z = 0;
  performer.backLeg.lowerPivot.rotation.z = 0;
  performer.shadow.scale.set(1, 1, 1);
  updateFacePresentation(performer);
}

function applyStageWalk(performer, delta, direction) {
  performer.phase += delta * 13;
  const stride = Math.sin(performer.phase) * .66;
  performer.model.rotation.y = direction > 0 ? 0 : -Math.PI;
  performer.frontLeg.pivot.rotation.z = stride;
  performer.backLeg.pivot.rotation.z = -stride;
  performer.frontLeg.lowerPivot.rotation.z = Math.max(0, -stride) * .74;
  performer.backLeg.lowerPivot.rotation.z = Math.max(0, stride) * .74;
  performer.frontArm.pivot.rotation.z = -stride * .73;
  performer.backArm.pivot.rotation.z = stride * .73;
  performer.frontArm.lowerPivot.rotation.z = 0;
  performer.backArm.lowerPivot.rotation.z = 0;
  performer.model.position.y = Math.abs(Math.sin(performer.phase * 2)) * .055;
  updateFacePresentation(performer);
}

function moveStageActor(performer, targetX, delta) {
  const difference = targetX - performer.group.position.x;
  if (Math.abs(difference) < .04) {
    performer.group.position.x = targetX;
    performer.state = { ...performer.state, x: targetX, moving: false };
    return true;
  }
  const direction = Math.sign(difference);
  performer.group.position.x += direction * Math.min(Math.abs(difference), delta * 2.25);
  performer.state = { ...performer.state, x: performer.group.position.x, facing: direction, moving: true };
  applyStageWalk(performer, delta, direction);
  return false;
}

function applyRapGesture(performer, gesture, elapsed, facing) {
  const beat = Math.sin(elapsed * 5.5);
  const secondaryBeat = Math.sin(elapsed * 2.7);
  const baseYaw = facing === 1 ? 0 : -Math.PI;
  resetStagePose(performer, facing);
  performer.model.position.y = Math.abs(secondaryBeat) * .045;

  if (gesture === 'open-hands') {
    performer.frontArm.pivot.rotation.z = 1.05 + beat * .18;
    performer.backArm.pivot.rotation.z = .92 - beat * .14;
    performer.frontArm.lowerPivot.rotation.z = -.58;
    performer.backArm.lowerPivot.rotation.z = -.48;
    updateFacePresentation(performer);
    return;
  }
  if (gesture === 'shoulder-rock') {
    performer.model.rotation.z = secondaryBeat * .12;
    performer.frontArm.pivot.rotation.z = .35 + beat * .5;
    performer.backArm.pivot.rotation.z = -.22 - beat * .42;
    performer.frontLeg.pivot.rotation.z = secondaryBeat * .08;
    performer.backLeg.pivot.rotation.z = -secondaryBeat * .08;
    updateFacePresentation(performer);
    return;
  }
  if (gesture === 'crowd-turn') {
    performer.model.rotation.y = baseYaw - facing * (.42 + secondaryBeat * .08);
    performer.frontArm.pivot.rotation.z = .78;
    performer.backArm.pivot.rotation.z = -.42;
    performer.frontArm.lowerPivot.rotation.z = -.42;
    updateFacePresentation(performer);
    return;
  }
  performer.frontArm.pivot.rotation.z = 1.38 + beat * .08;
  performer.frontArm.lowerPivot.rotation.z = -.72;
  performer.backArm.pivot.rotation.z = -.28 + beat * .18;
  performer.backArm.lowerPivot.rotation.z = .36;
  performer.model.rotation.z = -.045;
  updateFacePresentation(performer);
}

function updateStageAudience(elapsed) {
  for (const spectator of battle.crowd) {
    const cheer = Math.max(0, Math.sin(elapsed * 2.15 + spectator.phase));
    spectator.group.position.y = cheer * .055;
    spectator.leftArm.rotation.z = -.2 - cheer * 1.35;
    spectator.rightArm.rotation.z = .2 + cheer * 1.35;
  }
  for (const judge of battle.judges) {
    judge.group.position.y = Math.sin(elapsed * 1.15 + judge.phase) * .03;
    judge.arm.rotation.z = -.28 + Math.sin(elapsed * 1.8 + judge.phase) * .16;
  }
}

function beginBattlePhase(phase) {
  battle.phase = phase;
  battle.elapsed = 0;
}

function enterBattle() {
  if (gameMode === 'battle') return;
  gameMode = 'battle';
  roomGroup.visible = false;
  computerHighlight.visible = false;
  battle.group.visible = true;
  battle.group.add(actor.group);
  actor.group.position.set(-3.85, 0, 0);
  actor.state = { ...actor.state, x: -3.85, facing: 1, moving: false };
  actor.destinationX = null;
  actor.interaction = null;
  actor.mode = 'walking';
  resetStagePose(actor, 1);
  battle.opponent.group.position.set(3.75, 0, 0);
  battle.opponent.state = { ...battle.opponent.state, x: 3.75, facing: -1, moving: false };
  resetStagePose(battle.opponent, -1);
  battle.playerOrder = GESTURE_STYLES;
  battle.opponentOrder = shuffledStyles();
  sceneTitle.textContent = 'БАТТЛ · РАУНД 1';
  controls.textContent = 'Два раунда по 20 секунд · четыре рэп-жеста на каждого · зрители и судьи реагируют';
  beginBattlePhase('player-approach');
}

function updateBattle(delta, elapsed) {
  updateStageAudience(elapsed);
  battle.elapsed += delta;
  const opponent = battle.opponent;

  if (battle.phase === 'player-approach') {
    status.textContent = 'Ты выходишь к микрофону.';
    if (moveStageActor(actor, battle.micX - .08, delta)) {
      beginBattlePhase('player-settle');
    }
    return;
  }
  if (battle.phase === 'player-settle') {
    status.textContent = 'Занимаешь позицию у микрофона.';
    const progress = Math.min(battle.elapsed / .55, 1);
    actor.group.position.x = THREE.MathUtils.lerp(battle.micX - .08, battle.micX - .6, easeInOut(progress));
    resetStagePose(actor, 1);
    if (progress === 1) beginBattlePhase('player-performance');
    return;
  }
  if (battle.phase === 'player-performance') {
    const gesture = performanceStyleAt(battle.elapsed, battle.playerOrder);
    applyRapGesture(actor, gesture, battle.elapsed, 1);
    status.textContent = `Твой раунд · ${Math.max(0, PERFORMANCE_SECONDS - battle.elapsed).toFixed(1)} сек · ${gestureLabels[gesture]}`;
    if (battle.elapsed >= PERFORMANCE_SECONDS) beginBattlePhase('player-exit');
    return;
  }
  if (battle.phase === 'player-exit') {
    status.textContent = 'Ты заканчиваешь раунд и отходишь от микрофона.';
    if (moveStageActor(actor, -3.85, delta)) {
      resetStagePose(actor, 1);
      beginBattlePhase('opponent-approach');
    }
    return;
  }
  if (battle.phase === 'opponent-approach') {
    status.textContent = 'Соперник выходит к микрофону.';
    if (moveStageActor(opponent, battle.micX + .08, delta)) {
      beginBattlePhase('opponent-settle');
    }
    return;
  }
  if (battle.phase === 'opponent-settle') {
    status.textContent = 'Соперник занимает позицию.';
    const progress = Math.min(battle.elapsed / .55, 1);
    opponent.group.position.x = THREE.MathUtils.lerp(battle.micX + .08, battle.micX + .6, easeInOut(progress));
    resetStagePose(opponent, -1);
    if (progress === 1) beginBattlePhase('opponent-performance');
    return;
  }
  if (battle.phase === 'opponent-performance') {
    const gesture = performanceStyleAt(battle.elapsed, battle.opponentOrder);
    applyRapGesture(opponent, gesture, battle.elapsed, -1);
    status.textContent = `Раунд соперника · ${Math.max(0, PERFORMANCE_SECONDS - battle.elapsed).toFixed(1)} сек · ${gestureLabels[gesture]}`;
    if (battle.elapsed >= PERFORMANCE_SECONDS) beginBattlePhase('opponent-exit');
    return;
  }
  if (battle.phase === 'opponent-exit') {
    status.textContent = 'Соперник заканчивает раунд.';
    if (moveStageActor(opponent, 3.75, delta)) {
      resetStagePose(opponent, -1);
      beginBattlePhase('complete');
    }
    return;
  }
  status.textContent = 'Раунд окончен. Судьи обсуждают выступления.';
}

function render() {
  const delta = Math.min(clock.getDelta(), .05);
  if (entryMode === 'apartment') {
    if (gameMode === 'apartment') updateApartment(delta, clock.elapsedTime);
    else updateBattle(delta, clock.elapsedTime);
    syncAvatarViewPose(actor);
    updateActorBubble();
  } else {
    renderActorBubble(null);
  }
  if (!creatorModal.classList.contains('is-hidden')) {
    creatorPreviewActor.model.rotation.y = profileFaceLayout().previewYaw;
    creatorPreviewActor.model.scale.x = 1;
    creatorPreviewActor.model.position.y = Math.sin(clock.elapsedTime * .65) * .025;
    updateFacePresentation(creatorPreviewActor);
    creatorPreviewRenderer.render(creatorPreviewScene, creatorPreviewCamera);
  }
  if (entryMode === 'apartment') renderer.render(scene, camera);
  requestAnimationFrame(render);
}

function resizeCreatorPreview() {
  const width = Math.max(1, creatorPreviewCanvas.clientWidth);
  const height = Math.max(1, creatorPreviewCanvas.clientHeight);
  creatorPreviewRenderer.setSize(width, height, false);
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const aspect = width / height;
  const viewHeight = Math.max(5.3, 8.8 / aspect);
  camera.left = -viewHeight * aspect / 2;
  camera.right = viewHeight * aspect / 2;
  camera.top = viewHeight / 2;
  camera.bottom = -viewHeight / 2;
  camera.updateProjectionMatrix();
  camera.lookAt(camera.position.x, 2.15, 0);
  renderer.setSize(width, height, false);
  resizeCreatorPreview();
}

window.addEventListener('resize', resize);

function pointFromPointerEvent(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const intersections = raycaster.intersectObjects(interactiveObjects, false);
  const worldPoint = new THREE.Vector3();
  raycaster.ray.intersectPlane(walkPlane, worldPoint);
  const hitAction = intersections[0]?.object.userData.actionId ?? null;
  return { hitComputer: hitAction === 'computer', hitAction, worldPoint };
}

canvas.addEventListener('pointermove', (event) => {
  if (entryMode !== 'apartment' || gameMode !== 'apartment') {
    Object.values(actionHighlights).forEach((highlight) => { highlight.visible = false; });
    clearWorldTooltip();
    canvas.style.cursor = 'default';
    return;
  }
  const { hitComputer, hitAction } = pointFromPointerEvent(event);
  Object.values(actionHighlights).forEach((highlight) => { highlight.visible = false; });
  if (hitAction) actionHighlights[hitAction].visible = true;
  showWorldTooltip(hitAction, event);
  canvas.style.cursor = hitAction ? 'pointer' : 'crosshair';
});

canvas.addEventListener('pointerleave', () => {
  Object.values(actionHighlights).forEach((highlight) => { highlight.visible = false; });
  clearWorldTooltip();
  canvas.style.cursor = 'crosshair';
});

canvas.addEventListener('pointerdown', (event) => {
  if (event.button !== 0 || entryMode !== 'apartment' || gameMode !== 'apartment') return;
  const { hitComputer, hitAction, worldPoint } = pointFromPointerEvent(event);
  const intent = clickIntent({
    hitAction,
    hitComputer,
    worldX: worldPoint.x,
    worldY: worldPoint.y,
    actorX: actor.state.x,
  });
  applyIntent(intent);
});

resize();
renderCampaignHud();
renderCreator();
renderStartScreen();
setStatus();
render();
