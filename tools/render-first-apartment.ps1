param(
  [string]$Blender = 'D:\Codex\Tools\Blender\blender-4.5.9-windows-x64\blender.exe',
  [string]$Scene = (Join-Path $PSScriptRoot '..\assets\source\apartment-first-location.blend'),
  [string]$Output = (Join-Path $PSScriptRoot '..\artifacts\first-apartment-seat')
)

$scenePath = [System.IO.Path]::GetFullPath($Scene)
$outputPath = [System.IO.Path]::GetFullPath($Output)
$outputDirectory = Split-Path -Parent $outputPath
New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null

& $Blender --background $scenePath --render-output $outputPath --render-format PNG --render-frame 1
if ($LASTEXITCODE -ne 0) {
  throw "Blender render failed with exit code $LASTEXITCODE."
}

$framePath = "${outputPath}0001.png"
$stillPath = "$outputPath.png"
if (-not (Test-Path -LiteralPath $framePath)) {
  throw "Blender did not create the expected frame at $framePath."
}
Move-Item -LiteralPath $framePath -Destination $stillPath -Force
