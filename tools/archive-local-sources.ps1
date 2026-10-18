param(
 [string]$WorkspaceRoot = (Split-Path -Parent $PSScriptRoot),
 [string]$BaselinePath = 'artifacts/artem-local-session/baseline.json',
 [switch]$Apply
)
$ErrorActionPreference = 'Stop'
$workspace = [IO.Path]::GetFullPath($WorkspaceRoot)
$baseline = Get-Content -Raw -LiteralPath ([IO.Path]::GetFullPath($BaselinePath)) | ConvertFrom-Json
$inbox = [IO.Path]::GetFullPath((Join-Path $workspace 'Новая папка/beats 90 bpm'))
$library = [IO.Path]::GetFullPath((Join-Path $workspace 'stems/source-library'))
if ($baseline.intakeRoot -ne 'Новая папка/beats 90 bpm') { throw 'Unexpected intake root' }
function Assert-Inside([string]$path, [string]$root) {
 if (-not $path.StartsWith($root + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw "Path escapes named root: $path" }
}
function Assert-NoLinks([string]$path) {
 $current = $path
 while ($current) {
  if (Test-Path -LiteralPath $current) {
   $entry = Get-Item -Force -LiteralPath $current
   if ($entry.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Reparse point rejected: $current" }
  }
  $parent = Split-Path -Parent $current
  if ($parent -eq $current) { break }; $current = $parent
 }
}
function Assert-Original([string]$path, $original) {
 $item = Get-Item -Force -LiteralPath $path
 if ($item.PSIsContainer -or $item.Length -ne $original.bytes -or (Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash.ToLowerInvariant() -ne $original.sha256) { throw "Changed or unrelated original: $path" }
}
Assert-NoLinks $inbox; Assert-NoLinks $library
$mapping = @(); $targets = @{}
foreach ($original in $baseline.intake) {
 $relative = $original.path.Replace('\','/')
 $category = if ($relative -match '^Artem Voice \(10-65 skill\)/[^/]+\.wav$') { 'voices/artem' }
 elseif ($relative -match '^Ura Voice \(0-40 skill\)/[^/]+\.wav$') { 'voices/jura' }
 elseif ($relative -match '^bass(?: [234])?\.mp3$') { 'instruments/bass' }
 elseif ($relative -match '^drumm(?: [234])?\.mp3$') { 'instruments/drums' }
 elseif ($relative -match '^lead(?: [234])?\.mp3$') { 'instruments/lead' }
 else { throw "Unrecognized inventoried source: $relative" }
 $source = [IO.Path]::GetFullPath((Join-Path $inbox $relative))
 $destination = [IO.Path]::GetFullPath((Join-Path $library ($category + '/' + [IO.Path]::GetFileName($source))))
 Assert-Inside $source $inbox; Assert-Inside $destination $library
 Assert-NoLinks $source; Assert-NoLinks $destination
 if ($targets.ContainsKey($destination)) { throw "Destination collision: $destination" }; $targets[$destination] = $true
 $sourceExists = Test-Path -LiteralPath $source
 if ($sourceExists) {
  Assert-Original $source $original
  if (Test-Path -LiteralPath $destination) { throw "Refusing to overwrite destination: $destination" }
 } else { Assert-Original $destination $original }
 $mapping += [ordered]@{oldPath=$baseline.intakeRoot+'/'+$relative;newPath='stems/source-library/'+$category+'/'+[IO.Path]::GetFileName($source);bytes=$original.bytes;sha256=$original.sha256;source=$source;destination=$destination;pending=$sourceExists}
}
$manifestPath = Join-Path $library 'manifest.json'
if (Test-Path -LiteralPath $manifestPath) {
 Assert-NoLinks $manifestPath
 $prior = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
 if ($prior.version -ne 1 -or $prior.intakeRoot -ne $baseline.intakeRoot -or $prior.archiveRoot -ne 'stems/source-library' -or @($prior.originals).Count -ne $mapping.Count) { throw 'Refusing to overwrite unrelated archive manifest' }
 foreach ($entry in $mapping) {
  $found = @($prior.originals | Where-Object { $_.oldPath -eq $entry.oldPath -and $_.newPath -eq $entry.newPath -and $_.bytes -eq $entry.bytes -and $_.sha256 -eq $entry.sha256 })
  if ($found.Count -ne 1) { throw 'Archive manifest does not match verified inventory' }
 }
}
if ($Apply) {
 foreach ($entry in $mapping) {
  if ($entry.pending) {
   # Revalidate immediately before each native literal-path move.
   Assert-Inside $entry.source $inbox; Assert-Inside $entry.destination $library
   Assert-NoLinks $entry.source; Assert-NoLinks $entry.destination
   Assert-Original $entry.source $entry
   if (Test-Path -LiteralPath $entry.destination) { throw "Destination arrived during archive: $($entry.destination)" }
   New-Item -ItemType Directory -Path (Split-Path -Parent $entry.destination) -Force | Out-Null
   Move-Item -LiteralPath $entry.source -Destination $entry.destination
  }
  Assert-Original $entry.destination $entry
 }
 # Only empty, non-reparse child folders are removed. The incoming root remains.
 $directories = @(Get-ChildItem -Directory -Force -Recurse -LiteralPath $inbox | Sort-Object { $_.FullName.Length } -Descending)
 foreach ($directory in $directories) {
  Assert-Inside $directory.FullName $inbox; Assert-NoLinks $directory.FullName
  if (@(Get-ChildItem -Force -LiteralPath $directory.FullName).Count -eq 0) { Remove-Item -LiteralPath $directory.FullName }
 }
 $remaining = @(Get-ChildItem -File -Force -Recurse -LiteralPath $inbox | ForEach-Object FullName)
 $originals = @($mapping | ForEach-Object { [ordered]@{oldPath=$_.oldPath;newPath=$_.newPath;bytes=$_.bytes;sha256=$_.sha256} })
 $manifest = [ordered]@{version=1;intakeRoot=$baseline.intakeRoot;archiveRoot='stems/source-library';originals=$originals;remainingIntakeFiles=$remaining}
 $manifest | ConvertTo-Json -Depth 8 | Set-Content -Encoding utf8 -LiteralPath $manifestPath
 [ordered]@{verified=$mapping.Count;moved=@($mapping | Where-Object pending).Count;remainingIntakeFiles=$remaining;manifest=$manifestPath} | ConvertTo-Json -Depth 4
} else { [ordered]@{validated=$mapping.Count;pending=@($mapping | Where-Object pending).Count;mapping=$mapping} | ConvertTo-Json -Depth 5 }
