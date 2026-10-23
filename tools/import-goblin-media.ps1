param([switch]$RemoveVerifiedOriginals)
$ErrorActionPreference = 'Stop'
$sourceRoot = [IO.Path]::GetFullPath('D:\Music\game\Абстракт\Track 04\Гоблин Ссаблей')
$targetRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\assets\audio\goblin'))
if (-not $targetRoot.StartsWith('D:\Project\Battle\assets\audio\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Unexpected target' }
$names = @{
 'Бидбой демо.mp3'='bitboy-demo.mp3'; 'Бидбой с саундгудизером.mp3'='bitboy-soundgoodizer.mp3'
 'ГРУСТНЫЙ БИТ СМОТРЕЛ НА ДОЖДЬ.mp3'='rain.mp3'; 'Комбуча.mp3'='kombucha.mp3'
 'МИНУС ЧТОБЫ БЕГАТЬ А ПОТОМ ЛЕЖАТЬ.mp3'='run-lie.mp3'; 'МЦ ФИЛЯ ЛУЧШИЙ ГИТАРИСТ.mp3'='filya.mp3'
 'НОВЫЙ БИТ ТАНЦЫ.mp3'='dance.mp3'; 'Очень люблю ватрушек.mp3'='pastry.mp3'
 'Парни, я купил бас.mp3'='bass.mp3'; 'САНЯ РОКЕР.mp3'='rocker.mp3'
 'СИЛЬНЫЙ БИТ С МЦ ФИЛЕЙ НА ГИТАРЕ.mp3'='strong.mp3'; 'СУПЕР БИТ КАК БУДТО СРАЖАЮСЬ.mp3'='fight.mp3'
 'ТАКОЙ НЕПЛОХОЙ БИТ МНЕ НРАВИТСЯ.mp3'='nice.mp3'; 'ТЕВТОНСКИЕ ВОЙНЫ.mp3'='teutonic.mp3'
 'ТОСКЛИВЫЙ МИНУС КАК ВОДКУ ПИЛИ.mp3'='melancholy.mp3'
}
New-Item -ItemType Directory -Path $targetRoot -Force | Out-Null
foreach ($name in $names.Keys) {
 $source = [IO.Path]::GetFullPath((Join-Path $sourceRoot $name))
 $target = Join-Path $targetRoot $names[$name]
 if ([IO.Path]::GetDirectoryName($source) -ne $sourceRoot) { throw 'Source outside intake' }
 if (-not (Test-Path -LiteralPath $source)) {
  if (Test-Path -LiteralPath $target) { continue }
  throw "Missing source: $name"
 }
 $hash = (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash
 if (-not (Test-Path -LiteralPath $target)) { Copy-Item -LiteralPath $source -Destination $target }
 if ((Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash -ne $hash) { throw "Copy mismatch: $name" }
 if ($RemoveVerifiedOriginals) {
  if ((Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash -ne $hash) { throw "Source changed: $name" }
  Remove-Item -LiteralPath $source
 }
}
# Separately attached album tracks are copied, not removed from the user's album.
foreach ($entry in @(@('Аутро.wav','outro.wav'), @('Вайсити.mp3','vicecity.mp3'))) {
 $source = Join-Path 'D:\Music\Неуютная юрта\На растопку жалко' $entry[0]
 $target = Join-Path $targetRoot $entry[1]
 if (-not (Test-Path -LiteralPath $target)) { Copy-Item -LiteralPath $source -Destination $target }
 if ((Get-FileHash -LiteralPath $source).Hash -ne (Get-FileHash -LiteralPath $target).Hash) { throw 'Album copy mismatch' }
}
Write-Output "17 tracks verified in $targetRoot; remove-intake=$RemoveVerifiedOriginals; FL untouched."
