# Public preview acceptance — 2026-10-16

The preview is `0.1.0-preview.1`, profile `public-preview`, canonical runtime
revision `44`. Music and recorded vocals are disabled; symbolic production,
metadata export, submission, study, saves and procedural room/UI effects remain.

Run after `npm ci`, `npm test`, source/history audits, `npm run build:preview`
and `npm run audit:site`:

```sh
npm run qa:preview -- --root dist/public-preview --output-dir /external/qa-output
```

Use an output directory outside both the checkout and the built artifact. Every
run creates a new owned subdirectory containing `report.json` and screenshots;
it does not replace existing evidence. On Windows set `TEMP`, `TMP`, npm cache,
and `PLAYWRIGHT_BROWSERS_PATH` on D: as described in
[public preview instructions](../public-preview.md). Set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE` to an existing Edge/Chromium executable if needed.
Otherwise the locked Playwright Chromium installation is used.

The full harness uses fresh isolated contexts at 1280×720 and 1920×1080:

- Natural flow: create a character, wake in the apartment, choose manual sleep,
  wake, reload and continue the same character.
- Serialized fixture preconditions: downloaded FT archive; installed software;
  blank text/beat projects; a ready text/beat pair for recording. Subsequent
  installation, work, recording, mixing, export, attachment/send, social
  navigation, dossier study and reload use the published UI.
- Guards: actual release SHA/version/notice; recorded audio requests, PCM Worker,
  decoded audio and recorded/media starts; failed responses/requests, served test
  modules and page errors; preserved exported file and frozen track version.
- Local cache regression: an owned loopback responder primes synthetic revision
  43 JS/CSS/Worker responses with cacheable headers. Repeated fetches must use
  the browser's HTTP cache (zero transfer bytes and one server hit each), then
  the same origin delegates the unchanged artifact and requires revision 44
  JS/CSS/Worker. This tests stale URL isolation, not an old gameplay migration.

Fixture preparation stays in Node. No test modules, routes, private media or
production test hooks ship in the artifact. Procedural footsteps, short room
cues and typing buffers are attributed separately from recorded playback.
Browser operations and an overall watchdog are bounded. Only the verifier's
own browser and isolated ephemeral-port loopback server are closed.

Chromium can report `ERR_ABORTED` just after Three's original GLB reader reaches
EOF. The report retains those raw signals separately. Acceptance requires
HTTP 200, original-reader EOF, exact artifact byte count, complete resource
timing and the awaited parsed scene becoming ready. Partial transfers, unknown
callers, other errors and missing evidence still fail. No production response
or geometry is replaced to obtain this evidence.

For a metadata-sensitive smoke after committing/rebuilding, add `--smoke`.
For a deployment, build/obtain the expected artifact and use
`--live --url https://HOST/battle-life/ --expected-revision FULL_SHA`.
Live mode still creates only fresh contexts and its own test saves. It checks
release identity while allowing an independently generated build timestamp.
HTTP and port 4173 targets and browser-profile reuse are rejected.

Local browser evidence is distinct from Linux CI and live deployment evidence.
No subjective listening claim is made. Release readiness also requires the
Linux CI and live checks in the [release checklist](../release-checklist.md).

Local results: public tests 1475/1475; explicit optional local-asset suite
1481/1481; source/history/site audits passed. The artifact contains 346 files,
253,303,915 bytes (largest file 60,090,988 bytes), within both budgets.
Full Edge acceptance passed 13 checks with 33 screenshots across both viewports:
no recorded-audio requests/starts/decodes, unexpected failures or page errors.
Four completed GLB stream signals were retained with the EOF/size/document
evidence described above. Screenshots and raw reports remain outside public Git
and the artifact. These are local results; Linux CI and live publication remain
separate release checks.
