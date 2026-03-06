param(
  [string]$ApiBase = 'http://localhost:8888',
  [string]$AdminToken = '',
  [int]$PostId = 0
)

if ([string]::IsNullOrWhiteSpace($AdminToken)) {
  Write-Host '请传入 -AdminToken' -ForegroundColor Yellow
  exit 1
}

$headers = @{
  'Content-Type' = 'application/json'
  'x-token' = $AdminToken
}

Write-Host "[1/3] 获取审核列表..." -ForegroundColor Cyan
$posts = Invoke-RestMethod -Method Get -Uri "$ApiBase/api/v1/community/moderation/posts?page=1&pageSize=5&review_status=-1" -Headers $headers
$posts | ConvertTo-Json -Depth 6

Write-Host "[2/3] 获取审核日志..." -ForegroundColor Cyan
$logs = Invoke-RestMethod -Method Get -Uri "$ApiBase/api/v1/community/moderation/logs?page=1&pageSize=5" -Headers $headers
$logs | ConvertTo-Json -Depth 6

Write-Host "[3/3] 触发详情图回填..." -ForegroundColor Cyan
$backfillBody = @{ limit = 20 } | ConvertTo-Json
$backfill = Invoke-RestMethod -Method Post -Uri "$ApiBase/api/v1/community/moderation/previews/backfill" -Headers $headers -Body $backfillBody
$backfill | ConvertTo-Json -Depth 6

if ($PostId -gt 0) {
  Write-Host "可选：对作品 $PostId 执行审核通过示例..." -ForegroundColor DarkYellow
  $reviewBody = @{ action = 'approve'; reason = 'smoke test approve' } | ConvertTo-Json
  $review = Invoke-RestMethod -Method Post -Uri "$ApiBase/api/v1/community/moderation/posts/$PostId/review" -Headers $headers -Body $reviewBody
  $review | ConvertTo-Json -Depth 6
}

Write-Host '社区审核链路冒烟完成。' -ForegroundColor Green
