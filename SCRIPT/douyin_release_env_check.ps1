param(
  [string]$Root = '.'
)

$ErrorActionPreference = 'Stop'
$rootPath = (Resolve-Path $Root).Path
$tempDir = Join-Path $rootPath 'TEMP'
New-Item -ItemType Directory -Force $tempDir | Out-Null
$reportPath = Join-Path $tempDir 'douyin_release_env_check_report.md'

$frontendDir = Join-Path $rootPath 'perler-beads'
$envFile = Join-Path $frontendDir '.env.production'

function Read-EnvValue {
  param([string]$Key)
  if (Test-Path $envFile) {
    $line = Select-String -Path $envFile -Pattern "^$Key=" | Select-Object -First 1
    if ($line) { return ($line.Line -replace "^$Key=", '').Trim() }
  }
  return [Environment]::GetEnvironmentVariable($Key)
}

$checks = @()
function Add-Check { param($Name, $Pass, $Value, $Hint)
  $script:checks += [PSCustomObject]@{ Name=$Name; Pass=$Pass; Value=$Value; Hint=$Hint }
}

$adMode = (Read-EnvValue 'VITE_AD_MODE')
if (-not $adMode) { $adMode = 'off' }
Add-Check 'VITE_AD_MODE_set' ($adMode -ne '') $adMode '建议提审环境使用 douyin'
Add-Check 'VITE_AD_MODE_release' ($adMode -eq 'douyin') $adMode '提审环境应配置为 douyin'

$apiBase = Read-EnvValue 'VITE_API_BASE_URL'
$apiValid = $apiBase -and ($apiBase -notmatch 'localhost|127\\.0\\.0\\.1')
Add-Check 'VITE_API_BASE_URL_prod' $apiValid $apiBase '不能指向本机地址'

if ($adMode -eq 'douyin') {
  $rewardId = Read-EnvValue 'VITE_DOUYIN_REWARDED_AD_UNIT_ID'
  Add-Check 'DOUYIN_rewarded_id' (![string]::IsNullOrWhiteSpace($rewardId)) $rewardId '需填写激励视频广告位 ID'

  $bannerCreate = Read-EnvValue 'VITE_DOUYIN_BANNER_CREATE_INLINE_ID'
  Add-Check 'DOUYIN_banner_create_id' (![string]::IsNullOrWhiteSpace($bannerCreate)) $bannerCreate '需填写创作页横幅广告位 ID'

  $bannerMaking = Read-EnvValue 'VITE_DOUYIN_BANNER_MAKING_BOTTOM_ID'
  Add-Check 'DOUYIN_banner_making_id' (![string]::IsNullOrWhiteSpace($bannerMaking)) $bannerMaking '需填写制作页横幅广告位 ID'
}

$allPass = ($checks | Where-Object { -not $_.Pass }).Count -eq 0
$now = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'

$lines = @()
$lines += '# Douyin Release Env Check Report'
$lines += ''
$lines += "- Time: $now"
$lines += "- Root: $rootPath"
$lines += "- Env source: $(if (Test-Path $envFile) { $envFile } else { 'process env only' })"
$lines += "- Result: $(if ($allPass) { 'PASS' } else { 'FAIL' })"
$lines += ''
$lines += '## Checks'
foreach ($c in $checks) {
  $status = if ($c.Pass) { 'PASS' } else { 'FAIL' }
  $val = if ([string]::IsNullOrWhiteSpace($c.Value)) { '(empty)' } else { $c.Value }
  $lines += "- [$status] $($c.Name): $val"
  if (-not $c.Pass) { $lines += "  - Hint: $($c.Hint)" }
}

Set-Content -Path $reportPath -Value $lines -Encoding UTF8
Write-Output $reportPath
if (-not $allPass) { exit 2 }
