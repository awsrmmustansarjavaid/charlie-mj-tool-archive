$ErrorActionPreference = 'Stop'
$HostName = 'com.charliemj.toolarchive'
$ExtensionId = Read-Host 'Enter Charlie MJ Tool Archive Chrome extension ID (chrome://extensions)'
if ($ExtensionId -notmatch '^[a-p]{32}$') { throw 'Invalid Chrome extension ID. Enable Developer mode and copy the 32-character ID.' }
$Root = Split-Path -Parent $PSScriptRoot
$HostExe = Join-Path $PSScriptRoot 'charlie-mj-native-host.exe'
if (!(Test-Path $HostExe)) { throw 'Native host EXE not found. Build it first using build-native-host.ps1.' }
$InstallDir = Join-Path $env:LOCALAPPDATA 'CharlieMJ\NativeHost'
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
Copy-Item $HostExe (Join-Path $InstallDir 'charlie-mj-native-host.exe') -Force
$Manifest = @{
  name = $HostName
  description = 'Charlie MJ Tool Archive local portable database writer'
  path = (Join-Path $InstallDir 'charlie-mj-native-host.exe')
  type = 'stdio'
  allowed_origins = @("chrome-extension://$ExtensionId/")
}
$ManifestPath = Join-Path $InstallDir "$HostName.json"
$ManifestJson = $Manifest | ConvertTo-Json -Depth 4
[System.IO.File]::WriteAllText($ManifestPath, $ManifestJson, (New-Object System.Text.UTF8Encoding($false)))
New-Item -Path "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$HostName" -Force | Out-Null
Set-ItemProperty -Path "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$HostName" -Name '(default)' -Value $ManifestPath
Write-Host "Installed Native Messaging host. Restart Chrome. Helper: $InstallDir" -ForegroundColor Green
