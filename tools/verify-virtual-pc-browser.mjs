// Run against the local game with an isolated browser context, never a player profile.
// PLAYWRIGHT_MODULE_PATH may point to an existing playwright-core installation.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright-core');
const output = resolve(process.env.PC_QA_OUTPUT || 'artifacts/virtual-pc-acceptance');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}),
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.setDefaultTimeout(30000);
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const pc = page.locator('#virtual-pc');
const button = (name, root = pc) => root.getByRole('button', { name, exact: true });
const desktop = () => page.waitForFunction(() => document.querySelector('#virtual-pc')?.dataset.pcStage === 'desktop');
const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('battle-life-virtual-pc-v1')));
const checkFullscreen = async () => {
  const layout = await page.evaluate(() => {
    const root = document.querySelector('#virtual-pc'), box = root.getBoundingClientRect();
    const bar = root.querySelector('.pc-taskbar').getBoundingClientRect();
    return { hidden: root.hidden, display: getComputedStyle(root).display, left: box.left, top: box.top, width: box.width, height: box.height, viewportWidth: innerWidth, viewportHeight: innerHeight, taskbarBottom: bar.bottom };
  });
  assert.equal(layout.hidden, false);
  assert.notEqual(layout.display, 'none');
  assert.equal(layout.left, 0); assert.equal(layout.top, 0);
  assert.equal(layout.width, layout.viewportWidth);
  assert.equal(layout.height, layout.viewportHeight);
  assert.ok(layout.taskbarBottom <= layout.viewportHeight + 1);
};

try {
  await page.goto(process.env.PC_QA_URL || 'http://127.0.0.1:4173/?qa=virtual-pc', { waitUntil: 'networkidle' });
  await page.locator('#new-game').click();
  await page.locator('#character-name').fill('Проверка ПК');
  await page.locator('#stats-tab').click();
  await page.locator('#distribute').click();
  await page.locator('#start-game').click();
  await page.locator('#wake').click();
  await page.locator('#actions [data-action="computer"]').click();
  await page.waitForFunction(() => document.querySelector('#virtual-pc')?.dataset.pcStage === 'booting');
  await desktop();
  await checkFullscreen();
  await page.screenshot({ path: resolve(output, 'desktop-1280.png') });
  console.log('PASS seated transition -> boot -> fullscreen desktop');

  await button('Заводской рассвет').click();
  await button('Мой компьютер').click();
  await button('Открыть диск C:').click();
  await button('Открыть папку Мои проекты').click();
  assert.match(await pc.innerText(), /Мои проекты · пусто/);
  await button('Закрыть окно').click();
  await button('Underweb').click();
  await button('Выбрать баттл Бетонное эхо').click();
  await button('Скачать FT Studio через torent').click();
  await button('Пуск').click();
  await button('Отойти от ПК, оставив его включённым').click();
  await page.locator('#actions [data-action="bed"]').click();
  await page.locator('#wake').waitFor({ state: 'visible' });
  await page.locator('#wake').waitFor({ state: 'hidden' });
  await page.locator('#actions [data-action="computer"]').click();
  await desktop();
  await button('torent').click();
  await button('Установить FT Studio').click();
  assert.equal((await state()).download.status, 'installed');
  console.log('PASS background download during sleep -> install');

  await button('FT Studio').click();
  await pc.getByRole('textbox', { name: 'Название проекта', exact: true }).fill('Бит для проверки');
  await button('Создать проект FT Studio').click();
  await button('Слушать проект').click();
  await pc.getByText('Играет паттерн.', { exact: true }).waitFor();
  await button('Остановить проект').click();
  const fader = await pc.getByRole('slider', { name: 'Громкость kick', exact: true }).elementHandle();
  const rect = await fader.boundingBox();
  await page.mouse.move(rect.x + rect.width * .8, rect.y + rect.height / 2);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.width * .25, rect.y + rect.height / 2, { steps: 6 });
  await page.mouse.up();
  assert.equal(await fader.evaluate(node => node.isConnected), true);
  assert.ok(Number(await fader.inputValue()) < .8);
  await button('Сохранить проект в Мои проекты').click();
  assert.equal((await state()).projects.length, 1);
  await checkFullscreen();
  await page.screenshot({ path: resolve(output, 'studio-1280.png') });
  await page.setViewportSize({ width: 640, height: 900 });
  await checkFullscreen();
  await page.screenshot({ path: resolve(output, 'studio-640.png') });
  console.log('PASS real browser Play/Stop, fader drag, save and 1280/640 layouts');

  await button('Закрыть окно').click();
  await button('Мой компьютер').click();
  await button('Открыть диск C:').click();
  await button('Открыть папку Мои проекты').click();
  await button('Открыть проект Бит для проверки').click();
  await button('Слушать проект').click();
  await pc.getByText('Играет паттерн.', { exact: true }).waitFor();
  await button('Пуск').click();
  await button('Выключить компьютер').click();
  await page.waitForFunction(() => document.body.dataset.mode === 'game');
  assert.equal((await state()).power, 'off');
  await page.reload({ waitUntil: 'networkidle' });
  const restored = await state();
  assert.equal(restored.wallpaper, 'factory');
  assert.equal(restored.download.status, 'installed');
  assert.equal(restored.projects[0].name, 'Бит для проверки');
  await page.locator('#continue-game').click();
  await page.locator('#actions [data-action="computer"]').click();
  await desktop();
  await button('Мой компьютер').click();
  await button('Открыть диск C:').click();
  await button('Открыть папку Мои проекты').click();
  await button('Открыть проект Бит для проверки').click();
  await button('Слушать проект').click();
  await pc.getByText('Играет паттерн.', { exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log('PASS reopen -> shutdown -> reload -> reopen/play; zero page errors');
  console.log('Screenshots: ' + output);
} catch (error) {
  console.error('PAGE_ERRORS', errors);
  await page.screenshot({ path: resolve(output, 'failure.png') }).catch(() => {});
  throw error;
} finally {
  await browser.close();
}
