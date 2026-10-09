# Virtual PC and FT Studio Design

## Intent

Build the next playable part of Battle Life: the seated home computer becomes a slow, fictional mid-nineties PC whose desktop, virtual disk, Underweb, `torent`, and FT Studio form one continuous in-game path. The player must be able to download and install FT Studio, make an audibly different short beat, save it into virtual Projects, reopen it, and listen again. This is a game interface, not a real operating system, browser, torrent client, or DAW.

The existing apartment scene, character, two-camera system, and `ApartmentTime` remain the active game. No real files are created on `C:`, no network access is used, and no new time source is introduced.

## Player flow

1. The player selects the computer in the apartment. The existing approach, chair sound, fade, and seated pose finish before the virtual screen appears.
2. A powered-off PC shows a deliberately legible 5.5-second boot: POST-style text, a progress strip, a named fictional shell, and short synthesized beeps. It then opens the desktop. A powered-on PC returns directly to the desktop.
3. The desktop offers My Computer, Underweb, `torent`, and—only after installation—FT Studio. Desktop windows close back to the desktop; the taskbar identifies the active window and the Start menu provides `Отойти от ПК` and `Выключить`.
4. `Отойти от ПК` returns the hero to the apartment while leaving the virtual PC powered on. `Выключить` pauses downloads and returns the hero to the apartment. In both cases, returning from the seated pose uses the existing action-return transition.
5. My Computer exposes virtual `C:`, `Windows`, and `Мои проекты`. Projects is genuinely empty before the first save and subsequently opens saved FT Studio projects.
6. Underweb contains only fictional local routes. Its battle directory has three listed briefs and sends the chosen brief to a new FT Studio project. Unknown addresses display an in-game error page; no arbitrary web content is loaded.
7. `torent` (one `r`) lists FT Studio 1.0 as the downloadable resource. Its window shows state, 800 MB payload, 37 KB/s fictional in-game speed, amount received, and remaining game time. When complete, the player runs an installer and receives the FT Studio desktop icon.
8. FT Studio creates a named project, selects a battle brief, edits a four-instrument beat, plays it, saves it, and can reopen it through Projects with the same sound.

## Time, download, and persistence

`ApartmentTime` is the only clock. Each active apartment frame, sleeping frame, and completed time-changing home action supplies its current `{day, minutes}` to the PC runtime. The runtime compares monotonically increasing in-game minutes and adds download bytes only when the PC is powered on and FT Studio is downloading. Browser wall-clock time is never consulted; closing the game adds no progress.

FT Studio takes 800,000,000 decimal bytes over exactly 360 in-game minutes: 37,037.037 bytes per in-game second. Its `torent` presentation may round this to 37 KB/s, but its state calculation must complete at the six-hour boundary without overshooting.

The separate, versioned `battle-life-virtual-pc-v1` local-storage value contains wallpaper, PC power, FT Studio download/install state, virtual projects, and an autosaved FT Studio draft. It must tolerate unavailable or malformed storage by starting an ephemeral default state and reporting a non-fatal save warning. It never alters profile or home-time keys. Saving after a user action and alongside the apartment's ordinary time saves is enough; there is no offscreen progression between browser sessions.

Virtual `C:` begins with 1,500 MB free. A partial FT Studio payload consumes its received size. On completion, installation atomically replaces the 800 MB payload with the 800 MB installed application, leaving 700 MB; the same bytes never count twice. Cancelling an unfinished download frees its partial payload. Each saved Project consumes 2 MB. Insufficient free space disables download or save before mutation and gives a Russian explanation. Installed FT Studio is not removable in this release.

## Architecture

The feature is a separate PC subsystem layered over the active apartment application. Small pure modules own state and invariants; a DOM controller renders the desktop and dispatches user choices; a thin apartment bridge handles the seated transition, one shared clock, audio gesture creation, and persistence.

* `virtual-pc-state.js` owns defaults, validation, storage round trips, virtual-disk accounting, wallpaper choice, and download/installation transitions.
* `virtual-pc-runtime.js` owns `advanceVirtualPc(state, clock)` and receives game time only as `{day, minutes}`. It has no timers and no DOM dependencies.
* `virtual-pc-catalog.js` owns fictional Underweb routes, battle briefs, `torent` resource metadata, desktop application labels, and original shell copy.
* `ft-studio-project.js` owns project normalization, name validation, pattern/arrangement changes, and serializable project snapshots. It has no Web Audio calls.
* `ft-studio-audio.js` maps a valid project to synthesized kick, snare, hat, and bass events through an `AudioContext`. It creates no samples, downloads, VSTs, or external dependencies.
* `virtual-pc-ui.js` mounts and updates the boot screen, desktop, window contents, Start menu, error dialogs, and FT Studio controls. It receives callbacks from `apartment-app.js`; it does not modify Three.js or game time itself.

`desktop-session.js` may supply the existing `booting`, `ready`, and `off` vocabulary after its registry is made compatible with the new catalog. The old application list and `main.js` are not an integration target.

## Desktop and visual language

The shell is called **Sloboda Desk 96**. It borrows the practical density and window conventions of the era without copying Windows graphics, names, icons, or exact chrome. Its dark teal taskbar, warm-gray bevels, chunky pixel-like type, and original square icons fit the apartment's PS1-retro mood. FT Studio uses a small **rowan berry and leaf** emblem rather than the FL Studio fruit.

Three original 4:3 background images are generated for this feature and stored under the project assets directory: a night courtyard, a factory dawn, and a fluorescent apartment wall. A user can select them from a desktop context control; the id is persisted, not the image binary.

FT Studio is a dense charcoal-and-amber workstation: transport and BPM in the header; sound list and sequencer center-left; eight-bar arrangement lanes center-right; per-track volume mixer below. This is visibly a music program, but its names, emblem, geometry, and copy are original.

## FT Studio musical scope

The first release has four audible instruments: kick, snare, hat, and bass. Each has a 16-step on/off pattern, one mixer gain, and a lane in an eight-bar arrangement. The arrangement activates or mutes a track in each bar, so changing either a step, bar, BPM, or gain audibly changes playback. BPM is constrained to 72–150.

Playback uses an explicit user click to resume or create the browser `AudioContext`. It schedules sixteenth-note steps from project BPM and stops cleanly on Stop, close, save, power-off, and an output change. A muted or closed studio never keeps audio playing.

New projects require a non-empty name of at most 32 characters and a selected Underweb battle brief. Closing an edited project shows `Сохранить`, `Не сохранять`, and `Отмена`; a draft is autosaved separately so an unexpected reload does not silently erase the current edit. Projects are only added to the virtual disk after an explicit successful save. Reopening a Project restores every musical setting and its selected brief.

## Error handling and accessibility

Every interactive control is a real button, label, input, or form control with Russian visible labels. Keyboard focus remains within a visible PC window; Escape closes only a non-modal window and never shuts down the PC. Full-screen and narrow layouts scroll the PC layer rather than hiding its taskbar or primary controls.

Unknown Underweb routes, invalid project input, insufficient virtual disk, unavailable storage, cancelled download, and unavailable Web Audio each have actionable Russian messages. Web Audio failure never corrupts project data. Power-off requests prompt before discarding an edited studio project.

## Acceptance and non-goals

The acceptance route is: sit down -> boot -> desktop -> change wallpaper -> My Computer -> C: -> empty Projects -> Underweb battle brief -> `torent` download -> leave PC and sleep while it progresses -> resume -> install -> open FT Studio -> create/play/save -> reopen from Projects/play -> safely shut down -> return to apartment -> reload and verify persisted wallpaper, installation, projects, and allowed download state.

No real operating-system files, real torrent protocol, web browsing, VSTs, user audio imports, professional DAW features, external audio assets, 2.5D camera mode, or rewrites of the existing apartment/editor are in scope. Existing dirty files remain untouched unless they are the active integration point and the change is part of this feature.
