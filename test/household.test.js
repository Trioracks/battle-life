import test from 'node:test';
import assert from 'node:assert/strict';
import { buyFood, cookMeal, eatMeal, sleep, washDishes } from '../src/household.js';
import { createCampaign } from '../src/game-state.js';

test('buying groceries spends cash and creates ingredients for cooking', () => {
  const result = buyFood(createCampaign(), 'groceries');

  assert.equal(result.state.cash, 4620);
  assert.equal(result.state.inventory.ingredients, 5);
});

test('cooking creates stored portions and washing dishes takes fifteen minutes', () => {
  const cooked = cookMeal(createCampaign());
  const washed = washDishes(cooked.state);

  assert.equal(cooked.state.inventory.cookedMeals, 2);
  assert.equal(cooked.state.inventory.dirtyDishes, 1);
  assert.equal(washed.state.inventory.dirtyDishes, 0);
  assert.equal(washed.state.clock.minutes, 1190);
});

test('eating a stored portion improves hunger and sleep respects selected alarm duration', () => {
  const prepared = { ...createCampaign(), inventory: { ingredients: 0, cookedMeals: 1, dirtyDishes: 0 } };
  const eaten = eatMeal(prepared);
  const rested = sleep(eaten.state, 7);

  assert.equal(eaten.state.inventory.cookedMeals, 0);
  assert.ok(eaten.state.needs.hunger > prepared.needs.hunger);
  assert.deepEqual(rested.state.clock, { year: 2026, month: 9, day: 18, minutes: 135 });
  assert.ok(rested.state.needs.energy > eaten.state.needs.energy);
});
