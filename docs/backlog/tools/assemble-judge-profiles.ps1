param([string]$ProjectRoot='D:\Project\Battle')
$ErrorActionPreference='Stop'
$base=Join-Path $ProjectRoot 'docs/backlog/sources/2026-10-12'
$folder=Join-Path $ProjectRoot 'docs/backlog/judges'
$audit=Get-Content -Raw -Encoding UTF8 (Join-Path $base 'judge-corpus-audit.json') | ConvertFrom-Json
$metrics=Get-Content -Raw -Encoding UTF8 (Join-Path $base 'judge-descriptive-metrics.json') | ConvertFrom-Json
$ids=@{
 'атака трупа'='corpse-attack'; 'гексмалыш'='hexmalysh'; 'гешуль'='geshul'; 'доббро'='dobbro'
 'епархия'='eparhiya'; 'клим пропавший'='klim-propavshiy'; 'козачок'='kozachok'
 'мц варг пиночетский'='mc-varg-pinochetskiy'; 'мц онегин'='mc-onegin'; 'нагвальный'='nagvalny'
 'ок'='ok-unconfirmed'; 'охуенно культурный'='ohuyenno-kulturny'; 'рыцарь таверны'='tavern-knight'
 'свиноферма'='svinoferma'; 'тридцать третий'='thirty-third'; 'херова жесть'='herova-zhest'
 'abstract postmodern!'='abstract-postmodern'; 'alx beats'='alx-beats'; 'benarfa'='benarfa'; 'cenobite'='cenobite'
 'cyber olegi'='cyber-olegi'; 'dead rave'='dead-rave'; 'jakorja'='jakorja'; 'kosh (spacecave)'='kosh-spacecave'
 'nedonebo'='nedonebo'; 'pavelunderground'='pavel-underground'; "prikol'chique"='prikolchique'
 'svetokron'='svetokron'; 'whitespruce'='whitespruce'; 'zoo in space'='zoo-in-space'
}
$entries=[Collections.Generic.List[object]]::new()
foreach ($file in @('core-profiles.json','thirty-third-profile.json','later-profiles.json')) {
 $loaded=@(Get-Content -Raw -Encoding UTF8 (Join-Path $folder $file) | ConvertFrom-Json)
 foreach ($p in $loaded) {$entries.Add($p)}
}
$attack=[pscustomobject]@{
 judgeKey='атака трупа'; confidence='insufficient'
 observedPriorities=@()
 decisionPatterns=@()
 voice='Письменной манеры в источнике нет. Любой будущий стиль реплик будет авторской игровой настройкой.'
 limitations=@('100 баллов по общей сотне работ позволяют описать строгость шкалы, но не музыкальный вкус.','Нулевые оценки не объявляются неявками.','Нет оснований выводить личность, предпочтения и собственные музыкальные навыки.')
 evidenceRefs=@('1 РАУНД (СВОДНАЯ)!D2','1 РАУНД (СВОДНАЯ)!D35','1 РАУНД (СВОДНАЯ)!D101')
}
$entries.Add($attack)
$profiles=@()
foreach ($p in $entries | Sort-Object judgeKey) {
 $key=$p.judgeKey
 if (-not $ids.ContainsKey($key)) {throw "Unknown judge key $key"}
 $coverage=@($audit.coverage | Where-Object judgeKey -eq $key)
 $metric=@($metrics.judges | Where-Object judgeKey -eq $key)
 if ($coverage.Count -ne 1 -or $metric.Count -ne 1) {throw "Missing unique coverage for $key"}
 $profileDoc=if ($key -in @('епархия','клим пропавший','свиноферма')) {'docs/backlog/judges/core-judges.md'} elseif ($key -eq 'тридцать третий') {'docs/backlog/judges/thirty-third.md'} elseif ($key -eq 'атака трупа') {'docs/backlog/2026-10-12-judge-behavior-guide.md'} else {'docs/backlog/judges/later-judges.md'}
 $p | Add-Member -NotePropertyName id -NotePropertyValue $ids[$key] -Force
 $p | Add-Member -NotePropertyName sourceLabels -NotePropertyValue @($coverage[0].labels) -Force
 $p | Add-Member -NotePropertyName profileDocument -NotePropertyValue $profileDoc -Force
 $p | Add-Member -NotePropertyName rounds -NotePropertyValue @($coverage[0].rounds) -Force
 $p | Add-Member -NotePropertyName sourceCoverage -NotePropertyValue $coverage[0] -Force
 $p | Add-Member -NotePropertyName descriptiveMetrics -NotePropertyValue $metric[0] -Force
 $p | Add-Member -NotePropertyName firstRoundScale -NotePropertyValue @($audit.firstRoundScoreStats | Where-Object judgeKey -eq $key) -Force
 $p | Add-Member -NotePropertyName numericWeights -NotePropertyValue $null -Force
 $p | Add-Member -NotePropertyName identityStatus -NotePropertyValue $(if (@($coverage[0].labels).Count -gt 1) {'provisional_alias_merge'} else {'source_label_group'}) -Force
 $p | Add-Member -NotePropertyName possibleAliasOf -NotePropertyValue $(if ($key -eq 'ок') {'ohuyenno-kulturny'} else {$null}) -Force
 $profiles += $p
}
if ($profiles.Count -ne 30) {throw "Expected 30 profiles; got $($profiles.Count)"}
$result=[pscustomobject][ordered]@{
 version=1; generated='2026-10-12'; status='research_profiles_not_runtime_game_configuration'
 sourceUrl='https://docs.google.com/spreadsheets/d/169iocNcf92Ay2we8zweD-AkuxRYPRNMZxS1yhqwQmTo/edit?gid=215411653#gid=215411653'
 notes=@(
 'Qualitative hypotheses anchored in expressed source reasons; confidence does not measure prediction accuracy.',
 'Numeric weights remain null. No audio listening, model fitting or predictive accuracy evaluation has been performed.',
 'IDs are fixed research identities; append new IDs rather than renumbering. Confirm alias merges before production import.',
 'ок remains separate pending confirmation; combining with охуенно культурный would leave 29 groups.',
 'Comment subject may differ from row participant; consult judge-comment-attribution.json.',
 'Do not invent unknown track facts, quoted lyrics, personal history or reasons based only on a vote.'
 )
 rawJudgeNameVariants=40; workingJudgeGroups=30; profiles=$profiles
}
[IO.File]::WriteAllText((Join-Path $base 'judge-profiles.json'),($result | ConvertTo-Json -Depth 18),[Text.UTF8Encoding]::new($false))
$profiles | ForEach-Object {
 [pscustomobject][ordered]@{
  id=$_.id; judge=$_.judgeKey; aliases=($_.sourceLabels -join ' / ')
  reviewNotes=$_.sourceCoverage.reviewNotes; generalNotes=$_.sourceCoverage.generalNotes
  confidence=$_.confidence; medianReviewChars=$_.descriptiveMetrics.medianReviewChars
  priorities=($_.observedPriorities -join ' | '); voice=$_.voice; profileDocument=$_.profileDocument
 }
} | Export-Csv -LiteralPath (Join-Path $base 'judge-profile-register.csv') -Delimiter ';' -NoTypeInformation -Encoding UTF8
[pscustomobject]@{profiles=$profiles.Count; keys=@($profiles.judgeKey); output='judge-profiles.json'; csv='judge-profile-register.csv'}
