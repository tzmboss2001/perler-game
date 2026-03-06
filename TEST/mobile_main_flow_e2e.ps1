param(
  [string]$BaseUrl = "http://127.0.0.1:3005",
  [switch]$Headless
)

$ErrorActionPreference = "Stop"

$rootPath = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$frontendPath = Join-Path $rootPath "perler-beads"
$tempDir = Join-Path $rootPath "TEMP"
$picDir = Join-Path $tempDir "Pictures"
$devLog = Join-Path $tempDir "main_flow_dev.log"
$e2eLog = Join-Path $tempDir "main_flow_e2e.log"
$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"

New-Item -ItemType Directory -Force $tempDir | Out-Null
New-Item -ItemType Directory -Force $picDir | Out-Null

function Get-Port {
  param([string]$Url)
  $uri = [uri]$Url
  if ($uri.Port -gt 0) { return $uri.Port }
  if ($uri.Scheme -eq "https") { return 443 }
  return 80
}

function Wait-UrlReady {
  param(
    [string]$Url,
    [int]$Retry = 60
  )
  for ($i = 0; $i -lt $Retry; $i++) {
    try {
      $r = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 3
      if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { return $true }
    } catch {}
    Start-Sleep -Milliseconds 500
  }
  return $false
}

$port = Get-Port $BaseUrl
$listen = netstat -ano | findstr ":$port" | findstr "LISTENING"
$startedDev = $false
$devProc = $null

try {
  if (-not $listen) {
    if (Test-Path $devLog) { Remove-Item $devLog -Force }
    $cmd = "npm.cmd run dev -- --host 127.0.0.1 --port $port --strictPort > `"$devLog`" 2>&1"
    $devProc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $cmd -WorkingDirectory $frontendPath -PassThru
    $startedDev = $true
    $ready = Wait-UrlReady -Url "$BaseUrl/mobile/create" -Retry 80
    if (-not $ready) { throw "dev server not ready: $BaseUrl" }
  }

  if (Test-Path $e2eLog) { Remove-Item $e2eLog -Force }
  $args = @(
    (Join-Path $rootPath "TEST\mobile_main_flow_e2e.mjs"),
    "--base-url", $BaseUrl,
    "--chrome-path", $chromePath,
    "--screenshot-dir", $picDir
  )
  if ($Headless) { $args += "--headless" }

  & node @args 2>&1 | Tee-Object -FilePath $e2eLog
  if ($LASTEXITCODE -ne 0) { throw "main flow e2e failed: exit $LASTEXITCODE" }
} finally {
  if ($startedDev -and $devProc -and -not $devProc.HasExited) {
    taskkill /PID $devProc.Id /T /F | Out-Null
  }
}

Write-Output $e2eLog
exit 0
