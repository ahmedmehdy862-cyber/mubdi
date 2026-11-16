<#
  Builds a self-contained portable Windows install of the Mubdi desktop app.

  Usage (from repo root):
    powershell -ExecutionPolicy Bypass -File scripts/package-desktop.ps1 -OutDir F:\Mubdi

  Steps: build packages -> bundle main process (esbuild) -> install runtime deps ->
         fetch Electron runtime -> assemble app dir -> create shortcuts.
#>
param(
  [string]$OutDir = 'F:\Mubdi',
  [string]$ElectronVersion = '45.3.2',
  [switch]$NoShortcuts
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$appDir = Join-Path $OutDir 'resources\app'
$setupDir = Join-Path $OutDir '.setup'

Write-Host "[1/6] Building workspace packages"
Push-Location $root
pnpm -r --filter './packages/*' build
Pop-Location

Write-Host "[2/6] Assembling app directory: $appDir"
New-Item -ItemType Directory -Force -Path $appDir, $setupDir | Out-Null
Copy-Item (Join-Path $root 'apps\desktop\main.js'), (Join-Path $root 'apps\desktop\index.html'), (Join-Path $root 'apps\desktop\renderer.js') $appDir -Force
Copy-Item (Join-Path $root 'apps\desktop\preload.cjs') $appDir -Force

function Copy-PackageDist([string]$name) {
  $dest = Join-Path $appDir "packages\$name"
  New-Item -ItemType Directory -Force -Path $dest | Out-Null
  Copy-Item -Recurse -Force (Join-Path $root "packages\$name\dist") (Join-Path $dest 'dist')
  $pj = Get-Content (Join-Path $root "packages\$name\package.json") -Raw | ConvertFrom-Json
  $pj.main = 'dist/index.js'
  $pj.types = 'dist/index.d.ts'
  $pj | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $dest 'package.json') -Encoding utf8
}

foreach ($p in 'schemas','design-knowledge','core','psd-engine','renderer','brand') {
  Copy-PackageDist $p
}

$appPkg = @{
  name = 'mubdi-app'
  productName = 'Mubdi'
  version = '0.1.0'
  private = $true
  type = 'module'
  main = 'bundle.mjs'
  dependencies = @{
    '@napi-rs/canvas' = '1.1.1'
    'ag-psd' = '28.5.1'
    zod = '4.6.7'
  }
}
$appPkg | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $appDir 'package.json') -Encoding utf8

Write-Host "[3/6] Installing runtime dependencies (npm, flat node_modules)"
$env:npm_config_cache = Join-Path $setupDir 'npm-cache'
$env:npm_config_tmp = Join-Path $setupDir 'tmp'
Push-Location $appDir
npm install --omit=dev --no-audit --no-fund
Pop-Location

Write-Host "[3b/6] Linking @mubdi/design-knowledge into app node_modules"
$mubdiScope = Join-Path $appDir 'node_modules\@mubdi'
New-Item -ItemType Directory -Force -Path $mubdiScope | Out-Null
Copy-Item -Recurse -Force (Join-Path $appDir 'packages\design-knowledge') (Join-Path $mubdiScope 'design-knowledge')

Write-Host "[4/6] Bundling main process (esbuild)"
$esbuild = Get-ChildItem (Join-Path $root 'node_modules\.pnpm') -Directory |
  Where-Object { $_.Name -like 'esbuild@*' } |
  Sort-Object Name -Descending |
  Select-Object -First 1
$esbuildExe = Join-Path $esbuild.FullName 'node_modules\esbuild\bin\esbuild'
$esbuildBin = Get-ChildItem (Join-Path $root 'node_modules\.pnpm') -Recurse -Filter 'esbuild.exe' |
  Where-Object { $_.FullName -like '*@esbuild+win32-x64*' } |
  Select-Object -First 1
if ($esbuildBin) { $esbuildExe = $esbuildBin.FullName }
$outFile = Join-Path $appDir 'bundle.mjs'
& $esbuildExe (Join-Path $root 'apps\desktop\main.js') --bundle --platform=node --format=esm `
  --external:electron --external:@napi-rs/canvas "--outfile=$outFile"

Write-Host "[5/6] Fetching Electron runtime $ElectronVersion"
$zip = Join-Path $setupDir "electron-v$ElectronVersion-win32-x64.zip"
if (-not (Test-Path (Join-Path $OutDir 'Mubdi.exe'))) {
  if (-not (Test-Path $zip)) {
    $url = "https://github.com/electron/electron/releases/download/v$ElectronVersion/electron-v$ElectronVersion-win32-x64.zip"
    Write-Host "  downloading $url"
    Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
  }
  Expand-Archive -Path $zip -DestinationPath $OutDir -Force
  Rename-Item (Join-Path $OutDir 'electron.exe') (Join-Path $OutDir 'Mubdi.exe') -Force
}

Write-Host "[6/6] Finalising"
$iconSrc = Join-Path $appDir 'icon.png'
if (Test-Path $iconSrc) { Copy-Item $iconSrc (Join-Path $OutDir 'icon.png') -Force }

if (-not $NoShortcuts) {
  $ws = New-Object -ComObject WScript.Shell
  foreach ($dir in @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'))) {
    $lnk = $ws.CreateShortcut((Join-Path $dir 'Mubdi.lnk'))
    $lnk.TargetPath = Join-Path $OutDir 'Mubdi.exe'
    $lnk.WorkingDirectory = $OutDir
    $ico = Join-Path $OutDir 'Mubdi.ico'
    if (Test-Path $ico) { $lnk.IconLocation = "$ico,0" }
    $lnk.Description = 'Mubdi - AI Design Studio'
    $lnk.Save()
  }
}

Write-Host "Done. Launch: $(Join-Path $OutDir 'Mubdi.exe')"
