import test from 'node:test';
import assert from 'node:assert/strict';
import { getBankOverview, getBattleDetail, getBattleList, getJobListing, getMarketCatalog } from '../src/desktop-view-models.js';
import { createCampaign } from '../src/game-state.js';

test('desktop view models expose a battle detail, grocery delivery and bank debt', () => {
  const campaign = createCampaign();
  assert.equal(getBattleList(campaign)[0].id, 'makarewitch-vi');
  assert.equal(getBattleDetail(campaign, 'makarewitch-vi').applyLabel, 'Подать заявку');
  assert.equal(getJobListing('warehouse').district, 'docklands');
  assert.deepEqual(getMarketCatalog(campaign).stores.map((store) => store.name), ['Шестёрочка', 'Поворот']);
  assert.equal(getBankOverview(campaign).balance, 5000);
  assert.equal(getBankOverview(campaign).bills[0].debt, 0);
});

test('battle detail changes its button after registration', () => {
  const campaign = createCampaign();
  campaign.tournament.registered = true;
  const detail = getBattleDetail(campaign, 'makarewitch-vi');
  assert.equal(detail.applyLabel, 'Заявка принята');
  assert.equal(detail.canApply, false);
});

test('market cart gives an exact post-payment balance and delivery promise', () => {
  const catalog = getMarketCatalog(createCampaign());
  const groceries = catalog.stores[0].products[0];
  assert.equal(groceries.price, 380);
  assert.equal(groceries.deliveryMinutes, 40);
  assert.equal(catalog.balanceAfter('groceries'), 4620);
});
