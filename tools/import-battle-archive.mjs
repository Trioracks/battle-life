import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROUND_SHEETS = [
  ['selection', ['1 РАУНД (СВОДНАЯ)', '1 РАУНД']],
  ['round-2', ['2 РАУНД']], ['round-3', ['3 РАУНД']],
  ['round-4', ['4 РАУНД']], ['round-5', ['5 РАУНД']], ['final', ['ФИНАЛ']],
];
const key = name => String(name).trim().toLowerCase();
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

/** Pure import: reads declared local inputs, never writes or changes archive facts. */
export function importBattleArchive(inputDirectory) {
  const inputs = [];
  function read(filename) {
    const bytes = fs.readFileSync(path.resolve(inputDirectory, filename));
    inputs.push({ path: filename.replaceAll('\\', '/'), sha256: sha(bytes) });
    return JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
  }
  const source = read('battle-judging-source.json');
  const analysis = read('battle-judging-analysis.json');
  const participations = read('battle-participants-source.json');
  const observations = read('judge-observations.json');
  const corpus = read('judge-review-corpus.json');
  const attribution = read('judge-comment-attribution.json');
  const research = read('judge-profiles.json');
  const pool = read('../../demo-opponent-pool-v0.1.json');
  const aliases = {};
  const identities = research.profiles.map(p => {
    for (const label of [p.judgeKey, ...p.sourceLabels]) aliases[key(label)] = p.id;
    return { id:p.id, label:p.judgeKey, sourceLabels:p.sourceLabels,
      identityStatus:p.identityStatus, possibleAliasOf:p.possibleAliasOf, sourceRefs:p.evidenceRefs };
  });
  const unknownJudgeLabels = new Set();
  const judgeId = label => {
    const id = aliases[key(label)];
    if (!id) unknownJudgeLabels.add(label);
    return id ?? null;
  };
  const rounds = ROUND_SHEETS.map(([id, sheetNames]) => {
    const views = sheetNames.map(name => {
      const info = analysis.rounds.find(r => r.sheet === name);
      return { sheet:name, participantCount:info.participants, headerRow:info.headerRow };
    });
    const info = analysis.rounds.find(r => r.sheet === sheetNames[0]);
    const header = source.sheets.find(s => s.name === info.sheet).rows.find(r => r.row === info.headerRow);
    const individualColumns = info.judgeInfo.map(j => ({
      judgeId:judgeId(j.label), label:j.label, column:j.column, sourceRef:info.sheet + '!' + j.column + info.headerRow,
    }));
    const collectiveChannels = header.cells.filter(c => key(c.value) === 'народ').map(c => ({
      id:'audience', label:c.value, sourceRef:info.sheet + '!' + c.address,
    }));
    const excluded = individualColumns.length % 2 === 0 ? individualColumns.slice(-1) : [];
    return { id, mode:id === 'selection' ? 'grade' : 'pair_vote', views, individualColumns,
      gameRoster:{ judgeIds:individualColumns.filter(c => !excluded.includes(c)).map(c => c.judgeId),
        excludedJudgeIds:excluded.map(c => c.judgeId), collectiveChannels,
        exclusions:excluded.map(c => ({judgeId:c.judgeId,sourceRef:c.sourceRef,reason:'last individual column omitted to keep an odd game panel; historical votes untouched'})) } };
  });
  const crossed = new Map(attribution.verifiedCrossedNotes.map(a => [a.sourceRef,a]));
  const unresolved = new Map(attribution.unresolvedExamples.map(a => [a.sourceRef,a]));
  const canonical = corpus.filter(n => !n.duplicateOf).map(n => ({
    ...n, judgeId:judgeId(n.judgeKey),
    attribution:crossed.has(n.sourceRef) ? {status:'verified_crossed',...crossed.get(n.sourceRef)}
      : unresolved.has(n.sourceRef) ? {status:'unresolved',textSubject:null,reason:unresolved.get(n.sourceRef).reason}
      : {status:n.participant ? 'source_row' : 'general_note',textSubject:n.participant},
  }));
  const participantMap = new Map();
  for (const p of participations) {
    const identity = key(p.nickname);
    if (!participantMap.has(identity)) participantMap.set(identity, {
      id:'participant-' + sha(identity).slice(0,16), label:p.nickname,
      identityStatus:'exact_normalized_label_only', sourceRefs:[],
    });
    participantMap.get(identity).sourceRefs.push(p.sheet + '!' + p.cell);
  }
  const sourceReferenceIndex = Object.fromEntries(source.sheets.flatMap(s => s.rows.flatMap(r =>
    r.cells.map(c => [s.name + '!' + c.address,{kind:'cell',value:c.value,formula:c.formula}]))));
  // XLSX serializes populated cells only. A blank at an existing entrant/judge
  // intersection is a resolvable empty cell, not a lost source and not a zero vote.
  for (const o of observations) {
    if (sourceReferenceIndex[o.sourceRef] || o.value !== null || o.rawValue !== null || o.text !== null) continue;
    const sheet = source.sheets.find(s => s.name === o.sheet);
    const row = sheet?.rows.find(r => r.row === Number(o.cell.replace(/^[A-Z]+/,'')));
    const info = analysis.rounds.find(r => r.sheet === o.sheet);
    const column = o.cell.match(/^[A-Z]+/)?.[0];
    if (row && info?.judgeInfo.some(j => j.column === column)) {
      sourceReferenceIndex[o.sourceRef] = {kind:'empty_cell',value:null,formula:null};
    }
  }
  const archive = {
    schemaVersion:1, battleId:'makarevich-1', kind:'historical_archive_not_live_results',
    source, sourceReferenceIndex, aliases, identities, rounds, participants:[...participantMap.values()], participations,
    observations:observations.map(o => ({...o, judgeId:judgeId(o.judgeKey)})),
    notes:{rawCount:corpus.length, canonical, duplicates:corpus.filter(n => n.duplicateOf)},
    attribution, historicalOpponentPool:pool,
  };
  const cellRefs = new Set(Object.keys(sourceReferenceIndex));
  const refs = [
    ...observations.map(o => o.sourceRef), ...corpus.map(n => n.sourceRef),
    ...participations.map(p => p.sheet + '!' + p.cell), ...identities.flatMap(p => p.sourceRefs),
    ...attribution.verifiedCrossedNotes.map(n => n.sourceRef),
    ...attribution.unresolvedExamples.map(n => n.sourceRef),
  ];
  const diagnostics = {
    unresolvedSourceRefs:[...new Set(refs.filter(ref => !cellRefs.has(ref)))].sort(),
    unknownJudgeLabels:[...unknownJudgeLabels].sort(),
  };
  const manifest = {schemaVersion:1, battleId:archive.battleId, sourceUrl:source.sourceUrl,
    retrieved:source.retrieved, inputs, archiveSha256:sha(JSON.stringify(archive)),
    counts:{rounds:rounds.length,participations:participations.length,rawNotes:corpus.length,
      canonicalReviews:canonical.filter(n => n.kind === 'participant_review').length,
      generalNotes:canonical.filter(n => n.kind === 'judge_general_note').length},
  };
  return {archive,manifest,diagnostics};
}

// Build artifacts are emitted only by an explicit CLI invocation, never by import.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const input = process.argv[2];
  if (!input) throw new Error('Usage: node tools/import-battle-archive.mjs INPUT_DIRECTORY');
  const result = importBattleArchive(input);
  if (Object.values(result.diagnostics).some(items => items.length)) throw new Error(JSON.stringify(result.diagnostics));
  const root = fileURLToPath(new URL('../',import.meta.url));
  const directory = path.join(root,'data/battle-archive');
  fs.mkdirSync(directory,{recursive:true});
  fs.writeFileSync(path.join(directory,'makarevich-1.json'),JSON.stringify(result.archive,null,2)+'\n');
  fs.writeFileSync(path.join(directory,'manifest.json'),JSON.stringify(result.manifest,null,2)+'\n');
  const rosters = Object.fromEntries(result.archive.rounds.map(r => [r.id,r.gameRoster]));
  fs.writeFileSync(path.join(root,'src/battle-roster-data.js'),
    '// Generated by tools/import-battle-archive.mjs; historical archive stays separate.\nexport const BATTLE_ROSTERS = ' + JSON.stringify(rosters,null,2) + ';\n');
  console.log(JSON.stringify(result.manifest.counts));
}
