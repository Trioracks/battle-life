# First Playable 2.5D Apartment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the first playable Battle Life loop: start menu, customisable hero, a dark 2.5D apartment, click navigation, doors, and readable household interactions.

**Architecture:** Preserve the existing browser/Three.js game rules and local campaign storage. Move apartment presentation into focused scene, rig, staging, and entry-flow modules; Blender supplies the authored environment and avatar assets, while browser data supplies click zones, approach points, fade transitions, and action state.

**Tech Stack:** Browser ES modules, Three.js r170 from jsDelivr, Blender 4.5.9, glTF/GLB, Node.js built-in test runner, CSS.

**Spec:** `docs/superpowers/specs/2026-10-05-apartment-2p5d-production-design.md`

## Global Constraints

- The camera is orthographic 2.5D; no free camera or physics-based room navigation.
- The first production slice changes only the apartment interior, its hero, and the start/create flow.
- The scene is authored mid-poly and bleak post-Soviet, not photorealistic or densely decorated.
- Interactive logic uses hit areas, blockers, approach points, facing, and action poses; mesh precision never defines gameplay.
- The avatar is one rig with a single head, torso, two arms, and two legs; one root rotation determines head and body direction.
- Desk seating and sleep use a short fade-to-black staging transition; no physical stool-drag animation is made.
- Existing campaign rules, household effects, calendar, and old saved campaigns remain compatible.
- Every task runs focused tests before the whole `npm test`; existing unrelated working-tree edits are preserved.

## Review Focus

- A campaign saved before footwear existed must load with a safe default shoe choice — Task 1.
- Pressing New Game must not leave the old player, inventory, or clock visible — Task 2.
- A side-facing avatar must not reveal an anfas face, duplicate arm, or a third shoulder during walk — Tasks 4 and 6.
- Clicking a decorative mesh or the blocked side of furniture must not start an action — Task 5.
- Input and desktop UI must remain unavailable throughout the desk/sleep fade, then recover exactly once after fade-in — Task 6.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `src/creator.js` | Appearance option catalogue, labels, normalisation, saved-look migration, and creator data creation. |
| `src/start-screen.js` | Pure start-menu state: new campaign vs. available continuation. |
| `src/apartment-staging.js` | Pure action-to-approach/facing/fade presentation map. |
| `src/action-transitions.js` | Timed visible/fade phases after approach. |
| `src/apartment-scene.js` | Load and place authored apartment GLB, doors, click zones, blockers, and highlights. |
| `src/avatar-rig.js` | Load avatar GLB, apply appearance materials/visibility, select and blend safe animation clips. |
| `src/main.js` | Compose entry flow, scene, rig, click intent, action phases, fade overlay, and current game systems. |
| `index.html`, `style.css` | Start-screen DOM, creator controls, fade overlay, and responsive presentation. |
| `assets/source/*.blend` | Editable Blender source scenes for apartment and avatar. |
| `assets/models/*.glb` | Browser runtime exports only. |
| `tools/render-first-apartment.ps1` | Reproducible Blender still render for visual acceptance. |
| `test/*.test.js` | Node tests for new pure modules and existing-flow regressions. |

### Task 1: Persist the expanded visual customisation

**Files:**
- Modify: `src/creator.js`
- Modify: `src/game-state.js`
- Modify: `test/creator.test.js`
- Modify: `test/game-state.test.js`

**Interfaces:**
- Produces `normalizeLook(look): { hair, face, top, pants, footwear }` and `appearanceGeometry(look): { top, legStyle, footwear, lowerLegsVisible, facialHair }`.
- Produces `createRapper({ name, nickname?, allocations, look })` with a fallback nickname equal to `name`.
- Consumes old campaign `player.look` values with no `footwear` field.

- [ ] **Step 1: Write the failing creator tests for the complete initial catalogue**

```js
assert.deepEqual(normalizeLook({ top: 'sweater', pants: 'breeches', footwear: 'boots' }), {
  hair: 'bald', face: 'clean', top: 'sweater', pants: 'breeches', footwear: 'boots',
});
assert.equal(cycleLookPart({ ...base, footwear: 'sandals' }, 'footwear', 1).footwear, 'sneakers');
```

- [ ] **Step 2: Add a failing migration test for a saved four-part look**

```js
assert.deepEqual(normalizeLook({ hair: 'crop', face: 'clean', top: 'hoodie', pants: 'cargo' }).footwear, 'sneakers');
```

- [ ] **Step 3: Run the focused tests to verify failure**

Run: `npm test -- --test-name-pattern="creator"`

Expected: FAIL because `footwear`, `sweater`, and the required bottoms do not exist.

- [ ] **Step 4: Implement the five-part look catalogue in `src/creator.js`**

Use exactly: tops `tee`, `hoodie`, `sweater`; bottoms `shorts`, `breeches`, `sports`, `cargo`, `trousers`; footwear `sandals`, `sneakers`, `canvas`, `shoes`, `boots`. Keep former `jacket` and `jeans` saves mapped to safe supported values rather than rejecting them.

- [ ] **Step 5: Allow a blank nickname to inherit the required name**

Retain all existing stat validation. `createRapper` must still reject a blank name.

- [ ] **Step 6: Run focused tests and the full unit suite**

Run: `npm test`

Expected: PASS.

- [ ] **Step 7: Commit the appearance-data change**

```bash
git add src/creator.js src/game-state.js test/creator.test.js test/game-state.test.js
git commit -m "feat: expand playable avatar customisation"
```

### Task 2: Add a real start screen and route New Game through creation

**Files:**
- Create: `src/start-screen.js`
- Create: `test/start-screen.test.js`
- Modify: `index.html`
- Modify: `style.css`
- Modify: `src/main.js`

**Interfaces:**
- Produces `startScreenState(campaign): { canContinue: boolean, primaryAction: 'new' | 'continue' }`.
- Produces `newGameState(): Campaign` by delegating to existing `createCampaign()`.
- Consumes the existing campaign save only after the player selects Continue.

- [ ] **Step 1: Write failing unit tests for absent and present player saves**

```js
assert.deepEqual(startScreenState(createCampaign()), { canContinue: false, primaryAction: 'new' });
assert.equal(startScreenState({ ...createCampaign(), player: { name: 'Миша' } }).canContinue, true);
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `node --test test/start-screen.test.js`

Expected: FAIL because `src/start-screen.js` does not exist.

- [ ] **Step 3: Implement `src/start-screen.js` and pass focused tests**

Keep it DOM-free. Do not alter storage directly in this module.

- [ ] **Step 4: Add the start screen and a New Game action in `index.html`/`style.css`**

The screen has New Game always and Continue only when `canContinue` is true. New Game replaces the in-memory campaign with `createCampaign()`, persists it, resets creator state, and opens the creator. Continue leaves both campaign and actor appearance untouched.

- [ ] **Step 5: Update `src/main.js` to gate the apartment until a player is confirmed**

The apartment renderer and click handler remain paused behind the start/create UI. On confirmed creator submit, close the UI, apply the selected look to the runtime actor, and show the living-room spawn.

- [ ] **Step 6: Manually verify both routes at `http://localhost:4173`**

Expected: a fresh New Game shows creation; Continue returns the saved hero to the apartment; reloading retains the selected clothing and shoes.

- [ ] **Step 7: Run `npm test` and commit**

```bash
git add index.html style.css src/start-screen.js src/main.js test/start-screen.test.js
git commit -m "feat: add new game entry flow"
```

### Task 3: Author and export the sparse first-apartment Blender scene

**Files:**
- Create: `assets/source/apartment-first-location.blend`
- Create: `assets/models/apartment-first-location.glb`
- Create: `assets/models/apartment-first-location.manifest.json`
- Create: `tools/render-first-apartment.ps1`

**Interfaces:**
- Produces GLB roots named `architecture`, `kitchen`, `living`, `interior-door`, `entry-door`, `desk`, `bed`, `sink`, `stove`, `fridge`, `computer`, `desktop-mic`, and `chair`.
- Consumes `assets/source/apartment-first-location.blend` and renders `artifacts/first-apartment-seat.png` without editing game state.

- [ ] **Step 1: Create the Blender source using the named collections from the spec**

Build only two rooms and their 12–15 large meshes. Use the approved side cutaway: kitchen left with white floor tile and large black/off-white wall cells; green worn living room right; open foreground lane; full-height doors; desk/stool/CRT/microphone as separate named meshes.

- [ ] **Step 2: Create a seat-pose still in Blender and inspect it**

Use an avatar stand-in in the source scene only to confirm the chair is behind the desk and that the foreground route remains clear. Do not add decorative clutter to conceal intersections.

- [ ] **Step 3: Export `apartment-first-location.glb` and the mesh manifest**

Apply transforms, keep materials compact, and omit hidden reference geometry. The manifest lists each exported root plus its local interaction anchor name.

- [ ] **Step 4: Create `tools/render-first-apartment.ps1`**

It invokes `D:\Codex\Tools\Blender\blender-4.5.9-windows-x64\blender.exe` headlessly with the scene and writes a fixed 16:9 PNG under `artifacts/`.

- [ ] **Step 5: Render and verify the apartment asset**

Run: `powershell -ExecutionPolicy Bypass -File tools/render-first-apartment.ps1`

Expected: exit code 0 and a dark, sparse 2.5D apartment still with a readable free floor lane.

- [ ] **Step 6: Commit only the apartment source, export, manifest, and renderer**

```bash
git add assets/source/apartment-first-location.blend assets/models/apartment-first-location.glb assets/models/apartment-first-location.manifest.json tools/render-first-apartment.ps1
git commit -m "feat: add authored first apartment asset"
```

### Task 4: Author a single avatar rig and the reusable animation library

**Files:**
- Create: `assets/source/avatar-rig.blend`
- Create: `assets/models/avatar.glb`
- Create: `assets/models/avatar-animations.glb`
- Create: `assets/models/avatar.manifest.json`
- Create: `tools/render-avatar-acceptance.ps1`

**Interfaces:**
- Produces one skinned mesh and one armature with clips `idle`, `walk`, `sit`, `desk-idle`, `kitchen-work`, `lie-down`, and `door-reach`.
- Produces material slots `hair`, `top`, `pants`, `footwear`, `skin` and named optional meshes for hood, shorts calves, sandals, boots, and facial hair.
- Consumes the look normalisation values from Task 1.

- [ ] **Step 1: Build the low/mid-poly avatar as one Blender armature**

Use one head, torso, pair of arms, and pair of legs. Keep the silhouette blocky enough for the orthographic camera; do not model duplicate profile parts as separate characters.

- [ ] **Step 2: Add material/mesh variants for every Task 1 appearance option**

The top, pants, and shoe variants must toggle without changing skeleton topology. Sandals expose toes/foot shape; shorts and breeches expose the correct lower-leg amount.

- [ ] **Step 3: Key the seven reusable clips and render acceptance angles**

For `walk`, ensure counter-swinging limbs travel along the local forward axis. Render front, back, left-profile, right-profile, desk-seated, sink-work, and bed poses. The side renders must show a matching side head and torso, not a front face on a profile body.

- [ ] **Step 4: Export the static rig, animation GLB, and manifest**

The manifest maps each browser look value and required clip to its exported material, node, or animation name.

- [ ] **Step 5: Run the headless avatar render check**

Run: `powershell -ExecutionPolicy Bypass -File tools/render-avatar-acceptance.ps1`

Expected: all required pose PNGs are produced; no pose has a missing leg, duplicate face, duplicate shoulder, or inverted arm.

- [ ] **Step 6: Commit the avatar assets and renderer**

```bash
git add assets/source/avatar-rig.blend assets/models/avatar.glb assets/models/avatar-animations.glb assets/models/avatar.manifest.json tools/render-avatar-acceptance.ps1
git commit -m "feat: add avatar rig and core clips"
```

### Task 5: Make the apartment layout data own click zones, routes, and action staging

**Files:**
- Create: `src/apartment-staging.js`
- Create: `test/apartment-staging.test.js`
- Modify: `src/apartment-layout.js`
- Modify: `src/apartment-actions.js`
- Modify: `test/apartment-layout.test.js`
- Modify: `test/apartment-actions.test.js`

**Interfaces:**
- Produces `getInteractionStaging(id): { approach, facing, blocker, transition }`.
- Produces `isWalkTargetAllowed(point, blockers): boolean`.
- `transition` is `visible`, `desk-fade`, or `bed-fade`; desk actions are `computer` and `microphone`.

- [ ] **Step 1: Write failing staging tests for every interactive object**

```js
assert.equal(getInteractionStaging('computer').transition, 'desk-fade');
assert.equal(getInteractionStaging('bed').transition, 'bed-fade');
assert.equal(getInteractionStaging('sink').facing, 'back');
assert.equal(isWalkTargetAllowed({ x: 4.9, z: 0 }, deskBlockers), false);
```

- [ ] **Step 2: Run focused staging tests and confirm they fail**

Run: `node --test test/apartment-staging.test.js`

Expected: FAIL because the staging module does not exist.

- [ ] **Step 3: Implement the interaction data and align current action target positions**

Approach points must correspond to the Task 3 manifest. Visible objects use oversized hit areas; action starts only after the actor reaches the appropriate allowed point. Kitchen objects map to back-facing work; doors map to profile/reach.

- [ ] **Step 4: Update existing layout/action tests and pass the focused suite**

Run: `node --test test/apartment-staging.test.js test/apartment-layout.test.js test/apartment-actions.test.js`

Expected: PASS.

- [ ] **Step 5: Commit the staging data**

```bash
git add src/apartment-staging.js src/apartment-layout.js src/apartment-actions.js test/apartment-staging.test.js test/apartment-layout.test.js test/apartment-actions.test.js
git commit -m "feat: define apartment interaction staging"
```

### Task 6: Replace primitive apartment presentation with authored assets and safe transitions

**Files:**
- Create: `src/apartment-scene.js`
- Create: `src/avatar-rig.js`
- Modify: `src/action-transitions.js`
- Modify: `src/animation-timing.js`
- Modify: `src/sound-cues.js`
- Modify: `src/main.js`
- Modify: `index.html`
- Modify: `style.css`
- Modify: `test/action-transitions.test.js`
- Modify: `test/animation-timing.test.js`
- Modify: `test/sound-cues.test.js`

**Interfaces:**
- `loadApartmentScene({ scene, manifestUrl }): Promise<ApartmentScene>` returns named mesh references, hit areas, door panels, highlights, and blockers.
- `loadAvatarRig({ scene, avatarUrl, animationUrl, look }): Promise<AvatarRig>` returns `setLook(look)`, `setFacing(facing)`, `play(clip)`, and `update(delta)`.
- `createActionTransition({ actionId, fromRoom, toRoom, transition }): Transition` adds `fade-out`, `swap-pose`, and `fade-in` only for desk and bed transitions.

- [ ] **Step 1: Write failing transition and cue tests**

```js
assert.deepEqual(transitionPhaseAt(deskTransition, 1.29).id, 'fade-out');
assert.deepEqual(transitionPhaseAt(deskTransition, 1.50).id, 'swap-pose');
assert.equal(getSoundCue('chair-scrape').id, 'chair-scrape');
```

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `node --test test/action-transitions.test.js test/sound-cues.test.js`

Expected: FAIL because fade phases and the chair cue are absent.

- [ ] **Step 3: Implement the pure fade timing and chair-scrape cue**

Use 160–220 ms fade-out/fade-in durations, block input across both fades and pose swap, and consume no game time before the selected action begins.

- [ ] **Step 4: Implement GLB loading in the focused scene and rig modules**

Use `GLTFLoader` matching Three r170. Scene module creates only invisible hit areas/blockers in code; it does not recreate decorative furniture primitives. Rig module selects manifest clip names and applies Task 1 choices without duplicating body parts.

- [ ] **Step 5: Wire modules into `main.js` and remove superseded primitive builders**

Keep current game-rule imports and HUD intact. Replace manual apartment mesh assembly and manual limb rotations with scene/rig APIs. During fade swap, place the hero behind the stool or on the bed and only then expose the respective action UI.

- [ ] **Step 6: Add start/fade markup and CSS**

The opaque fade overlay sits above WebGL but below modal/desktop UI. It never leaves a stuck black screen if an action is unavailable, cancelled, or completes.

- [ ] **Step 7: Verify focused and full tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 8: Manually exercise browser interactions**

Open the game and verify click walk in both directions, room crossing, door panels, computer seat fade, microphone record fade, sink, stove, fridge, bed fade, and exit door. Check that the avatar has both legs and the correct head/body direction in every captured state.

- [ ] **Step 9: Commit the runtime integration**

```bash
git add src/apartment-scene.js src/avatar-rig.js src/action-transitions.js src/animation-timing.js src/sound-cues.js src/main.js index.html style.css test/action-transitions.test.js test/animation-timing.test.js test/sound-cues.test.js
git commit -m "feat: ship playable 2.5d apartment"
```

### Task 7: Capture acceptance renders and run the first-playthrough regression

**Files:**
- Create: `docs/qa/2026-10-05-first-apartment-acceptance.md`
- Modify: `README.md`
- Modify: `test/four-day-scenario.test.js` only if a save migration requires it

**Interfaces:**
- Produces a QA document linking the seven required visual captures and the exact browser verification route.
- Consumes the production Blender renders from Tasks 3–4 and the playable browser slice from Task 6.

- [ ] **Step 1: Write the acceptance checklist before capture**

Include the seven visual states specified in the design: both walking profiles, front/back, desk seating/recording, kitchen work, sleep, doors, and the whole apartment with unobstructed foreground lane.

- [ ] **Step 2: Run a clean-save first playthrough**

New Game → name/look → apartment → computer → microphone → kitchen → sleep → entry door. Record any input block, bad layer order, duplicate limb, or wrong facing as a failure.

- [ ] **Step 3: Run an old-save migration playthrough**

Load a fixture without footwear, confirm a default shoe choice is applied, then run the same apartment interactions.

- [ ] **Step 4: Run all automated tests**

Run: `npm test`

Expected: PASS with all existing tests and new migration/staging/transition tests included.

- [ ] **Step 5: Update launch instructions and commit QA evidence**

```bash
git add docs/qa/2026-10-05-first-apartment-acceptance.md README.md test/four-day-scenario.test.js
git commit -m "docs: record first apartment acceptance"
```

## Plan Self-Review

- **Spec coverage:** Tasks 1–2 cover the menu and creator; Tasks 3–4 cover Blender sources and rendered production assets; Task 5 owns interaction data; Task 6 owns camera, input, actions, doors, fades, and runtime rig; Task 7 owns the required acceptance captures and migration check.
- **Type consistency:** `normalizeLook` is the sole look migration boundary; `getInteractionStaging` is the sole visual-action boundary; `loadApartmentScene` and `loadAvatarRig` are the runtime asset boundaries consumed only by `main.js`.
- **Review focus coverage:** Task 1 tests old-look fallback, Task 2 tests new-campaign reset, Task 4 acceptance renders test profile anatomy, Task 5 tests blocker clicks, and Task 6 tests fade/input state.
- **Scope:** City, maps, wider economy, new music mechanics, free 3D movement, and furniture physics remain excluded.
