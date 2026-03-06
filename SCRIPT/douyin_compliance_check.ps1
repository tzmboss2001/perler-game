param(
  [string]$Root = ".",
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

$rootPath = (Resolve-Path $Root).Path
$tempDir = Join-Path $rootPath "TEMP"
New-Item -ItemType Directory -Force $tempDir | Out-Null

$reportPath = Join-Path $tempDir "douyin_compliance_report.md"

function New-CheckResult {
  param(
    [string]$Name,
    [bool]$Pass,
    [string]$Evidence
  )
  [PSCustomObject]@{
    Name = $Name
    Pass = $Pass
    Evidence = $Evidence
  }
}

function Test-Pattern {
  param(
    [string[]]$Patterns,
    [string[]]$Targets
  )
  foreach ($target in $Targets) {
    if (!(Test-Path $target)) { continue }
    foreach ($p in $Patterns) {
      $m = Select-String -Path $target -Pattern $p -SimpleMatch | Select-Object -First 1
      if ($m) {
        return @{ Pass = $true; Evidence = "$($m.Path):$($m.LineNumber):$($m.Line.Trim())" }
      }
    }
  }
  return @{ Pass = $false; Evidence = "not matched: $($Patterns -join ' | ')" }
}

$checks = New-Object System.Collections.Generic.List[object]

# 1) Legal routes
$routeTargets = @((Join-Path $rootPath "perler-beads\src\router\index.tsx"))
$privacyRoute = Test-Pattern -Patterns @("/mobile/privacy-policy") -Targets $routeTargets
$checks.Add((New-CheckResult -Name "route_privacy_policy" -Pass $privacyRoute.Pass -Evidence $privacyRoute.Evidence))
$uaRoute = Test-Pattern -Patterns @("/mobile/user-agreement") -Targets $routeTargets
$checks.Add((New-CheckResult -Name "route_user_agreement" -Pass $uaRoute.Pass -Evidence $uaRoute.Evidence))
$feedbackRoute = Test-Pattern -Patterns @("/mobile/feedback") -Targets $routeTargets
$checks.Add((New-CheckResult -Name "route_feedback" -Pass $feedbackRoute.Pass -Evidence $feedbackRoute.Evidence))

# 2) Settings entries
$settingsTarget = @((Join-Path $rootPath "perler-beads\src\pages\mobile\SettingsPage.tsx"))
$settingsPrivacy = Test-Pattern -Patterns @("privacy-policy") -Targets $settingsTarget
$checks.Add((New-CheckResult -Name "settings_privacy_entry" -Pass $settingsPrivacy.Pass -Evidence $settingsPrivacy.Evidence))
$settingsUA = Test-Pattern -Patterns @("user-agreement") -Targets $settingsTarget
$checks.Add((New-CheckResult -Name "settings_user_agreement_entry" -Pass $settingsUA.Pass -Evidence $settingsUA.Evidence))
$settingsFeedback = Test-Pattern -Patterns @("/mobile/feedback") -Targets $settingsTarget
$checks.Add((New-CheckResult -Name "settings_feedback_entry" -Pass $settingsFeedback.Pass -Evidence $settingsFeedback.Evidence))

# 3) Report entry and api call
$communityDetailTarget = @((Join-Path $rootPath "perler-beads\src\pages\mobile\CommunityDetailPage.tsx"))
$communityReportCall = Test-Pattern -Patterns @("communityApi.reportPost") -Targets $communityDetailTarget
$checks.Add((New-CheckResult -Name "community_report_api_call" -Pass $communityReportCall.Pass -Evidence $communityReportCall.Evidence))
$communityReportBtn = Test-Pattern -Patterns @("reporting", "showPrompt") -Targets $communityDetailTarget
$checks.Add((New-CheckResult -Name "community_report_ui_flow" -Pass $communityReportBtn.Pass -Evidence $communityReportBtn.Evidence))

$finishedDetailTarget = @((Join-Path $rootPath "perler-beads\src\pages\mobile\FinishedWorkDetailPage.tsx"))
$finishedReportCall = Test-Pattern -Patterns @("finishedWorkApi.report") -Targets $finishedDetailTarget
$checks.Add((New-CheckResult -Name "finished_report_api_call" -Pass $finishedReportCall.Pass -Evidence $finishedReportCall.Evidence))
$finishedReportBtn = Test-Pattern -Patterns @("handleReport") -Targets $finishedDetailTarget
$checks.Add((New-CheckResult -Name "finished_report_ui_flow" -Pass $finishedReportBtn.Pass -Evidence $finishedReportBtn.Evidence))

# 4) Moderation features
$adminTargets = @(
  (Join-Path $rootPath "perler-beads\src\pages\admin\AdminConsolePage.tsx"),
  (Join-Path $rootPath "perler-beads\src\pages\mobile\CommunityModerationPage.tsx")
)
$modPanel = Test-Pattern -Patterns @("communityReports", "finishedReports", "举报处理") -Targets $adminTargets
$checks.Add((New-CheckResult -Name "moderation_report_panel" -Pass $modPanel.Pass -Evidence $modPanel.Evidence))
$modHide = Test-Pattern -Patterns @("hide", "下架") -Targets $adminTargets
$checks.Add((New-CheckResult -Name "moderation_hide_action" -Pass $modHide.Pass -Evidence $modHide.Evidence))
$modLog = Test-Pattern -Patterns @("logs", "审核日志") -Targets $adminTargets
$checks.Add((New-CheckResult -Name "moderation_logs" -Pass $modLog.Pass -Evidence $modLog.Evidence))

# 5) Backend auth guards for sensitive operations
$backendTargets = @(
  (Join-Path $rootPath "perler-beads-server\server\api\v1\community\community.go"),
  (Join-Path $rootPath "perler-beads-server\server\api\v1\finishedwork\finished_work.go")
)
$authGuard = Test-Pattern -Patterns @('c.GetUint("userID")', "if userID == 0") -Targets $backendTargets
$checks.Add((New-CheckResult -Name "backend_auth_guard_sensitive_ops" -Pass $authGuard.Pass -Evidence $authGuard.Evidence))

# 6) Legal pages content existence
$privacyTarget = @((Join-Path $rootPath "perler-beads\src\pages\mobile\PrivacyPolicyPage.tsx"))
$privacyContent = Test-Pattern -Patterns @("LEGAL_INFO", "sectionTitle", "listItem") -Targets $privacyTarget
$checks.Add((New-CheckResult -Name "privacy_policy_has_content" -Pass $privacyContent.Pass -Evidence $privacyContent.Evidence))
$uaTarget = @((Join-Path $rootPath "perler-beads\src\pages\mobile\UserAgreementPage.tsx"))
$uaContent = Test-Pattern -Patterns @("LEGAL_INFO", "sectionTitle", "listItem") -Targets $uaTarget
$checks.Add((New-CheckResult -Name "user_agreement_has_content" -Pass $uaContent.Pass -Evidence $uaContent.Evidence))

# 7) Ad labels
$adTargets = @(
  (Join-Path $rootPath "perler-beads\src\components\ads\BannerAd.tsx"),
  (Join-Path $rootPath "perler-beads\src\components\ads\RewardedUnlockModal.tsx")
)
$adContent = Test-Pattern -Patterns @("广告", "reward", "unlock", "解锁") -Targets $adTargets
$checks.Add((New-CheckResult -Name "ad_label_or_reward_hint" -Pass $adContent.Pass -Evidence $adContent.Evidence))

# 8) Build gates
if ($SkipBuild) {
  $checks.Add((New-CheckResult -Name "frontend_build" -Pass $true -Evidence "skipped by -SkipBuild"))
  $checks.Add((New-CheckResult -Name "backend_build" -Pass $true -Evidence "skipped by -SkipBuild"))
}
else {
  try {
    Push-Location (Join-Path $rootPath "perler-beads")
    cmd /c "npm.cmd run build > ..\TEMP\douyin_front_build.log 2>&1"
    if ($LASTEXITCODE -ne 0) { throw "exit code $LASTEXITCODE" }
    $checks.Add((New-CheckResult -Name "frontend_build" -Pass $true -Evidence "ok, see TEMP/douyin_front_build.log"))
  }
  catch {
    $checks.Add((New-CheckResult -Name "frontend_build" -Pass $false -Evidence "failed: $($_.Exception.Message)"))
  }
  finally {
    Pop-Location
  }

  try {
    Push-Location (Join-Path $rootPath "perler-beads-server\server")
    go build . *> (Join-Path $tempDir "douyin_back_build.log")
    if ($LASTEXITCODE -ne 0) { throw "exit code $LASTEXITCODE" }
    $checks.Add((New-CheckResult -Name "backend_build" -Pass $true -Evidence "ok, see TEMP/douyin_back_build.log"))
  }
  catch {
    $checks.Add((New-CheckResult -Name "backend_build" -Pass $false -Evidence "failed: $($_.Exception.Message)"))
  }
  finally {
    Pop-Location
  }
}

$total = $checks.Count
$passed = @($checks | Where-Object { $_.Pass }).Count
$failed = $total - $passed
$rate = if ($total -gt 0) { [math]::Round(($passed * 100.0 / $total), 1) } else { 0 }

$lines = @()
$lines += "# Douyin Compliance Report"
$lines += ""
$lines += "- Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$lines += "- Root: $rootPath"
$lines += "- Total checks: $total"
$lines += "- Passed: $passed"
$lines += "- Failed: $failed"
$lines += "- Pass rate: $rate`%"
$lines += ""
$lines += "## Results"
foreach ($c in $checks) {
  $status = if ($c.Pass) { "PASS" } else { "FAIL" }
  $lines += "- [$status] $($c.Name)"
  $lines += "  - Evidence: $($c.Evidence)"
}

$lines | Set-Content -Path $reportPath -Encoding UTF8
Write-Output $reportPath

if ($failed -gt 0) { exit 1 }
exit 0
