# Apartment Comfort Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Средний масштаб 2D, старт в 3D после сна, тихие одиночные шаги и подписанные полки.

**Architecture:** Change camera configuration/initial mode, never replace the scene. Footsteps have one distance-based event source. Fridge keeps its existing food model.

**Tech Stack:** Three.js, Web Audio, DOM/CSS, Node.js tests.

**Spec:** `docs/superpowers/specs/2026-10-12-sloboda-workflow-design.md`, apartment/camera section.

## Global Constraints

- Inherit `2026-10-12-sloboda-track-patch.md`.
- Initial 2D tuning:75% current coverage, `6.7*.75=5.025`; refine only with visual evidence, not different scenery.
- Sleep temporarily uses2D; restore selected mode after standing. New game selects3D.
- Freezer and three shelves, each three slots; infinite test food, +30 satiety and current ingredients unchanged.

## Review Focus

- Do not restore3D while still in bed/fade — D1.
- Explicit2D survives subsequent sleep — D1.
- First movement click never doubles the step — D2.
- Teleport/fade/pause/new game never emit accumulated bursts — D2.
- Visible shelf heading does not displace third food slot on narrow screens — D2.

## Task D1 Framing and waking

**Files:** modify `src/apartment-v3-camera.js`, `src/apartment-app.js`, where needed `src/apartment-v3-new-game.js`; tests `test/apartment-v3-camera-comfort.test.js`, `test/apartment-new-game.test.js`, `test/apartment-shared-scene.test.js`.

**Interfaces:** `CameraModes({initialMode='3D'}={})`, `reset({initialMode='3D'}={})`; sleepCamera retained, restoration only through onMotionState when safe. cameraPose signature unchanged, height5.025/distance8, same shared scene.

- [ ] Tests `new game wakes3D`, `explicit2D survives sleep`, `medium framing`: `assert.equal(new CameraModes().mode,'3D')`; started bed→2D, completed while returning/fading→still2D, standing→3D. FOV follows height5.025 formula; both modes retain same courtyard/static/live scene.
- [ ] Run `node --test test/apartment-v3-camera-comfort.test.js test/apartment-new-game.test.js test/apartment-shared-scene.test.js`; require RED.
- [ ] Implement default mode and intermediate coverage using current follow-band/clamp formula. Ensure initial3D assets are prepared before rendering; opening sleep temporarily uses2D. PC work transitions must not overwrite the sleep return mode. Keep explicit later player choice.
- [ ] Rerun to PASS; visually inspect bed/desk/kitchen, windows, adjacent room, small/wide screens and mode switches. Record before/after framing in QA; numeric correctness alone does not prove comfortable framing.
- [ ] Commit `fix: balance apartment framing and wake camera`.

## Task D2 Softer footsteps and shelf labels

**Files:** modify `src/indoor-footsteps.js`, `src/apartment-app.js`, `src/home-needs-view.js`, `apartment-v3.css`; create `src/footstep-cadence.js`, `test/footstep-cadence.test.js`; extend `test/indoor-footsteps.test.js`, `test/home-needs-view.test.js`.

**Interfaces:** `createFootstepCadence(stride)->{update({clip,walkDistance,paused}),reset()}`; update returns boolean for at most one event, never a backlog burst. playIndoorFootstep(context,variantIndex) unchanged. Fridge gains visible h3, retaining data-fridge-shelf/slot.

- [ ] Tests `no click sound`, `one half-stride event`, `reset no burst`: first walking sample=false; stride/2 crossing=true once; repeated distance=false; large jump at most one. Headings equal `['Морозилка','Полка 1','Полка 2','Полка 3']`, three actual slots per shelf.
- [ ] Run `node --test test/footstep-cadence.test.js test/indoor-footsteps.test.js test/home-needs-view.test.js`; require RED.
- [ ] Remove direct footstep cues from pointerdown/action clicks; use actual movement cadence only. Lower existing peak step gain at least threefold, reduce bass thump and soften envelope, keeping subtle variation with no new samples. Reset cadence on walk enter/exit/new game and paused gaps. Add shelf heading plus inner three-column slot grid so h3 is not a fourth slot.
- [ ] Rerun to PASS; listen to starting/stopping/turning/resuming, no footsteps during sleep/recording. Verify fridge keyboard focus, repeated consumption to100, +30/∞, third-slot visibility.
- [ ] Commit `fix: soften footsteps and label fridge shelves`.
