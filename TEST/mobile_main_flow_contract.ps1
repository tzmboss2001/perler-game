param(
  [string]$Root = "."
)

$ErrorActionPreference = "Stop"

$rootPath = (Resolve-Path $Root).Path
$frontendPath = Join-Path $rootPath "perler-beads"
$routerFile = Join-Path $frontendPath "src\router\index.tsx"
$createFile = Join-Path $frontendPath "src\pages\mobile\CreatePage.tsx"
$editorFile = Join-Path $frontendPath "src\pages\mobile\EditorPage.tsx"
$makingFile = Join-Path $frontendPath "src\pages\mobile\MakingPage.tsx"

function Assert-Contains {
  param(
    [string]$Content,
    [string]$Needle,
    [string]$Label
  )
  if ($Content -notmatch [regex]::Escape($Needle)) {
    throw "$Label missing: $Needle"
  }
}

function Assert-FileExists {
  param([string]$Path)
  if (-not (Test-Path $Path)) {
    throw "file not found: $Path"
  }
}

Assert-FileExists $routerFile
Assert-FileExists $createFile
Assert-FileExists $editorFile
Assert-FileExists $makingFile

$router = Get-Content -Raw -Encoding UTF8 $routerFile
$create = Get-Content -Raw -Encoding UTF8 $createFile
$editor = Get-Content -Raw -Encoding UTF8 $editorFile
$making = Get-Content -Raw -Encoding UTF8 $makingFile

# Route contract: create -> editor -> making must all exist.
Assert-Contains -Content $router -Needle 'path="create"' -Label "router"
Assert-Contains -Content $router -Needle 'path="/mobile/editor"' -Label "router"
Assert-Contains -Content $router -Needle 'path="/mobile/making"' -Label "router"

# Create page contract: quick path + advanced toggle + enter editor.
Assert-Contains -Content $create -Needle 'fastMode: true' -Label "create"
Assert-Contains -Content $create -Needle 'setShowAdvanced((v) => !v)' -Label "create"
Assert-Contains -Content $create -Needle "navigate('/mobile/editor'" -Label "create"

# Editor page contract: start-making primary action + secondary share action.
Assert-Contains -Content $editor -Needle 'handleStartMakingClick' -Label "editor"
Assert-Contains -Content $editor -Needle 'handleShareClick' -Label "editor"
Assert-Contains -Content $editor -Needle 'setShowSaveModal(true)' -Label "editor"

# Making page contract: destination page still present.
Assert-Contains -Content $making -Needle 'const MakingPage' -Label "making"

Write-Output "main flow contract pass"
exit 0
