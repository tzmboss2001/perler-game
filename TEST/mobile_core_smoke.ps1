param(
  [string]$BaseUrl = 'http://localhost:8012',
  [string]$Email = 'test@example.com',
  [string]$Password = '123456'
)

$ErrorActionPreference = 'Stop'

function Assert-True {
  param(
    [bool]$Condition,
    [string]$Message
  )
  if (-not $Condition) { throw $Message }
}

$report = @()
$report += "# Mobile Core Smoke"
$report += "- Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$report += "- BaseUrl: $BaseUrl"

# 1) health
$healthCode = (Invoke-WebRequest -Uri "$BaseUrl/health" -UseBasicParsing -TimeoutSec 5).StatusCode
Assert-True ($healthCode -eq 200) 'health check failed'
$report += "- health: PASS ($healthCode)"

# 2) login
$loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json
$loginResp = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/auth/login" -ContentType 'application/json' -Body $loginBody
Assert-True ($loginResp.code -eq 0) "login failed: $($loginResp.msg)"
Assert-True (-not [string]::IsNullOrWhiteSpace($loginResp.data.token)) 'login token empty'
$token = $loginResp.data.token
$headers = @{ 'x-token' = $token }
$report += "- login: PASS"

# 3) community list
$listResp = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/v1/community/posts?page=1&pageSize=5" -Headers $headers
Assert-True ($listResp.code -eq 0) "community list failed: $($listResp.msg)"
$list = @($listResp.data.list)
Assert-True ($list.Count -gt 0) 'community list empty'
$firstId = $list[0].id
$report += "- community_list: PASS (count=$($list.Count), first_id=$firstId)"

# 4) community detail
$detailResp = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/v1/community/posts/$firstId" -Headers $headers
Assert-True ($detailResp.code -eq 0) "community detail failed: $($detailResp.msg)"
Assert-True ($detailResp.data.id -eq $firstId) 'community detail id mismatch'
Assert-True ($null -ne $detailResp.data.bead_data) 'community bead_data missing'
$report += "- community_detail: PASS"

# 5) making count increment
$makeResp = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/community/posts/$firstId/make" -Headers $headers
Assert-True ($makeResp.code -eq 0) "make increment failed: $($makeResp.msg)"
$report += "- make_increment: PASS"

$reportPath = Join-Path (Resolve-Path '.').Path 'TEMP\mobile_core_smoke_report.md'
$report | Set-Content -Path $reportPath -Encoding UTF8
Write-Output $reportPath
