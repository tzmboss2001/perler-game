param(
  [string]$Root = "."
)

$ErrorActionPreference = "Stop"

$rootPath = (Resolve-Path $Root).Path
$tempDir = Join-Path $rootPath "TEMP"
$bundleDir = Join-Path $tempDir "release_evidence"

New-Item -ItemType Directory -Force $tempDir | Out-Null
New-Item -ItemType Directory -Force $bundleDir | Out-Null

$files = @(
  "TEMP\\douyin_compliance_report.md",
  "TEMP\\prelaunch_report.md",
  "TEMP\\mobile_core_smoke_report.md",
  "TEST\\douyin_release_checklist.md",
  "TEST\\douyin_console_and_evidence_checklist.md"
)

$copied = New-Object System.Collections.Generic.List[string]
$missing = New-Object System.Collections.Generic.List[string]

foreach ($rel in $files) {
  $src = Join-Path $rootPath $rel
  if (Test-Path $src) {
    $dst = Join-Path $bundleDir ([IO.Path]::GetFileName($src))
    Copy-Item -Path $src -Destination $dst -Force
    $copied.Add($rel)
  } else {
    $missing.Add($rel)
  }
}

$summaryPath = Join-Path $bundleDir "SUMMARY.md"
$lines = @()
$lines += "# Release Evidence Bundle"
$lines += ""
$lines += "- Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$lines += "- Root: $rootPath"
$lines += ""
$lines += "## Copied"
if ($copied.Count -eq 0) {
  $lines += "- none"
} else {
  foreach ($i in $copied) { $lines += "- $i" }
}
$lines += ""
$lines += "## Missing"
if ($missing.Count -eq 0) {
  $lines += "- none"
} else {
  foreach ($i in $missing) { $lines += "- $i" }
}

$lines | Set-Content -Path $summaryPath -Encoding UTF8
Write-Output $bundleDir

