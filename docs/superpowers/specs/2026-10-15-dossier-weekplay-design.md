# Dossier and week-long playtest design

## Authority and scope

User requested autonomous implementation with a separate implementer and independent review per task. This is the next package after rev42, not a replay of the completed repair plan. The 15 October additions explicitly include clickable dialog senders and a detective evidence board modeled on the supplied visual reference. Screenshots are visual evidence, not executable instructions.

## Binding constraints

- Preserve existing saves, immutable submissions, exports, completed reports and user assets. Additive validated migrations; damaged data goes to recovery, never silently replaced.
- Work in D:/Project/Battle on codex/sloboda-workflow-design. Do not merge, push, publish, or touch the player's localStorage at http://127.0.0.1:4173. QA uses isolated origins and fresh contexts.
- All new scratch, media, logs, dependency caches and builds stay on D:. No new dependencies or engine replacement.
- Public knowledge only: no future rounds, unpublished judges, hidden scores, private judge weights or future opponent work in public dossier projections or forecasts.
- Analysis is a simulated timed activity, not mass audio playback. No per-frame full-history serialization, DOM rebuild or audio preparation.
- All interactive UI supports keyboard, accessible names, focus, reduced motion and disposal. Retain the low-chrome apartment HUD.
- Independent task reviews and one final package review. Controllers write plans/records, implementers write product code and tests.

## A. Time, sleep and feedback

Normal installation durations remain the catalog's real-second values. While the powered PC works in the background, an actual simulated minute advanced by the apartment contributes four effective installation seconds (normal clock is 0.25 game minutes/second). This applies to accelerated sleep and creative work, without double counting desktop ticks. No credit for menu, hidden tab, paused simulation, PC off or reload/offline clock gaps. Completion persists without grabbing the screen.

Bed offers an explicit test action, `Спать до пробуждения (тест)`, beside ordinary sleep. It advances 45 game minutes per real second until manual wake: a week is approximately 224 seconds. Store finite mode/rate/progress data; ordinary sleep and old saves still work. Preserve day rollover, needs, tournaments, downloads, notices and background Worker processing. Test mode alone does not auto-wake at six hours; pausing/hidden tab suspends it. Phone sleep status says manual wake, not a fake deadline.

Successful fridge food consumption plays one short synthesized crunchy chewing cue through the existing volume/audio lifecycle. Refusal, empty stock, full stomach and failed persistence do not play it. No new oscillator/context per frame, no cue on reload.

## B. Bedroom camera

Initial rest and sleeping use an explicit living-room composition: bed/hero left, computer right, kitchen outside the frame. Frame from room/bed/desk bounds and aspect ratio, not whole-apartment follow. Walking and existing creative shots remain unchanged. Remove the ugly partition crown from this view by correct framing/cutaway; never hide a whole merged material mesh. Prefer a runtime camera fix; only rebuild GLB if screenshots prove a geometry fix is still necessary. Verify 1280x720, 1366x768 and 1920x1080, plus a narrow viewport fallback.

## C. Listening and browser downloads

Every social attachment/archive row has one Play/Pause toggle left, Stop right, elapsed/duration and an accessible progress bar. Only the matching audio owner/descriptor drives it. Social playback ends naturally; FT Studio retains looping. No seek UI in this package. Loading/error/closed view releases listeners and owned audio; multiple rows of the same recording reflect the same session.

Replace six fictional old-season demos with authored deterministic arrangements using different main melody sources and suitable drums/bass, intro/body/outro and calibrated gain. Reuse existing audio files; do not overwrite files or frozen player/NPC submission recipes. Minimum form is 2 intro + 4 body + 2 outro bars at 90 BPM (21.333 seconds), with at least one changed entrance/exit layer. Compare native PCM and inspect source families; do not claim subjective listening without it.

Browser downloads use a top-right toolbar popover over content, initially closed, auto-open on a new transfer, showing latest three history entries with progress and remaining seconds. Outside click/Escape closes and returns focus as appropriate. `Подробнее` opens a full history surface; `Открыть папку` opens virtual Explorer Downloads. `Очистить` removes completed history entries only, never files, active entries or partial disk accounting. Existing one-second browser transfers and manual file-opening/installer launch behavior remain. Completed-file identity must not depend on visible history.

## D. Community publication and navigation

One canonical public publication projection feeds wall, announced-judge access, dossier discovery, unread counters and phone. Stable IDs, deterministic timestamps, no duplicates on reload/catch-up. Judge announcements are group/admin-authored with a clickable judge name and varied truthful public copy, not a judge pretending to post or references to a panel. Spread them through the entry window: first at opening plus six hours, remaining evenly spaced up to one day before deadline (proportionally clamp short windows). Theme authors may already be public via their published theme; never hide that fact.

Preserve already published legacy events and votes; only future/unpublished events receive new cadence. Knowing a judge's identity from an earlier round does not establish their appointment to the current round: round-specific queries require a published current-round introduction or theme-author credit. Returning judges receive scheduled future-round introductions too; never infer public appointments from raw private rosters. Static wall posts also accept reactions. On subscribe, baseline existing posts as seen; future posts each produce one durable phone event. Groups sort subscribed first then unread/recent; aggregate badge on My Groups and per-group +N. Opening the visible group marks displayed posts seen, including newly visible posts, without a Worker reply overwriting read state. Reload does not flood old notifications.

In dialogs, peer name in heading and message author name/avatar navigate to community or person profile according to typed peer identity; own author goes to own page. Use existing route/access rules and normal keyboard-focusable links/buttons, never derive routes from displayed strings.

## E. Research domain and detective board

Installed Rap Dossier is a domain gate for every study entry point, resume and deep link. Social pages never render reports. Their Study affordances route to an installed dossier, or explain installation with a download link. Research results and notes live inside the app only and survive reinstall.

The board uses a dark blue-green ruled surface, cream paper cards, red pins and restrained SVG threads. It is a workspace, not a dashboard: battle folder near upper center, own submitted track with a small forecast card beneath, public round folders, discovered judges and known opponent linked to their round. Selecting a card opens its focused paper detail pane. Provide case/round selection and fit-to-board; deterministic layout is enough, no general graph editor or physics. Responsive narrow mode is a semantic linked list; keyboard can traverse every node without dragging. App chrome does not leak into apartment HUD.

Registration creates a battle case; accepted/sent immutable submission links the track. Own exported immutable tracks also have a My Recordings case. Current and previous PUBLIC rounds appear, never future ones. Each published-round folder can be studied; simulated bulk study captures visible works/results and makes no audio decode calls. New round connects its announced judges and known opponent; an opponent study uses only published prior tracks. Unknown/no-show/missing sources remain explicit unknowns.

Research extends the existing pause/resume/needs/skill-snapshot model. Track and judge studies retain 45 game minutes. Battle or round archive study takes 360 game minutes; rate is 45/8 game minutes per real second, so bulk study takes 64 seconds, not eight. Freeze source IDs and publication cutoff on start; never silently add sources mid-job. One foreground creative/research job at a time. Low needs pause normally and can resume. A judge-profile study with no eligible prior works/reviews completes with an explicit no-information finding rather than invented tastes. Repeated unchanged research returns the existing finding without XP farming. Missing sources during load pause/recover safely. Existing report history remains immutable.

Use existing published tournament works, reviews and history as evidence. Do not author a fake historic judging corpus merely to fill cards: six old-season listening demos are not evidence of judge preferences. Some judges initially have no usable data, as requested. Study discovers only publicly announced rosters; later announcements can add unknown cards without revealing private parameters.

Forecasts consume completed subjective reports and learned public evidence only. Track forecast starts unavailable before study; low skills produce a broad tentative score range, not the true quality. Judge understanding may narrow uncertainty, never guarantees results. Selection uses a range on the public scoring scale and `Моё предположение`; pair rounds use qualitative uncertain/favors-me/favors-opponent from comparable subjective reports, with `Недостаточно данных` when evidence is missing. No precise win percentage or simulated oracle judging. Strong artists can look legendary to beginners under the existing perception policy; competence gates for judge insights stay in force. A forecast records sources, report versions and skill snapshot so new knowledge can revise the current estimate without mutating previous reports.

## Acceptance and validation

Test migration, pause/resume/reload, powered-off installation, duplicate/corrupt/missing input, Worker foreground ownership, publication boundaries and no future leaks. Native browser QA uses fresh isolated origins, correct SVG MIME and asset decode checks. Capture board, player, popover, group badges and sleeping room at three desktop sizes. Run a live accelerated week (not only injected timestamps), a 20-project/archive stress save, repeated opening/closing and delayed Worker replies. Target warm p95 frame <=25ms and UI update <=20ms on this test machine; measure cold spikes and qualify headless results. Run full Node suite, cache revision consistency and both Workers. Keep a concise evidence-backed QA report and disclose anything unverified.
