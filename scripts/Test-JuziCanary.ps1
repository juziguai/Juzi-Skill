[CmdletBinding()]
param(
    [string[]]$Project,
    [string]$OutputPath = '.codex/reports/canary.json',
    [switch]$KeepSandbox
)

$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$registry = Get-Content -LiteralPath (Join-Path $root '.agents/projects.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$plugins = @($registry.projects | Where-Object kind -eq 'plugin')
if ($Project) {
    $plugins = @($plugins | Where-Object { $_.id -in $Project })
}
if ($plugins.Count -eq 0) {
    throw 'No registered plugin was selected for canary installation.'
}

$canaryRoot = Join-Path $root '.codex\canary'
$sandbox = Join-Path $canaryRoot ("juzi-codex-canary-" + [guid]::NewGuid().ToString('N'))
$codexHome = Join-Path $sandbox 'codex-home'
$null = New-Item -ItemType Directory -Path $codexHome -Force
$oldCodexHome = $env:CODEX_HOME
$result = [ordered]@{
    schemaVersion = 1
    status = 'running'
    codexVersion = (& codex --version).Trim()
    marketplace = $registry.marketplace.name
    projects = @($plugins.id)
    installed = @()
    sandboxRemoved = $false
}

try {
    $env:CODEX_HOME = $codexHome
    $add = & codex plugin marketplace add $root --json
    if ($LASTEXITCODE -ne 0) { throw 'Isolated marketplace add failed.' }
    foreach ($plugin in $plugins) {
        $selector = "$($plugin.id)@$($registry.marketplace.name)"
        $install = & codex plugin add $selector --json
        if ($LASTEXITCODE -ne 0) { throw "Isolated plugin install failed: $selector" }
    }
    $list = & codex plugin list --json | ConvertFrom-Json
    foreach ($plugin in $plugins) {
        $selector = "$($plugin.id)@$($registry.marketplace.name)"
        $item = @($list.installed | Where-Object pluginId -eq $selector)
        if ($item.Count -ne 1 -or -not $item[0].installed -or -not $item[0].enabled) {
            throw "Canary state is invalid: $selector"
        }
        $result.installed += [ordered]@{
            pluginId = $selector
            version = $item[0].version
            installed = [bool]$item[0].installed
            enabled = [bool]$item[0].enabled
        }
    }
    $result.status = 'passed'
}
finally {
    $env:CODEX_HOME = $oldCodexHome
    if (-not $KeepSandbox -and (Test-Path -LiteralPath $sandbox)) {
        $resolvedSandbox = [System.IO.Path]::GetFullPath($sandbox)
        $resolvedCanaryRoot = [System.IO.Path]::GetFullPath($canaryRoot)
        if (-not $resolvedSandbox.StartsWith($resolvedCanaryRoot, [System.StringComparison]::OrdinalIgnoreCase) -or
            -not (Split-Path -Leaf $resolvedSandbox).StartsWith('juzi-codex-canary-')) {
            throw "Refusing to remove unexpected canary path: $resolvedSandbox"
        }
        Remove-Item -LiteralPath $sandbox -Recurse -Force
        $result.sandboxRemoved = $true
    }
    $absoluteOutput = [System.IO.Path]::GetFullPath((Join-Path $root $OutputPath))
    $null = New-Item -ItemType Directory -Path (Split-Path -Parent $absoluteOutput) -Force
    $json = $result | ConvertTo-Json -Depth 8
    [System.IO.File]::WriteAllText($absoluteOutput, $json + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))
}

$result | ConvertTo-Json -Depth 8
if ($result.status -ne 'passed') { exit 1 }
