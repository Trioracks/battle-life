# Queued overhaul — acceptance evidence

## Baseline

- Local rollback commit: `4ca1862` (accepted apartment v8).
- `npm test`: 222 passed, 0 failed before implementation.
- Browser: saved profile `324` present. Continued into living room; returned to menu to pause time.
- Screenshot: `artifacts/v3/queue-baseline-v8.png`.

## Camera browser matrix (verified 2026-10-07)

Task commit `d4d143e`. Independent review approved; one non-blocking test-provenance improvement remains for final triage. Fresh controller `npm test`: 235/235.

Real browser checks passed: three views; centered 2.5D; actual monitor LMB click in first person -> 2D seated; cross-door fridge interaction retains first person; bed -> 2D sleep; peephole -> same first-person view; actual wall-switch LMB toggles only living-room light; day/night outside window lights differ. Inspector: 144 FPS; console errors/warnings empty. Original profile 324 kept; both lights restored on; lighting preview returned to game time and menu paused.

Screenshots: camera-25d-v9.png, camera-first-day-v9.png, camera-first-night-v9.png, camera-sleep-v9.png under `artifacts/v3`.

The browser tool cannot issue held-RMB drag. Pointer-adapter tests cover press/drag/release/cancel and independent look; exported-geometry ray tests cover 26 directions from each room. These are not manual browser gesture tests.

Original acceptance checklist:

- 2D, 2.5D, first-person cycle and repeated clicks/loading.
- Both rooms, day/night and independent room lights.
- First-person wall/ceiling/furniture coverage, floor and furniture hits.
- Computer from first-person: approach -> opaque fade -> seated 2D -> stand.
- Bed from first-person: fade -> sleeping 2D -> wake.
- Kitchen actions retain mode; door crossings follow existing routes.
- Peephole returns to selected apartment mode. Console errors and FPS.

## Avatar browser matrix (verified 2026-10-07)

Commits f45ba1c, 232ab5e, d04fbc6. Eight hair options inspected; visual findings for parted/messy/longshag locks and buzz scalp were corrected and rechecked. Final buzz hugs the oval skull, messy fringe reaches one brow and leaves the other eye clear. Square/long/oval lower faces visibly differ. Representative clothing checks passed: substantial hood, sleeveless tank, thick high collar, separate red/white dyes, fixed skin/soles, sports white markings and tall boots. Screenshot: artifacts/v3/wardrobe-forms-v10.jpg. Original profile 324 preserved by canceling the creator. Full close-up facial-hair matrix follows with Task 3's head framing.

Independent scoped hair re-review approved at `d04fbc6`. Fresh controller `npm test`: 243/243, zero failures.

- Eight hair silhouettes; oval/square/long bare faces front and profile.
- Beard/mustache combinations, neckline/hood/tank silhouettes.
- Wide/skinny jeans, shorts/breeches, sports stripes and left-thigh text.
- Five footwear silhouettes, independent material colors.
- Editor -> cancel preserves saved profile; save round-trip tests.
- Existing walk/seated/sleep clips and clothing clearances.

## Pixel UI browser matrix (verified 2026-10-07)

Task3 commits30cafcb/14b6c2b. Browser inspected menu, editor appearance and skills, HUD/actions, inspector, door dialog, peephole and destination choice. Loading screen observed during reloads. Error styling inspected in source, not injected as a runtime failure.

Fixed preview render-target viewport reset caught in browser, then verified centered model and separate head/full-body framing. Fixed desktop HUD wrapping so feet remain visible. Verified actual pointer drag turns preview; keyboard ArrowRight changes zoom; Enter chooses hoodie and red swatch while focus remains on swatch. At640×900, document content/client widths both640: no horizontal overflow; scrolling provides all controls. Name/ten-point allocation preserved; creator canceled without replacing saved profile324.

Shared retro pass seen in 2D, 2.5D, first person, creator and peephole; actual monitor click after downsampling approaches computer and switches to 2D, seated pose inspected with hold. Inspector reports 144 FPS. Screenshots: `artifacts/v3/retro-apartment-v11.jpg` and `artifacts/v3/retro-creator-v11.jpg`.

Follow-up close-up gates found and corrected face-fitted beard primitive naming (605c1a3), floating feature depths (695433f) and buried brow/lip triangle interiors (a815fbc). Browser confirms square full beard, long goatee/handlebar combination, long profile nose contact and continuous oval brows. Real-loader tests cover36 fitted owners; geometry tests cover all three face surfaces.

## Final acceptance

Independent whole-change review approved `4ca1862..a815fbc`: no Critical/Important findings. Fresh controller `npm test`: **253 passed, 0 failed**, exit 0. Browser console errors/warnings empty. Interface left open in unsaved editor; original profile324 remains intact, viewport override reset.

Non-blocking follow-up: strengthen static-export dynamic-object provenance regression. Reviewer compared 85,937 static triangles against 17,983 non-depth interaction triangles at 0.1 mm world-space precision; zero identical triangles. This corroborates current export separation without claiming exhaustive duplication proof.

Verification limits: held-RMB drag not available through browser automation; real pointer adapter tests cover it. Runtime-injected loading failures, viewports below640px and exhaustive animation/outfit combinations were not manually tested. Camera enclosure is sampled with26 directions per room rather than formally exhaustive.

## Implementation decisions

- Kept the existing local `codex/apartment-v3` checkout because the accepted baseline was originally untracked and served there. Reversible baseline commit `4ca1862` preserves it; unrelated legacy changes remain unstaged. Tradeoff: scoped staging is necessary to avoid mixing the two work streams.
- Migrated old `shaggy` saves to `bowl`, preserving their prior silhouette as the user identified it. Tradeoff: anyone wanting the new messy style selects it once.

- Menu, creator appearance/stats, HUD/actions, door choice, peephole, destinations, inspector, loading/errors.
- Category cards/swatches, rotation, zoom, full-body reset, keyboard focus.
- Native viewport plus narrow layout; no horizontal overflow/clipped actions.
- Shared retro treatment in all cameras/creator without text blur.
- Final screenshots, full regression suite and independent review.

## Verified resources

- Press Start 2P official Google Fonts metadata lists Cyrillic and Cyrillic Extended, OFL: https://github.com/google/fonts/tree/main/ofl/pressstart2p
- Bundle unmodified font locally with OFL copyright notice.
- User photographs are hairstyle shape references, not assets to paste on the character.

## Next stage requested by user (not part of this completed queue)

Virtual retro computer: slow boot, desktop, three wallpapers, Start/shutdown, simulated C:/Windows/Projects, Underweb and fictional battle websites, torent and slow download/install of FT Studio, storage budget and future music projects. All files and downloads are game-state simulations, not the host filesystem or network. User asked for this after cameras/wardrobe/UI; it remains next-stage work.
