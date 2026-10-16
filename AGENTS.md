# Battle Life public preview rules

This checkout is the lightweight public source for `Trioracks/battle-life`.
Publication branch: `master`. Make changes on a `codex/` branch, review the PR,
then update master through the reviewed merge. Never merge the preserved full
development branch or import its Git history. The snapshot origin is recorded in
[public source provenance](docs/public-source-provenance.json).

- Use Node 24 and `npm ci`. Public tests (`npm test`) also require Python 3,
  standard library only. `BATTLE_PYTHON` may name one executable; otherwise tests
  discover `python3`, `python`, or Windows `py -3`. No pip packages or Blender are
  required. Python is not needed to start, build, or play the preview.
- Default `npm start` serves `http://127.0.0.1:4180/battle-life/`. Do not disturb
  an existing server on 4173 or read/change a player's browser storage. Browser
  QA must own an isolated server and fresh browser context, serve the built
  artifact, and put output outside both the served tree and source audit tree.
- Public profile: `public-preview`. Keep the notice
  `Музыка и вокал отключены в тестовой веб-версии`, text audio catalog IDs,
  save compatibility, and procedural UI/room effects. Local `local-full` audio
  is an explicit opt-in using an external asset root or ignored
  `.local-audio.json`; never make it a public test/build/CI prerequisite.
- Exclude binary audio, raw stems, Blender sources, archives, secrets, local
  settings, caches and QA output from public Git and Pages. Do not solve a budget
  failure by compressing, transcoding, optimizing, or deleting assets silently.
  Limits: 350 MiB total artifact and 95 MiB per file; fail closed.
- On this Windows host, keep avoidable temp, caches, browser downloads, builds
  and artifacts on D:. Set `TEMP`, `TMP`, `npm_config_cache`, and
  `PLAYWRIGHT_BROWSERS_PATH` before installing or launching tools; see
  [public preview instructions](docs/public-preview.md). Linux CI uses runner
  workspace/temp paths. Do not introduce machine-global absolute dependencies.
- Before proposing a merge, run public tests, source/new-history audits, build,
  artifact audit and isolated browser smoke; record results and the exact public
  commit SHA. Review workflow permission/event changes separately. Preserve
  unrelated edits and inherited vendor whitespace. No force pushes, history
  rewrites, bulk pushes, branch deletions, backend, telemetry or save sync.
- Only successful master push/manual runs may deploy. PRs validate their exact
  head SHA with read-only permissions and work before Pages is configured.
  Deployment alone gets Pages/OIDC writes. Keep official action SHA pins,
  publication-only FIFO serialization (`queue: max`, `cancel-in-progress: false`)
  and the last current-master check. A late older build must not cancel active
  or replace pending newer deployments. Do not add
  tokens or automatically enable Pages. See the [release checklist](docs/release-checklist.md).
