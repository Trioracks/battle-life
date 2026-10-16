# Rendered Cutaway Apartment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the prototype apartment with a Blender-rendered, gloomy 2.5D cutaway and a genuinely rigged, configurable 3D hero whose appearance, movement, and actions agree in game.

**Architecture:** A Blender scene exports fixed-camera background, foreground, and object-state layers plus a JSON interaction manifest. The browser composes those layers around a Three.js avatar rig; pure modules validate the package and map gameplay actions to a single body orientation, clip, placement, and fade sequence. Existing campaign rules remain the source of truth for time, needs, and action results.

**Tech Stack:** Blender 4.5 background rendering and glTF export; WebP/PNG scene layers; Three.js 0.170 browser renderer; native ES modules; Node `node:test`.

**Spec:** `docs/superpowers/specs/2026-10-05-rendered-cutaway-apartment-design.md`

## Global Constraints

- Use one fixed orthographic 2.5D camera; do not add a free or isometric camera.
- The apartment must be a stylized, gloomy late-Soviet/post-Soviet evening cutaway, not a glossy studio, photoreal room, or the current low-poly blockout.
- `assets/source/apartment-cutaway-v2.blend` is the visual source of truth. The browser must not recreate the room from primitive boxes.
- The hero is one rigged Blender model with exactly one head and torso, two arms, and two legs; no PNG/sprite fallback and no independently-facing head layer.
- Direction mapping is fixed: front for creator/neutral display, profile-right for rightward travel, back for fixture work, profile-left for leftward travel.
- Computer, microphone, and bed use a short fade-out → state swap → fade-in. Kitchen work and door opening remain visibly staged.
- If the v2 art package fails validation or loading, show a localized retryable error; never reveal the retired blockout as a fallback.
- Preserve current campaign save semantics, economy, action durations, and Russian UI copy unless this plan explicitly changes presentation.
- Put generated Blender renders, caches, and temporary media on `D:`; do not create bulky artifacts on `C:`.

## Review Focus

1. A stale/malformed manifest or a missing image must stop loading with a Russian retryable error, not yield a partial room — covered in Task 1 and Task 4 tests.
2. A click on a large rendered prop must resolve its intended action rather than its neighbouring prop or empty floor — covered in Task 1 interaction-rectangle tests and Task 6 browser check.
3. A hero moving left/right must turn head, torso, arms, and legs together into the matching profile, including after a fade — covered in Task 3 acceptance renders and Task 5 presentation tests.
4. New and pre-v2 saved campaigns must retain a normalized look and still reach the apartment — covered in Task 5 migration tests and Task 7 browser check.
5. Small and wide viewports must preserve foreground masking and usable interaction controls without stretching the cutaway — covered in Task 4 layout-contract tests and Task 7 visual check.

## File Structure

| Path | Responsibility |
| --- | --- |
| `assets/source/apartment-cutaway-v2.blend` | Fixed-camera art source for the apartment layers and interaction markers. |
| `assets/apartment/v2/manifest.json` | Versioned cutaway dimensions, rendered assets, state layers, normalized hit zones, approaches, facings, poses and transitions. |
| `assets/apartment/v2/*.webp` | Background and foreground render layers; never hand-built geometry. |
| `assets/source/avatar-rig-v2.blend` | One hero mesh/armature, swappable appearance and all required clips. |
| `assets/models/avatar-v2*.glb` and `assets/models/avatar-v2.manifest.json` | Browser avatar and animation bank with an inspectable export contract. |
| `tools/build-apartment-cutaway-v2.py` | Repeatable Blender build/export for apartment source and v2 layers. |
| `tools/build-avatar-rig-v2.py` | Repeatable Blender build/export for v2 hero source, GLBs and contract. |
| `tools/render-apartment-cutaway-v2.ps1`, `tools/render-avatar-v2-acceptance.ps1` | Deterministic human-review render commands, outputting only under `D:\Project\Battle\artifacts`. |
| `src/apartment-art-manifest.js` | Parse/validate/load the art package and expose immutable typed records. |
| `src/cutaway-layer-contract.js` | Pure layer order, state selection, viewport sizing and hit-test helpers. |
| `src/rendered-apartment-scene.js` | Three.js image planes, prop hit meshes and foreground placement. |
| `src/avatar-presentation.js` | Pure whole-body direction/clip/placement mapping for idle, walk, work, seat and sleep. |
| `src/apartment-art-error.js` | Localized, retryable user-facing message for art-package failures. |
| `src/avatar-rig.js` | Load the v2 GLB rig, apply selected appearance and play presentation clips. |
| `src/apartment-staging.js` | Read staging exclusively from manifest records rather than hard-coded blockout coordinates. |
| `src/action-transitions.js` | Reuse existing phase machine, including desktop and bed fades. |
| `src/main.js` | Wire loaded v2 scene and rig into current campaign/action lifecycle; remove blockout construction from the active path. |
| `index.html`, `style.css` | Restrained dark shell, v2 loading/error surface, creator preview and HUD presentation. |
| `test/apartment-art-manifest.test.js` | Manifest and interaction package contract. |
| `test/cutaway-layer-contract.test.js` | Layer-state/viewport/hit-test contract. |
| `test/avatar-presentation.test.js` | Four whole-body orientations and pose/clip selections. |
| `test/avatar-v2-package.test.js` | Exported v2 avatar contract and asset presence. |

### Task 1: Define and validate the rendered-apartment package

**Files:**
- Create: `src/apartment-art-manifest.js`
- Create: `assets/apartment/v2/manifest.json`
- Create: `test/apartment-art-manifest.test.js`
- Modify: `test/apartment-staging.test.js`

**Interfaces:**
- Produces `validateApartmentArtManifest(raw) -> { valid: boolean, value?: ApartmentArtManifest, errors: string[] }`.
- Produces `loadApartmentArtManifest(url, fetchImpl = fetch) -> Promise<ApartmentArtManifest>`; rejects with `ApartmentArtLoadError` containing a Russian user message.
- Produces `getManifestInteraction(manifest, actionId) -> ApartmentInteraction | null`.
- `ApartmentInteraction` has `id`, `hitRect`, `approach`, `facing`, `pose`, `transition`, `room`, and optional `sceneState`.

- [ ] **Step 1: Write failing manifest-contract tests**

Add tests that accept the real `schemaVersion: 2`, `1920 × 1080` manifest only when it has mandatory `background`, `foreground`, `states`, and all seven interactions (`computer`, `microphone`, `bed`, `fridge`, `stove`, `sink`, `door`). Assert that `computer` and `microphone` use `desk-fade`/`seated`, `bed` uses `bed-fade`/`sleep`, kitchen fixtures use `back`/`work`, and `door` has a profile-facing open state. Add malformed-manifest and rejected-fetch assertions for a localized `ApartmentArtLoadError`.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test test/apartment-art-manifest.test.js`

Expected: FAIL because `apartment-art-manifest.js` and the v2 manifest do not exist.

- [ ] **Step 3: Implement manifest parsing and the authored data**

Implement the three exported functions in `src/apartment-art-manifest.js`. Freeze validated nested records, reject duplicate interaction IDs, rectangles outside `[0, 1]`, unknown facing/pose/transition values, absent foreground/state references, and non-finite approach values. Create the manifest with canonical 1920×1080 coordinates, the layer filenames from Task 2, and the exact staging values specified above. Refactor `getInteractionStaging(manifest, actionId)` to delegate to its passed validated manifest and never retain retired scene coordinates.

- [ ] **Step 4: Run focused and related tests**

Run: `node --test test/apartment-art-manifest.test.js test/apartment-staging.test.js`

Expected: PASS; the fixture verifies distinct prop zones and no hard-coded blockout staging contract.

- [ ] **Step 5: Commit the package contract**

```bash
git add assets/apartment/v2/manifest.json src/apartment-art-manifest.js src/apartment-staging.js test/apartment-art-manifest.test.js test/apartment-staging.test.js
git commit -m "feat: define rendered apartment package"
```

### Task 2: Build the evening cutaway from Blender and export its layers

**Files:**
- Create: `tools/build-apartment-cutaway-v2.py`
- Create: `assets/source/apartment-cutaway-v2.blend`
- Create: `assets/apartment/v2/background.webp`
- Create: `assets/apartment/v2/foreground.webp`
- Create: `assets/apartment/v2/states/door-open.webp`
- Create: `assets/apartment/v2/states/desk-seated.webp`
- Create: `assets/apartment/v2/states/bed-occupied.webp`
- Create: `tools/render-apartment-cutaway-v2.ps1`
- Create: `test/rendered-cutaway-package.test.js`

**Interfaces:**
- Consumes the Task 1 manifest paths and dimensions.
- Produces files named by `manifest.layers` and `manifest.states`; all use the canonical 1920×1080 camera frame.
- `tools/render-apartment-cutaway-v2.ps1` renders `artifacts/apartment-v2-wide.png` from the source blend and exits nonzero when Blender or the output fails.

- [ ] **Step 1: Write the failing exported-package test**

Write a filesystem test that loads the validated manifest and asserts every declared v2 layer exists, is non-empty, and only declares state names `door-open`, `desk-seated`, and `bed-occupied`. Assert the source path and acceptance-render script are present. The test must not accept `apartment-first-location.glb` as a v2 art asset.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test test/rendered-cutaway-package.test.js`

Expected: FAIL because no v2 Blender source or rendered layer package exists.

- [ ] **Step 3: Implement the repeatable Blender scene builder and export**

Write `tools/build-apartment-cutaway-v2.py` to construct/save `apartment-cutaway-v2.blend` with its locked orthographic camera and the four required collections. Use authored material variation, baked/painted wear and fixed lighting to form the approved composition: checker-tile kitchen at left, white tile floor, worn green living-room walls, blue night window, readable doors, bed, CRT desk, modest microphone, fridge/sink/stove. Render opaque background, transparent foreground, and each named object-state layer at 1920×1080. Keep the hero out of every apartment layer. Add the PowerShell renderer that targets `D:\Project\Battle\artifacts` and validates the output.

- [ ] **Step 4: Run package test and render an acceptance frame**

Run: `node --test test/rendered-cutaway-package.test.js`

Expected: PASS.

Run: `powershell -ExecutionPolicy Bypass -File tools/render-apartment-cutaway-v2.ps1`

Expected: exits 0 and creates `D:\Project\Battle\artifacts\apartment-v2-wide.png`.

- [ ] **Step 5: Inspect the acceptance frame and commit the source package**

Inspect `artifacts/apartment-v2-wide.png` at full size: both rooms and both doors must read without a hero; no studio gloss or photo-real treatment. Commit only source, exporter, manifest-referenced web layers, test and renderer script; do not commit `artifacts/`.

```bash
git add assets/source/apartment-cutaway-v2.blend assets/apartment/v2 tools/build-apartment-cutaway-v2.py tools/render-apartment-cutaway-v2.ps1 test/rendered-cutaway-package.test.js
git commit -m "feat: add rendered Soviet apartment cutaway"
```

### Task 3: Produce the v2 hero rig and its four verified visual directions

**Files:**
- Create: `tools/build-avatar-rig-v2.py`
- Create: `assets/source/avatar-rig-v2.blend`
- Create: `assets/models/avatar-v2.glb`
- Create: `assets/models/avatar-v2-animations.glb`
- Create: `assets/models/avatar-v2.manifest.json`
- Create: `tools/render-avatar-v2-acceptance.ps1`
- Create: `test/avatar-v2-package.test.js`

**Interfaces:**
- Produces a v2 export manifest with `representation: "skinned-three-rig"`, `armature: true`, part IDs `head`, `torso`, `arm-left`, `arm-right`, `leg-left`, `leg-right`, and clips `idle`, `walk`, `work-back`, `seated-idle`, `keyboard`, `record`, `sleep`, `door-reach`.
- The GLB rig supports appearance values already normalized by `creator.js`: hair, top, pants and footwear.
- Acceptance renderer creates `front.png`, `right-profile.png`, `back.png`, `left-profile.png`, `walk-left.png`, `walk-right.png`, `desk-seated.png`, `sink-work.png`, and `bed-pose.png` below `D:\Project\Battle\artifacts\avatar-v2-acceptance`.

- [ ] **Step 1: Write the failing v2 rig-package test**

Assert that the exported manifest exists, identifies a skinned armature rather than a sprite, lists exactly one head/torso and two arms/two legs, exposes all eight clips, and has variants for every `LOOK_OPTIONS` value. Assert its source and acceptance script exist and that it does not point to the retired `avatar.glb` files.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test test/avatar-v2-package.test.js`

Expected: FAIL because the v2 rig package does not exist.

- [ ] **Step 3: Build/export one physically coherent Blender hero**

Implement the Blender builder so it creates one armature-bound body (not independent billboards): head and torso share the skeleton with both complete arms and legs. Author the front, right, back and left silhouettes through root rotation, not overlaying alternative faces. Make the `walk` action move arms and legs forward/back in opposing horizontal stride; make `work-back` face fixtures; make seated and sleep poses use the same body. Export model and clips plus the manifest. Add the acceptance renderer with explicit expected filenames.

- [ ] **Step 4: Verify package and render the nine review frames**

Run: `node --test test/avatar-v2-package.test.js`

Expected: PASS.

Run: `powershell -ExecutionPolicy Bypass -File tools/render-avatar-v2-acceptance.ps1`

Expected: exits 0 and creates all nine acceptance images under `D:\Project\Battle\artifacts\avatar-v2-acceptance`.

- [ ] **Step 5: Inspect animation frames and commit v2 hero assets**

Inspect left/right walk frames for a single consistent profile from head to feet; inspect back work for two intact limbs without visible face; inspect desktop and sleep placement. Commit source, GLBs, manifest, builder, renderer and test, excluding generated renders.

```bash
git add assets/source/avatar-rig-v2.blend assets/models/avatar-v2.glb assets/models/avatar-v2-animations.glb assets/models/avatar-v2.manifest.json tools/build-avatar-rig-v2.py tools/render-avatar-v2-acceptance.ps1 test/avatar-v2-package.test.js
git commit -m "feat: add coherent v2 avatar rig"
```

### Task 4: Compose rendered layers and interaction targets in Three.js

**Files:**
- Create: `src/cutaway-layer-contract.js`
- Create: `src/rendered-apartment-scene.js`
- Create: `test/cutaway-layer-contract.test.js`
- Modify: `index.html`

**Interfaces:**
- `resolveCutawayLayers(manifest, sceneState) -> readonly LayerDescriptor[]` returns `background`, relevant state overlays, then `foreground`.
- `cutawayWorldLayout(manifest) -> { width, height, heroZ, foregroundZ }` preserves the canonical aspect ratio across viewport sizes.
- `interactionAtNormalizedPoint(manifest, { x, y }) -> string | null` chooses the smallest containing prop zone; floor clicks return `null`.
- `loadRenderedApartment({ scene, manifestUrl, assetBaseUrl }) -> Promise<{ root, hitAreas, highlights, setSceneState(state), dispose() }>` rejects with `ApartmentArtLoadError`; it does not import `apartment-first-location.glb`.

- [ ] **Step 1: Write failing layer, hit-test and viewport tests**

Assert base ordering as background → foreground; assert `desk-seated` and `bed-occupied` insert only their declared state layers before foreground; assert the foreground z-plane is in front of `heroZ`. Test overlapping click zones return the smaller precise zone, missing zones return floor, and both a 4:3 and an ultrawide calculated viewport preserve the manifest aspect ratio.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test test/cutaway-layer-contract.test.js`

Expected: FAIL because the pure layer contract does not exist.

- [ ] **Step 3: Implement pure contract and Three.js layer renderer**

Implement `cutaway-layer-contract.js` without DOM/Three.js dependencies. In `rendered-apartment-scene.js`, use `TextureLoader` and transparent `PlaneGeometry` layers from the manifest, build invisible hit meshes from normalized rectangles, keep highlight meshes inside the root, expose state changes and release textures/materials in `dispose`. Add the import map/cache version required for the v2 module only; do not create visual room geometry in JavaScript.

- [ ] **Step 4: Run the focused test**

Run: `node --test test/cutaway-layer-contract.test.js`

Expected: PASS; tests prove the resulting wide/small viewport math and precise action resolution.

- [ ] **Step 5: Commit compositing primitives**

```bash
git add src/cutaway-layer-contract.js src/rendered-apartment-scene.js test/cutaway-layer-contract.test.js index.html
git commit -m "feat: compose rendered apartment layers"
```

### Task 5: Map every actor state to a whole-body presentation

**Files:**
- Create: `src/avatar-presentation.js`
- Create: `test/avatar-presentation.test.js`
- Modify: `src/avatar-rig.js`
- Modify: `src/apartment-orientation.js`
- Modify: `src/action-transitions.js`
- Modify: `test/action-transitions.test.js`

**Interfaces:**
- `presentationFor({ direction, mode }) -> { yaw, clip, pose, showBody: boolean }` accepts modes `creator`, `idle`, `walk`, `work`, `seated`, `keyboard`, `record`, `sleep`, and `door`.
- `presentationFor({ direction: 1, mode: "walk" })` maps to profile-right/`walk`; `direction: -1` maps to profile-left/`walk`; work maps to back/`work-back`; creator maps to front/`idle`.
- `loadAvatarRig()` defaults to the v2 GLBs and returns `setPresentation(presentation)` in addition to `setLook()` and `update()`.
- `actionUsesDeskSeat(actionId)` returns true for both `computer` and `microphone`.

- [ ] **Step 1: Write failing full-body presentation and fade tests**

Test all four canonical yaw outputs and clip names. Assert no presentation selects separate face/head data. Add transition assertions that computer and microphone both pass `fade-out`, `swap-pose`, `fade-in` before `perform`, bed does the same, and kitchen work never chooses a seated pose.

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `node --test test/avatar-presentation.test.js test/action-transitions.test.js`

Expected: FAIL because presentation mapping is absent and computer is not yet classified as a desk seat.

- [ ] **Step 3: Implement unified visual orientation and v2 rig playback**

Create the pure presentation map using only root yaw and named rig clips. Remove `avatarFacingForYaw`/billboard logic from the active hero path and make `avatar-rig.js` load `avatar-v2.glb` plus its animation bank. Apply all appearance changes through named v2 meshes/materials; when a requested legacy saved option is encountered, use `normalizeLook()` first. Update transition selection so the three specified state swaps always use the same fade contract.

- [ ] **Step 4: Run focused and dependent tests**

Run: `node --test test/avatar-presentation.test.js test/action-transitions.test.js test/creator.test.js test/avatar-v2-package.test.js`

Expected: PASS; legacy appearance values normalize and every action picks one whole-body configuration.

- [ ] **Step 5: Commit presentation and rig integration**

```bash
git add src/avatar-presentation.js src/avatar-rig.js src/apartment-orientation.js src/action-transitions.js test/avatar-presentation.test.js test/action-transitions.test.js
git commit -m "feat: map avatar states to coherent body poses"
```

### Task 6: Replace the live blockout with the rendered scene and staged interactions

**Files:**
- Modify: `src/main.js`
- Modify: `src/apartment-staging.js`
- Modify: `src/click-intent.js`
- Modify: `src/apartment-actions.js`
- Modify: `src/sound-cues.js`
- Modify: `test/apartment-staging.test.js`
- Modify: `test/click-intent.test.js`

**Interfaces:**
- Consumes `loadRenderedApartment()`, `loadAvatarRig()`, `presentationFor()`, and Task 1 manifest interactions.
- Produces an active runtime where `setSceneState()` is called only during its declared fade swap, and where hero placement comes from the relevant `approach` record.
- `clickIntent()` continues to return `walk`, `computer`, or `apartment-action`; hit inputs are manifest action IDs rather than old GLB anchors.

- [ ] **Step 1: Write failing interaction-flow tests**

Extend tests to assert: a click in each declared v2 prop zone chooses its action; a walk click remains a walk; computer/microphone switch to `desk-seated` only during the fade swap; bed switches to `bed-occupied`; sink/stove/fridge select back-facing work; and a door goes through a visible profile reach before changing room/exit state.

- [ ] **Step 2: Run the focused test suite to verify it fails**

Run: `node --test test/apartment-staging.test.js test/click-intent.test.js test/action-transitions.test.js`

Expected: FAIL because live interaction state is still tied to the old blockout and GLB anchors.

- [ ] **Step 3: Integrate v2 scene without a visual fallback**

Replace `addRoom()` and `replaceBlockoutWithAuthoredApartment()` in the active boot path with a single async v2 load sequence. Add the rendered layer root and the v2 hero rig, map raycast hits to manifest IDs, and update runtime position/yaw/clip via `presentationFor()`. On a state swap, hide the standing hero briefly, set the declared scene state and pose, then fade back. Play a short chair scrape during desktop swaps and keep existing household/game results. Remove retired primitive-room construction, legacy avatar-silhouette manipulation, and old GLB anchors from the active path.

- [ ] **Step 4: Run full automated tests**

Run: `npm test`

Expected: PASS with all existing campaign tests plus the v2 interaction-flow tests.

- [ ] **Step 5: Commit playable cutaway integration**

```bash
git add src/main.js src/apartment-staging.js src/click-intent.js src/apartment-actions.js src/sound-cues.js test/apartment-staging.test.js test/click-intent.test.js test/action-transitions.test.js
git commit -m "feat: run apartment actions in rendered cutaway"
```

### Task 7: Bring menu, creator and error presentation into the v2 visual language

**Files:**
- Create: `src/apartment-art-error.js`
- Modify: `index.html`
- Modify: `style.css`
- Modify: `src/main.js`
- Modify: `src/creator.js`
- Modify: `test/creator.test.js`
- Modify: `test/start-screen.test.js`
- Create: `test/apartment-art-error.test.js`

**Interfaces:**
- The existing creator emits `normalizeLook()` values consumed by the v2 rig and uses the same v2 `loadAvatarRig()` preview.
- `formatApartmentArtError(error) -> { title, message, retryLabel }` in `src/apartment-art-error.js` supplies Russian copy to the DOM when `ApartmentArtLoadError` occurs.
- Existing start actions remain `new` and `continue` from `startScreenState()`.

- [ ] **Step 1: Write failing creator/save/error presentation tests**

Extend creator tests to round-trip every top, pants and footwear option through `createRapper()`/`normalizeLook()` without producing an unsupported v2 look. Add start-screen assertions that a fresh campaign starts creation and a saved player exposes continue. Add `test/apartment-art-error.test.js` to pin the exact Russian retry copy returned by `formatApartmentArtError()`.

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `node --test test/creator.test.js test/start-screen.test.js test/apartment-art-error.test.js`

Expected: FAIL for the missing v2 error/persistence contract.

- [ ] **Step 3: Implement the restrained UI restyle**

Keep the menu → new game → creator → apartment flow, but restyle its shell, creator frame, action dock and loader/error state around dark charcoal-green panels, warm muted yellow accents and readable Russian type. Ensure the creator canvas renders the same v2 rig, not `createCharacter()` geometry. The HUD must remain compact and never obscure the hero or the door. The retry button reloads only the v2 scene package; it cannot opt into a prototype-room fallback.

- [ ] **Step 4: Run focused tests and inspect responsive layouts**

Run: `node --test test/creator.test.js test/start-screen.test.js test/apartment-art-error.test.js test/client-module-version.test.js`

Expected: PASS.

Manually inspect a 1280×720 and 2560×1080 browser: cutaway remains letterboxed rather than stretched; creator controls are usable; error/retry copy is fully readable.

- [ ] **Step 5: Commit the visual shell**

```bash
git add index.html style.css src/main.js src/creator.js src/apartment-art-error.js test/creator.test.js test/start-screen.test.js test/apartment-art-error.test.js
git commit -m "feat: align shell and creator with cutaway art"
```

### Task 8: Perform visual acceptance and document the delivery

**Files:**
- Modify: `README.md`
- Create: `docs/qa/2026-10-05-rendered-cutaway-acceptance.md`
- Modify: `tools/render-apartment-cutaway-v2.ps1`
- Modify: `tools/render-avatar-v2-acceptance.ps1`

**Interfaces:**
- Acceptance document records the required visual frames, browser actions, expected pose/state, and exact commands.
- README names the v2 Blender sources, rebuild commands, and the fact that artifacts stay untracked.

- [ ] **Step 1: Write the failing documentation/acceptance check**

Add `test/rendered-cutaway-package.test.js` assertions that the README names both v2 Blender source files and that the acceptance document lists all nine hero frames plus all seven interactions. This pins the support path for anyone rebuilding the assets.

- [ ] **Step 2: Run the focused check to verify it fails**

Run: `node --test test/rendered-cutaway-package.test.js`

Expected: FAIL because v2 maintenance and acceptance instructions have not been documented.

- [ ] **Step 3: Write acceptance instructions and capture evidence**

Document the rebuild/render commands, state that generated `artifacts/` are untracked, and record pass criteria for the wide apartment frame, four directions, left/right gait, desktop/mic, kitchen work, sleep and both doors. Execute Blender acceptance renderers and browser checks on a clean new-game save and a pre-v2 saved campaign. Save review images only under `D:\Project\Battle\artifacts`.

- [ ] **Step 4: Run final verification**

Run: `npm test`

Expected: PASS.

Run: `powershell -ExecutionPolicy Bypass -File tools/render-apartment-cutaway-v2.ps1; powershell -ExecutionPolicy Bypass -File tools/render-avatar-v2-acceptance.ps1`

Expected: both commands exit 0 and regenerate the documented acceptance frames.

- [ ] **Step 5: Commit documentation, then request a visual review**

```bash
git add README.md docs/qa/2026-10-05-rendered-cutaway-acceptance.md tools/render-apartment-cutaway-v2.ps1 tools/render-avatar-v2-acceptance.ps1 test/rendered-cutaway-package.test.js
git commit -m "docs: add rendered cutaway acceptance guide"
```

Open the game and show the wide apartment frame plus the four hero directions to the user before calling the visual replacement complete.
