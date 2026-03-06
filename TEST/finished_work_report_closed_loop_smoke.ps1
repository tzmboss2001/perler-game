param(
  [string]$BaseUrl = 'http://localhost:8012',
  [string]$AdminEmail = 'test@example.com',
  [string]$AdminPassword = '123456'
)

$ErrorActionPreference = 'Stop'

function Post-Json {
  param(
    [string]$Url,
    [hashtable]$Body,
    [string]$Token = ''
  )
  $headers = @{ 'Content-Type' = 'application/json' }
  if ($Token) { $headers['x-token'] = $Token }
  Invoke-RestMethod -Method Post -Uri $Url -Headers $headers -Body ($Body | ConvertTo-Json -Depth 20)
}

function Get-Json {
  param(
    [string]$Url,
    [string]$Token = ''
  )
  $headers = @{}
  if ($Token) { $headers['x-token'] = $Token }
  Invoke-RestMethod -Method Get -Uri $Url -Headers $headers
}

$report = [ordered]@{
  generated_at = (Get-Date).ToString('s')
  base_url = $BaseUrl
  status = 'FAIL'
  steps = @()
}

try {
  $adminLogin = Post-Json -Url "$BaseUrl/api/v1/auth/login" -Body @{
    email = $AdminEmail
    password = $AdminPassword
  }
  if ($adminLogin.code -ne 0) { throw "admin login failed: $($adminLogin.msg)" }
  $adminToken = $adminLogin.data.token
  $adminId = [int]$adminLogin.data.user_info.id
  $report.steps += @{ step = 'admin_login'; ok = $true; admin_id = $adminId }

  $stamp = Get-Date -Format 'yyyyMMddHHmmss'
  $publisherEmail = "fw_publisher_$stamp@example.com"
  $publisherLogin = Post-Json -Url "$BaseUrl/api/v1/auth/smart-login" -Body @{
    email = $publisherEmail
    password = '123456'
  }
  if ($publisherLogin.code -ne 0) { throw "publisher login failed: $($publisherLogin.msg)" }
  $publisherToken = $publisherLogin.data.token
  $publisherId = [int]$publisherLogin.data.user_info.id
  $report.steps += @{ step = 'publisher_login'; ok = $true; publisher_id = $publisherId; publisher_email = $publisherEmail }

  $img = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Zx8QAAAAASUVORK5CYII='
  $title = "fw-report-flow-$stamp"
  $create = Post-Json -Url "$BaseUrl/api/v1/finished-works" -Token $publisherToken -Body @{
    title = $title
    description = 'auto test finished report flow'
    images_base64 = @("data:image/png;base64,$img")
    is_public = $true
  }
  if ($create.code -ne 0) { throw "create finished work failed: $($create.msg)" }
  $workId = [int]$create.data.id
  $report.steps += @{ step = 'create_finished_work'; ok = $true; work_id = $workId; title = $title }

  $submit = Post-Json -Url "$BaseUrl/api/v1/finished-works/$workId/report" -Token $adminToken -Body @{
    reason = 'smoke-report'
    detail = 'finished-work full flow'
  }
  if ($submit.code -ne 0) { throw "submit report failed: $($submit.msg)" }
  $report.steps += @{ step = 'submit_report'; ok = $true }

  $pending = Get-Json -Url "$BaseUrl/api/v1/finished-works/moderation/reports?page=1&pageSize=50&status=0" -Token $adminToken
  if ($pending.code -ne 0) { throw "fetch pending reports failed: $($pending.msg)" }
  $target = @($pending.data.list) | Where-Object { [int]$_.work_id -eq $workId } | Select-Object -First 1
  if (-not $target) { throw "pending report not found for work_id=$workId" }
  $reportId = [int]$target.id
  $report.steps += @{ step = 'find_pending_report'; ok = $true; report_id = $reportId }

  $handle = Post-Json -Url "$BaseUrl/api/v1/finished-works/moderation/reports/$reportId/handle" -Token $adminToken -Body @{
    action = 'accept'
    note = 'smoke accept finished report'
  }
  if ($handle.code -ne 0) { throw "handle report failed: $($handle.msg)" }
  $report.steps += @{ step = 'handle_report'; ok = $true }

  $accepted = Get-Json -Url "$BaseUrl/api/v1/finished-works/moderation/reports?page=1&pageSize=50&status=1" -Token $adminToken
  $handled = @($accepted.data.list) | Where-Object { [int]$_.id -eq $reportId } | Select-Object -First 1
  $report.steps += @{ step = 'verify_status_accepted'; ok = [bool]($null -ne $handled) }

  $report.status = 'PASS'
} catch {
  $report.steps += @{ step = 'exception'; ok = $false; error = $_.Exception.Message }
}

$reportPath = Join-Path (Resolve-Path '.').Path 'TEMP\finished_work_report_closed_loop_smoke_report.json'
$report | ConvertTo-Json -Depth 20 | Set-Content -Path $reportPath -Encoding UTF8
Write-Output $reportPath
