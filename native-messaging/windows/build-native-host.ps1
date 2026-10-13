$ErrorActionPreference = 'Stop'
python -m pip install --upgrade pyinstaller
$Source = Join-Path $PSScriptRoot '..\charlie_mj_native_host.py'
python -m PyInstaller --onefile --name charlie-mj-native-host --distpath $PSScriptRoot --workpath (Join-Path $env:TEMP 'cmj-native-build') --specpath (Join-Path $env:TEMP 'cmj-native-build') $Source
Write-Host 'Build complete. Run install-native-host.ps1 and enter the extension ID.' -ForegroundColor Green
