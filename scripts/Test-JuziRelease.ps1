[CmdletBinding()]
param(
    [string]$Base = 'origin/main',
    [switch]$All,
    [switch]$History,
    [switch]$RequireClean,
    [string]$OutputPath = '.codex/reports/preflight.json'
)

$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$script = Join-Path $PSScriptRoot 'juzi_release.py'
$arguments = @($script, 'preflight', '--base', $Base, '--output', $OutputPath)
if ($All) { $arguments += '--all' }
if ($History) { $arguments += '--history' }
if ($RequireClean) { $arguments += '--require-clean' }

Push-Location $root
try {
    & python @arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Juzi release preflight failed with exit code $LASTEXITCODE."
    }
}
finally {
    Pop-Location
}
