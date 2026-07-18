[CmdletBinding()]
param(
    [string[]]$Project,
    [string]$OutputPath = '.codex/reports/loaded-state.json'
)

$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$registry = Get-Content -LiteralPath (Join-Path $root '.agents/projects.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$selected = @($registry.projects)
if ($Project) {
    $selected = @($selected | Where-Object { $_.id -in $Project })
}
if ($selected.Count -eq 0) { throw 'No registered project was selected.' }

$expected = @($selected | ForEach-Object {
    if ($_.kind -eq 'plugin') { "$($_.id):$($_.installedId)" } else { $_.installedId }
})
$absoluteOutput = [System.IO.Path]::GetFullPath((Join-Path $root $OutputPath))
$null = New-Item -ItemType Directory -Path (Split-Path -Parent $absoluteOutput) -Force
$schema = Join-Path $PSScriptRoot 'schemas/loaded-state.schema.json'
$expectedJson = $expected | ConvertTo-Json -Compress
$prompt = @"
You are a read-only Codex capability load probe. Do not call tools and do not inspect files.
Use only the Available skills list supplied to this new task by the host.
For each exact identifier in EXPECTED, mark it loaded only if that exact Skill key is present.
Return status=passed only when missing is empty.
EXPECTED=$expectedJson
"@

Push-Location $root
try {
    $previousErrorAction = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $cliOutput = @(& codex exec --ephemeral --sandbox read-only --color never --output-schema $schema --output-last-message $absoluteOutput $prompt 2>&1)
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousErrorAction
    }
    if ($exitCode -ne 0) {
        $tail = @($cliOutput | Select-Object -Last 12) -join [Environment]::NewLine
        throw "Codex loaded-state probe failed with exit code $exitCode.$([Environment]::NewLine)$tail"
    }
}
finally {
    Pop-Location
}

$result = Get-Content -LiteralPath $absoluteOutput -Raw -Encoding UTF8 | ConvertFrom-Json
$loaded = @($result.loaded | Sort-Object -Unique)
$missing = @($expected | Where-Object { $_ -notin $loaded })
if ($missing.Count -gt 0 -or $result.status -ne 'passed') {
    throw "Loaded-state proof failed; missing: $($missing -join ', ')"
}
$result | ConvertTo-Json -Depth 5
