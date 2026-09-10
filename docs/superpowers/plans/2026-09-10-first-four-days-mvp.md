# Battle Life — First Four Days MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a playable, saved four-day opening in which a created rapper can register for MAKAREWITCH VI, live in the apartment, take a job, make and submit a first track, and receive selection feedback.

**Architecture:** The existing Three.js apartment remains the navigable world. Pure simulation modules own campaign state, time, needs, production, tournament judging, work and map data; DOM overlays render the HUD, desktop, phone and Game Dev Tycoon-style decision windows. `main.js` only connects clicks, animation state and UI actions to that simulation.

**Tech Stack:** Vanilla ES modules, Three.js CDN, browser localStorage, Node built-in test runner.

**Spec:** `docs/game-design/2026-09-09-battle-life-living-design.md`; `docs/game-design/2026-09-09-track-production-design.md`.

## Global Constraints

- The world is animated and free navigation costs no game time.
- Only confirmed actions advance game time; every action displays its duration.
- Start date is 17 September, starting cash is 5,000 ₽ and next rent is 1 October for 3,500 ₽.
- The first tournament is MAKAREWITCH VI; application closes on 20 September and selection is not a forced victory.
- Every implementation task uses red-green tests, full regression, a browser visual check, one commit and one push.
- No actual lyrics are generated or displayed; the player selects creative direction and receives project cards.

---

### Task 1: Campaign state, calendar, needs and persistence

**Files:**
- Create: `src/game-state.js`, `test/game-state.test.js`
- Modify: `index.html`, `style.css`, `src/main.js`

**Interfaces:**
- Produces `createCampaign()`, `advanceCampaign(state, action)`, `saveCampaign(state)`, `loadCampaign()`.
- `advanceCampaign` accepts `{ id, minutes, effects }` and returns a new state plus daily-save marker.

- [ ] Write red tests for start values, duration-based hunger/energy changes, day rollover and rental reminder.
- [ ] Run `npm test -- test/game-state.test.js` and observe missing-module failure.
- [ ] Implement immutable state transitions and localStorage adapter.
- [ ] Run focused and complete tests.
- [ ] Render a fixed HUD with time, cash, four needs and selected activity.
- [ ] Visually check the HUD in the browser, commit and push `feat: add campaign state and HUD`.

### Task 2: Creator and visual avatar

**Files:**
- Create: `src/creator.js`, `test/creator.test.js`
- Modify: `index.html`, `style.css`, `src/main.js`

**Interfaces:**
- Produces `createRapper({ name, nickname, allocations, look })` and `validateAllocations(allocations)`.
- Consumes campaign state to write player identity and nine skills.

- [ ] Test the ten +10 allocation budget, 50 creator cap and a valid avatar payload.
- [ ] Implement creation validation and modal UI.
- [ ] Feed hair/top/pants/cap choices into the existing Three.js character builder.
- [ ] Verify test suite and creator visually, commit and push `feat: add rapper creator`.

### Task 3: Apartment interaction director

**Files:**
- Create: `src/apartment-actions.js`, `test/apartment-actions.test.js`, `src/sound-cues.js`
- Modify: `src/main.js`, `index.html`, `style.css`

**Interfaces:**
- Produces action definitions for computer, fridge, stove, sink, bed, microphone and door.
- Each definition exposes `label`, `minutes`, `needs`, `animation` and an optional completion result.

- [ ] Test action availability and duration; verify that walking is not an action.
- [ ] Add clickable visual objects and approach → loop → cleanup animation states.
- [ ] Add replaceable silent/generated Web Audio placeholders by named cue keys.
- [ ] Verify computer, food, dish, bed, microphone and door actions manually; run tests; commit and push `feat: add animated apartment actions`.

### Task 4: Immersive computer desktop and phone

**Files:**
- Create: `src/desktop-apps.js`, `test/desktop-apps.test.js`, `src/phone-notifications.js`, `test/phone-notifications.test.js`
- Modify: `index.html`, `style.css`, `src/main.js`

**Interfaces:**
- Produces desktop app ids `battles`, `jobs`, `market`, `bills` and `phone.enqueue(message)`.
- Consumes game state and produces declarative views; no app advances time by opening.

- [ ] Test desktop routing and FIFO notification queue.
- [ ] Add camera/overlay transition from seated computer to desktop with icons.
- [ ] Add left-side phone panel for messages and score notifications.
- [ ] Verify flows, run regression, commit and push `feat: add computer desktop and phone`.

### Task 5: Map, travel, shop and a starter job

**Files:**
- Create: `src/calikfornia.js`, `test/calikfornia.test.js`, `src/jobs.js`, `test/jobs.test.js`
- Modify: `index.html`, `style.css`, `src/main.js`

**Interfaces:**
- Produces seven named district records, `travelTo(state, districtId)` and `completeShift(state, jobId)`.
- Consumes campaign state; returns time, cash and need changes.

- [ ] Test travel duration, one available shop and cash payment after a legal shift.
- [ ] Implement map overlay, travel confirmation and one accessible store plus warehouse/construction/cashier job cards.
- [ ] Ensure unavailable energy blocks heavy shift start with an explanation.
- [ ] Verify map interaction and tests; commit and push `feat: add Calikfornia travel and jobs`.

### Task 6: Food, cooking, dishes, sleep and cleanliness

**Files:**
- Create: `src/household.js`, `test/household.test.js`
- Modify: `src/main.js`, `index.html`, `style.css`

**Interfaces:**
- Produces `buyFood`, `cookMeal`, `eatMeal`, `washDishes`, `sleep` and `cleanHome`.
- Consumes inventory and campaign state, returning state plus a human-readable result.

- [ ] Test food purchase, one stored cooked portion, dish accumulation, 15-minute washing and chosen-duration sleep.
- [ ] Implement one store basket, fridge inventory and action windows.
- [ ] Animate cooking, eating, washing and sleeping with blackout/wake transition.
- [ ] Verify full household loop and tests; commit and push `feat: add household survival loop`.

### Task 7: MAKAREWITCH VI registration and research

**Files:**
- Create: `src/tournament.js`, `test/tournament.test.js`
- Modify: `src/main.js`, `index.html`, `style.css`

**Interfaces:**
- Produces tournament data, `registerForTournament`, `researchTournament` and `canSubmit`.
- Research unlocks a visible first hint, `лиричный фокус`, and takes time.

- [ ] Test registration, deadline rejection after 20 September and first research reveal.
- [ ] Implement BattleNet/Makarewitch application page with public description, archive comments and research action.
- [ ] Verify registration and research in desktop; commit and push `feat: add Makarewitch registration and research`.

### Task 8: Track production and submission

**Files:**
- Create: `src/track-project.js`, `test/track-project.test.js`
- Modify: `src/main.js`, `index.html`, `style.css`

**Interfaces:**
- Produces `startDraft`, `polishDraft`, `rewriteDraft`, `chooseBeat`, `recordTrack`, `mixTrack`, `masterTrack`, `submitTrack`.
- Track quality stays hidden; only a confidence estimate is exposed.

- [ ] Test valid order, duration cost, incremental polish and blocked submission without a recording.
- [ ] Implement the compact creative brief, five-position focus slider, optional research checkbox and step cards.
- [ ] Add microphone recording animation and final submit confirmation.
- [ ] Verify a complete 17–20 September submission path; commit and push `feat: add track production and submission`.

### Task 9: Selection scoring, judges and notifications

**Files:**
- Create: `src/selection.js`, `test/selection.test.js`
- Modify: `src/main.js`, `index.html`, `style.css`

**Interfaces:**
- Produces `scoreSelection(track, tournament, judges)` with three 1–10 scores, comments and a hidden pass threshold.
- Consumes submitted track state; never forces a passing result.

- [ ] Test a coherent starter track can narrowly pass, an incomplete or badly mismatched track can fail, and scores stay bounded 1–10.
- [ ] Implement delayed judge notices through the phone queue and a selection result screen.
- [ ] Verify two contrasting test campaigns; commit and push `feat: add Makarewitch selection results`.

### Task 10: Four-day scenario, regression and polish

**Files:**
- Create: `test/four-day-scenario.test.js`, `docs/qa/2026-09-10-four-day-smoke.md`
- Modify: `README.md`, `index.html`, `style.css`, `src/main.js`

**Interfaces:**
- Scenario creates a rapper, registers, researches, buys/cooks food, works, produces and submits before deadline.

- [ ] Write scenario test first and observe failure while a required flow is disconnected.
- [ ] Join all UI pathways, seed first-day food and provide contextual guidance without forced actions.
- [ ] Run `npm test`, browser smoke test and a design-doc checklist.
- [ ] Document exact manual smoke path, commit and push `feat: deliver first four playable days`.

## Review checklist

- Every ten requested capability has a corresponding task above.
- The plan intentionally keeps full social systems, services, complex illness, piracy risks and offline rounds outside the first-four-day vertical slice.
- The plan contains no unfinished markers or vague implementation instructions.
