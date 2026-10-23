$ErrorActionPreference='Stop'
$base=Join-Path (Get-Location) 'docs/backlog/sources/2026-10-12'
$observations=@(Get-Content -Raw -Encoding UTF8 (Join-Path $base 'judge-observations.json') | ConvertFrom-Json)
$notes=@(Get-Content -Raw -Encoding UTF8 (Join-Path $base 'judge-review-corpus.json') | ConvertFrom-Json)
function Median($values) { $xs=@($values | Sort-Object); if (-not $xs.Count) {return $null}; $k=[int][math]::Floor($xs.Count/2); if ($xs.Count%2) {return $xs[$k]}; return ($xs[$k-1]+$xs[$k])/2 }
$decisions=[Collections.Generic.List[object]]::new()
foreach ($g in $observations | Where-Object valueKind -eq 'pair_vote' | Group-Object {$_.sheet+'|'+$_.pair+'|'+$_.judgeKey}) {
 $pair=@($g.Group | Sort-Object cell); $known=@($pair | Where-Object {$null -ne $_.value})
 $status=if ($known.Count -eq 2 -and ($known.value | Measure-Object -Sum).Sum -eq 1 -and @($known | Where-Object {$_.value -notin @(0,1)}).Count -eq 0) {'complete_comparison'} elseif ($known.Count -eq 1) {'one_value_only'} elseif (-not $known.Count) {'no_values'} else {'other_inconsistent'}
 $winner=if ($status -eq 'complete_comparison') {($known | Where-Object value -eq 1).participant} else {$null}
 $decisions.Add([pscustomobject]@{sheet=$pair[0].sheet; pair=$pair[0].pair; judgeKey=$pair[0].judgeKey; status=$status; winner=$winner; refs=@($pair.sourceRef)})
}
$metrics=@()
foreach ($g in $observations | Group-Object judgeKey | Sort-Object Name) {
 $nr=@($notes | Where-Object {$_.judgeKey -eq $g.Name -and $_.kind -eq 'participant_review' -and -not $_.duplicateOf})
 $ds=@($decisions | Where-Object {$_.judgeKey -eq $g.Name -and $_.status -eq 'complete_comparison'})
 $agree=0; $disagree=0; $tie=0
 foreach ($d in $ds) {
  $others=@($decisions | Where-Object {$_.sheet -eq $d.sheet -and $_.pair -eq $d.pair -and $_.judgeKey -ne $d.judgeKey -and $_.status -eq 'complete_comparison'})
  $grouped=@($others | Group-Object winner | Sort-Object Count -Descending)
  if (-not $grouped.Count -or ($grouped.Count -gt 1 -and $grouped[0].Count -eq $grouped[1].Count)) {$tie++;continue}
  if ($grouped[0].Name -eq $d.winner) {$agree++} else {$disagree++}
 }
 $metrics += [pscustomobject][ordered]@{judgeKey=$g.Name; reviewNotes=$nr.Count; medianReviewChars=(Median @($nr | ForEach-Object {$_.text.Length})); minReviewChars=($nr | ForEach-Object {$_.text.Length} | Measure-Object -Minimum).Minimum; maxReviewChars=($nr | ForEach-Object {$_.text.Length} | Measure-Object -Maximum).Maximum; completePairComparisons=$ds.Count; agreesWithOtherJudgesMajority=$agree; disagreesWithOtherJudgesMajority=$disagree; otherJudgesTiedOrAbsent=$tie}
}
$byRound=@($decisions | Group-Object sheet | ForEach-Object {[pscustomobject]@{sheet=$_.Name; statuses=@($_.Group | Group-Object status | ForEach-Object {[pscustomobject]@{status=$_.Name;count=$_.Count}})}})
$result=[pscustomobject]@{generated='2026-10-12'; methodology='Only two observed complementary 0/1 values count as a comparison. Majority excludes current judge and collective НАРОД; a majority is not ground truth. Counts are descriptive; no preference weights inferred.'; judges=$metrics; roundPairCoverage=$byRound; decisions=$decisions}
[IO.File]::WriteAllText((Join-Path $base 'judge-descriptive-metrics.json'),($result | ConvertTo-Json -Depth 12),[Text.UTF8Encoding]::new($false))
$metrics | ConvertTo-Json
$byRound | ConvertTo-Json -Depth 6
