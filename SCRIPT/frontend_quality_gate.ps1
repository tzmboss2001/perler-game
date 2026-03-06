param(
  [string]$Root = ".",
  [switch]$UpdateBaseline
)

$ErrorActionPreference = "Stop"

$rootPath = (Resolve-Path $Root).Path
$frontendPath = Join-Path $rootPath "perler-beads"
$tempDir = Join-Path $rootPath "TEMP"
$baselinePath = Join-Path $rootPath "TEST\quality_gate_garbled_baseline.txt"
$reportPath = Join-Path $tempDir "quality_gate_report.md"

New-Item -ItemType Directory -Force $tempDir | Out-Null
New-Item -ItemType Directory -Force (Join-Path $rootPath "TEST") | Out-Null

function Run-Step {
  param([string]$Name, [scriptblock]$Action)
  try {
    $output = & $Action 2>&1
    [PSCustomObject]@{ Name = $Name; Success = $true; Output = ($output | Out-String).Trim() }
  } catch {
    [PSCustomObject]@{ Name = $Name; Success = $false; Output = $_.Exception.Message }
  }
}

function Get-GarbledFindings {
  $targetFiles = @(
    "index.html",
    "src/pages/mobile/HomePage.tsx",
    "src/pages/mobile/CreatePage.tsx",
    "src/pages/mobile/LoginPage.tsx",
    "src/pages/mobile/ProfilePage.tsx",
    "src/pages/mobile/CommunityPage.tsx",
    "src/pages/mobile/CommunityDetailPage.tsx",
    "src/pages/mobile/MakingPage.tsx",
    "src/components/OnboardingModal.tsx",
    "src/components/MyColorsModal.tsx",
    "src/components/BottomNav.tsx"
  )

  $tokens = @(
    [string][char]0xFFFD,
    [string][char]0x9983,
    [string][char]0x9225,
    [string][char]0x8133,
    [string][char]0x8DEF
  )

  $findings = New-Object System.Collections.Generic.List[string]

  foreach ($rel in $targetFiles) {
    $full = Join-Path $frontendPath $rel
    if (!(Test-Path $full)) { continue }

    $lineNo = 0
    Get-Content $full | ForEach-Object {
      $lineNo++
      $line = $_
      $hasHit = $false
      if ($line -match '\?\?\?') {
        $hasHit = $true
      } else {
        foreach ($t in $tokens) {
          if ($line.Contains($t)) { $hasHit = $true; break }
        }
      }
      if (-not $hasHit) { return }
      if ($line -match '^\s*(//|/\*|\*|\*/|\{/\*|\*/|\})') { return }
      if ($line.Trim().Length -eq 0) { return }
      $findings.Add("$rel`:$lineNo`:$($line.Trim())")
    }
  }

  return $findings
}

$steps = @()

$steps += Run-Step -Name "frontend_build" -Action {
  Push-Location $frontendPath
  try {
    cmd /c "npm.cmd run build > ..\TEMP\quality_gate_front_build.log 2>&1"
    if ($LASTEXITCODE -ne 0) { throw "frontend build failed with exit code $LASTEXITCODE" }
  } finally {
    Pop-Location
  }
}

$steps += Run-Step -Name "frontend_dev_smoke" -Action {
  Push-Location $frontendPath
  $proc = $null
  try {
    $devCmd = "npm.cmd run dev -- --host 127.0.0.1 --port 3005 --strictPort > ..\TEMP\quality_gate_dev.log 2>&1"
    $proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $devCmd -PassThru

    $ready = $false
    for ($i = 0; $i -lt 30; $i++) {
      Start-Sleep -Milliseconds 500
      try {
        $r = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:3005/" -TimeoutSec 3
        if ($r.StatusCode -eq 200) { $ready = $true; break }
      } catch {}
    }
    if (-not $ready) { throw "dev server not ready on 3005" }

    $paths = @("/", "/mobile/home", "/mobile/create", "/mobile/profile", "/mobile/login")
    foreach ($p in $paths) {
      $resp = Invoke-WebRequest -UseBasicParsing ("http://127.0.0.1:3005" + $p) -TimeoutSec 5
      if ($resp.StatusCode -ne 200) { throw "smoke route failed: $p status=$($resp.StatusCode)" }
    }

    $homeHtml = (Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:3005/" -TimeoutSec 5).Content
    if ($homeHtml -notmatch "<title>") { throw "index html missing <title>" }
  } finally {
    if ($proc -and !$proc.HasExited) { taskkill /PID $proc.Id /T /F | Out-Null }
    Pop-Location
  }
}

$steps += Run-Step -Name "frontend_main_flow_contract" -Action {
  $scriptPath = Join-Path $rootPath "TEST\mobile_main_flow_contract.ps1"
  if (!(Test-Path $scriptPath)) { throw "main flow contract script not found: $scriptPath" }
  & powershell -ExecutionPolicy Bypass -File $scriptPath -Root $rootPath
  if ($LASTEXITCODE -ne 0) { throw "main flow contract failed with exit code $LASTEXITCODE" }
}

$allFindings = Get-GarbledFindings

if ($UpdateBaseline -or !(Test-Path $baselinePath)) {
  $allFindings | Set-Content -Path $baselinePath -Encoding UTF8
}

$baseline = @()
if (Test-Path $baselinePath) { $baseline = Get-Content $baselinePath }

$baselineSet = @{}
foreach ($b in $baseline) {
  if ($b) { $baselineSet[$b] = $true }
}

$newFindings = New-Object System.Collections.Generic.List[string]
foreach ($f in $allFindings) {
  if (-not $baselineSet.ContainsKey($f)) { $newFindings.Add($f) }
}

$steps += [PSCustomObject]@{
  Name = "frontend_garbled_diff"
  Success = ($newFindings.Count -eq 0)
  Output = if ($newFindings.Count -eq 0) { "no new garbled findings" } else { ($newFindings | Select-Object -First 30 | Out-String).Trim() }
}

$now = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$lines = @()
$lines += "# Frontend Quality Gate Report"
$lines += ""
$lines += "- Time: $now"
$lines += "- Root: $rootPath"
$lines += "- Baseline: $baselinePath"
$lines += "- Baseline Count: $($baseline.Count)"
$lines += "- Current Findings Count: $($allFindings.Count)"
$lines += "- New Findings Count: $($newFindings.Count)"
$lines += ""
$lines += "## Steps"
foreach ($s in $steps) {
  $status = if ($s.Success) { "PASS" } else { "FAIL" }
  $lines += "- $($s.Name): $status"
}
$lines += ""
$lines += "## Step Details"
foreach ($s in $steps) {
  $lines += "### $($s.Name)"
  $lines += "~~~text"
  $lines += ($s.Output | Out-String).Trim()
  $lines += "~~~"
}
$lines += ""
$lines += "## New Garbled Findings (Top 30)"
if ($newFindings.Count -gt 0) {
  $lines += "~~~text"
  $lines += ($newFindings | Select-Object -First 30)
  $lines += "~~~"
} else {
  $lines += "- none"
}

$lines | Set-Content -Path $reportPath -Encoding UTF8

$hasFail = $false
foreach ($s in $steps) {
  if (-not $s.Success) { $hasFail = $true; break }
}

Write-Output $reportPath
if ($hasFail) { exit 1 }
exit 0
