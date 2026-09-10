const SAVE_KEY = 'battle-life-campaign-v1';

const startClock = Object.freeze({ year: 2026, month: 9, day: 17, minutes: 19 * 60 });
const startNeeds = Object.freeze({ energy: 72, hunger: 68, health: 82, leisure: 56 });

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

function clampNeed(value) {
  return Math.max(0, Math.min(100, Math.round(value * 10) / 10));
}

function dateKey(clock) {
  return `${clock.year}-${String(clock.month).padStart(2, '0')}-${String(clock.day).padStart(2, '0')}`;
}

function addMinutes(clock, minutes) {
  const date = new Date(Date.UTC(clock.year, clock.month - 1, clock.day, 0, clock.minutes + minutes));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    minutes: date.getUTCHours() * 60 + date.getUTCMinutes(),
  };
}

function isRentDue(clock) {
  return clock.year > 2026 || (clock.year === 2026 && (clock.month > 10 || (clock.month === 10 && clock.day >= 1)));
}

export function createCampaign() {
  return {
    version: 1,
    clock: copy(startClock),
    cash: 5000,
    needs: copy(startNeeds),
    rent: {
      amount: 3500,
      due: { year: 2026, month: 10, day: 1 },
      status: 'upcoming',
      debt: 0,
    },
    player: null,
    inventory: { ingredients: 2, cookedMeals: 0, dirtyDishes: 0 },
    home: { cleanliness: 82 },
    activity: { id: 'idle', label: 'Осматривается', minutes: 0 },
    lastDailySave: '2026-09-17',
    notifications: [],
    tournament: { registered: false, researchHints: [], submitted: false, selection: null },
    track: null,
    location: 'north-sloboda-home',
  };
}

export function getInventorySummary(campaign) {
  const inventory = campaign?.inventory ?? {};
  return {
    ingredients: Number(inventory.ingredients) || 0,
    cookedMeals: Number(inventory.cookedMeals) || 0,
    dirtyDishes: Number(inventory.dirtyDishes) || 0,
  };
}

export function advanceCampaign(campaign, action) {
  if (!Number.isFinite(action?.minutes) || action.minutes <= 0) {
    throw new Error('A confirmed action needs a positive duration.');
  }

  const state = copy(campaign);
  const beforeDay = dateKey(state.clock);
  state.clock = addMinutes(state.clock, action.minutes);
  const hours = action.minutes / 60;
  const effects = action.effects ?? {};
  state.needs.hunger = clampNeed(state.needs.hunger - hours * 1.5 + (effects.hunger ?? 0));
  state.needs.energy = clampNeed(state.needs.energy - hours * .5 + (effects.energy ?? 0));
  state.needs.leisure = clampNeed(state.needs.leisure - hours * .5 + (effects.leisure ?? 0));
  state.needs.health = clampNeed(state.needs.health + (effects.health ?? 0));
  state.cash += effects.cash ?? 0;
  state.activity = { id: action.id, label: action.label ?? action.id, minutes: action.minutes };

  const crossedDay = beforeDay !== dateKey(state.clock);
  if (crossedDay) state.lastDailySave = dateKey(state.clock);
  if (isRentDue(state.clock) && state.rent.status === 'upcoming') state.rent.status = 'due';

  return { state, crossedDay };
}

export function saveCampaign(campaign, storage = globalThis.localStorage) {
  storage?.setItem(SAVE_KEY, JSON.stringify(campaign));
  return campaign;
}

export function loadCampaign(storage = globalThis.localStorage) {
  const serialized = storage?.getItem(SAVE_KEY);
  if (!serialized) return null;
  try {
    return JSON.parse(serialized);
  } catch {
    return null;
  }
}

export const campaignSaveKey = SAVE_KEY;
