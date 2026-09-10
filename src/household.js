import { advanceCampaign } from './game-state.js';

function nextInventory(campaign, change) {
  return { ...campaign.inventory, ...change };
}

export function buyFood(campaign, item) {
  if (item !== 'groceries') throw new Error('Такого продукта в MVP нет.');
  if (campaign.cash < 380) return { state: campaign, message: 'Не хватает денег на продукты.', completed: false };
  const result = advanceCampaign(campaign, { id: 'buy-groceries', label: 'Покупает продукты', minutes: 5, effects: { cash: -380 } });
  return { state: { ...result.state, inventory: nextInventory(campaign, { ingredients: campaign.inventory.ingredients + 3 }) }, message: 'Продукты в холодильнике.', completed: true };
}

export function cookMeal(campaign) {
  if (campaign.inventory.ingredients < 2) return { state: campaign, message: 'Нужно хотя бы два ингредиента.', completed: false };
  const result = advanceCampaign(campaign, { id: 'cook-meal', label: 'Готовит еду', minutes: 35, effects: { energy: -2, leisure: 1 } });
  return { state: { ...result.state, inventory: nextInventory(campaign, { ingredients: campaign.inventory.ingredients - 2, cookedMeals: campaign.inventory.cookedMeals + 2, dirtyDishes: campaign.inventory.dirtyDishes + 1 }) }, message: 'Готово две порции.', completed: true };
}

export function eatMeal(campaign) {
  if (campaign.inventory.cookedMeals < 1) return { state: campaign, message: 'В холодильнике нет готовой еды.', completed: false };
  const result = advanceCampaign(campaign, { id: 'eat-meal', label: 'Ест дома', minutes: 15, effects: { hunger: 26, leisure: 2 } });
  return { state: { ...result.state, inventory: nextInventory(campaign, { cookedMeals: campaign.inventory.cookedMeals - 1, dirtyDishes: campaign.inventory.dirtyDishes + 1 }) }, message: 'Сыт.' , completed: true };
}

export function washDishes(campaign) {
  const result = advanceCampaign(campaign, { id: 'wash-dishes', label: 'Моет посуду', minutes: 15, effects: { leisure: -.5 } });
  return { state: { ...result.state, inventory: nextInventory(campaign, { dirtyDishes: 0 }) }, message: 'Кухня стала чище.', completed: true };
}

export function sleep(campaign, hours) {
  if (!Number.isInteger(hours) || hours < 1 || hours > 12) throw new Error('Будильник можно поставить от 1 до 12 часов.');
  const result = advanceCampaign(campaign, { id: 'sleep', label: `Спит ${hours} ч`, minutes: hours * 60, effects: { energy: hours * 8, health: hours * .55, leisure: -hours * .2 } });
  return { state: result.state, message: `Проснулся через ${hours} ч.`, completed: true };
}
