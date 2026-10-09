# Windows XP Game Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Заменить текущую оболочку игрового ПК на узнаваемую и работающую Windows XP Luna с многоконностью, ярлыками, Пуском, Проводником и настройкой обоев, сохранив игровые данные.

**Architecture:** Чистая модель окон отделена от стабильного DOM-каркаса. Существующий контроллер координирует приложения, сохранения и модальные переходы; Проводник отображает существующие игровые данные. Квартира остаётся владельцем профиля и времени.

**Tech Stack:** Native JavaScript ES modules, HTML/CSS, локальные SVG, Node `node:test`, уже установленный Playwright/Chromium. Без новых runtime-зависимостей и сборщика.

**Spec:** `docs/superpowers/specs/2026-10-09-windows-xp-shell-design.md` — одобрена пользователем; прочитать полностью вместе с этим планом. Этот план пока ждёт согласования и выбора способа исполнения.

## Global Constraints

- «Базовое оформление — синяя тема Luna»: не Windows 98, Classic или Royale.
- «Используется `Tahoma, Arial, sans-serif`, базовый размер 12–13 CSS px независимо от уменьшенного корневого шрифта квартиры».
- «Ярлыки слева, графика около 32×32 px»; «Панель закреплена снизу, высота около 32 px».
- «При 640×900 приложения по умолчанию открываются развёрнутыми»; браузерная приёмка также на 1280×720.
- «Все диски и папки виртуальные; реальный C:, сеть, скачивание ПО и настройки компьютера пользователя недоступны игре».
- «Долговременно сохраняются данные проектов, загрузка, фон и позиции ярлыков, но не список открытых окон».
- Прежние `battle-life-virtual-pc-v1`, version=1, 1500 МБ диска, 800 МБ установки, 2 МБ проекта, 360 игровых минут загрузки; изменять только представление и описанную в спецификации многоконность/аудиоповедение.
- «Все новые артефакты, графика, браузерные профили и кеши находятся на D:». Не устанавливать браузер повторно и не вызывать `npx` для скачивания пакетов.
- Не создавать worktree автоматически: в текущем проекте ранее выбран обычный checkout. На старте исполнения проверить применимые инструкции и актуальный Git scope; без push, переключения ветки и включения чужих изменений.

## Review Focus

1. Старое/повреждённое сохранение: новая раскладка не сбрасывает проекты, фон или загрузку; неизвестные идентификаторы и NaN не ломают геометрию — Task 1.
2. Изменённая, но свёрнутая Studio: переключение безопасно, а уход/выключение всё равно защищают черновик; отказ localStorage не закрывает игру — Task 3.
3. Прерывание перетаскивания, двойной клик после drag, сужение viewport: нет случайного запуска, зависшего capture или потерянного заголовка — Tasks 2, 7.
4. Сохранение проекта при уже открытом Проводнике и игровой tick во время ввода/drag: список актуален, пользовательский ввод и DOM-узлы не теряются — Tasks 3, 4, 7.
5. Меню возле края и цепочка диалогов: пункт достижим, Escape снимает только верхний слой, отмена возвращает фокус; применение/отмена обоев имеют разные результаты — Tasks 5, 7.

## Исходное состояние и карта файлов

База кода: `1481137`; спецификация: `396d3f5`. Активная точка входа `index.html → src/apartment-app.js`, сейчас rev=16. `src/virtual-pc-ui.js` хранит один `pc.window`, пересоздаёт рабочий стол и останавливает звук при смене приложения — эти три механизма требуют замены. `tools/verify-virtual-pc-browser.mjs` уже проходит реальный игровой маршрут, но предполагает одинарные клики и старое расположение обоев.

| Файлы | Назначение / владелец задачи |
| --- | --- |
| Новый `src/virtual-pc-window-state.js`; изменение `src/virtual-pc-state.js` | Оконная геометрия и нормализация позиций ярлыков — Task 1 |
| Новые `src/virtual-pc-shell.js`, `src/virtual-pc-icons.js`, `src/virtual-pc-dom.js`, SVG в `assets/ui/virtual-pc/icons/`; `virtual-pc.css` | Стабильный каркас XP, графика, scoped-стили и DOM-хелперы — Task 2 |
| `src/virtual-pc-ui.js`, `src/virtual-pc-catalog.js` | Координатор нескольких приложений и защищённых переходов — Tasks 3–5 |
| Новые `src/virtual-pc-explorer.js`, `src/virtual-pc-explorer-view.js` | Чистая навигация/данные и представление Проводника — Task 4 |
| Новые `src/virtual-pc-system-windows.js`, `src/virtual-pc-menus.js` | Свойства, панель управления, подтверждение выключения, доступные меню — Task 5 |
| `src/apartment-app.js`, `index.html` | Метаданные персонажа/часов, жизненный цикл и версии модулей — Task 6 |
| Новые `test/virtual-pc-window-state.test.js`, `test/virtual-pc-shell.test.js`, `test/virtual-pc-multiwindow.test.js`, `test/virtual-pc-explorer.test.js`, `test/virtual-pc-system-windows.test.js`, `test/helpers/virtual-pc-dom.js` | Регрессии каждого нового блока |
| Существующие PC-тесты, браузерный сценарий; новый `docs/superpowers/qa/2026-10-09-windows-xp-shell.md` | Полная приёмка и доказательства — Task 7 |

Существующие dirty-файлы `src/main.js`, `style.css`, action/animation/sound-модули и их тесты, `test/client-module-version.test.js`, legacy и старые артефакты не включать в коммиты. Если затрагиваемый файл стал dirty после планирования, сначала отделить изменения пользователя. `git add` — только явные пути задачи; перед каждым коммитом `git diff --cached --check` и просмотр staged diff.

### Task 1: Чистая модель окон и совместимая раскладка

**Files:** Create `src/virtual-pc-window-state.js`, `test/virtual-pc-window-state.test.js`; modify `src/virtual-pc-state.js` (`normalizeSnapshot`, exports), `test/virtual-pc-state.test.js`.

**Interfaces:**
- `createWindowState({width,height}) → {viewport, windows:[], activeId:null}`; размер viewport включает панель задач, рабочая высота `max(0,height-32)`.
- `reduceWindows(state, action) → newState`; action types `open {id,appId,title,rect?}`, `activate|minimize|task|toggle-maximize|close {id}`, `geometry {id,rect}`, `viewport {width,height}`, `clear`. `task` сворачивает активное либо восстанавливает/активирует другое.
- Window: `{id,appId,title,rect:{x,y,width,height},restoreRect,mode:'normal'|'maximized'|'minimized',restoreMode:'normal'|'maximized',z}`. Один id на приложение; повторный open активирует без сброса геометрии.
- В state-модуле добавить `desktopIcons: {[id]:{x,y}}`, `setDesktopIconPosition(state,id,{x,y}) → state`, `resetDesktopIconPositions(state) → state`, `layoutDesktopIcons(ids,positions,{width,height}) → positions`. Допустимые id: `computer`, `documents`, `underweb`, `torent`, `ft-studio`.

- [ ] **1. Записать failing-тесты с неизменяемыми входными объектами:**
  ```js
  const a = createWindowState({width:1280,height:720});
  const b = reduceWindows(a,{type:'open',id:'computer',appId:'computer',title:'Мой компьютер'});
  const c = reduceWindows(b,{type:'toggle-maximize',id:'computer'});
  assert.deepEqual(c.windows[0].rect,{x:0,y:0,width:1280,height:688});
  assert.deepEqual(reduceWindows(c,{type:'toggle-maximize',id:'computer'}).windows[0].rect,b.windows[0].rect);
  assert.equal(a.windows.length,0);
  ```
  Отдельные имена: `duplicate open focuses one instance`, `minimized maximized window restores maximized`, `closing active picks top visible window`, `640 viewport starts maximized`, `invalid geometry cannot poison state`, `old save retains projects download wallpaper`, `unknown icon and nonfinite position are ignored`. Проверить activeId=null при отсутствии видимых окон, round-trip storage и отсутствие windows в сохранении.
- [ ] **2. Запустить** `node --test test/virtual-pc-window-state.test.js test/virtual-pc-state.test.js`; ожидается FAIL из-за отсутствующего интерфейса, не сторонних ошибок.
- [ ] **3. Реализовать интерфейсы.** Начальный обычный размер 560×420, Studio 940×620, ограниченный рабочей областью; минимальный 320×220 либо доступный размер меньшего viewport. При width≤640 открывать maximized. Позиции/размеры конечные, rect целиком в рабочей области; неизвестные команды/id безопасно возвращают исходное состояние. Сетка ярлыков 80×88 с отступом 8, сначала сверху вниз; нормализация пропускает незнакомые поля, layout ограничивает координаты с учётом размера ярлыка.
- [ ] **4. Повторить команду шага 2**, затем `node --test test/virtual-pc-runtime.test.js`; ожидается 0 failures, прежние числа диска/прогресса неизменны.
- [ ] **5. Проверить staged diff и закоммитить только четыре файла задачи:** `feat: model XP windows and desktop layout`.

### Task 2: Стабильный каркас XP, графика и жесты

**Files:** Create `src/virtual-pc-shell.js`, `src/virtual-pc-icons.js`, `src/virtual-pc-dom.js`, `test/virtual-pc-shell.test.js`, `test/helpers/virtual-pc-dom.js`; create SVG `computer.svg`, `documents.svg`, `folder.svg`, `disk.svg`, `project.svg`, `underweb.svg`, `torent.svg`, `studio.svg`, `settings.svg`, `display.svg`, `power.svg`, `start.svg`, `minimize.svg`, `maximize.svg`, `restore.svg`, `close.svg` in `assets/ui/virtual-pc/icons/`; modify `virtual-pc.css`.

**Interfaces:**
- `pcElement(document,tag,options={})`, `pcButton(document,text,options,handler)`, `pcFocusable(root) → Element[]` в DOM-хелпере; перенести существующие семантики без сторонней библиотеки. `createPcIcon(document,id,{size=32}={}) → HTMLImageElement`, локальные src и пустой alt у декоративной графики.
- `mountPcShell(root,{onCommand}) → {render(model),getContentRoot(id),getMenuRoot(),setModal(node,returnFocus),focusActive(),dispose()}`. Model: `{windows:WindowState,apps:[{id,label,iconId,description}],wallpaper,iconPositions,metadata:{playerName,clockLabel},warning}`. Сохранить keyed frame/content DOM для каждого window id; `getContentRoot(id)` возвращает стабильный элемент или null, `getMenuRoot()` — стабильный верхний слой для Task 5. `setModal(null,returnFocus)` снимает modal/inert и возвращает фокус, если исходный элемент ещё доступен, иначе фокусирует активное окно.
- Commands: `{type:'window',action}` использует Task 1; `{type:'open-app',appId}`, `{type:'move-icon',id,position}`, `{type:'desktop-menu',targetId:null|string,x,y}`, `{type:'start-menu'}`. Обработчики вызываются только после осмысленного жеста, не во время render.
- Тестовый `pcDocument()` в `test/helpers/virtual-pc-dom.js` расширяет существующий узкий DOM-adapter только используемыми операциями remove/contains/isConnected/событий; export `findPc(root,role,id?)` по data-pc-role и data-window-id. Он не эмулирует браузерную геометрию — её проверяет Task 7.

- [ ] **1. Записать failing-тесты** `render retains content and input nodes`, `title controls emit window commands`, `one click selects double click opens`, `pointer cancellation suppresses click`, `dispose removes gesture listeners`. Для стабильности: `assert.strictEqual(shell.getContentRoot('underweb'),contentBefore); assert.equal(input.value,'underweb://battles/yard-cipher');` после render с изменённым activeId/rect/clockLabel. Проверить относительный локальный src каждого SVG, наличие viewBox и отсутствие Unicode-значков вместо картинки.
- [ ] **2. Запустить** `node --test test/virtual-pc-shell.test.js`; ожидается FAIL на отсутствующий shell API.
- [ ] **3. Реализовать каркас и scoped CSS.** Размер текста 13px; Luna-синие градиенты заголовков/панели, красный крестик, зелёный Пуск, inactive-состояния, taskbar 32px, белые/светлые поля, тёмная внутренняя Studio. Удалить `.pc-desktop-header` и постоянный wallpaper-picker из новой оболочки. Отдельные слои окон/меню/modal; overlay-modal делает фон inert. Кнопки задач ограничены по ширине, overflow прокручивается внутри средней области, Пуск и часы не исчезают.
- [ ] **4. Реализовать жесты shell.** Pointer capture только для primary pointer; drag начинается после 4px, resize с восьми направлений, double-click title → toggle-maximize. Кнопки/inputs исключены из title drag; pointercancel/lostpointercapture/close/dispose снимают capture. Перемещение визуально обновляет геометрию без замены контента, финальные данные отправляются координатору. ResizeObserver передаёт viewport через command; keyboard Enter/Shift+F10 и стрелки по сетке ярлыков; Tab по активному scope, Escape не закрывает два слоя сразу.
- [ ] **5. Повторить тест шага 2**, ожидается PASS. Закоммитить только перечисленные файлы/SVG после проверки diff: `feat: render interactive XP desktop chrome`.

### Task 3: Несколько живых приложений и защита проектов

**Files:** Modify `src/virtual-pc-ui.js` (`renderDesktop`, frame/content renderers, `openNow/open`, `requestProjectTransition`, close/leave/shutdown/reset/dispose); create `test/virtual-pc-multiwindow.test.js`; modify `test/virtual-pc-ui.test.js`, `test/virtual-pc-recovery.test.js`, `src/virtual-pc-catalog.js`.

**Interfaces:** Consumes Tasks 1–2. `pc.windows` хранит WindowState; `pc.shell` — mounted shell. Сохранить `mountVirtualPc` и имеющиеся callbacks/public lifecycle. `open(appId)`, `closeWindow(id=pc.windows.activeId)`, новый `windowAction(action)`, `syncHost({playerName,clockLabel})`, `refreshApp(appId,{replaceContent=false}={})`; `refreshApp` заменяет только содержимое явно изменённого приложения, динамические поля обновляет in-place. `renderUnderweb/renderTorent/renderStudio` возвращают контент без общей рамки. `desktopApps` использует iconId; documents — desktop-команда открытия computer на нужном пути, не отдельный экземпляр файлового менеджера.

- [ ] **1. Добавить failing-регрессии** `switching preserves studio draft and audio`, `reopening studio focuses existing form`, `hidden dirty studio guards shutdown`, `failed save does not execute pending shutdown`, `syncState retains torent controls and studio fader`, `shutdown clears windows but leave preserves them`. Пример проверок на настоящем controller c injected audio/storage:
  ```js
  controller.showDesktop(createVirtualPcState({power:'on',download:{status:'installed'}}));
  controller.open('ft-studio');
  controller.open('underweb');
  assert.equal(controller.windows.windows.length,2);
  assert.equal(controller.windows.activeId,'underweb');
  assert.equal(controller.confirmClose,false);
  ```
  Существующий тест, требующий save-guard при простой смене приложения, заменить на сохранность dirty/project и числа audio.stop; проверки закрытия и замены проекта не удалять.
- [ ] **2. Запустить** `node --test test/virtual-pc-multiwindow.test.js test/virtual-pc-ui.test.js test/virtual-pc-recovery.test.js`; новые проверки должны выявить одноконность до изменения production-кода.
- [ ] **3. Подключить shell к координатору.** Открытие/активация не переписывают project/address/form и не вызывают audio.stop; скрытые приложения продолжают получать нужные динамические обновления. Сохранять контент в DOM при minimize; `pc.render()` согласует рамки, а не `root.replaceChildren` на каждый tick. Clock updates вообще не вызывают renderStudio. Mixer input остаётся без замены node.
- [ ] **4. Перестроить guarded lifecycle.** Закрытие именно Studio/замена файла/уход/выключение защищают dirty и recovered draft независимо от activeId; закрытие Проводника не спрашивает о Studio. Перед guard восстановить Studio, блокировать фон, вернуть фокус после отмены. Stop сохраняется на музыкальных edits/save/подтверждённом close/leave/shutdown/reset; переключение/minimize его не вызывает. Shutdown очищает только окна, не проекты; leave оставляет окна сеанса. `boot/reset/dispose` освобождают shell/слушатели/capture, таймеры сохраняют исправленный Window receiver.
- [ ] **5. Повторить шаг 2**, дополнительно `node --test test/ft-studio-audio.test.js`; ожидается PASS. Commit scope только файлы задачи: `feat: preserve live apps across XP windows`.

### Task 4: Настоящее представление Проводника

**Files:** Create `src/virtual-pc-explorer.js`, `src/virtual-pc-explorer-view.js`, `test/virtual-pc-explorer.test.js`; modify computer renderer in `src/virtual-pc-ui.js`, `virtual-pc.css`, relevant paths in `test/virtual-pc-ui.test.js`, `test/virtual-pc-recovery.test.js`.

**Interfaces:** `createExplorerState(path='computer') → {path,history,index,selection:null,view:'icons',treeVisible:true,error:''}`; `navigateExplorer(state,{type,path?,id?,view?}) → state` with types `navigate|back|forward|up|select|view|toggle-tree`. Paths: `computer`, `disk`, `windows`, `documents`, `projects`; display/address maps to `Мой компьютер`, `C:\`, `C:\Windows`, `C:\Мои документы`, `C:\Мои документы\Мои проекты`. `explorerEntries(pcState,path) → [{id,kind:'disk'|'folder'|'project',name,iconId,targetPath?,projectId?,sizeMb?}]`; project ids prefixed `project:`. `explorerProperties(pcState,entry) → {title,rows:[{label,value}]}`. `mountExplorer(root,{onOpenProject,onProperties,onClose,onMenu}) → {navigate(path),update(pcState),dispose()}` owns navigation/view state and preserves unrelated input on update; `onMenu({items,x,y,anchor})` передаёт команды и callbacks в menu API Task 5, не создаёт второй слой меню. До Task 5 тесты захватывают этот payload через injected callback.

- [ ] **1. Записать failing-тесты** `history discards forward branch after new navigation`, `root disables up`, `invalid address preserves current folder`, `projects refresh after save without losing folder selection`, `malformed project shows local error`, `text names cannot inject markup`. Минимальная точная история:
  ```js
  let e = createExplorerState();
  e = navigateExplorer(e,{type:'navigate',path:'disk'});
  e = navigateExplorer(e,{type:'navigate',path:'documents'});
  e = navigateExplorer(e,{type:'back'});
  assert.equal(e.path,'disk');
  assert.equal(navigateExplorer(e,{type:'forward'}).path,'documents');
  assert.equal(explorerEntries(createVirtualPcState(),'projects').length,0);
  ```
- [ ] **2. Запустить** `node --test test/virtual-pc-explorer.test.js`; ожидается FAIL на новые интерфейсы.
- [ ] **3. Реализовать чистые пути/entries/properties**, без Node filesystem/URL fetch, через существующие diskUsage/projects и BATTLE_BRIEFS. Адреса обрабатывать как локальную whitelist с допустимыми slash/case-вариантами, неизвестные/внешние пути отклонять. Выбор исчезнувшего объекта снимать; обновлённый одноимённый объект распознавать по id. Пользовательские строки только через textContent.
- [ ] **4. Создать XP-Проводник** с меню из спецификации, рабочими back/forward/up, адресом, переключаемым деревом и icons/details, статусом «Объектов: 0», выделением и dblclick/Enter, контекстными действиями. В properties callback передавать immutable entry snapshot; проект открывать через controller.openProject, не обходя guard. Documents shortcut/Start переводят существующий экземпляр в documents. Обновлять данные при save/install/sync, не пересоздавать адресное поле во время ввода. System properties presentation подключается Task 5.
- [ ] **5. Повторить шаг 2 и тесты UI/recovery**, ожидается PASS; commit `feat: add XP Explorer for virtual files` только из этого scope.

### Task 5: Пуск, контекстные меню и системные диалоги

**Files:** Create `src/virtual-pc-menus.js`, `src/virtual-pc-system-windows.js`, `test/virtual-pc-system-windows.test.js`; modify `src/virtual-pc-shell.js`, `src/virtual-pc-ui.js`, `virtual-pc.css`.

**Interfaces:** `mountPcMenu(shell.getMenuRoot(),{onDismiss}) → {open({items,x,y,anchor}),close(),dispose()}`; MenuItem `{id,label,iconId?,disabled?,items?,onSelect?}`. Только одно главное меню открыто одновременно, submenu управляется внутри него. `mountSystemWindow(root,{kind,getState,onPersist,onOpen,onClose,onConfirmShutdown,properties?}) → {update(),dispose()}`; kinds `display|control-panel|properties|shutdown`. `onPersist(next)` возвращает durability boolean; data по прежним callbacks, `onOpen(kind)` направляет к единственному window id `system:<kind>`. `properties` использует rows Task 4 либо описание ярлыка. Для shutdown создать отдельный root через pcElement и передать его в shell.setModal, а не добавлять обычное taskbar-окно; после подтверждения закрыть его до проверки dirty Studio, не складывать два modal одновременно.

- [ ] **1. Записать failing-тесты** `display selection is preview only`, `apply then cancel retains applied wallpaper`, `OK commits and closes`, `failed storage displays session-only warning`, `outside click and Escape dismiss only menu`, `shutdown cancellation does not call host`, `modal restores initiating focus`. Точные ожидания:
  ```js
  assert.equal(state.wallpaper,'courtyard'); // после выбора factory в предпросмотре
  assert.equal(persisted.length,0);
  // После Применить, выбора room и Отмены:
  assert.equal(persisted.at(-1).wallpaper,'factory');
  assert.equal(closed,true);
  ```
  В тестах создавать mounted system window и посылать события реальным controls; state/persisted/closed — локальные captures переданных callbacks.
- [ ] **2. Запустить** `node --test test/virtual-pc-system-windows.test.js`; ожидается FAIL до реализации.
- [ ] **3. Реализовать меню**, viewport-clamp после измерения, keyboard arrows/Enter/Escape, Shift+F10 от anchor, focus return, события внутри не вызывают outside-close; disabled-пункты не активируются. Desktop: упорядочить, обновить, свойства; icon: открыть, свойства; Explorer: открытие/свойства и вид/обновить на фоне. Suppress native contextmenu только в области игрового shell.
- [ ] **4. Реализовать двухколоночный Пуск**, имя персонажа, приложения/Все программы, документы/компьютер/панель управления, отойти/выключение. Display содержит monitor preview, три WALLPAPERS, ОК/Отмена/Применить и никакого прежнего taskbar-picker. Control panel открывает display и свойства диска. Properties показывает реальные виртуальные данные; неподдерживаемые системные функции не добавлять. System windows остаются singleton и участвуют в геометрии shell; shutdown-dialog и project guard используют единый modal priority.
- [ ] **5. Повторить шаг 2 плюс multiwindow-тесты**, ожидается PASS. Commit `feat: add XP Start menus and desktop properties` с явными путями задачи.

### Task 6: Интеграция с квартирой, загрузка и совместимость

**Files:** Modify `src/apartment-app.js` (`openComputer`, new-game/reset, frame sync), `src/virtual-pc-ui.js` (boot UI), `index.html`, `virtual-pc.css`, `test/virtual-pc-integration.test.js`; add `test/virtual-pc-xp-entry.test.js`.

**Interfaces:** Task 3 `syncHost({playerName,clockLabel})`, существующие `profile.name`, `homeTime.label`. Вызывать перед boot/showDesktop и после изменения label/profile; проверка равенства внутри syncHost не пересоздаёт DOM. Единственный источник игрового времени по-прежнему `ApartmentTime`.

- [ ] **1. Записать failing-проверки:** `host metadata updates clock without touching inputs`, `new game resets icons and windows alongside PC`, `boot completes with Window receiver and XP chrome`, `entry loads versioned XP stylesheet and module`. `assert.equal(clock.textContent,'16:00'); assert.strictEqual(inputAfter,inputBefore); assert.deepEqual(resetState.desktopIcons,{});` с настоящим controller; в интеграции сохранить существующий sleep/download-тест. Новый entry test читать index/module через node:fs, не редактируя уже dirty `test/client-module-version.test.js`.
- [ ] **2. Запустить** `node --test test/virtual-pc-integration.test.js test/virtual-pc-xp-entry.test.js test/virtual-pc-recovery.test.js`; ожидается новый FAIL, затем исправление.
- [ ] **3. Подключить metadata и обновить boot.** Оставить последовательность 1100/1500/1900/1000 ms = 5500 ms и безопасные Web Audio tones; после текстовой самопроверки XP-подобный экран загрузки вместо Sloboda Desk 96. Не брать новые игровые таймеры, не менять посадку/камеру. Уход/возврат включённого PC сохраняет открытые окна; выключение и новая игра очищают окна в соответствии с Task 3.
- [ ] **4. Продвинуть cache revisions** активного HTML entry и изменённых импортов/CSS относительно фактической текущей версии (baseline entry rev=16); все новые URL локальны. `npm test` → 0 failures; UI-тесты адаптировать к согласованным новым взаимодействиям, не ослабляя recovery/storage/timer проверки. Прежний результат 344 — историческая база, не обещание нового количества.
- [ ] **5. Проверить diff, закоммитить только scope задачи:** `feat: integrate XP shell with apartment lifecycle`.

### Task 7: Реальный браузер, визуальная приёмка и передача

**Files:** Modify `tools/verify-virtual-pc-browser.mjs`; create `docs/superpowers/qa/2026-10-09-windows-xp-shell.md`; update верхние актуализации `docs/PROJECT_HANDOFF_2026-10-08.md`, `docs/superpowers/plans/2026-10-08-delivery-queue.md` и этот checklist. Screenshots: `artifacts/xp-shell-acceptance/`, без чужих артефактов.

**Interfaces:** Существующие env `PLAYWRIGHT_MODULE_PATH`, `PLAYWRIGHT_CHROMIUM_EXECUTABLE`, `PC_QA_URL`, `PC_QA_OUTPUT`. Приложения выбирать через `data-window-id` и accessible labels; не полагаться на единственное «Закрыть окно» во всём документе. Папки/ярлыки открывать dblclick, команды/меню — click.

- [ ] **1. Обновить браузерный сценарий** по 12 пунктам приёмки спецификации. Проверить blank desktop/Start/Explorer/display screenshots на обоих размерах, drag/resize/minimize/maximize, Enter/Shift+F10/Escape, apply/cancel обоев, время/имя, установку/проект/reload. Точные DOM-проверки: `assert.equal(await fader.evaluate(n=>n.isConnected),true)`, `assert.equal(await input.inputValue(),'Незавершённый ввод')` после переключения/тика; `assert.deepEqual(pageErrors,[])`; menu rect внутри viewport и window bottom≤height−32. В отдельном тестовом контексте принудительно отказать localStorage.setItem и проверить невозможность уйти через ошибку guarded-save.
- [ ] **2. Запустить с уже установленными инструментами** из PowerShell; пути сначала проверить `Test-Path`, без автоматической установки при отсутствии:
  ```powershell
  $env:PLAYWRIGHT_MODULE_PATH='D:\Codex\Caches\npm\_npx\48b1ca104c3549f4\node_modules\playwright-core'
  $env:PLAYWRIGHT_CHROMIUM_EXECUTABLE='D:\Codex\Caches\ms-playwright\chromium_headless_shell-1228\chrome-headless-shell-win64\chrome-headless-shell.exe'
  $env:PC_QA_OUTPUT='D:\Project\Battle\artifacts\xp-shell-acceptance'
  $pcQaScratch=New-Item -ItemType Directory -Path ('D:\Codex\Temp\battle-xp-'+[guid]::NewGuid().ToString('N'))
  $env:TEMP=$pcQaScratch.FullName
  $env:TMP=$pcQaScratch.FullName
  node tools/verify-virtual-pc-browser.mjs
  ```
  Использовать уже работающий 127.0.0.1:4173; при необходимости запускать hidden-сервер для этого checkout, не завершать чужие процессы. Только новый изолированный browser context, не профиль игрока. Ожидается exit=0 и PASS каждого маршрута; отсутствие инструмента записать как непроведённую проверку, не успех.
- [ ] **3. Просмотреть каждый полученный скриншот.** Проверить узнаваемость Luna, читаемость 13px на screenshot, настоящие графические иконки, две колонки Пуска, дерево/белую область Проводника, рамки и доступность taskbar. Исправить наблюдаемые дефекты и повторить затронутые тесты/снимки. Unit-проход не заменяет эту проверку, человеческое прослушивание колонок не заявлять по headless.
- [ ] **4. Выполнить** `npm test`, `git diff --check`, `git status --short`; записать фактические count/exit code и browser evidence в QA. Пройти Review Focus и сопоставить каждый пункт со своим тестом. Провести финальное независимое ревью согласно выбранному способу исполнения и применимому skill; исправить подтверждённые замечания с регрессиями. Не считать ревью пройденным по отсутствию ответа.
- [ ] **5. Закоммитить только browser script и перечисленные QA/docs:** `test: verify XP desktop in real browser`. Обновить чекбоксы завершённых шагов; не помечать недоступную браузерную проверку выполненной. Открыть пользователю новую revision локальной игры, кратко дать шаг «Продолжить → компьютер», приложить реальный скриншот результата и отметить оставшиеся ограничения.

## Self-review и разрешение на исполнение

Покрытие спецификации: desktop/gestures и windows → Tasks 1–3; Explorer → Task 4; Start/context/display → Task 5; audio/data guards → Task 3; metadata/boot/migration → Tasks 1, 6; visual/runtime acceptance → Task 7. Все пять Review Focus имеют именованные регрессии; interfaces согласованы по `WindowState`, `syncHost`, `mountExplorer` и `mountSystemWindow`.

Рекомендуемое исполнение: **Native** — один исполнитель в этом чате, задачи последовательно, затем независимое финальное ревью. Причина: семь задач тесно связаны общим DOM-контрактом и координатором; отдельный контекст на каждый маленький переход увеличит накладные расходы. Альтернатива **Subagent-driven** — отдельный исполнитель и ревью на каждую задачу, больше независимых проверок и затрат. Пользователь должен просмотреть этот план и выбрать способ до изменения кода.
