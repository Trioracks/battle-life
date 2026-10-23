param([string]$ProjectRoot='D:\Project\Battle')
$ErrorActionPreference='Stop'
$base=Join-Path $ProjectRoot 'docs/backlog/sources/2026-10-12'
function ReadJson([string]$name) { Get-Content -Raw -Encoding UTF8 (Join-Path $base $name) | ConvertFrom-Json }
function Check([bool]$ok,[string]$message) { if (-not $ok) {throw $message} }
$rawNotes=@(ReadJson 'battle-judging-notes.json')
$corpus=@(ReadJson 'judge-review-corpus.json')
$observations=@(ReadJson 'judge-observations.json')
$audit=ReadJson 'judge-corpus-audit.json'
$metrics=ReadJson 'judge-descriptive-metrics.json'
$profiles=ReadJson 'judge-profiles.json'
$attribution=ReadJson 'judge-comment-attribution.json'
$source=ReadJson 'battle-judging-source.json'
Check ($rawNotes.Count -eq 1430 -and $corpus.Count -eq $rawNotes.Count) 'Raw note coverage changed'
Check ($observations.Count -eq 1519) 'Unexpected canonical observations'
Check (@($corpus | Where-Object {-not $_.duplicateOf}).Count -eq 1037) 'Unexpected canonical notes'
Check (@($corpus | Where-Object {-not $_.duplicateOf -and $_.kind -eq 'participant_review'}).Count -eq 1031) 'Unexpected canonical participant notes'
Check ($audit.duplicateFirstRoundCells -eq 500) 'Unexpected first-round duplicates'
Check (@($audit.duplicateFirstRoundValueConflicts).Count -eq 0 -and @($audit.duplicateFirstRoundTextConflicts).Count -eq 0) 'First-round conflict detected'
Check (@($audit.identicalPairTextGroups).Count -eq 14) 'Unexpected pair duplicate count'
Check (@($audit.coverage).Count -eq 30) 'Unexpected judge group count'
$rawIndex=@{}; $noteIndex=@{}; $obsIndex=@{}; $sourceCells=@{}
foreach ($n in $rawNotes) {$rawIndex[$n.sheet+'!'+$n.cell]=$n}
foreach ($n in $corpus) {
 Check ($rawIndex[$n.sourceRef].text -ceq $n.text) ('Changed raw text '+$n.sourceRef)
 $noteIndex[$n.sourceRef]=$n
}
foreach ($s in $source.sheets) { foreach ($r in $s.rows) {foreach ($c in $r.cells) {$sourceCells[$s.name+'!'+$c.address]=$c}}}
foreach ($o in $observations) {
 if ($null -ne $o.rawValue) {
  Check ($sourceCells.ContainsKey($o.sourceRef)) ('Missing source cell '+$o.sourceRef)
  Check ($o.rawValue -eq $sourceCells[$o.sourceRef].value) ('Changed source value '+$o.sourceRef)
 } else {
  Check (-not $sourceCells.ContainsKey($o.sourceRef) -or [string]::IsNullOrEmpty($sourceCells[$o.sourceRef].value)) ('Unexpected source value '+$o.sourceRef)
 }
 if ($null -ne $o.value) {
  if ($o.valueKind -eq 'score') {Check ($o.value -ge 0 -and $o.value -le 10) ('Invalid score '+$o.sourceRef)}
  else {Check ($o.value -in @(0,1)) ('Invalid pair vote '+$o.sourceRef)}
 }
 if ($null -ne $o.text) {Check ($noteIndex[$o.sourceRef].text -ceq $o.text) ('Changed observation text '+$o.sourceRef)}
 $obsIndex[$o.sourceRef]=$o
}
foreach ($n in $corpus | Where-Object {$_.duplicateOf}) {Check ($noteIndex.ContainsKey($n.duplicateOf)) ('Unknown duplicate target '+$n.sourceRef)}
foreach ($st in $audit.firstRoundScoreStats) {
 $total=0.0; $count=0
 foreach ($bin in $st.distribution) {Check ($bin.score -ge 0 -and $bin.score -le 10) 'Bad score bin';$total += $bin.score*$bin.count;$count += $bin.count}
 Check ($count -eq 100 -and [math]::Abs($total/$count-$st.mean) -lt 0.0000001) ('Bad score distribution '+$st.judgeKey)
}
Check (@($source.sheets.rows.cells | Where-Object formula -eq 'System.Xml.XmlElement').Count -eq 0) 'Unparsed formula remains'
Check (@($profiles.profiles).Count -eq 30) 'Incomplete profile register'
Check (@($profiles.profiles.id | Sort-Object -Unique).Count -eq 30) 'Duplicate profile IDs'
Check (@($profiles.profiles.judgeKey | Sort-Object -Unique).Count -eq 30) 'Duplicate profile keys'
foreach ($p in $profiles.profiles) {
 Check ($p.confidence -in @('high','medium','low','insufficient')) ('Invalid confidence '+$p.judgeKey)
 Check (@($audit.coverage | Where-Object judgeKey -eq $p.judgeKey).Count -eq 1) ('Unknown judge '+$p.judgeKey)
 $refs=@($p.evidenceRefs)+@($p.decisionPatterns | ForEach-Object {$_.sourceRefs})
 foreach ($ref in $refs) {
  Check ($obsIndex.ContainsKey($ref) -or $noteIndex.ContainsKey($ref)) ('Missing profile evidence '+$ref)
  $j=if ($noteIndex.ContainsKey($ref)) {$noteIndex[$ref].judgeKey} else {$obsIndex[$ref].judgeKey}
  Check ($j -eq $p.judgeKey) ('Wrong judge in profile evidence '+$p.judgeKey+' '+$ref)
 }
}
foreach ($x in $attribution.verifiedCrossedNotes) {
 $o=$obsIndex[$x.sourceRef]
 Check ($null -ne $o -and $o.participant -ceq $x.rowParticipant -and $o.value -eq $x.rowVote) ('Bad attribution anchor '+$x.sourceRef)
 Check ($o.opponent -ceq $x.textSubject) ('Bad attribution subject '+$x.sourceRef)
}
$docPaths=@(
 'BACKLOG.md',
 'BACKLOG_V1.md',
 'docs/backlog/2026-10-12-implementation-handoff.md',
 'docs/backlog/2026-10-12-judges-participants-analysis.md',
 'docs/backlog/2026-10-12-judge-behavior-guide.md',
 'docs/backlog/judges/core-judges.md',
 'docs/backlog/judges/thirty-third.md',
 'docs/backlog/judges/later-judges.md'
)
$checkedRefs=0; $checkedLinks=0
foreach ($rel in $docPaths) {
 $path=Join-Path $ProjectRoot $rel
 Check (Test-Path -LiteralPath $path) ('Missing document '+$rel)
 $text=[IO.File]::ReadAllText($path)
 foreach ($m in [regex]::Matches($text,'(?<sheet>1 РАУНД \(СВОДНАЯ\)|1 РАУНД|2 РАУНД|3 РАУНД|4 РАУНД|5 РАУНД|ФИНАЛ)!(?<cell>[A-Z]+\d+)')) {
  $ref=$m.Groups['sheet'].Value+'!'+$m.Groups['cell'].Value
  Check ($sourceCells.ContainsKey($ref) -or $noteIndex.ContainsKey($ref) -or $obsIndex.ContainsKey($ref)) ('Unknown document source reference '+$rel+' '+$ref)
  $checkedRefs++
 }
 foreach ($m in [regex]::Matches($text,'\[[^\]]+\]\((?<target>[^)]+)\)')) {
  $target=$m.Groups['target'].Value
  if ($target -match '^(https?:|#)' -or $target -match '[<>]') {continue}
  $target=($target -split '#')[0]
  Check (Test-Path -LiteralPath (Join-Path (Split-Path $path) $target)) ('Broken local link '+$rel+' '+$target)
  $checkedLinks++
 }
}
[pscustomobject]@{verified=$true;rawNotes=$rawNotes.Count;canonicalNotes=1037;canonicalParticipantNotes=1031;canonicalObservationCells=$observations.Count;profiles=@($profiles.profiles).Count;crossedNoteMappings=@($attribution.verifiedCrossedNotes).Count;documentSourceReferences=$checkedRefs;localDocumentLinks=$checkedLinks}
