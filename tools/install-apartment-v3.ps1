[CmdletBinding(SupportsShouldProcess=$true)]
param([Parameter(Mandatory=$true)][string]$Bundle,[string]$Project='D:/Project/Battle',[Parameter(Mandatory=$true)][string]$Backup)
$ErrorActionPreference='Stop'
function Full([string]$Value){[IO.Path]::GetFullPath($Value).TrimEnd('\','/')}
function Within([string]$Value,[string]$Parent){$Value.StartsWith($Parent+'\',[StringComparison]::OrdinalIgnoreCase)}
$bundlePath=Full $Bundle; $projectPath=Full $Project; $backupPath=Full $Backup
$buildRoot=Full 'D:/Codex/Builds'
if(!(Within $bundlePath $buildRoot) -or !(Within $backupPath $buildRoot)){throw 'Bundle and backup must be below D:/Codex/Builds'}
if($projectPath -ne (Full 'D:/Project/Battle')){throw 'Unexpected project/source destination'}
if((Test-Path -LiteralPath $backupPath) -or (Within $backupPath $bundlePath) -or (Within $bundlePath $backupPath)){throw 'Backup must be a fresh, separate directory'}
# Reject links/junctions in every existing ancestor before copying anything.
foreach($candidate in @($bundlePath,$backupPath,$projectPath)){
 $ancestor=$candidate
 while($ancestor){if(Test-Path -LiteralPath $ancestor){if((Get-Item -LiteralPath $ancestor).Attributes -band [IO.FileAttributes]::ReparsePoint){throw "Reparse point not allowed: $ancestor"}};$ancestor=[IO.Path]::GetDirectoryName($ancestor)}
}
$validation=& node "$PSScriptRoot/validate-apartment-v3.mjs" $bundlePath
if($LASTEXITCODE -ne 0){throw "Bundle validation failed: $validation"}
$result=($validation -join "`n")|ConvertFrom-Json
$assetTarget=Join-Path $projectPath 'assets/apartment/v3';$sourceTarget=Join-Path $projectPath 'assets/source'
$sourcePath=Join-Path (Split-Path $bundlePath -Parent) 'source'
$operations=@()
foreach($file in $result.files){$operations+=@{From=(Join-Path $bundlePath $file);To=(Join-Path $assetTarget $file);Relative="assets/$file"}}
foreach($file in @('apartment-cutaway-v3.blend','mannequin-v3.blend')){
 $from=Join-Path $sourcePath $file
 if(!(Test-Path -LiteralPath $from -PathType Leaf)){throw "Missing editable source: $from"}
 $operations+=@{From=$from;To=(Join-Path $sourceTarget $file);Relative="source/$file"}
}
foreach($op in $operations){if(!(Within (Full $op.To) $assetTarget) -and !(Within (Full $op.To) $sourceTarget)){throw 'Unexpected write target'};if((Get-Item -LiteralPath $op.From).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Linked source is not allowed'}}
if(!$PSCmdlet.ShouldProcess($projectPath,"Install validated apartment bundle with backup at $backupPath")){return}
$null=New-Item -ItemType Directory -Path (Join-Path $backupPath 'assets'),(Join-Path $backupPath 'source')
foreach($op in $operations){$op.Existed=Test-Path -LiteralPath $op.To;if($op.Existed){Copy-Item -LiteralPath $op.To -Destination (Join-Path $backupPath $op.Relative)}}
$listeners=@(Get-NetTCPConnection -LocalPort 4173 -State Listen -ErrorAction SilentlyContinue)
$server=$null
foreach($listener in $listeners){
 $process=Get-CimInstance Win32_Process -Filter "ProcessId = $($listener.OwningProcess)"
 if($process.CommandLine -notmatch 'http\.server\s+4173' -or $process.CommandLine.Replace('\','/') -notmatch '--directory\s+["'']?D:/Project/Battle(?:["'']|\s|$)'){throw 'Port 4173 belongs to an unverified server; no assets changed'}
 $server=$process
}
try{
 if($server){Stop-Process -Id $server.ProcessId}
 # Manifest last, so even an interrupted copy never advertises missing resources.
 foreach($op in ($operations|Sort-Object {$_.To.EndsWith('scene.json')})){Copy-Item -LiteralPath $op.From -Destination $op.To -Force}
}catch{
 foreach($op in $operations){if($op.Existed){Copy-Item -LiteralPath (Join-Path $backupPath $op.Relative) -Destination $op.To -Force}elseif(Test-Path -LiteralPath $op.To){Remove-Item -LiteralPath $op.To -Force}}
 throw
}finally{
 if($server){Start-Process -FilePath $server.ExecutablePath -ArgumentList @('-m','http.server','4173','--bind','127.0.0.1','--directory','D:/Project/Battle') -WorkingDirectory $projectPath -WindowStyle Hidden -RedirectStandardOutput 'D:/Codex/Temp/battle-v12-server.log' -RedirectStandardError 'D:/Codex/Temp/battle-v12-server-error.log'|Out-Null}
}
if($server){$healthy=$false;for($attempt=0;$attempt -lt 20;$attempt++){try{if((Invoke-WebRequest 'http://127.0.0.1:4173/assets/apartment/v3/scene.json' -UseBasicParsing).StatusCode -eq 200){$healthy=$true;break}}catch{Start-Sleep -Milliseconds 250}};if(!$healthy){throw 'Installed, but server HTTP check failed'}}
Write-Output "Installed. Previous resources recoverable at $backupPath"
