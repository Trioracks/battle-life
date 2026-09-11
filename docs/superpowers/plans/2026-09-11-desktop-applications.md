# Repset, вакансии, маркет и банк Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Наполнить окна домашнего ПК понятными интерфейсами заявок, работы, покупок и банковских счетов, не меняя существующую игровую экономику.

**Architecture:** `src/desktop-view-models.js` создаёт тестируемые данные карточек из существующих чистых модулей. `src/main.js` рендерит эти данные в оконной рамке рабочего стола и вызывает существующие игровые команды только после явного действия игрока. Ни одно приложение не хранит отдельные деньги, время или статус заявки.

**Tech Stack:** ES modules, Node.js built-in test runner, Three.js via CDN, HTML, CSS.

**Spec:** `docs/superpowers/specs/2026-09-11-creator-apartment-desktop-design.md`

## Global Constraints

- Repset, магазины, банк и работодатели полностью вымышлены.
- Кнопка «Подать заявку» находится только на странице выбранного баттла.
- Заказы применяют существующее правило: оплата сразу, доставка 40 минут, ингредиенты появляются в холодильнике.
- Вакансия сохраняет существующие район, график, нагрузку, оплату и требование бодрости; смена стартует через карту.
- Банк показывает существующие `cash`, `rent.amount`, `rent.status` и `rent.debt`, не создавая вторую финансовую модель.
- Каждый завершённый блок проходит `npm test`, ручную проверку, отдельный коммит и push.

---

### Task 1: Тестируемые данные окон приложений

**Files:**
- Create: `src/desktop-view-models.js`
- Create: `test/desktop-view-models.test.js`
- Modify: `src/desktop-apps.js:1-35`

**Interfaces:**
- Consumes: `campaign`, `MAKAREWITCH_VI`, `getJob`, `jobIds`, `getInventorySummary`.
- Produces: `getBattleList(campaign)`, `getBattleDetail(campaign, id)`, `getJobListing(id)`, `getMarketCatalog(campaign)`, `getBankOverview(campaign)`.

- [ ] **Step 1: Write the failing test**

```js
import { getBankOverview, getBattleDetail, getJobListing, getMarketCatalog } from '../src/desktop-view-models.js';
import { createCampaign } from '../src/game-state.js';

test('desktop view models expose a battle detail, product delivery and bank debt', () => {
  const campaign = createCampaign();
  assert.equal(getBattleDetail(campaign, 'makarewitch-vi').applyLabel, 'Подать заявку');
  assert.equal(getJobListing('warehouse').district, 'docklands');
  assert.deepEqual(getMarketCatalog(campaign).stores.map((store) => store.name), ['Шестёрочка', 'Поворот']);
  assert.equal(getBankOverview(campaign).balance, 5000);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/desktop-view-models.test.js`

Expected: FAIL because the view-model module does not exist.

- [ ] **Step 3: Write minimal implementation**

Use only derived objects:

```js
export function getBankOverview(campaign) {
  return {
    balance: campaign.cash,
    operations: [{ id: 'starting-cash', label: 'Стартовый остаток', amount: campaign.cash }],
    bills: [{ id: 'rent', label: 'Аренда жилья', amount: campaign.rent.amount, status: campaign.rent.status, debt: campaign.rent.debt }],
  };
}
```

`getMarketCatalog` returns two stores with the existing grocery product (`id: 'groceries'`, `price: 380`, `deliveryMinutes: 40`, `ingredients: 3`). `getBattleDetail` derives registration status and combines tournament description, theme, deadline, visible hints and a deterministic local participant list. `getJobListing` copies the job and adds a fictional employer avatar label and a fixed review list.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/desktop-view-models.test.js test/jobs.test.js test/household.test.js test/tournament.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/desktop-view-models.js test/desktop-view-models.test.js src/desktop-apps.js
git commit -m "feat: add desktop application view models"
git push origin master
```

### Task 2: Repset: профиль, каталог и карточка баттла

**Files:**
- Modify: `src/main.js:168-230,250-324`
- Modify: `style.css:128-143`
- Modify: `test/desktop-view-models.test.js`

**Interfaces:**
- Consumes: `getBattleList(campaign)`, `getBattleDetail(campaign, 'makarewitch-vi')`, existing `registerForTournament` and `researchTournament`.
- Produces: Repset window states `battle-list` and `battle-detail`; registration happens only with `[data-battle-apply]` from the detail state.

- [ ] **Step 1: Write the failing test**

```js
import { getBattleDetail } from '../src/desktop-view-models.js';

test('Repset detail reflects an already submitted application', () => {
  const campaign = { ...createCampaign(), tournament: { registered: true, researchHints: [], submitted: false, selection: null } };
  assert.equal(getBattleDetail(campaign, 'makarewitch-vi').applyLabel, 'Заявка принята');
  assert.equal(getBattleDetail(campaign, 'makarewitch-vi').canApply, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/desktop-view-models.test.js`

Expected: FAIL until the detail model represents registered state.

- [ ] **Step 3: Implement the Repset window**

Render a left profile rail with the player nickname, avatar placeholder, visible skills and application status. Render the list on the right. A list item sets a local `desktopSubView = 'battle-detail'`; the detail then displays description, theme, deadline, participants and archive hints. Bind `data-battle-apply` only inside this detail to the existing registration function and re-render the same window. Keep archive research and track entry reachable after registration.

- [ ] **Step 4: Run tests and manual check**

Run: `npm test`

Expected: PASS.

Manual browser check: Repset opens to profile/list; detail displays MAKAREWITCH VI; apply is unavailable before opening detail and becomes `Заявка принята` after a successful registration.

- [ ] **Step 5: Commit**

```bash
git add src/main.js style.css src/desktop-view-models.js test/desktop-view-models.test.js
git commit -m "feat: add Repset battle detail workflow"
git push origin master
```

### Task 3: Вакансии, маркет и банк в отдельных оконных страницах

**Files:**
- Modify: `src/main.js:168-324`
- Modify: `style.css:128-143`
- Modify: `test/desktop-view-models.test.js`
- Modify: `docs/qa/2026-09-10-four-day-smoke.md`

**Interfaces:**
- Consumes: `getJobListing`, `getMarketCatalog`, `getBankOverview`, existing `buyFood`, `getJob`, `completeShift` and map travel flow.
- Produces: window subviews `job-detail`, `market-cart`, `bank-bills`; all final button handlers call the existing domain command once.

- [ ] **Step 1: Write the failing test**

```js
test('market cart provides an explicit post-payment balance and delivery promise', () => {
  const catalog = getMarketCatalog(createCampaign());
  const groceries = catalog.stores[0].products[0];
  assert.equal(groceries.price, 380);
  assert.equal(groceries.deliveryMinutes, 40);
  assert.equal(catalog.balanceAfter('groceries'), 4620);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/desktop-view-models.test.js`

Expected: FAIL until `balanceAfter` is included in the market model.

- [ ] **Step 3: Implement three window pages**

For jobs, render list cards then a selected detail with employer label, district, shifts, pay, energy requirement and review text. The final action informs the player that the selected job is available on the map; it must not silently execute a shift from the computer.

For market, render store tabs `Шестёрочка` and `Поворот`, product rows and cart. The checkout button must show `380 ₽`, the exact post-payment balance and `Курьер привезёт через 40 мин`, then invoke existing `buyFood(campaign, 'groceries')` once.

For bank, render current card balance, operations and clickable tabs `Переводы`, `Счета`. Transfers are display-only in this MVP; bills display rent amount, due status and debt from the campaign. Do not invent a payment flow.

- [ ] **Step 4: Run automated and manual checks**

Run: `npm test`

Expected: PASS.

Manual browser check: inspect a warehouse vacancy without starting it; order groceries and verify 380 ₽, 40 minutes and fridge inventory; inspect the bank balance and rent debt values against HUD.

- [ ] **Step 5: Commit**

```bash
git add src/main.js style.css src/desktop-view-models.js test/desktop-view-models.test.js docs/qa/2026-09-10-four-day-smoke.md
git commit -m "feat: add jobs market and bank desktop windows"
git push origin master
```

### Task 4: Полный регресс первого игрового отрезка

**Files:**
- Modify: `test/four-day-scenario.test.js`
- Modify: `docs/qa/2026-09-10-four-day-smoke.md`

**Interfaces:**
- Consumes: all existing campaign modules and desktop view models.
- Produces: a scenario proving that the new presentation did not change game rules.

- [ ] **Step 1: Write the failing scenario assertion**

```js
test('first four days keep one campaign economy across Repset, market, work and bank', () => {
  const campaign = createCampaign();
  const bankBefore = getBankOverview(campaign);
  const purchase = buyFood(campaign, 'groceries');
  const bankAfter = getBankOverview(purchase.state);
  assert.equal(bankBefore.balance - bankAfter.balance, 380);
  assert.equal(purchase.state.inventory.ingredients, campaign.inventory.ingredients + 3);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/four-day-scenario.test.js`

Expected: FAIL until the scenario imports the browser-derived view model and verifies it against campaign state.

- [ ] **Step 3: Implement the regression scenario and expand manual QA**

Keep the assertion above, then extend it through registration, archive research, draft, beat, recording, mixing, mastering and submission using existing functions. Add the exact browser path to the QA document: create MC → kitchen meal → sleep → desktop boot → Repset registration → market order → bank bill → map job detail → track submission.

- [ ] **Step 4: Run final verification**

Run: `npm test`

Expected: PASS with the full suite.

Run: `git diff --check`

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add test/four-day-scenario.test.js docs/qa/2026-09-10-four-day-smoke.md
git commit -m "test: cover refreshed desktop gameplay loop"
git push origin master
```
