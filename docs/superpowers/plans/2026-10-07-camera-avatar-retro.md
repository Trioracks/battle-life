# Camera, wardrobe and retro interface implementation

> For agentic workers: use superpowers:subagent-driven-development. Execute continuously; the user approved all three tasks and explicitly asked not to return until done.

**Goal:** Deliver camera modes, distinctive customizable 3D avatar and an all-screen 8–16-bit interface in that order.
**Architecture:** Keep the existing Three.js / Blender v3 apartment and its single motion/time state. Add isolated camera policy, expand the existing skinned wardrobe, then share a retro render pass and pixel UI. Do not replace the apartment with a mockup or bitmap avatar.
**Tech stack:** Vendored Three.js, vanilla JS/CSS/HTML, Node test runner, Blender 4.5.9 with OPTIX.
**Spec:** Approved camera design at docs/superpowers/specs/2026-10-07-apartment-camera-modes-design.md; user-approved customization and Dendy UI requirements reproduced below.

## Global Constraints

- Execute tasks 1, 2, 3 in order. Preserve existing profile, gameplay, movement routes, working animations, sleep timing, lights and doors.
- All new renders, caches, builds and scratch belong on D:. Use existing D:/Project/Battle checkout and D:/Codex/Tools/Blender/blender-4.5.9-windows-x64/blender.exe. No dependencies or assets on C:.
- No push, merge, external publication, or unrelated cleanup. Keep unrelated user changes.
- Real 3D skinned character, same appearance in editor and apartment. No image substitution.
- Tests must exercise behavior/exported geometry rather than source-string matches. RED before production edits, focused GREEN, full npm test before reporting.
- Controller owns browser verification and independent review. Implementers do not dispatch agents.

### Task 1: Three apartment cameras

Files: add src/apartment-v3-camera.js and camera/picking tests; update src/apartment-v3-scene.js, src/apartment-app.js, index.html, apartment-v3.css; update tools/build-apartment-v3.py (focused helper scripts allowed), assets/apartment/v3/*, source apartment blend and export tests.

Read the camera spec. Deliver one button cycling 2D -> 2.5D -> first person -> 2D. Default 2D. Ortho 2D yaw 0/pitch 8 degrees; 2.5D yaw 8/pitch 8 degrees; same framing/follow. First-person perspective FOV60 near .03, eye height derived from neutral rig, independent remembered yaw/full rotation and pitch limited +/-70 degrees, no bob. RMB drag look only in first person, LMB pick objects/floor; prevent context menu only over first-person canvas. No pointer lock/WASD/free walking. Floor hits take only X for existing rail routes. Walls and closed doors occlude object picks.

Keep one shared actor/motion/time/light/door state. Use separate matching Blender baked side backdrops for all eight lighting states in each orthographic mode. Export real textured static geometry for first-person view; include front wall and ceiling with no holes, furniture and outside windows. Reuse moving meshes, never duplicate doors/chair/clock/fridge/cover/switches. Hide own actor and depth proxies/backdrops in first person. Lazy-load extra assets, cache, stay in previous mode on failure, expose retry; avoid parallel racing switches. Hide switching under a brief visual fade that does not advance game time.

Computer and sleep: approach in current mode, force 2D only during the existing opaque black phase before revealing seated/lying pose; remain 2D after. Cannot switch into first-person during seated/sleeping/transfers. Other standing interactions keep mode. Preview and peephole cameras isolated; return from peephole preserves mode.

1. Write and run failing policy/pose/picking/state-preservation tests.
2. Implement policy, input and scene integration; preserve existing controller responsibilities.
3. Build camera assets using Blender GPU; verify exported textures and real first-person geometry.
4. Run focused tests and full npm test. Report actual commands/results and asset sizes, plus how controller can exercise modes.

ReviewFocus: (1) cycle/load-failure doesn't change motion/time, (2) RMB never walks/LMB works after drag, (3) opaque-phase 2D switch for computer and bed, (4) hidden-wall and closed-door click blocking, (5) same furniture alignment and independent light/day state in all cameras. Browser gate additionally checks 360-degree view, both rooms and all interactions.

### Task 2: Character forms and wardrobe

Files: tools/build-mannequin-v3.py and focused avatar helper if useful; src/avatar-v3-profile.js; creator controls in src/apartment-app.js; assets/apartment/v3/mannequin.glb and source blend; avatar profile/rig/geometry tests. Minimal functional controls first; pixel redesign belongs to Task 3. Preserve camera work.

Eight hairstyles: bald, "Озеро в лесу" short hair around open crown, shaved 3 mm textured buzzcut, existing short crop, side-part with short sides and strong sideways fringe, bowl, uneven tousled layered hair, neck-length "Длинный шегги". Hair references at D:/Codex/Temp/codex-clipboard-ddb719d1-7c6d-44f0-9043-12668c7121f6.png (side part), 11eb72d0-f157-4cc4-8010-54028da7a0ce.png (bowl), b116b291-c55c-40f3-a3dd-4fabaa379bf5.png (messy), 785dd859-c67f-4fb5-b555-77e5ef683382.png (long shag; all share codex-clipboard- prefix). Inspect them. Current old shaggy is bowl-like: preserve saved silhouette by migrating old shaggy to bowl, add new messy and longshag IDs. Preserve short crop.

Three faces remain oval/square/long but give genuinely different jaw/chin/cheek/nose/proportions, not only hidden skull. Fit hair/facial hair to face. Beards none + stubble, short full, broad full, goatee, jawline/chinstrap. Mustaches none + pencil, chevron, walrus, curled/handlebar, horseshoe. Independent selections with consistent hair tone and joined geometry without overlap plates. Preserve old full/classic saves through explicit aliases as needed. References Philips beard styles and Truefitt & Hill moustache shapes are approved; implement stylized geometry, not downloaded faces.

Tops: tee, shirt (preserve), hoodie with substantial hood, knitted thick high-neck sweater, tank top, thin turtleneck. Real clothing silhouettes, no painted torso or shoulder caps. Bottoms: wide jeans, skinny jeans, breeches, shorts, sports pants. Sports have two fixed white stripes each outer side and fixed 'sport' on left thigh. Footwear: sneakers, canvas trainers, tall boots, preserve sandals and flipflops; distinct soles/silhouettes. All tops/bottoms/footwear have separate palette selections: white, grey, black, red, yellow, green, blue, light blue, olive/dirty green, beige, brown. Fixed trims/soles/lettering stay unaffected. Colors save/load and match editor/game. Match current accepted skinned body's gait, stance, sleep and chair poses.

1. Add/run failing catalog round-trip/migration/color tests and exported geometry tests naming visible differences/clothing limits.
2. Implement catalog and safe normalization; rebuild head/hair/facial hair and clothing meshes/material tint channels with current bones/weights.
3. Export GLB and source blend; ensure no missing meshes, floating shoulders, duplicate pelvis/seat blobs or collar-only tees. Old cached scene colors must not override newly selected colors.
4. Add functional selections/colors and preview support for rotation/zone framing consumed by Task 3. Run focused and full tests; report geometry/compatibility inspection.

ReviewFocus: (1) clear bald crown vs buzz texture vs crop, (2) face silhouette differences below eyes, (3) beard/mustache combos with each face, (4) skin/soles/stripes not recolored, (5) round-trip old/new saved appearance matches apartment and creator. Controller visually checks all hairstyles, three faces, representative clothes and animations.

### Task 3: Pixel interface and shared PS1 visual treatment

Files: index.html, apartment-v3.css, creator UI JS (extract focused src/apartment-v3-creator.js if needed), shared src/apartment-v3-retro.js, scene integration, local licensed pixel font assets and license, UI/render tests. Do not regress cameras or customization.

All screens must feel like an 8–16-bit Dendy game: pixel Cyrillic typeface, crisp square frames, selected states, pixel-scale icons/arrows, layered dark panels with restrained warm accents. Include menu, creator/stats, HUD/actions, doors/peephole/destinations, dialogs, loading/error feedback and inspector. No rounded web-dashboard controls or system select dropdowns as primary appearance UI. Text remains readable and focus states accessible; responsive layout without clipped controls.

Creator: large live character; category tabs/cards for face/hair/beards/mustaches/tops/bottoms/shoes; labeled swatches; front/side/back/left buttons plus drag rotation and zoom/selected-body-zone framing. Name/stats/start controls remain comprehensible; preserve ten-point stats and validation. Show meaningful current selection and palette. Render full-body option available after head/foot focus. Retain separate preview camera.

World and hero: colored PS1/Felvidek-inspired pass using low internal resolution, nearest-neighbor presentation, stepped tones, ordered dithering and moderate grain. Apply consistently to 3D actor, background, first-person geometry and preview; preserve clearly distinguishable clothing colors. UI text sits above the low-res pass and stays sharp. Keep Soviet mood, not medieval assets. No excessive flicker or blur. Respect reduced motion by stabilizing grain. First-person cursor/picking must remain correct after resizing/downsampling.

1. Add/run failing render-policy/selection/accessible-control behavior tests.
2. Add local licensed Cyrillic pixel font; implement shared render pass and output sizing.
3. Rebuild all-screen CSS and creator cards/swatches/rotation/zoom, keeping existing data/state controllers.
4. Test responsive/selection/rerender behavior, full npm test. Report font provenance/license, render sizes and all screen coverage.

ReviewFocus: (1) every existing game screen uses pixel interface, (2) readable Cyrillic/name/stats/errors at narrow sizes, (3) category and swatches persist with correct colors, (4) same world/hero dithering in all modes, (5) input coordinates and frame rate after pixel scaling. Controller performs real browser screenshots and final all-stage regression, then independent whole-change review.
