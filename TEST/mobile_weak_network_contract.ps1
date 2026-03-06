param(
  [string]$Root = '.'
)

$ErrorActionPreference = 'Stop'
$rootPath = (Resolve-Path $Root).Path
$tempDir = Join-Path $rootPath 'TEMP'
New-Item -ItemType Directory -Force $tempDir | Out-Null
$reportPath = Join-Path $tempDir 'mobile_weak_network_contract_report.md'

$targets = @(
  'perler-beads/src/services/api/projectApi.ts',
  'perler-beads/src/services/api/communityApi.ts',
  'perler-beads/src/services/api/finishedWorkApi.ts',
  'perler-beads/src/services/api/userApi.ts'
)

$rows = @()
foreach ($rel in $targets) {
  $path = Join-Path $rootPath $rel
  $raw = Get-Content $path -Raw
  $hasAbort = $raw -match 'AbortController'
  $hasTimeoutMsg = $raw -match '请求超时|timeout'
  $rows += [PSCustomObject]@{
    File = $rel
    AbortController = $hasAbort
    TimeoutMessage = $hasTimeoutMsg
    Pass = ($hasAbort -and $hasTimeoutMsg)
  }
}

$allPass = ($rows | Where-Object { -not $_.Pass }).Count -eq 0
$now = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'

$lines = @()
$lines += '# Mobile Weak Network Contract Report'
$lines += ''
$lines += "- Time: $now"
$lines += "- Root: $rootPath"
$lines += "- Result: $(if ($allPass) { 'PASS' } else { 'FAIL' })"
$lines += ''
$lines += '## API Timeout Contract'
foreach ($r in $rows) {
  $status = if ($r.Pass) { 'PASS' } else { 'FAIL' }
  $lines += "- [$status] $($r.File)"
  $lines += "  - AbortController: $($r.AbortController)"
  $lines += "  - TimeoutMessage: $($r.TimeoutMessage)"
}

$lines += ''
$lines += '## Manual Real-Device Weak Network Steps'
$lines += '- 1. 打开抖音开发者工具或真机网络调试，设置 3G 慢网。'
$lines += '- 2. 依次测试：上传图片、生成图案、发布社区、点赞、举报、成品上传。'
$lines += '- 3. 确认页面不会卡死，出现可理解错误提示，并允许用户重试。'
$lines += '- 4. 切断网络后重试一次，恢复网络后再次重试。'

Set-Content -Path $reportPath -Value $lines -Encoding UTF8
Write-Output $reportPath
if (-not $allPass) { exit 2 }
