param(
  [string]$Root = "."
)

$ErrorActionPreference = "Stop"

$rootPath = (Resolve-Path $Root).Path
$tempDir = Join-Path $rootPath "TEMP"
New-Item -ItemType Directory -Force $tempDir | Out-Null

$reportPath = Join-Path $tempDir "prelaunch_report.md"

function Run-Step {
  param(
    [string]$Name,
    [scriptblock]$Action
  )
  try {
    $output = & $Action 2>&1
    [PSCustomObject]@{
      Name = $Name
      Success = $true
      Output = ($output | Out-String).Trim()
    }
  }
  catch {
    [PSCustomObject]@{
      Name = $Name
      Success = $false
      Output = $_.Exception.Message
    }
  }
}

$steps = @()

$steps += Run-Step -Name "frontend_build" -Action {
  Push-Location (Join-Path $rootPath "perler-beads")
  try {
    cmd /c "npm.cmd run build > ..\\TEMP\\prelaunch_front_build.log 2>&1"
    if ($LASTEXITCODE -ne 0) { throw "frontend build failed with exit code $LASTEXITCODE" }
  }
  finally {
    Pop-Location
  }
}

$steps += Run-Step -Name "backend_build" -Action {
  Push-Location (Join-Path $rootPath "perler-beads-server\\server")
  try {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    go build .
    $ErrorActionPreference = $prev
    if ($LASTEXITCODE -ne 0) { throw "backend build failed with exit code $LASTEXITCODE" }
  }
  finally {
    $ErrorActionPreference = "Stop"
    Pop-Location
  }
}

$todoMatches = & rg -n "TODO|FIXME|HACK|XXX" (Join-Path $rootPath "perler-beads") (Join-Path $rootPath "perler-beads-server\\server") -g "*.ts" -g "*.tsx" -g "*.go" 2>$null
$garbleMatches = & rg -n -P "\x{FFFD}|\?\?\?" (Join-Path $rootPath "perler-beads\\src") (Join-Path $rootPath "perler-beads-server\\server") -g "*.ts" -g "*.tsx" -g "*.go" 2>$null
$placeholderMatches = & rg -n "developer@example.com|TODO:" (Join-Path $rootPath "perler-beads\\src\\pages\\mobile") -g "*.tsx" 2>$null

$todoCount = if ($todoMatches) { @($todoMatches).Count } else { 0 }
$garbleCount = if ($garbleMatches) { @($garbleMatches).Count } else { 0 }
$placeholderCount = if ($placeholderMatches) { @($placeholderMatches).Count } else { 0 }

$now = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

$lines = @()
$lines += "# Prelaunch Check Report"
$lines += ""
$lines += "- Time: $now"
$lines += "- Root: $rootPath"
$lines += ""
$lines += "## Build Results"
foreach ($s in $steps) {
  $status = if ($s.Success) { "PASS" } else { "FAIL" }
  $lines += "- $($s.Name): $status"
}
$lines += ""
$lines += "## Risk Counters"
$lines += "- TODO/FIXME/HACK/XXX: $todoCount"
$lines += "- Possible garbled text: $garbleCount"
$lines += "- Placeholder legal/about text: $placeholderCount"
$lines += ""
$lines += "## Sample Findings (Top 10)"
$lines += ""
$lines += "### TODO"
if ($todoCount -gt 0) {
  $lines += "~~~text"
  $lines += (@($todoMatches) | Select-Object -First 10)
  $lines += "~~~"
}
else {
  $lines += "- none"
}
$lines += ""
$lines += "### Garbled"
if ($garbleCount -gt 0) {
  $lines += "~~~text"
  $lines += (@($garbleMatches) | Select-Object -First 10)
  $lines += "~~~"
}
else {
  $lines += "- none"
}
$lines += ""
$lines += "### Placeholder"
if ($placeholderCount -gt 0) {
  $lines += "~~~text"
  $lines += (@($placeholderMatches) | Select-Object -First 10)
  $lines += "~~~"
}
else {
  $lines += "- none"
}

Set-Content -Path $reportPath -Value $lines -Encoding UTF8
Write-Output $reportPath
