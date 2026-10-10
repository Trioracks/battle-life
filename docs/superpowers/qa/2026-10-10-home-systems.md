# Итоговая проверка бытовых систем и студии — версия 23

В существующей ветке `codex/home-studio-polish` объединены ранее проверенные блоки холодильника и реплик, единого новичка и гардероба, форума и установки программ, материалов выключателя. Пользователь поручил реализацию всего списка 10.10.2026. Итоговая интеграция меняет только версии импортов, проверки и документацию; поведение производственных JS-модулей в этом шаге не менялось. Независимое ревью всей ветки следует после этого локального коммита; push и merge не выполнялись.

## Версии и TDD

`test/client-module-version.test.js` теперь обходит реальный граф от `apartment-app`, включая динамический импорт сцены и циклическую пару profile/wardrobe. Он проверяет 33 изменённых с `56f4cae` модуля и все их зависимые импортёры: 38 модулей получают единственный канонический URL `?rev=23`. Дополнительные импортёры — lighting, beat-market, ft-studio-project/audio и system-windows — также требуют обновления, поскольку их сохранённый код содержал прежние URL зависимостей.

- RED: `node --test test/client-module-version.test.js` до производственного обновления — 1 успех, 1 ожидаемый отказ: entry оставался `apartment-app.js?rev=22`, требовался `rev=23`.
- GREEN: та же команда после обновления — 2/2, без ошибок.
- Изменённые `apartment-v3.css`, `creator-v12.css`, `desktop-apps.css` загружаются с `rev=23`. `virtual-pc.css` не менялся с `56f4cae` и сохраняет `rev=21`. Не связанные с изменениями ассеты не переверсионированы.
- Неизменённый `BeatAudio` сохраняет `beat-audio.js?rev=21`; браузерный probe импортирует именно URL экземпляра приложения. Сохранены версии 21 у неизменённых beginner-bank/playback/work-audio/work-view.
- Полный FT-сценарий без route-подмен и обхода кэша модулей подтвердил реальные ответы сети для всех 38 канонических JS URL, трёх изменённых CSS, прежнего PC CSS и `BeatAudio`. Промежуточные source no-cache routes удалены из бытовых/программных сценариев.

## Команды и результаты

Сервер: `http://127.0.0.1:4173`. Использованы уже установленные Playwright и Chromium; зависимости и браузеры не скачивались. Финальный Node-прогон завершён до браузерных сценариев. Все браузерные сценарии запускались последовательно, каждый завершал свой браузер перед следующим.

```powershell
$env:TEMP='D:/Codex/Temp'
$env:TMP='D:/Codex/Temp'
$env:PLAYWRIGHT_MODULE_PATH='D:/Codex/Caches/npm/_npx/48b1ca104c3549f4/node_modules/playwright-core'
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE='D:/Codex/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-win64/chrome-headless-shell.exe'
$env:FT_QA_DIR='D:/Codex/Builds/Battle/home-systems-20261010'

node --test
node tools/verify-home-needs.mjs
node tools/verify-home-needs-focus.mjs
node tools/verify-home-wardrobe.mjs
node tools/verify-pc-software.mjs
$env:PC_SOFTWARE_QA_CASES='supplement'
node tools/verify-pc-software.mjs
Remove-Item Env:PC_SOFTWARE_QA_CASES
node tools/verify-home-switch.mjs
node tools/verify-ft-beginner.mjs
node tools/verify-home-studio.mjs
```

| Проверка | Фактический результат |
| --- | --- |
| Полный `node --test` | 530/530, 0 failures, 0 skipped; 23 997.867 ms. Полный чистый вывод: `node-tests.log` в каталоге артефактов. |
| Focused migration/wardrobe/integration/version | 18/18. Отдельная проверка XP entry после обновления старого ожидания: 5/5. |
| `verify-home-needs` | 6 групп PASS: подход и расход/лимит/reload/focus при выключенном ПК; отказ backup; голод 2D/3D/mobile; нехватка энергии с запретом AudioContext; прерывание работы с сохранением частичного задания/проекта/звуков; скрытая реплика без старения или повторного аудио. |
| `verify-home-needs-focus` | 3 случая PASS: оставшийся запас, полная сытость, последняя порция. После отключения съеденной кнопки фокус остаётся на доступном элементе, Shift+Tab/Tab не выходят, Escape возвращает фокус. |
| `verify-home-wardrobe` | 3 группы PASS: свежий герой с девятью навыками 10, подход/замки/отмена/применение/reload, raycast шкафа 2D/3D и 480px; старая схема с сохранением проекта/stems/кошелька/холодильника и последующей практики; отказ миграции блокирует последующую разрушительную автозапись. |
| `verify-pc-software`, main | 3 группы PASS: новая игра → форум → загрузка клиента → мастер → пустая очередь → metadata → пауза/выключение/сон → reload → отмена/повтор мастера FT → свой путь/Explorer → FT; прежняя установленная FT и данные сохранены; заполненный общий диск отклоняет новые байты с видимой причиной. |
| `verify-pc-software`, supplement | PASS: частичная загрузка после reload не получает время задним числом, пустой toolbar отключён, финальный компактный форум доступен на desktop/480px. |
| `verify-home-switch` | 16/16 render/pick: living/kitchen × 2D/3D × day/night × on/off. Сохранение не создавалось, сцена освобождена. |
| `verify-ft-beginner` | PASS: три озвученных этапа; hidden/re-enable; reload посреди этапа с прежними выборами; голод/готовка/обед/продолжение; 9 клипов с первого такта; реальный Play/Pause/Stop; панели и транспорт 640/1280; реальная сеть версии 23. |
| `verify-home-studio` | PASS: дата 01.10.2012 на игровом дне 31, повторное случайное/ручное название и открытие, 1 → 3 → 6 → 9 дорожек, New/Open и транспорт сверху, фактический анализ без управляющих кнопок, фокус и 640/1280. |

Все перечисленные браузерные сценарии завершились с нулём `pageerror`. В первом полном Node-прогоне осталось старое ожидание версии 22 в `virtual-pc-xp-entry.test.js`; оно обновлено согласованно с новым графом, после чего focused и полный прогоны успешны. Ошибок UI, требующих производственных исправлений, итоговые сценарии не выявили.

Git сообщает о преобразовании LF/CRLF при diff/staging некоторых файлов. Это отдельные сообщения Git о рабочей копии, а не предупреждения Node или браузерные ошибки. Финальный `node-tests.log` содержит чистый тестовый вывод. `git diff --check` прошёл.

## Визуальная проверка и сохранения

Артефакты находятся в `D:/Codex/Builds/Battle/home-systems-20261010`. Просмотрены свежие `08-final-640.png` и `08-final-1280.png`: верхние кнопки читаемы и не перекрываются; 1280 показывает девять цветных дорожек и анализ справа; 640 использует прокручиваемые дорожки и анализ ниже. Контроллер независимо просмотрел оба финальных скриншота и не запросил дополнительных визуальных изменений. Также просмотрены бытовая реплика mobile, шкаф/комната 2D/3D, дневной 2D и ночной 3D detail выключателя. Материалы сохраняют кремовый пластик и читаемое углубление.

`progressive-0.png` — `progressive-3.png` и `polished-640.png`/`polished-1280.png` фиксируют календарь и постепенное раскрытие дорожек. `software-main.log`, `software-supplement.log`, `switch.log`, `ft-beginner.log`, `home-studio.log` сохраняют результаты соответствующих запусков.

Контексты Chromium изолированы от пользовательского браузера. Старые сохранения готовятся на инертных fixture-страницах до запуска приложения; изменения FT между reload передаются через `sessionStorage` и initScript следующего документа, чтобы pagehide autosave не затёр seed. Пользовательские сохранения не читались и не изменялись. Исходные файлы `stems` и аудиоассеты не менялись. Миграции сохраняют резервные копии и журнал, а `migrationReady` продолжает блокировать profile/PC/time записи после отказа.

## Границы проверки и отложенные мелочи

- `verify-home-switch` использует реальную сцену с программно выбранными позой/камерой/светом. Это render/pick fixture, не проверка ходьбы через UI. Существующие Node-тесты подхода, контакта, отмены и однократного переключения остаются успешными.
- Полный FT-сценарий использует совместимый seed `createVirtualPcState({download:{status:'installed'}})` для установленной FT. Реальная новая цепочка установки отдельно пройдена в software main. В текущем состоянии приложения `software` остаётся источником истины, `download` — производной проекцией.
- `verify-virtual-pc-browser.mjs`, `verify-pc-lifecycle-browser.mjs`, `verify-desktop-rework.mjs` в этом шаге не запускались: их прежние direct-install/preinstalled-client gates устарели. Совместимость этих сценариев не заявляется. `verify-beat-review.mjs` также не запускался повторно; этот отчёт не переносит его прежний результат в версию 23.
- Звук проверен технически по успешному воспроизведению и источникам/состояниям транспорта. Субъективное прослушивание пользователем этим не заменяется.
- Унаследованная неблокирующая мелочь Task 3: `virtual-pc-explorer.js:65` показывает «Папка» в Properties у непроектных metadata/archive/executable. Реализация Properties в Task 5 не менялась; тронуты только её import URL. Оставлено для итогового ревью.
- Магазины, рецепты/йогурт, новые жанры/лицензии, вокал и тексты не добавлены. 01.09.2012 остаётся выбранной пользователем запасной игровой датой, не доказанной датой PvB 3.

## Архив решений из SDD ledger

Следующие строки `Ruling` перенесены дословно из `.superpowers/sdd/2026-10-10-home-systems/progress.md`, чтобы они сохранились в отслеживаемой документации после возможной очистки рабочего ledger.

Ruling: use simulation sizes client download 2 MB / installation 8 MB, FT download 800 MB / installation 800 MB, metadata 12 KB — user left exact sizes open, existing FT already 800 MB — if wrong, rebalance catalog and migrate only future downloads.

Ruling: switch runtime material override plus matching generator values avoids re-exporting whole apartment — baked switch materials caused overly dark outline — if wrong, visual polish may need a dedicated bake later.

Ruling: Task3 also replaces the legacy 590-project cap with shared disk accounting and caps incoming bytes at available capacity — retained archives invalidate that shortcut and otherwise allow overfilling C — if wrong, project storage limits need rebalancing; no project data is removed.
