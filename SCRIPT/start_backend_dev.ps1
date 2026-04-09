$ErrorActionPreference = 'Stop'

$projectRoot = 'D:\work\web\perler-beads-creator'
$serverDir = Join-Path $projectRoot 'perler-beads-server\server'
$tempDir = Join-Path $projectRoot 'TEMP'
$stdoutLog = Join-Path $tempDir 'backend_stdout.log'
$stderrLog = Join-Path $tempDir 'backend_stderr.log'

if (!(Test-Path $tempDir)) {
  New-Item -ItemType Directory -Path $tempDir | Out-Null
}

$existing = Get-CimInstance Win32_Process | Where-Object {
  $_.CommandLine -like '*perler-beads-server.exe*' -or
  ($_.Name -eq 'go.exe' -and $_.CommandLine -like '*go run .*')
}

foreach ($proc in $existing) {
  try {
    Stop-Process -Id $proc.ProcessId -Force -ErrorAction Stop
  } catch {
  }
}

Push-Location $serverDir
try {
  go build -o perler-beads-server.exe .
  Start-Process -FilePath (Join-Path $serverDir 'perler-beads-server.exe') `
    -WorkingDirectory $serverDir `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog
} finally {
  Pop-Location
}

Start-Sleep -Seconds 2

try {
  $health = Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8012/health -TimeoutSec 5
  Write-Output "后端启动成功: $($health.Content)"
} catch {
  Write-Output "后端启动失败，请检查日志:"
  Write-Output $stdoutLog
  Write-Output $stderrLog
  throw
}
