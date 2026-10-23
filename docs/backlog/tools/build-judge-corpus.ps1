param([string]$ProjectRoot = 'D:\Project\Battle')
$ErrorActionPreference = 'Stop'
$base = Join-Path $ProjectRoot 'docs\backlog\sources\2026-10-12'
$src = Get-Content -Raw -Encoding UTF8 (Join-Path $base 'battle-judging-source.json') | ConvertFrom-Json
$notes = @(Get-Content -Raw -Encoding UTF8 (Join-Path $base 'battle-judging-notes.json') | ConvertFrom-Json)
$analysis = Get-Content -Raw -Encoding UTF8 (Join-Path $base 'battle-judging-analysis.json') | ConvertFrom-Json
$people = @(Get-Content -Raw -Encoding UTF8 (Join-Path $base 'battle-participants-source.json') | ConvertFrom-Json)
function Norm([string]$s) { return ($s.Trim().ToLowerInvariant() -replace '\s+', ' ') }
function Num($s) {
  if ([string]::IsNullOrWhiteSpace([string]$s)) { return $null }
  $n = 0.0
  if ([double]::TryParse([string]$s, [Globalization.NumberStyles]::Float, [Globalization.CultureInfo]::InvariantCulture, [ref]$n)) { return $n }
  return $null
}
$aliases = @{
 'pavelundergeound'='pavelunderground'; 'павел андерграунд'='pavelunderground'
 'сенобит'='cenobite'; 'кибер олежа'='cyber olegi'; 'дед рейв'='dead rave'
 'вайтспрус'='whitespruce'; 'кош'='kosh (spacecave)'; 'бен арфа'='benarfa'
 'алкс битс'='alx beats'; 'зу ин спейс'='zoo in space'
}
function Judge([string]$s) { $k=Norm $s; if ($aliases.ContainsKey($k)) { return $aliases[$k] }; return $k }
$noteIndex=@{}
foreach ($n in $notes) { $noteIndex[$n.sheet+'!'+$n.cell]=$n }
$sheetIndex=@{}
foreach ($s in $src.sheets) { $sheetIndex[$s.name]=$s }
$roundIndex=@{}
foreach ($r in $analysis.rounds) { $roundIndex[$r.sheet]=$r }
$allObs = [Collections.Generic.List[object]]::new()
foreach ($r in $analysis.rounds) {
 $s=$sheetIndex[$r.sheet]
 $rows=@{}
 foreach ($row in $s.rows) { $rows[[int]$row.row]=$row }
 $pp=@($people | Where-Object sheet -eq $r.sheet | Sort-Object { [int]($_.cell -replace '\D','') })
 for ($pi=0; $pi -lt $pp.Count; $pi++) {
  $p=$pp[$pi]; $rn=[int]($p.cell -replace '\D','')
  $opponent=$null; $pair=$null
  if ($r.sheet -notlike '1 РАУНД*') {
   $pair=[int][math]::Floor($pi/2)+1
   $oi=if ($pi%2 -eq 0) {$pi+1} else {$pi-1}
   if ($oi -lt $pp.Count) { $opponent=$pp[$oi].nickname }
  }
  foreach ($j in $r.judgeInfo) {
   $address=$j.column+$rn; $ref=$r.sheet+'!'+$address
   $cell=@($rows[$rn].cells | Where-Object address -eq $address)
   $raw=if ($cell.Count) {$cell[0].value} else {$null}
   $nn=$noteIndex[$ref]
   $allObs.Add([pscustomobject][ordered]@{
    sourceRef=$ref; sheet=$r.sheet; cell=$address; judgeLabel=$j.label; judgeKey=(Judge $j.label)
    participant=$p.nickname; participantKey=(Norm $p.nickname); pair=$pair; opponent=$opponent
    value=(Num $raw); rawValue=$raw; valueKind=$(if ($r.sheet -like '1 РАУНД*') {'score'} else {'pair_vote'})
    text=$(if ($nn) {$nn.text} else {$null}); originalDuplicate=$false
   })
  }
 }
}
$summaryIndex=@{}
foreach ($o in $allObs | Where-Object sheet -eq '1 РАУНД (СВОДНАЯ)') { $summaryIndex[$o.judgeKey+'|'+$o.participantKey]=$o }
$duplicates=[Collections.Generic.List[object]]::new()
$canonical=[Collections.Generic.List[object]]::new()
foreach ($o in $allObs) {
 if ($o.sheet -eq '1 РАУНД') {
  $other=$summaryIndex[$o.judgeKey+'|'+$o.participantKey]
  if ($other) {
   $o.originalDuplicate=$true
   $duplicates.Add([pscustomobject]@{
    originalRef=$o.sourceRef; canonicalRef=$other.sourceRef
    sameValue=($o.rawValue -eq $other.rawValue); sameText=($o.text -ceq $other.text)
   })
   continue
  }
 }
 $canonical.Add($o)
}
$obsByRef=@{}
foreach ($o in $allObs) {$obsByRef[$o.sourceRef]=$o}
$duplicateByRef=@{}
foreach ($d in $duplicates) {$duplicateByRef[$d.originalRef]=$d}
$reviewCorpus=[Collections.Generic.List[object]]::new()
foreach ($n in $notes) {
 $ref=$n.sheet+'!'+$n.cell; $r=$roundIndex[$n.sheet]
 $col=$n.cell -replace '\d',''; $rn=[int]($n.cell -replace '\D','')
 $jj=@($r.judgeInfo | Where-Object column -eq $col)
 $o=$obsByRef[$ref]; $dup=$duplicateByRef[$ref]
 $kind=if ($o) {'participant_review'} elseif ($rn -eq $r.headerRow -and $jj.Count) {'judge_general_note'} else {'other_note'}
 $reviewCorpus.Add([pscustomobject][ordered]@{
  sourceRef=$ref; sheet=$n.sheet; cell=$n.cell; kind=$kind
  judgeKey=$(if ($jj.Count) {Judge $jj[0].label} else {$null})
  judgeLabel=$(if ($jj.Count) {$jj[0].label} else {$null})
  participant=$(if ($o) {$o.participant} else {$null}); opponent=$(if ($o) {$o.opponent} else {$null})
  pair=$(if ($o) {$o.pair} else {$null}); value=$(if ($o) {$o.value} else {$null})
  valueKind=$(if ($o) {$o.valueKind} else {$null})
  text=$n.text; duplicateOf=$(if ($dup) {$dup.canonicalRef} else {$null})
 })
}
# The original first-round header duplicates the summary header too.
foreach ($n in $reviewCorpus | Where-Object { $_.sheet -eq '1 РАУНД' -and $_.kind -eq 'judge_general_note' }) {
 $match=@($reviewCorpus | Where-Object { $_.sheet -eq '1 РАУНД (СВОДНАЯ)' -and $_.kind -eq 'judge_general_note' -and $_.judgeKey -eq $n.judgeKey -and $_.text -ceq $n.text })
 if ($match.Count -eq 1) { $n.duplicateOf=$match[0].sourceRef }
}
$pairTexts=@($reviewCorpus | Where-Object { $_.kind -eq 'participant_review' -and $_.pair -and -not $_.duplicateOf } |
 Group-Object { $_.sheet+'|'+$_.judgeKey+'|'+$_.pair+'|'+$_.text.Trim() } |
 Where-Object Count -gt 1 | ForEach-Object { [pscustomobject]@{refs=@($_.Group.sourceRef); judge=$_.Group[0].judgeKey; sheet=$_.Group[0].sheet; pair=$_.Group[0].pair; count=$_.Count} })
$coverage=@()
foreach ($g in $canonical | Group-Object judgeKey | Sort-Object Name) {
 $reviews=@($reviewCorpus | Where-Object {$_.judgeKey -eq $g.Name -and -not $_.duplicateOf})
 $content=@($reviews | Where-Object kind -eq 'participant_review')
 $coverage += [pscustomobject][ordered]@{
  judgeKey=$g.Name; labels=@($g.Group.judgeLabel | Sort-Object -Unique)
  appearances=$g.Count; numericValues=@($g.Group | Where-Object {$null -ne $_.value}).Count
  reviewNotes=$content.Count; generalNotes=@($reviews | Where-Object kind -eq 'judge_general_note').Count
  reviewChars=($content.text | Measure-Object -Character).Characters
  rounds=@($g.Group.sheet | Sort-Object -Unique)
  possibleAliasOf=$(if ($g.Name -eq 'ок') {'охуенно культурный'} else {$null})
 }
}
$scoreStats=@()
$first=@($canonical | Where-Object sheet -eq '1 РАУНД (СВОДНАЯ)')
foreach ($jg in $first | Group-Object judgeKey) {
 $xs=@($jg.Group.value | Sort-Object)
 $diffs=@()
 foreach ($o in $jg.Group) {
  $others=@($first | Where-Object { $_.participantKey -eq $o.participantKey -and $_.judgeKey -ne $o.judgeKey })
  $diffs += $o.value-($others.value | Measure-Object -Average).Average
 }
 $scoreStats += [pscustomobject]@{
  judgeKey=$jg.Name; n=$xs.Count; mean=($xs | Measure-Object -Average).Average
  median=($xs[49]+$xs[50])/2; min=$xs[0]; max=$xs[-1]; zeroCount=@($xs | Where-Object {$_ -eq 0}).Count
  meanDifferenceFromOtherFour=($diffs | Measure-Object -Average).Average
  distribution=@($xs | Group-Object | Sort-Object {$_.Group[0]} | ForEach-Object {[pscustomobject]@{score=$_.Group[0];count=$_.Count}})
 }
}
$audit=[pscustomobject][ordered]@{
 generated='2026-10-12'; rawNotes=$notes.Count; rawObservationCells=$allObs.Count; canonicalObservationCells=$canonical.Count
 duplicateFirstRoundCells=$duplicates.Count
 duplicateFirstRoundValueConflicts=@($duplicates | Where-Object {-not $_.sameValue})
 duplicateFirstRoundTextConflicts=@($duplicates | Where-Object {-not $_.sameText})
 noteKinds=@($reviewCorpus | Group-Object kind | ForEach-Object {[pscustomobject]@{kind=$_.Name;count=$_.Count}})
 canonicalNotes=@($reviewCorpus | Where-Object {-not $_.duplicateOf}).Count
 canonicalParticipantReviewNotes=@($reviewCorpus | Where-Object {-not $_.duplicateOf -and $_.kind -eq 'participant_review'}).Count
 identicalPairTextGroups=$pairTexts
 aliasPolicy='Transliteration/typo merges are provisional. ок remains separate; possibleAliasOf=охуенно культурный.'
 coverage=$coverage; firstRoundScoreStats=$scoreStats
}
[IO.File]::WriteAllText((Join-Path $base 'judge-observations.json'), ($canonical | ConvertTo-Json -Depth 12), [Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText((Join-Path $base 'judge-review-corpus.json'), ($reviewCorpus | ConvertTo-Json -Depth 12), [Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText((Join-Path $base 'judge-corpus-audit.json'), ($audit | ConvertTo-Json -Depth 12), [Text.UTF8Encoding]::new($false))
$audit | Select-Object rawNotes,rawObservationCells,canonicalObservationCells,duplicateFirstRoundCells,canonicalNotes,canonicalParticipantReviewNotes,noteKinds | ConvertTo-Json -Depth 8
$coverage | Select-Object judgeKey,reviewNotes,generalNotes,reviewChars | ConvertTo-Json
$scoreStats | Select-Object judgeKey,n,mean,median,zeroCount,meanDifferenceFromOtherFour | ConvertTo-Json
"First-round value conflicts: $(@($audit.duplicateFirstRoundValueConflicts).Count); text conflicts: $(@($audit.duplicateFirstRoundTextConflicts).Count); identical pair text groups: $($pairTexts.Count)"
