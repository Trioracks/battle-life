param([string]$ProjectRoot = 'D:\Project\Battle')
$ErrorActionPreference = 'Stop'
$backlogRoot = Join-Path $ProjectRoot 'docs\backlog'
$policy = Get-Content -LiteralPath (Join-Path $backlogRoot 'judge-comment-policy-v0.2.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$registry = @{}
foreach ($trigger in $policy.triggerRegistry) { $registry[$trigger.tag] = $trigger.label }
$prefixes = @{ 'eparhiya'='EP'; 'klim-propavshiy'='KL'; 'svinoferma'='SV'; 'thirty-third'='TT' }
$summary = @()
$allComments = @()
function Add-Requirement($row,[string]$text) {
  if (@($row.requires) -notcontains $text) { $row.requires = @($row.requires) + @($text) }
}
function Escape-Cell([string]$text) {
  return $text.Replace('|','\|').Replace([Environment]::NewLine,'<br>').Replace([string][char]10,'<br>')
}
foreach ($bank in $policy.banks) {
  $path = Join-Path $backlogRoot $bank.path
  $data = Get-Content -LiteralPath $path -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($data.judgeId -ne $bank.judgeId) { throw "Judge mismatch: $path" }
  if ($data.rows.Count -ne 81) { throw "Expected 81 rows: $path" }
  if (@($data.rows.id | Select-Object -Unique).Count -ne 81) { throw "Duplicate IDs: $path" }
  if (@($data.rows.comment | Select-Object -Unique).Count -ne 81) { throw "Duplicate texts: $path" }
  foreach ($row in $data.rows) {
    if (-not $registry.ContainsKey($row.trigger)) { throw "Unregistered trigger: $($row.id)" }
    foreach ($field in @('criterion','trigger','comment','family','length')) {
      if ([string]::IsNullOrWhiteSpace([string]$row.$field)) { throw "Missing $field at $($row.id)" }
    }
    if ($row.length -notin @('micro','short','medium','long')) { throw "Invalid length: $($row.id)" }
    if ($row.trigger -match '^text\.reference\.') {
      Add-Requirement $row 'Отсылка существует в сохранённой версии; игровой судья знаком с её источником.'
    }
    if ($row.trigger -eq 'vocal.diction.good') {
      Add-Requirement $row 'Техническая слышимость позволяет судье различить чётко произносимые слова.'
    }
    if ($row.trigger -match '^pair\.') {
      Add-Requirement $row 'Разница считается после форматной поправки, до строгости, ограничения и округления.'
    }
    if ($row.trigger -match '^format\.') {
      Add-Requirement $row 'Профиль площадки и отношение судьи заданы до оценки, а не выбраны под реплику.'
    }
    if ($row.trigger -match '^(text|vocal)\.' -and $row.trigger -notmatch '^text\.reference\.') {
      Add-Requirement $row 'Указанный аспект доступен восприятию судьи в этой версии, а не полностью скрыт записью.'
    }
    foreach ($match in [regex]::Matches($row.comment,'\{([^}]+)\}')) {
      if ($match.Groups[1].Value -notin @('referenceTitle','expectedStyle')) { throw "Unknown slot: $($row.id)" }
      if (@($row.requires).Count -eq 0) { throw "Slot lacks context: $($row.id)" }
    }
    $allComments += [pscustomobject]@{judgeId=$data.judgeId;id=$row.id;text=$row.comment.Trim().ToLowerInvariant();length=$row.length}
  }
  for ($i=0; $i -lt 81; $i++) {
    $expected = $prefixes[$data.judgeId] + '-' + ($i+1).ToString('00')
    if ($data.rows[$i].id -ne $expected) { throw "Sequence mismatch: $expected" }
  }
  $good = @($data.rows | Where-Object trigger -eq 'text.rhymes.good').Count
  $bad = @($data.rows | Where-Object trigger -eq 'text.rhymes.bad').Count
  if ($good -ne 10 -or $bad -ne 10) { throw "Rhyme coverage mismatch: $path" }
  $covered = @($data.rows.trigger | Select-Object -Unique)
  if ($covered.Count -ne $registry.Count) { throw "Trigger coverage incomplete: $path" }
  [IO.File]::WriteAllText($path,($data | ConvertTo-Json -Depth 30),[Text.UTF8Encoding]::new($false))
  $lines = @(
    ('# ' + $data.judgeName + ' — живые игровые реплики'),
    '',
    '81 новый комментарий. Это авторские игровые примеры по исследованной манере, не исторические цитаты и не результат прослушивания новых треков.',
    '',
    ('[Общая политика, связь с производством и формат баттла](../2026-10-12-live-judge-comments.md). [JSON для разработки](' + $data.judgeId + '.json).'),
    '',
    'Условие — результат конкретного аспекта и реакция судьи, а не величина навыка или сырого ползунка. Все дополнительные условия обязательны. Форматные варианты с высокой/низкой значимостью описывают разные заданные конфигурации; они не переключают коэффициент случайно. Балл и голос отображаются отдельно от комментария.',
    '',
    'Строки 01–18: текст; 19–36: бит; 37–42: вокал; 43–60: отсылки, сочетания, исход пары, звук и история; 61–65: формат; 66–81: дополнительные реакции на рифмы.',
    '',
    '| ID | Когда использовать | Комментарий | Дополнительные условия |',
    '| --- | --- | --- | --- |'
  )
  foreach ($row in $data.rows) {
    $requires = if (@($row.requires).Count) { @($row.requires | ForEach-Object { Escape-Cell $_ }) -join '<br>' } else { 'Достаточно указанного триггера.' }
    $lines += '| ' + $row.id + ' | ' + (Escape-Cell $registry[$row.trigger]) + ' | ' + (Escape-Cell $row.comment) + ' | ' + $requires + ' |'
  }
  $markdownPath = Join-Path (Split-Path $path -Parent) ($data.judgeId+'.md')
  [IO.File]::WriteAllText($markdownPath,($lines -join [Environment]::NewLine)+[Environment]::NewLine,[Text.UTF8Encoding]::new($false))
  $actual = Get-Content -LiteralPath $markdownPath -Encoding UTF8
  if (@($actual | Where-Object { $_ -match '^\| (EP|KL|SV|TT)-\d+ \|' }).Count -ne 81) { throw "Table row loss: $markdownPath" }
  $summary += [ordered]@{judgeId=$data.judgeId;comments=81;triggerFamilies=$covered.Count;positiveRhymes=$good;negativeRhymes=$bad;table=[IO.Path]::GetFileName($markdownPath)}
}
$duplicates = @($allComments | Group-Object text | Where-Object { $_.Count -gt 1 })
$substantiveDuplicates = @($duplicates | Where-Object { @($_.Group | Where-Object length -ne 'micro').Count -gt 0 })
if ($substantiveDuplicates.Count) { throw ('Duplicate substantive comments: '+($substantiveDuplicates.Name -join '; ')) }
$verification = [ordered]@{
  verified=$true;comments=$allComments.Count;judges=$summary;registeredTriggers=$registry.Count
  duplicateSubstantiveTextsAcrossJudges=$substantiveDuplicates.Count
  sharedMicroReactions=@($duplicates | ForEach-Object { [ordered]@{text=$_.Name;count=$_.Count} })
  verificationScope='Saved JSON schema, IDs, trigger coverage, rhyme counts, conditions/slots and rendered Markdown row counts; manual editorial review separately performed'
  gameIntegrationTested=$false;fiftyTrackNoveltySimulationRun=$false
}
[IO.File]::WriteAllText((Join-Path $backlogRoot 'judge-comments-verification.json'),($verification | ConvertTo-Json -Depth 10),[Text.UTF8Encoding]::new($false))
$verification | ConvertTo-Json -Depth 10
