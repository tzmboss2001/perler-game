param(
  [string]$BaseUrl = "http://localhost:8888",
  [string]$Token = "",
  [int]$PostId = 0,
  [int]$ReporterUserId = 0,
  [switch]$FetchModerationReports
)

$ErrorActionPreference = 'Stop'

function Invoke-JsonRequest {
  param(
    [string]$Method,
    [string]$Url,
    [object]$Body = $null,
    [string]$TokenHeader = ""
  )

  $headers = @{}
  if ($TokenHeader) {
    $headers['x-token'] = $TokenHeader
  }

  if ($Body -ne $null) {
    return Invoke-RestMethod -Method $Method -Uri $Url -Headers $headers -ContentType 'application/json' -Body ($Body | ConvertTo-Json -Depth 8)
  }
  return Invoke-RestMethod -Method $Method -Uri $Url -Headers $headers
}

$report = [ordered]@{
  generated_at = (Get-Date).ToString('s')
  base_url = $BaseUrl
  steps = @()
}

if (-not $Token) {
  throw "Please pass -Token (logged-in user token)."
}

if ($ReporterUserId -le 0) {
  try {
    $who = Invoke-JsonRequest -Method 'GET' -Url "$BaseUrl/api/v1/auth/user-info" -TokenHeader $Token
    if ($who.code -eq 0 -and $who.data -and $who.data.id) {
      $ReporterUserId = [int]$who.data.id
    }
  } catch {
    # fallback to auto-pick without reporter id
  }
}

if ($PostId -le 0) {
  try {
    $listResp = Invoke-JsonRequest -Method 'GET' -Url "$($BaseUrl)/api/v1/community/posts?page=1&pageSize=30" -TokenHeader $Token
    if ($listResp.code -eq 0 -and $listResp.data -and $listResp.data.list) {
      $rows = @($listResp.data.list)
      $candidate = $rows | Where-Object {
        $ownerId = 0
        if ($_.user -and $_.user.id) { $ownerId = [int]$_.user.id }
        if ($ReporterUserId -gt 0) { return $ownerId -ne $ReporterUserId }
        return $true
      } | Select-Object -First 1

      if ($candidate -and $candidate.id) {
        $PostId = [int]$candidate.id
      }
    }
  } catch {
    # keep validation below
  }
}

$canSubmitReport = $true
if ($PostId -le 0) {
  $canSubmitReport = $false
  $report.steps += @{
    step = 'pick_report_target'
    ok = $false
    msg = 'No reportable target found. All visible posts may belong to current user.'
    reporter_id = $ReporterUserId
  }
}

if ($canSubmitReport) {
  try {
  $body = @{
    reason = "smoke-report"
    detail = "auto submit from TEST/community_report_smoke.ps1"
  }
  $resp = Invoke-JsonRequest -Method 'POST' -Url "$BaseUrl/api/v1/community/posts/$PostId/report" -Body $body -TokenHeader $Token
  $ok = ($resp.code -eq 0)
  if (-not $ok -and ($resp.msg -match 'own post|my post|your own|cannot report your own')) {
    $report.steps += @{
      step = 'submit_report'
      ok = $false
      code = $resp.code
      msg = 'report failed: selected own post, please retry with another PostId'
      post_id = $PostId
      reporter_id = $ReporterUserId
    }
  } else {
    $report.steps += @{
      step = 'submit_report'
      ok = $ok
      code = $resp.code
      msg = $resp.msg
      post_id = $PostId
      reporter_id = $ReporterUserId
    }
  }
  } catch {
    $report.steps += @{ step = 'submit_report'; ok = $false; error = $_.Exception.Message; post_id = $PostId; reporter_id = $ReporterUserId }
  }
}

if ($FetchModerationReports) {
  try {
    $resp2 = Invoke-JsonRequest -Method 'GET' -Url "$($BaseUrl)/api/v1/community/moderation/reports?page=1&pageSize=10&status=0" -TokenHeader $Token
    $count = 0
    if ($resp2.data -and $resp2.data.list) { $count = @($resp2.data.list).Count }
    $report.steps += @{ step = 'fetch_pending_reports'; ok = ($resp2.code -eq 0); code = $resp2.code; total = $resp2.data.total; list_count = $count }
  } catch {
    $report.steps += @{ step = 'fetch_pending_reports'; ok = $false; error = $_.Exception.Message }
  }
}

$reportPath = Join-Path $PSScriptRoot '..\TEMP\community_report_smoke_report.json'
$report | ConvertTo-Json -Depth 10 | Set-Content -Path $reportPath -Encoding UTF8
Write-Output "Report generated: $reportPath"
