param(
  [string]$Blender = 'D:\Codex\Tools\Blender\blender-4.5.9-windows-x64\blender.exe',
  [string]$Scene = (Join-Path $PSScriptRoot '..\assets\source\avatar-rig.blend'),
  [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\artifacts\avatar-acceptance')
)

$scenePath = [System.IO.Path]::GetFullPath($Scene)
$outPath = [System.IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $outPath -Force | Out-Null

& $Blender --background $scenePath --python-text render_avatar_acceptance.py -- $outPath
if ($LASTEXITCODE -ne 0) {
  throw "Blender render failed with exit code $LASTEXITCODE."
}

foreach ($pose in @('front', 'back', 'left-profile', 'right-profile', 'desk-seated', 'sink-work', 'bed-pose')) {
  $render = Join-Path $outPath "$pose.png"
  if (-not (Test-Path -LiteralPath $render)) {
    throw "Missing avatar acceptance render: $render"
  }
}
