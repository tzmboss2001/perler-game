param(
  [string]$BaseUrl = "http://localhost:8888",
  [string]$Token = "",
  [int]$Limit = 20
)

$ErrorActionPreference = 'Stop'

if (-not $Token) {
  throw "请传入 -Token（管理员x-token）"
}

$headers = @{ 'x-token' = $Token }
$url = "$BaseUrl/api/v1/community/moderation/reports/alerts?limit=$Limit"
$res = Invoke-RestMethod -Method GET -Uri $url -Headers $headers

if ($res.code -ne 0) {
  throw "接口返回失败: $($res.msg)"
}

$list = @()
if ($res.data -and $res.data.list) {
  $list = @($res.data.list)
}

$overdue = @($list | Where-Object { $_.overdue -eq $true })
$high = @($list | Where-Object { $_.priority -ge 1 })

$now = Get-Date
$mdLines = @(
  "# 社区举报SLA告警报告",
  "",
  "生成时间: $($now.ToString('yyyy-MM-dd HH:mm:ss'))",
  "接口: $url",
  "总数: $($list.Count)",
  "超时数: $($overdue.Count)",
  "高优数: $($high.Count)",
  "",
  "## Top 列表"
)

foreach ($item in $list) {
  $mdLines += "- 举报#$($item.id) 作品#$($item.post_id) 状态=$($item.status) 超时=$($item.overdue) 高优=$($item.priority) 等待=$($item.age_hours)h 原因=$($item.reason)"
}

$reportMd = Join-Path $PSScriptRoot '..\TEMP\community_report_alert_report.md'
$reportJson = Join-Path $PSScriptRoot '..\TEMP\community_report_alert_report.json'

$mdLines -join "`r`n" | Set-Content -Path $reportMd -Encoding UTF8
($res | ConvertTo-Json -Depth 12) | Set-Content -Path $reportJson -Encoding UTF8

Write-Output "告警报告已生成: $reportMd"
Write-Output "告警JSON已生成: $reportJson"
