# Playable World Clarity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the first four days of Battle Life visually legible and playable without hidden controls.

**Architecture:** Keep campaign state and all economy rules in the existing pure ES modules. Add narrow presentation metadata for apartment actions, map locations and desktop jobs; render those from `src/main.js` with a full-screen mode switch for desktop and a full-screen illustrated map. The Three.js scene owns actor poses, room geometry, hover outlines and action progress; DOM owns creator, desktop and map accessibility.

**Tech Stack:** HTML, CSS, vanilla ES modules, Three.js 0.170, Node built-in test runner.

**Spec:** `docs/superpowers/specs/2026-09-10-playable-world-clarity-design.md`

## Global Constraints

- Work only in `D:\Project\Battle` and keep third-party caches on `D:`.
- Preserve current pure module APIs unless their tests are updated in the same task.
- Never generate or display track lyrics.
- Run `npm test` before each commit and push each accepted task to `git@github.com:Trioracks/battle-life.git`.

---

### Task 1: Reliable launch and presenter-friendly campaign data

**Files:**
- Create: `Запустить игру.cmd`
- Modify: `README.md`, `src/game-state.js`, `test/game-state.test.js`

**Interfaces:**
- Produces `getInventorySummary(campaign): { ingredients: number, cookedMeals: number, dirtyDishes: number }`.
- Produces a click-to-run launcher that opens `http://localhost:4173`.

- [ ] Write failing tests for a stable inventory summary and ensure they fail.
- [ ] Implement the summary without mutating campaign data.
- [ ] Add a launcher using the locally available Python runtime, serving `D:\Project\Battle` and opening the local URL.
- [ ] Update README so direct `file://` opening is explicitly unsupported and the launcher is the first instruction.
- [ ] Run focused tests, then `npm test`; inspect the launcher contents; commit `feat: add reliable game launcher` and push.

### Task 2: Body-zone character creator

**Files:**
- Modify: `index.html`, `style.css`, `src/creator.js`, `src/main.js`, `test/creator.test.js`

**Interfaces:**
- `createRapper` accepts `look: { hair, face, top, pants }` and no longer persists `cap`.
- `cycleLookPart(look, part, direction)` returns a valid immutable look for `hair`, `face`, `top`, or `pants`.

- [ ] Write failing tests for face persistence, cycling a part and absence of cap.
- [ ] Implement the pure creator functions and update default look.
- [ ] Replace selector-only appearance UI with avatar preview zones and labelled arrow buttons.
- [ ] Extend avatar rendering with facial-hair meshes and live preview updates.
- [ ] Run tests and browser smoke for all four body zones; commit `feat: add body-zone character creator` and push.

### Task 3: Clear apartment plan and hover contracts

**Files:**
- Modify: `src/apartment-actions.js`, `src/main.js`, `style.css`, `test/apartment-actions.test.js`

**Interfaces:**
- Every apartment action includes `tooltip`, `minutes`, `targetX`, `animation`, `cue`, and `requiresEnergy`.
- `describeApartmentAction(action, needs)` returns display text and availability without three.js dependencies.

- [ ] Write failing tests for tooltip text, action duration and low-energy explanation.
- [ ] Implement action description metadata.
- [ ] Rebuild room geometry into living area, divider and kitchen; add recognizable bed, fridge, stove, sink and table.
- [ ] Add industrial window backdrop with red apartment blocks and factory lights.
- [ ] Add per-object highlight and screen-positioned tooltip on pointer move; ensure object identity, not x-position, determines the action.
- [ ] Run tests and manually hover each object; commit `feat: clarify apartment interactions` and push.

### Task 4: Observed actions and compact HUD

**Files:**
- Modify: `index.html`, `style.css`, `src/main.js`, `src/household.js`, `test/household.test.js`

**Interfaces:**
- `presentActionProgress(action, elapsed, duration)` returns clamped progress data for renderer/UI.
- Household action result reports inventory after the action.

- [ ] Write failing tests for clamped progress and each household result inventory.
- [ ] Implement the pure progress helper and expose food values in action results.
- [ ] Move time/activity, cash/rent, needs and contextual prompt to non-obstructive HUD positions.
- [ ] Implement actor-bound progress bubble, accelerated clock and end bubble for actions of 30+ minutes.
- [ ] Give sleep a lying pose plus fade; give cooking and washing distinct poses at their own stations.
- [ ] Run tests and smoke sleep, cooking, dishwashing and eating; commit `feat: show actions and household state` and push.

### Task 5: Full-screen PC with observable long actions

**Files:**
- Modify: `index.html`, `style.css`, `src/desktop-apps.js`, `src/main.js`, `test/desktop-apps.test.js`

**Interfaces:**
- Desktop app id `battles` has label `Рэп-Сеть`.
- `getDesktopAction(id)` returns duration, apartment animation target and result view for long PC actions.

- [ ] Write failing tests for the renamed app and archive-study action metadata.
- [ ] Implement the metadata and preserve existing app ids.
- [ ] Replace inset desktop with a full-game workbench/boot screen and visible desktop icons.
- [ ] Animate sitting, boot and return; route archive study through observed typing with clock advance and actor bubble.
- [ ] Add explicit money, debt, delivery and inventory information to Market and Bills views.
- [ ] Run tests and smoke PC boot, archive study, market and bills; commit `feat: add immersive computer workflow` and push.

### Task 6: Transparent track workflow and microphone handoff

**Files:**
- Modify: `src/track-project.js`, `src/tournament.js`, `src/main.js`, `style.css`, `test/track-project.test.js`, `test/tournament.test.js`

**Interfaces:**
- `getTrackStepStatus(campaign)` returns each visible step, duration, availability and reason.
- Recording is only completed through a microphone-apartment action when beat selection is ready.

- [ ] Write failing tests for step availability and blocked recording before a selected beat.
- [ ] Implement status computation without generating text.
- [ ] Render a seven-step checklist in «Рэп-Сети», each with time and blocked explanation.
- [ ] Route `record` to the apartment microphone, then return to the track workflow with stage `recorded`.
- [ ] Run tests and manually complete a full track; commit `feat: clarify track production workflow` and push.

### Task 7: Illustrated map, locations and jobs

**Files:**
- Modify: `src/calikfornia.js`, `src/jobs.js`, `src/main.js`, `style.css`, `test/calikfornia.test.js`, `test/jobs.test.js`

**Interfaces:**
- `getDistrictLocations(districtId)` returns visible location descriptors.
- `startLocationAction(campaign, locationId)` returns either a travel result or a completed shop/work result.

- [ ] Write failing tests for locations in North Sloboda, Docklands and East Factory and their action routes.
- [ ] Implement pure district-location data and state routing.
- [ ] Replace card grid with an illustrated semantic map; district hover shows name, travel duration and destination details.
- [ ] Add selectable supermarket, dock warehouse and construction work points, each with a visible consequence.
- [ ] Run tests and browser smoke for travel, shop and both jobs; commit `feat: add interactive Calikfornia map` and push.

### Task 8: Regression scenario and final polish

**Files:**
- Modify: `test/four-day-scenario.test.js`, `docs/qa/2026-09-10-four-day-smoke.md`, `README.md`

**Interfaces:**
- The scenario starts from a body-zone-created MC and reaches submitted track through visible actions.

- [ ] Extend the existing scenario to cover registration, archive study, delivery, cooking, a map job, recording at the microphone and submission.
- [ ] Write/adjust the manual smoke checklist for creator, apartment, PC and map.
- [ ] Run `npm test` from a clean start and use a fresh browser campaign to complete the first four days.
- [ ] Inspect `git diff --check`, commit `test: cover clear first-four-day gameplay` and push.
