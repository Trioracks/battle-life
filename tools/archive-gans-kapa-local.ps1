param([string]$WorkspaceRoot = (Split-Path -Parent $PSScriptRoot), [string]$BaselinePath = 'artifacts/gans-mix-session/baseline.json', [switch]$Apply)
$ErrorActionPreference = 'Stop'
$workspace = [IO.Path]::GetFullPath($WorkspaceRoot)
$batch = 'gans-kapa-20261018-v1'
$intakeRelative = 'Новая папка/beats 90 bpm'
$excluded = $intakeRelative + '/skill 0 to 50 beatmaking.mp3'
$inbox = [IO.Path]::GetFullPath((Join-Path $workspace $intakeRelative))
$library = [IO.Path]::GetFullPath((Join-Path $workspace 'stems/source-library'))
function Assert-Inside([string]$path,[string]$root) {
 if (-not $path.StartsWith($root + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw "Path escapes root: $path" }
}
function Assert-NoLinks([string]$path) {
 $current = $path
 while ($current) {
  if (Test-Path -LiteralPath $current) {
   if ((Get-Item -Force -LiteralPath $current).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Reparse point rejected: $current" }
  }
  $parent = Split-Path -Parent $current
  if ($parent -eq $current) { break }; $current = $parent
 }
}
function Assert-Original([string]$path,$row) {
 $item = Get-Item -Force -LiteralPath $path
 if ($item.PSIsContainer -or $item.Length -ne $row.bytes -or (Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash.ToLowerInvariant() -cne $row.sha256) { throw "Source bytes differ from baseline: $path" }
}
Assert-NoLinks $workspace
Assert-Inside $inbox $workspace; Assert-Inside $library $workspace
$baselineFull = if ([IO.Path]::IsPathRooted($BaselinePath)) { [IO.Path]::GetFullPath($BaselinePath) } else { [IO.Path]::GetFullPath((Join-Path $workspace $BaselinePath)) }
Assert-Inside $baselineFull $workspace; Assert-NoLinks $baselineFull
$baseline = Get-Content -Raw -LiteralPath $baselineFull | ConvertFrom-Json
if ($baseline.excluded.path -cne $excluded) { throw 'Unexpected excluded path' }
$incoming = @($baseline.rows | Where-Object { $_.incoming -eq $true })
if ($incoming.Count -ne 108) { throw 'Expected exactly 108 approved originals' }
$mapping = @(); $targets = @{}; $sources = @{}; $counts = @{gans=0;kapa=0;instruments=0}
foreach ($row in $incoming) {
 $relative = [string]$row.path
 if ($relative -match '\\|(^|/)\.\.?(/|$)' -or $relative -ceq $excluded -or $row.sha256 -cnotmatch '^[0-9a-f]{64}$' -or $row.bytes -le 0) { throw "Invalid inventoried path or hash: $relative" }
 if ($relative -cmatch '^Новая папка/beats 90 bpm/Gans \(skill 0-50\)/[^/:]+\.wav$') { $category="voices/gans/$batch"; $counts.gans++ }
 elseif ($relative -cmatch '^Новая папка/beats 90 bpm/Kapa \(skill 0-40\)/[^/:]+\.wav$') { $category="voices/kapa/$batch"; $counts.kapa++ }
 elseif ($relative -cmatch '^Новая папка/beats 90 bpm/(bass|drumm|lead) [123]\.mp3$') { $part=@{bass='bass';drumm='drums';lead='lead'}[$Matches[1]]; $category="instruments/$batch/$part"; $counts.instruments++ }
 else { throw "Unapproved source: $relative" }
 $source = [IO.Path]::GetFullPath((Join-Path $workspace $relative))
 $newPath = 'stems/source-library/'+$category+'/'+[IO.Path]::GetFileName($source)
 $destination = [IO.Path]::GetFullPath((Join-Path $workspace $newPath))
 Assert-Inside $source $inbox; Assert-Inside $destination $library
 Assert-NoLinks $source; Assert-NoLinks $destination
 if ($targets.ContainsKey($destination) -or $sources.ContainsKey($source)) { throw 'Duplicate inventoried source or destination' }
 $targets[$destination]=$true; $sources[$source]=$true
 $pending = Test-Path -LiteralPath $source
 if ($pending) {
  Assert-Original $source $row
  if (Test-Path -LiteralPath $destination) { throw "Refusing to overwrite destination: $destination" }
 } else { Assert-Original $destination $row }
 $mapping += [ordered]@{oldPath=$relative;newPath=$newPath;bytes=$row.bytes;sha256=$row.sha256;source=$source;destination=$destination;pending=$pending}
}
if ($counts.gans -ne 49 -or $counts.kapa -ne 50 -or $counts.instruments -ne 9) { throw 'Unexpected approved source categories' }
$originals = @($mapping | ForEach-Object { [ordered]@{oldPath=$_.oldPath;newPath=$_.newPath;bytes=$_.bytes;sha256=$_.sha256} })
$manifest = [ordered]@{version=1;batch=$batch;intakeRoot=$intakeRelative;archiveRoot='stems/source-library';excludedPath=$excluded;existingLibrary='preserved; additive batch only';originals=$originals}
$manifestPath = Join-Path $library "batches/$batch.json"
Assert-NoLinks $manifestPath
if (Test-Path -LiteralPath $manifestPath) {
 $prior = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
 if (($prior | ConvertTo-Json -Depth 8 -Compress) -cne ($manifest | ConvertTo-Json -Depth 8 -Compress)) { throw 'Existing batch manifest differs; refusing overwrite' }
}
if ($Apply) {
 # All 108 destinations and source hashes have passed before the first move.
 foreach ($entry in $mapping) {
  if ($entry.pending) {
   Assert-Inside $entry.source $inbox; Assert-Inside $entry.destination $library
   Assert-NoLinks $entry.source; Assert-NoLinks $entry.destination; Assert-Original $entry.source $entry
   if (Test-Path -LiteralPath $entry.destination) { throw 'Destination arrived during archive' }
   New-Item -ItemType Directory -Path (Split-Path -Parent $entry.destination) -Force | Out-Null
   Move-Item -LiteralPath $entry.source -Destination $entry.destination
  }
  Assert-Original $entry.destination $entry
 }
 if (-not (Test-Path -LiteralPath $manifestPath)) {
  New-Item -ItemType Directory -Path (Split-Path -Parent $manifestPath) -Force | Out-Null
  New-Item -ItemType File -Path $manifestPath -Value (($manifest | ConvertTo-Json -Depth 8) + "`n") | Out-Null
 }
 [ordered]@{verified=$mapping.Count;moved=@($mapping | Where-Object pending).Count;manifest=$manifestPath;excludedPath=$excluded} | ConvertTo-Json
} else { [ordered]@{validated=$mapping.Count;pending=@($mapping | Where-Object pending).Count;manifest=$manifestPath} | ConvertTo-Json }
