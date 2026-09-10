import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { easeInOut, keyboardArmPose, seatPose, turnAngle } from './animation-timing.js';
import { GESTURE_STYLES, PERFORMANCE_SECONDS, performanceStyleAt, shuffledStyles } from './battle-director.js';
import { clickIntent } from './click-intent.js';
import { stepCharacter } from './character-motion.js';
import { presentActionProgress } from './action-progress.js';
import { advanceCampaign, createCampaign, getInventorySummary, loadCampaign, saveCampaign } from './game-state.js';
import { createRapper, cycleLookPart, LOOK_PART_LABELS, lookPartAtPreviewHeight, STAT_KEYS, statLabels, validateAllocations } from './creator.js';
import { canStartApartmentAction, describeApartmentAction, getApartmentAction } from './apartment-actions.js';
import { playSoundCue } from './sound-cues.js';
import { desktopApps, getDesktopAction, openDesktopApp } from './desktop-apps.js';
import { dequeueNotification, enqueueNotification } from './phone-notifications.js';
import { districts, getDistrictLocations, startLocationAction, travelTo } from './calikfornia.js';
import { completeShift, getJob, jobIds } from './jobs.js';
import { buyFood, cookMeal, eatMeal, sleep, washDishes } from './household.js';
import { MAKAREWITCH_VI, registerForTournament, researchTournament } from './tournament.js';
import { chooseBeat, getTrackStepStatus, masterTrack, mixTrack, polishDraft, recordTrack, startDraft, submitTrack } from './track-project.js';
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
const creatorModal = document.querySelector('#creator-modal');
const creatorForm = document.querySelector('#creator-form');
const creatorStats = document.querySelector('#creator-stats');
const creatorPoints = document.querySelector('#creator-points');
const creatorError = document.querySelector('#creator-error');
const creatorPreviewCanvas = document.querySelector('#creator-preview');
const creatorLookControls = document.querySelector('#creator-look-controls');
const interactionDock = document.querySelector('#interaction-dock');
const worldTooltip = document.querySelector('#world-tooltip');
const actorBubble = document.querySelector('#actor-bubble');
const desktopScreen = document.querySelector('#desktop-screen');
const desktopContent = document.querySelector('#desktop-content');
const desktopClose = document.querySelector('#desktop-close');
const phonePanel = document.querySelector('#phone-panel');
const mapScreen = document.querySelector('#map-screen');
const mapDistricts = document.querySelector('#map-districts');
const mapLocationPanel = document.querySelector('#map-location-panel');
const mapClose = document.querySelector('#map-close');
let campaign = loadCampaign() ?? createCampaign();
saveCampaign(campaign);
let creatorAllocations = Object.fromEntries(STAT_KEYS.map((key) => [key, 0]));
let creatorLook = campaign.player?.look ?? { hair: 'bald', face: 'clean', top: 'hoodie', pants: 'cargo' };
let audioContext = null;
let desktopOpen = false;
let desktopBootTimer = null;
const room = { left: -5.15, right: 5.15 };
const deskX = 3.18;
const exitZoneX = 4.62;
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
  if (gameMode !== 'apartment') return renderActorBubble(null);
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

function renderDesktop(view = 'home') {
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
    desktopContent.innerHTML = `<section class="desktop-page"><button class="desktop-back" data-desktop-back>← Рабочий стол</button><h2>Трек для MAKAREWITCH VI</h2><ol class="track-steps">${steps.map((step) => `<li class="track-steps__item track-steps__item--${step.state}"><strong>${step.label}</strong><span>${step.minutes ? `${step.minutes} мин` : 'сразу'}</span><small>${step.state === 'done' ? 'готово' : step.reason || 'следующий шаг'}</small></li>`).join('')}</ol>${controls}</section>`;
    return;
  }
  if (view === 'home') {
    desktopContent.innerHTML = `<div class="desktop-grid">${desktopApps.map((app) => `<button class="desktop-icon" data-desktop-app="${app.id}"><b>${app.icon}</b><span>${app.label}</span><small>${app.description}</small></button>`).join('')}</div>`;
    return;
  }
  const opened = openDesktopApp(view);
  if (!opened) return renderDesktop();
  const inventory = getInventorySummary(campaign);
  const body = view === 'jobs'
    ? `<p>Выбери смену. Деньги выдают наличными после работы; нагрузка различается.</p><div class="desktop-grid">${jobIds.map((id) => { const job = getJob(id); return `<button class="desktop-icon" data-job="${id}"><b>₽</b><span>${job.label}</span><small>${job.duration / 60} ч · ${job.pay} ₽</small></button>`; }).join('')}</div>`
    : view === 'market'
      ? `<p><strong>Наличные: ${campaign.cash.toLocaleString('ru-RU')} ₽.</strong> В холодильнике: ${inventory.ingredients} ингредиентов, ${inventory.cookedMeals} готовых порций, грязной посуды — ${inventory.dirtyDishes}.</p><p>Заказ оплачивается сразу; курьер привезёт продукты домой за 40 минут игрового времени.</p><div class="desktop-grid"><button class="desktop-icon" data-market="groceries"><b>▣</b><span>Заказать продукты</span><small>380 ₽ · +3 ингредиента · доставка 40 мин</small></button></div>`
      : view === 'battles'
        ? `<p>${MAKAREWITCH_VI.description}</p><p><strong>Дедлайн: 20 сентября, 23:59.</strong> ${campaign.tournament.researchHints.length ? `Найдено: ${campaign.tournament.researchHints.join(', ')}.` : ''}</p><div class="desktop-grid">${campaign.tournament.registered ? `<button class="desktop-icon" data-battle="research"><b>⌕</b><span>Изучить архив</span><small>1 ч · комментарии и скрытые предпочтения</small></button><button class="desktop-icon" data-battle="track"><b>♫</b><span>Моя заявка</span><small>Сделать и сдать трек</small></button>${campaign.tournament.submitted && !campaign.tournament.selection ? `<button class="desktop-icon" data-battle="results"><b>!</b><span>Судьи отсудили</span><small>Открыть комментарии и баллы</small></button>` : ''}` : `<button class="desktop-icon" data-battle="register"><b>◈</b><span>Участвовать</span><small>Зарегистрироваться на MAKAREWITCH VI</small></button>`}</div>${campaign.tournament.selection ? `<p><strong>${campaign.tournament.selection.passed ? 'Ты прошёл отбор.' : 'Ты не прошёл отбор.'}</strong> ${campaign.tournament.selection.total}/30<br>${campaign.tournament.selection.scores.map((score) => `${score.judge}: ${score.value}/10 — ${score.comment}`).join('<br>')}</p>` : `<p>${MAKAREWITCH_VI.comments.join('<br>')}</p>`}`
      : view === 'bills'
        ? `<p><strong>Наличные: ${campaign.cash.toLocaleString('ru-RU')} ₽</strong><br>Аренда: ${campaign.rent.amount.toLocaleString('ru-RU')} ₽ · 1 октября<br>Долг: ${campaign.rent.debt.toLocaleString('ru-RU')} ₽ · статус: ${campaign.rent.status === 'due' ? 'к оплате' : 'ещё не наступил'}.</p><p>При просрочке все доходы будут уходить в счёт общего долга.</p>`
        : `<p>${opened.app.description}. Этот раздел готов к игровому действию.</p>`;
  desktopContent.innerHTML = `<section class="desktop-page"><button class="desktop-back" data-desktop-back>← Рабочий стол</button><h2>${opened.app.label}</h2>${body}<div id="desktop-page-actions"></div></section>`;
}

function openDesktop() {
  desktopOpen = true;
  desktopScreen.classList.remove('is-hidden');
  desktopScreen.classList.add('is-booting');
  desktopContent.innerHTML = '<section class="desktop-boot"><b>КАЛИКФОРНИЯ OS</b><span>Включение рабочего стола…</span><i><em></em></i></section>';
  clearTimeout(desktopBootTimer);
  desktopBootTimer = setTimeout(() => {
    if (!desktopOpen) return;
    desktopScreen.classList.remove('is-booting');
    renderDesktop();
  }, 460);
}

function closeDesktop() {
  clearTimeout(desktopBootTimer);
  desktopOpen = false;
  desktopScreen.classList.add('is-hidden');
  desktopScreen.classList.remove('is-booting');
  if (actor.mode === 'typing') beginStandingSequence();
}

function startDesktopAction(actionId, complete) {
  const action = getDesktopAction(actionId);
  if (!action) return;
  clearTimeout(desktopBootTimer);
  desktopOpen = false;
  desktopScreen.classList.add('is-hidden');
  actor.computerTask = { ...action, complete };
  actor.actionElapsed = 0;
  actor.bubble = null;
}

desktopContent.addEventListener('click', (event) => {
  const app = event.target.closest('[data-desktop-app]');
  if (app) renderDesktop(app.dataset.desktopApp);
  if (event.target.closest('[data-desktop-back]')) renderDesktop();
  const jobButton = event.target.closest('[data-job]');
  if (jobButton) {
    const result = completeShift(campaign, jobButton.dataset.job);
    campaign = result.state;
    saveCampaign(campaign);
    renderCampaignHud();
    notify('РАБОТА', result.message);
    renderDesktop('jobs');
  }
  const marketButton = event.target.closest('[data-market]');
  if (marketButton) {
    const result = buyFood(campaign, marketButton.dataset.market);
    campaign = result.state;
    saveCampaign(campaign);
    renderCampaignHud();
    notify('МАРКЕТ', result.message);
    renderDesktop('market');
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
    const result = battleButton.dataset.battle === 'register'
      ? registerForTournament(campaign, MAKAREWITCH_VI.id)
      : researchTournament(campaign);
    campaign = result.state;
    saveCampaign(campaign);
    renderCampaignHud();
    notify('MAKAREWITCH VI', result.message);
    renderDesktop('battles');
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

function openMap() {
  const location = campaign.location === 'north-sloboda-home' ? 'north-sloboda' : campaign.location;
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
  creatorLookControls.innerHTML = Object.entries(LOOK_PART_LABELS).map(([part, label]) => `<div class="creator-zone creator-zone--${part}" data-look-zone="${part}"><button type="button" aria-label="Предыдущий вариант: ${label}" data-look-part="${part}" data-direction="-1">‹</button><span>${label}<strong>${lookValueLabel(part, creatorLook[part])}</strong></span><button type="button" aria-label="Следующий вариант: ${label}" data-look-part="${part}" data-direction="1">›</button></div>`).join('');
  if (creatorPreviewActor) applyAvatarLook(creatorPreviewActor, creatorLook);
}

function selectedLook() {
  return { ...creatorLook };
}

function lookValueLabel(part, value) {
  const labels = {
    hair: { bald: 'Лысый', crop: 'Короткие', mohawk: 'Ирокез' },
    face: { clean: 'Без бороды', mustache: 'Усы', beard: 'Борода' },
    top: { hoodie: 'Худи', bomber: 'Бомбер', jacket: 'Куртка' },
    pants: { cargo: 'Карго', jeans: 'Джинсы', shorts: 'Шорты' },
  };
  return labels[part]?.[value] ?? value;
}

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
  const zone = event.target.closest('[data-look-zone]');
  const part = button?.dataset.lookPart ?? zone?.dataset.lookZone;
  if (!part) return;
  creatorLook = cycleLookPart(creatorLook, part, Number(button?.dataset.direction ?? 1));
  applyAvatarLook(actor, creatorLook);
  renderCreator();
});

creatorPreviewCanvas.addEventListener('click', (event) => {
  const rect = creatorPreviewCanvas.getBoundingClientRect();
  const part = lookPartAtPreviewHeight((event.clientY - rect.top) / rect.height);
  creatorLook = cycleLookPart(creatorLook, part, 1);
  applyAvatarLook(actor, creatorLook);
  renderCreator();
});

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
    applyAvatarLook(actor, player.look);
    sceneTitle.textContent = `КВАРТИРА · ${player.nickname.toUpperCase()}`;
    creatorModal.classList.add('is-hidden');
    setStatus();
  } catch (error) {
    creatorError.textContent = error.message;
  }
});

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x121a1b, 10, 20);

const camera = new THREE.OrthographicCamera(-8, 8, 4.6, -4.6, 0.1, 30);
camera.position.set(0, 3.35, 11.5);
camera.lookAt(0, 2.7, 0);

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
  const actionHitAreas = [];
  const actionHighlights = {};
  const actionHit = (id, position, size) => {
    const hit = new THREE.Mesh(
      new THREE.BoxGeometry(...size),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    );
    hit.position.set(...position);
    hit.userData.actionId = id;
    roomGroup.add(hit);
    actionHitAreas.push(hit);
    const highlight = new THREE.Mesh(
      new THREE.BoxGeometry(...size),
      new THREE.MeshBasicMaterial({ color: 0xf0bd59, transparent: true, opacity: .2, depthWrite: false }),
    );
    highlight.position.set(...position);
    highlight.scale.set(1.06, 1.05, 1.08);
    highlight.visible = false;
    roomGroup.add(highlight);
    actionHighlights[id] = highlight;
    return hit;
  };

  box(roomGroup, [13.2, .24, 3.1], colors.floor, [0, -.12, 0]);
  box(roomGroup, [13.2, 6.7, .18], colors.wall, [0, 3.25, -1.35]);
  box(roomGroup, [13.2, .13, .22], colors.floorLine, [0, .08, -1.12]);

  for (let x = -5.5; x < 6; x += 1.1) {
    box(roomGroup, [.035, 6.2, .04], 0x738070, [x, 3.15, -1.23], { castShadow: false });
  }

  const windowGroup = new THREE.Group();
  windowGroup.position.set(1.25, 3.75, -1.19);
  roomGroup.add(windowGroup);
  box(windowGroup, [3.9, 2.36, .14], colors.woodDark, [0, 0, 0]);
  plane(windowGroup, [3.54, 2.04], 0x263b4b, [0, 0, .09], { emissive: 0x132937, emissiveIntensity: .8 });
  for (const [x, width, height, y] of [[-1.35, .72, 1.15, -.46], [-.52, .63, 1.42, -.33], [.22, .83, .98, -.52], [1.14, .66, 1.58, -.25]]) {
    box(windowGroup, [width, height, .025], 0x9b443d, [x, y, .12], { emissive: 0x3b100c, emissiveIntensity: .45 });
    for (let floor = y - height / 2 + .18; floor < y + height / 2; floor += .24) box(windowGroup, [width * .72, .045, .03], 0xe0aa58, [x, floor, .14], { emissive: 0x5c3213, emissiveIntensity: 1.2 });
  }
  box(windowGroup, [.12, 2.16, .1], colors.wood, [0, 0, .14]);
  box(windowGroup, [3.68, .11, .1], colors.wood, [0, 0, .14]);

  const divider = new THREE.Group();
  divider.position.set(-1.12, 1.55, -.72);
  roomGroup.add(divider);
  box(divider, [.22, 3.1, .35], 0x34413d, [0, 0, 0]);
  box(divider, [.31, .14, .4], colors.wood, [0, 1.48, .02]);
  for (const y of [-.9, -.35, .2, .75]) box(divider, [.06, .08, .42], 0xb95947, [.15, y, .05]);

  const bedFrame = new THREE.Group();
  bedFrame.position.set(.15, 0, -.12);
  roomGroup.add(bedFrame);
  box(bedFrame, [2.18, .65, .92], 0x303b3a, [0, .4, 0]);
  box(bedFrame, [2.3, .2, 1.02], 0x23302f, [0, .79, 0]);
  box(bedFrame, [.72, .12, .82], 0xe0d6bd, [-.65, .95, .02]);
  box(bedFrame, [1.22, .12, .9], 0xa34d43, [.42, .96, .02]);
  box(bedFrame, [.16, .95, .9], colors.wood, [-1.01, .48, 0]);
  box(bedFrame, [.16, .95, .9], colors.wood, [1.01, .48, 0]);

  const desk = new THREE.Group();
  desk.position.set(deskX, 0, -.25);
  roomGroup.add(desk);
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
  roomGroup.add(shelf);
  box(shelf, [1.28, 3.3, .31], colors.woodDark, [0, 0, 0]);
  for (const y of [-1.1, -.25, .6, 1.45]) {
    box(shelf, [1.08, .09, .37], colors.wood, [0, y, .1]);
  }
  for (const [x, y, color] of [[-.38, -.75, colors.red], [-.12, -.75, colors.amber], [.18, -.75, colors.teal], [-.22, .1, colors.teal], [.1, .1, colors.red], [.38, .1, colors.amber], [-.35, .94, colors.amber]]) {
    box(shelf, [.15, .48, .17], color, [x, y, .24]);
  }

  const poster = new THREE.Group();
  poster.position.set(.15, 3.7, -1.19);
  roomGroup.add(poster);
  plane(poster, [1.28, 1.85], colors.red, [0, 0, 0], { emissive: 0x220404, emissiveIntensity: .45 });
  plane(poster, [.86, .23], colors.amber, [0, .38, .018], { emissive: 0x3e2204, emissiveIntensity: .6 });
  plane(poster, [.44, .72], colors.black, [0, -.35, .018]);

  const lamp = new THREE.PointLight(0xe6bd6d, 18, 6.5, 2);
  lamp.position.set(-.85, 4.85, 1.05);
  lamp.castShadow = true;
  roomGroup.add(lamp);
  box(roomGroup, [.62, .18, .62], colors.amber, [-.85, 4.55, .78], { emissive: 0x8c5520, emissiveIntensity: 1.8 });
  box(roomGroup, [.035, 1.18, .035], colors.black, [-.85, 5.12, .78]);

  // Everyday objects use simple geometry deliberately: their interaction state, not visual complexity, drives the MVP.
  const fridge = new THREE.Group();
  fridge.position.set(-4.72, 0, -.4);
  roomGroup.add(fridge);
  box(fridge, [1.05, 2.28, .72], 0x2b3937, [0, 1.14, 0]);
  box(fridge, [.9, .93, .06], 0x49615f, [0, 1.59, .4], { emissive: 0x16302d, emissiveIntensity: .18 });
  box(fridge, [.9, .02, .05], colors.black, [0, 1.08, .43]);
  box(fridge, [.06, .68, .06], colors.tealLight, [.33, 1.6, .45]);
  box(fridge, [.54, .16, .06], colors.amber, [-.12, 2.16, .44], { emissive: 0x432b11, emissiveIntensity: .8 });

  const kitchen = new THREE.Group();
  kitchen.position.set(-3.12, 0, -.72);
  roomGroup.add(kitchen);
  box(kitchen, [2.12, .86, .72], 0x42504c, [0, .43, 0]);
  box(kitchen, [2.18, .13, .77], colors.wood, [0, .88, .02]);
  box(kitchen, [.94, .16, .74], 0x313432, [-.53, .98, .04]);
  for (const [x, y] of [[-.75, .8], [-.35, .8], [-.75, 1.12], [-.35, 1.12]]) cylinder(kitchen, .13, .13, .035, 0x15191b, [x, y, .08]);
  box(kitchen, [.62, .06, .5], 0x31565a, [.63, .95, .04], { emissive: 0x10373a, emissiveIntensity: .5 });
  box(kitchen, [.05, .31, .05], 0xbcc4bb, [.62, 1.13, -.12]);
  box(kitchen, [.26, .04, .04], 0xbcc4bb, [.72, 1.25, -.08]);

  const kitchenTable = new THREE.Group();
  kitchenTable.position.set(-2.15, 0, .12);
  roomGroup.add(kitchenTable);
  box(kitchenTable, [1.05, .12, .72], 0x79533c, [0, 1.05, 0]);
  for (const x of [-.4, .4]) box(kitchenTable, [.08, 1.05, .08], colors.woodDark, [x, .5, 0]);
  box(kitchenTable, [.52, .1, .5], 0x52392c, [-.65, .5, .07]);

  const mic = new THREE.Group();
  mic.position.set(2.23, .08, .54);
  roomGroup.add(mic);
  cylinder(mic, .03, .05, 1.46, 0x161d1e, [0, .73, 0]);
  cylinder(mic, .11, .08, .22, 0x8ba19e, [0, 1.52, 0]);
  cylinder(mic, .3, .04, .05, 0x161d1e, [0, .03, 0]);

  box(roomGroup, [.82, 3.25, .12], 0x49362e, [5.44, 1.63, -.76]);
  box(roomGroup, [.66, 2.98, .05], 0x263332, [5.44, 1.63, -.67]);

  actionHit('bed', [.15, .82, .1], [2.5, 1.2, 1.15]);
  actionHit('fridge', [-4.72, 1.12, .02], [1.2, 2.42, .95]);
  actionHit('stove', [-3.66, .95, .02], [.95, .75, .98]);
  actionHit('sink', [-2.49, .98, .02], [.84, .78, .98]);
  actionHit('microphone', [2.23, .92, .28], [.72, 1.9, .9]);
  actionHit('door', [5.44, 1.63, .04], [.95, 3.45, .8]);

  // The exit sits above and beside the shelf so it remains readable at every viewport width.
  const exitArrow = new THREE.ArrowHelper(
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(4.82, 3.88, .42),
    .92,
    0xe6bd58,
    .28,
    .18,
  );
  roomGroup.add(exitArrow);
  plane(roomGroup, [1.34, .42], 0x5d4727, [5.2, 3.88, .23], { emissive: 0x3e2808, emissiveIntensity: .7 });
  box(roomGroup, [.12, 4.2, .34], 0x313936, [5.92, 2.08, -.12]);
  return { roomGroup, computerHitArea, computerHighlight, actionHitAreas, actionHighlights };
}

function makeLimb(parent, name, z, color, upperLength, lowerLength) {
  const pivot = new THREE.Group();
  pivot.name = `${name}Pivot`;
  parent.add(pivot);
  const upper = box(pivot, [.28, upperLength, .28], color, [0, -upperLength / 2, z]);
  const lowerPivot = new THREE.Group();
  lowerPivot.position.set(0, -upperLength, z);
  pivot.add(lowerPivot);
  box(lowerPivot, [.25, lowerLength, .25], color, [0, -lowerLength / 2, 0]);
  return { pivot, lowerPivot, upper };
}

function createCharacter(parent = scene, { x = -1.75, hoodie = colors.hoodie, pants = colors.pants, cap = colors.red } = {}) {
  const actor = {
    group: new THREE.Group(),
    model: new THREE.Group(),
    state: { x, facing: 1, moving: false },
    mode: 'walking',
    phase: 0,
    turn: null,
    actionElapsed: 0,
    seatStartX: 0,
    seatTargetX: deskX - .45,
    destinationX: null,
    interaction: null,
    pendingIntent: null,
    bubble: null,
    computerTask: null,
  };
  actor.group.position.x = actor.state.x;
  actor.group.add(actor.model);
  parent.add(actor.group);

  const shadow = new THREE.Mesh(new THREE.CircleGeometry(.62, 24), new THREE.MeshBasicMaterial({ color: 0x0a0e0e, transparent: true, opacity: .42 }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.y = .4;
  shadow.position.y = .012;
  actor.group.add(shadow);
  actor.shadow = shadow;

  const torso = box(actor.model, [.72, .96, .48], hoodie, [0, 1.48, 0]);
  box(actor.model, [.8, .21, .52], 0x1c252b, [0, 1.98, 0]);
  box(actor.model, [.25, .18, .2], colors.skin, [.42, 2.32, 0]);
  box(actor.model, [.53, .57, .48], colors.skin, [0, 2.32, 0]);
  const hair = box(actor.model, [.55, .09, .51], 0x17151b, [0, 2.64, 0]);
  const faceHair = new THREE.Group();
  actor.model.add(faceHair);
  const mustache = box(faceHair, [.26, .055, .05], 0x1b1718, [0, 2.31, .27]);
  const beard = box(faceHair, [.37, .2, .055], 0x1b1718, [0, 2.13, .27]);
  mustache.visible = false;
  beard.visible = false;
  box(actor.model, [.11, .07, .34], 0x171c20, [.28, 2.38, .25]);

  actor.backArm = makeLimb(actor.model, 'backArm', -.31, 0x1f2930, .62, .52);
  actor.frontArm = makeLimb(actor.model, 'frontArm', .31, 0x34444d, .62, .52);
  actor.backArm.pivot.position.set(0, 1.83, 0);
  actor.frontArm.pivot.position.set(0, 1.83, 0);
  box(actor.backArm.lowerPivot, [.22, .21, .22], colors.skin, [0, -.6, 0]);
  box(actor.frontArm.lowerPivot, [.22, .21, .22], colors.skin, [0, -.6, 0]);

  actor.backLeg = makeLimb(actor.model, 'backLeg', -.19, 0x33423f, .68, .6);
  actor.frontLeg = makeLimb(actor.model, 'frontLeg', .19, pants, .68, .6);
  actor.backLeg.pivot.position.set(0, 1.03, 0);
  actor.frontLeg.pivot.position.set(0, 1.03, 0);
  box(actor.backLeg.lowerPivot, [.39, .16, .32], colors.shoe, [.1, -.64, .01]);
  box(actor.frontLeg.lowerPivot, [.39, .16, .32], colors.shoe, [.1, -.64, .01]);

  actor.model.rotation.y = 0;
  actor.lookParts = { torso, hair, mustache, beard, frontLeg: actor.frontLeg.upper, backLeg: actor.backLeg.upper, frontArm: actor.frontArm.upper, backArm: actor.backArm.upper };
  return actor;
}

function applyAvatarLook(target, look = {}) {
  const topColors = { hoodie: colors.hoodie, bomber: 0x5d4035, jacket: 0x2e5361 };
  const pantsColors = { cargo: colors.pants, jeans: 0x303d63, shorts: 0x77715b };
  const topColor = topColors[look.top] ?? topColors.hoodie;
  target.lookParts.torso.material.color.setHex(topColor);
  target.lookParts.frontArm.material.color.setHex(topColor);
  target.lookParts.backArm.material.color.setHex(topColor);
  target.lookParts.frontLeg.material.color.setHex(pantsColors[look.pants] ?? pantsColors.cargo);
  target.lookParts.backLeg.material.color.setHex(pantsColors[look.pants] ?? pantsColors.cargo);
  target.lookParts.hair.visible = look.hair !== 'bald';
  target.lookParts.hair.scale.set(1, look.hair === 'mohawk' ? 2.2 : 1, look.hair === 'mohawk' ? .38 : 1);
  target.lookParts.hair.position.y = look.hair === 'mohawk' ? 2.72 : 2.64;
  target.lookParts.mustache.visible = look.face === 'mustache';
  target.lookParts.beard.visible = look.face === 'beard';
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

const { roomGroup, computerHitArea, computerHighlight, actionHitAreas, actionHighlights } = addRoom();
const interactiveObjects = actionHitAreas;
const actor = createCharacter();
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
creatorPreviewActor.model.rotation.y = -.28;
applyAvatarLook(creatorPreviewActor, creatorLook);
const battle = createBattleScene();
let gameMode = 'apartment';

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
  actor.state = { ...actor.state, moving: false };
  startTurn(Math.PI / 2, .34);
}

function beginStandingSequence() {
  actor.mode = 'standingUp';
  actor.actionElapsed = 0;
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
  if (actionId === 'door') {
    renderInteractionDock('<strong>Дверь</strong><span class="interaction-dock__hint">Карта Каликфорнии откроется после короткой анимации.</span>');
  }
  actor.activeApartmentAction = action;
  actor.bubble = null;
  actor.mode = 'apartmentAction';
  actor.actionElapsed = 0;
  actor.state = { ...actor.state, moving: false };
  startTurn(Math.PI / 2, .22);
  cue(action.cue);
}

function completeApartmentAction(action) {
  const trackRecording = action.id === 'microphone' && campaign.track?.stage === 'beat-ready'
    ? recordTrack(campaign, 'takes')
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
    actor.model.position.set(.04, .38, .24);
    actor.model.rotation.z = -Math.PI / 2;
    actor.shadow.scale.set(1.58, .62, 1);
    return;
  }
  if (action.animation === 'record') {
    actor.frontArm.pivot.rotation.z = .86 + beat * .24;
    actor.backArm.pivot.rotation.z = -.52 - beat * .12;
    actor.frontArm.lowerPivot.rotation.z = -.64;
    actor.backArm.lowerPivot.rotation.z = .35;
    actor.model.position.y = Math.abs(beat) * .035;
    return;
  }
  if (action.animation === 'cook' || action.animation === 'wash') {
    actor.frontArm.pivot.rotation.z = .88 + beat * .15;
    actor.backArm.pivot.rotation.z = .74 - beat * .12;
    actor.frontArm.lowerPivot.rotation.z = -.92;
    actor.backArm.lowerPivot.rotation.z = -.8;
    return;
  }
  actor.frontArm.pivot.rotation.z = .4 + beat * .1;
  actor.backArm.pivot.rotation.z = -.2 - beat * .08;
}

function requestMove(targetX, interaction = null) {
  if (actor.mode === 'typing') {
    actor.pendingIntent = { type: 'walk', targetX, interaction };
    beginStandingSequence();
    return;
  }
  if (actor.mode !== 'walking') return;
  actor.destinationX = THREE.MathUtils.clamp(targetX, room.left, room.right);
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
  startTurn(-Math.PI / 2, .28);
}

function applyIntent(intent) {
  if (intent.type === 'apartment-action') {
    const action = getApartmentAction(intent.actionId);
    if (action) requestMove(action.targetX, `action:${action.id}`);
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

  if (actor.mode === 'standingUp') {
    const progress = 1 - Math.min(actor.actionElapsed / .4, 1);
    applySeatPose(progress, elapsed);
    if (progress === 0) {
      actor.mode = 'walking';
      actor.actionElapsed = 0;
      startTurn(actor.state.facing === 1 ? 0 : -Math.PI, .24);
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
    applyApartmentActionPose(actor.activeApartmentAction, elapsed);
    if (actor.actionElapsed >= actionVisualDuration(actor.activeApartmentAction)) {
      const action = actor.activeApartmentAction;
      actor.activeApartmentAction = null;
      actor.mode = 'walking';
      actor.actionElapsed = 0;
      actor.model.rotation.z = 0;
      completeApartmentAction(action);
    }
    return true;
  }

  return true;
}

function updateApartment(delta, elapsed) {
  updateTurn(delta);
  if (updateAction(delta, elapsed)) {
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
      actor.destinationX = null;
      const interaction = actor.interaction;
      actor.interaction = null;
      if (interaction === 'computer') beginSeatSequence();
      if (interaction?.startsWith('action:')) beginApartmentAction(interaction.slice(7));
    } else {
      const direction = Math.sign(difference);
      const previousFacing = actor.state.facing;
      actor.state = stepCharacter(actor.state, { left: direction < 0, right: direction > 0 }, delta, room);
      if (actor.state.facing !== previousFacing) {
        startTurn(actor.state.facing === 1 ? 0 : -Math.PI);
      }
      actor.group.position.x = actor.state.x;
    }
  }
  updatePose(delta, elapsed);
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
    return;
  }
  if (gesture === 'shoulder-rock') {
    performer.model.rotation.z = secondaryBeat * .12;
    performer.frontArm.pivot.rotation.z = .35 + beat * .5;
    performer.backArm.pivot.rotation.z = -.22 - beat * .42;
    performer.frontLeg.pivot.rotation.z = secondaryBeat * .08;
    performer.backLeg.pivot.rotation.z = -secondaryBeat * .08;
    return;
  }
  if (gesture === 'crowd-turn') {
    performer.model.rotation.y = baseYaw - facing * (.42 + secondaryBeat * .08);
    performer.frontArm.pivot.rotation.z = .78;
    performer.backArm.pivot.rotation.z = -.42;
    performer.frontArm.lowerPivot.rotation.z = -.42;
    return;
  }
  performer.frontArm.pivot.rotation.z = 1.38 + beat * .08;
  performer.frontArm.lowerPivot.rotation.z = -.72;
  performer.backArm.pivot.rotation.z = -.28 + beat * .18;
  performer.backArm.lowerPivot.rotation.z = .36;
  performer.model.rotation.z = -.045;
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
  if (gameMode === 'apartment') updateApartment(delta, clock.elapsedTime);
  else updateBattle(delta, clock.elapsedTime);
  updateActorBubble();
  if (!creatorModal.classList.contains('is-hidden')) {
    creatorPreviewActor.model.rotation.y = -.28 + Math.sin(clock.elapsedTime * .65) * .08;
    creatorPreviewRenderer.render(creatorPreviewScene, creatorPreviewCamera);
  }
  renderer.render(scene, camera);
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
  const viewHeight = Math.max(6.9, 13.4 / aspect);
  camera.left = -viewHeight * aspect / 2;
  camera.right = viewHeight * aspect / 2;
  camera.top = viewHeight / 2;
  camera.bottom = -viewHeight / 2;
  camera.updateProjectionMatrix();
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
  if (gameMode !== 'apartment') {
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
  if (event.button !== 0 || gameMode !== 'apartment') return;
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
if (campaign.player) {
  creatorModal.classList.add('is-hidden');
  sceneTitle.textContent = `КВАРТИРА · ${campaign.player.nickname.toUpperCase()}`;
}
setStatus();
render();
