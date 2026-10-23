param(
 [Parameter(Mandatory=$true)][string]$ManifestPath,
 [Parameter(Mandatory=$true)][string]$VerificationPath,
 [switch]$Apply
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$workspace = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$batch = 'abstract-20261020-v1'
function Assert-Absolute([string]$value) {
 if (-not [IO.Path]::IsPathFullyQualified($value) -or [IO.Path]::GetFullPath($value) -ine $value) { throw "Noncanonical absolute path: $value" }
}
function Assert-Inside([string]$value,[string]$root) {
 if (-not $value.StartsWith($root + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw "Path escapes approved root: $value" }
}
function Assert-NoLinks([string]$value) {
 Assert-Absolute $value
 $current = $value
 while ($current) {
  $item = Get-Item -Force -LiteralPath $current -ErrorAction SilentlyContinue
  if ($null -ne $item -and ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw "Reparse point rejected: $current" }
  $parent = Split-Path -Parent $current
  if ($parent -eq $current) { break }; $current = $parent
 }
}
function Assert-Bytes([string]$value,$row) {
 Assert-NoLinks $value
 $item = Get-Item -Force -LiteralPath $value
 if ($item.PSIsContainer -or $item.Length -ne $row.bytes -or (Get-FileHash -Algorithm SHA256 -LiteralPath $value).Hash.ToLowerInvariant() -cne $row.sha256) { throw "Inventoried bytes changed: $value" }
}
function Assert-Digest($row) {
 if ($row.bytes -isnot [long] -and $row.bytes -isnot [int]) { throw 'Invalid byte count' }
 if ($row.bytes -lt 0 -or $row.sha256 -cnotmatch '^[a-f0-9]{64}$') { throw 'Invalid bytes/hash' }
}
Assert-Absolute $ManifestPath; Assert-Absolute $VerificationPath
Assert-Inside $ManifestPath $workspace; Assert-Inside $VerificationPath $workspace
Assert-NoLinks $ManifestPath; Assert-NoLinks $VerificationPath
$manifest = Get-Content -Raw -LiteralPath $ManifestPath | ConvertFrom-Json
$proof = Get-Content -Raw -LiteralPath $VerificationPath | ConvertFrom-Json
if ($manifest.version -ne 1 -or $manifest.batch -cne $batch -or @($manifest.sources).Count -ne 255) { throw 'Invalid intake manifest' }
foreach ($root in @($manifest.abstractRoot,$manifest.experimentalRoot,$manifest.libraryRoot)) { Assert-Absolute $root; Assert-NoLinks $root }
$production = $manifest.abstractRoot -ceq 'D:\Music\game\Абстракт' -and $manifest.experimentalRoot -ceq 'D:\Music\game\Эксперементал' -and $manifest.libraryRoot -ieq (Join-Path $workspace 'stems/source-library')
if ($production) {
 if ($ManifestPath -ine (Join-Path $manifest.libraryRoot "batches/$batch.json")) { throw 'Unexpected production manifest location' }
} else {
 # Synthetic proof may only authorize files in this worktree's D: test sandbox.
 $fixtureRoot = Split-Path -Parent $manifest.abstractRoot
 Assert-Inside $fixtureRoot (Join-Path $workspace 'artifacts/test-temp')
 if ($fixtureRoot -notmatch '^D:\\' -or (Split-Path -Leaf $fixtureRoot) -cnotmatch '^abstract-intake-[a-zA-Z0-9]+$' -or
     $manifest.abstractRoot -cne (Join-Path $fixtureRoot 'Абстракт') -or
     $manifest.experimentalRoot -cne (Join-Path $fixtureRoot 'Эксперементал') -or
     $manifest.libraryRoot -cne (Join-Path $fixtureRoot 'source-library')) { throw 'Unapproved intake roots' }
 Assert-Inside $ManifestPath $fixtureRoot; Assert-Inside $VerificationPath $fixtureRoot
}
$manifestHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $ManifestPath).Hash.ToLowerInvariant()
foreach ($flag in @('ok','testsPassed','browserPassed','assetsVerified')) {
 if ($proof.$flag -isnot [bool] -or $proof.$flag -ne $true) { throw "Verification flag must be boolean true: $flag" }
}
if ($proof.version -ne 1 -or $proof.batch -cne $batch -or $proof.manifestSha256 -cne $manifestHash) { throw 'Verification does not authorize this exact manifest' }
if (@($proof.preparedManifestHashes).Count -eq 0) { throw 'Missing prepared manifest hashes' }
$preparedPaths = @{}
foreach ($entry in @($proof.preparedManifestHashes)) {
 Assert-Absolute $entry.path; Assert-Inside $entry.path $workspace; Assert-NoLinks $entry.path
 if ($preparedPaths.ContainsKey($entry.path) -or $entry.sha256 -cnotmatch '^[a-f0-9]{64}$' -or
     (Get-FileHash -Algorithm SHA256 -LiteralPath $entry.path).Hash.ToLowerInvariant() -cne $entry.sha256) { throw 'Prepared manifest hash mismatch' }
 $preparedPaths[$entry.path] = $true
}
if (@($proof.approvedSourceRows).Count -ne 255) { throw 'Missing approved source rows' }
$approved = @{}
foreach ($row in @($proof.approvedSourceRows)) {
 if ($approved.ContainsKey($row.source)) { throw 'Duplicate approved source' }
 $approved[$row.source] = $row
}
$counts = @{abstract=0;experimental=0;'voice-danya'=0;'voice-kapa'=0}
$familyCounts = @{'Track 01'=9;'Track 02'=11;'Track 03'=7;'Track 04'=20}
$danielTracks = @(2,3,8,9,10,11,12,13,15,16,17,19,20,21,22,25,26,27,29,31,33,34,35,37,39,41,42,43,45,47,48,51,52)
$sources = @{}; $targets = @{}; $triples = @{}; $mapping = @()
foreach ($row in @($manifest.sources)) {
 Assert-Absolute $row.source; Assert-Absolute $row.destination; Assert-Digest $row
 Assert-NoLinks $row.source; Assert-NoLinks $row.destination
 if ($sources.ContainsKey($row.source) -or $targets.ContainsKey($row.destination)) { throw 'Duplicate source or destination' }
 $sources[$row.source]=$true; $targets[$row.destination]=$true
 if (-not $approved.ContainsKey($row.source)) { throw 'Source not approved in verification' }
 foreach ($field in @('source','destination','role','family','index','bytes','sha256')) {
  if ($row.$field -cne $approved[$row.source].$field) { throw "Approved row mismatch: $field" }
 }
 $expectedDestination = $null
 if ($row.source.StartsWith($manifest.abstractRoot + '\',[StringComparison]::OrdinalIgnoreCase)) {
  $relative = $row.source.Substring($manifest.abstractRoot.Length + 1)
  if ($relative -cmatch '^(Track 0[1-4])\\([^\\]+)$') {
   $family = $Matches[1]; $name = $Matches[2]
   if ($name -match '^(bass|drum|drumm|lead) ([1-9]\d*)\.mp3$') {
    $rawRole = $Matches[1].ToLowerInvariant(); $index = [int]$Matches[2]
    $role = if ($rawRole.StartsWith('drum')) { 'drums' } else { $rawRole }
    $drumName = if ($family -ceq 'Track 03') { 'drumm' } else { 'drum' }
    if ($index -gt $familyCounts[$family] -or ($role -eq 'drums' -and $rawRole -cne $drumName) -or $row.family -cne $family -or $row.role -cne $role -or $row.index -ne $index) { throw 'Invalid instrumental row' }
    $key = "$family/$index/$role"
    if ($triples.ContainsKey($key)) { throw 'Duplicate instrumental role' }; $triples[$key]=$true
    $expectedDestination = Join-Path $manifest.libraryRoot "instruments/$batch/$($family.ToLowerInvariant().Replace(' ','-'))/$role/$name"
    $counts.abstract++
   }
  } elseif ($relative -cmatch '^(Даня Войс|Капа Войс)\\([^\\]+)$') {
   $daniel = $Matches[1] -ceq 'Даня Войс'; $name = $Matches[2]
   $prefix = if ($daniel) { 'Даниил' } else { 'Капа' }
   if ($name -cmatch "^$prefix - (REC(?:_([1-9]\d*))?|Track ([1-9]\d*))\.wav`$") {
    $rec = $Matches[2]; $track = $Matches[3]
    $maxRec = if ($daniel) { 18 } else { 49 }
    if ($track) { $valid = if ($daniel) { [int]$track -in $danielTracks } else { $track -ceq '1' } }
    else { $valid = -not $rec -or ([int]$rec -ge 2 -and [int]$rec -le $maxRec) }
    $role = if ($daniel) { 'voice-danya' } else { 'voice-kapa' }
    if (-not $valid -or $row.role -cne $role -or $null -ne $row.family -or $null -ne $row.index) { throw 'Invalid voice row' }
    $speaker = if ($daniel) { 'danya' } else { 'kapa' }
    $expectedDestination = Join-Path $manifest.libraryRoot "voices/$speaker/$batch/$name"
    $counts[$role]++
   }
  }
 } elseif ((Split-Path -Parent $row.source) -ceq $manifest.experimentalRoot -and (Split-Path -Leaf $row.source) -match '^lead ([1-9]\d*)\.mp3$') {
  $index = [int]$Matches[1]
  if ($index -gt 13 -or $row.family -cne 'experimental' -or $row.role -cne 'lead' -or $row.index -ne $index) { throw 'Invalid experimental row' }
  $expectedDestination = Join-Path $manifest.libraryRoot "instruments/$batch/experimental/lead/$(Split-Path -Leaf $row.source)"
  $counts.experimental++
 }
 if (-not $expectedDestination -or $row.destination -cne $expectedDestination) { throw "Unapproved mapping: $($row.source)" }
 Assert-Bytes $row.destination $row
 $pending = Test-Path -LiteralPath $row.source
 if ($pending) { Assert-Bytes $row.source $row }
 $mapping += [pscustomobject]@{row=$row;pending=$pending}
}
if ($counts.abstract -ne 141 -or $counts.experimental -ne 13 -or $counts['voice-danya'] -ne 51 -or $counts['voice-kapa'] -ne 50) { throw 'Unexpected source categories' }
foreach ($family in $familyCounts.Keys) {
 for ($i=1; $i -le $familyCounts[$family]; $i++) {
  foreach ($role in @('bass','drums','lead')) { if (-not $triples.ContainsKey("$family/$i/$role")) { throw 'Incomplete instrumental triple' } }
 }
}
foreach ($row in @($manifest.excluded)) {
 Assert-Absolute $row.path; Assert-Digest $row
 if ($sources.ContainsKey($row.path) -or (-not $row.path.StartsWith($manifest.abstractRoot + '\',[StringComparison]::OrdinalIgnoreCase) -and -not $row.path.StartsWith($manifest.experimentalRoot + '\',[StringComparison]::OrdinalIgnoreCase))) { throw 'Invalid excluded path' }
 Assert-Bytes $row.path $row
}
$removed = 0
if ($Apply) {
 foreach ($entry in $mapping) {
  if ($entry.pending) {
   # Repeat all deletion-adjacent checks; remove one exact verified file, never a tree.
   Assert-NoLinks $entry.row.source; Assert-NoLinks $entry.row.destination
   Assert-Bytes $entry.row.source $entry.row; Assert-Bytes $entry.row.destination $entry.row
   Remove-Item -LiteralPath $entry.row.source
   $removed++
  }
 }
}
[ordered]@{batch=$batch;verified=$mapping.Count;pending=@($mapping | Where-Object pending).Count;removed=$removed;applied=[bool]$Apply;manifestSha256=$manifestHash} | ConvertTo-Json
