[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)]
    [ValidateSet('Plan', 'Prepare', 'ConfigureChannel', 'Install', 'Verify', 'Receipt')]
    [string]$Phase,
    [string[]]$Project,
    [ValidateSet('stable', 'beta')]
    [string]$Channel = 'stable',
    [string]$Base = 'origin/main',
    [string]$ExpectedCommit,
    [string]$ReceiptPath = '.codex/reports/release-receipt.json',
    [switch]$Apply
)

$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$registryPath = Join-Path $root '.agents/projects.json'
$registry = Get-Content -LiteralPath $registryPath -Raw -Encoding UTF8 | ConvertFrom-Json
$projectMap = @{}
foreach ($item in $registry.projects) { $projectMap[$item.id] = $item }
if (-not $Project -and $Phase -eq 'Prepare') {
    throw 'Prepare requires explicit -Project values; inspect juzi_release.py changed before selecting package versions.'
}
if (-not $Project) { $Project = @($registry.projects.id) }
foreach ($id in $Project) {
    if (-not $projectMap.ContainsKey($id)) { throw "Unknown project: $id" }
}

Push-Location $root
try {
    switch ($Phase) {
        'Plan' {
            & (Join-Path $PSScriptRoot 'Test-JuziRelease.ps1') -All -History
        }
        'Prepare' {
            if (-not $Apply) { throw 'Prepare requires -Apply because it may synchronize package copies and update plugin versions.' }
            foreach ($id in $Project) {
                $item = $projectMap[$id]
                if ($item.kind -ne 'plugin') { continue }
                $changed = @(& git status --porcelain -- $item.canonicalPath $item.packagePath)
                if ($changed.Count -eq 0) {
                    Write-Verbose "No package change detected; skipping cachebuster: $id"
                    continue
                }
                if ($item.sourceMode -eq 'generated-copy') {
                    & python (Join-Path $PSScriptRoot 'juzi_release.py') sync --project $id --apply
                    if ($LASTEXITCODE -ne 0) { throw "Package synchronization failed: $id" }
                }
                $cachebuster = Join-Path $HOME '.codex/skills/.system/plugin-creator/scripts/update_plugin_cachebuster.py'
                if (-not (Test-Path -LiteralPath $cachebuster)) {
                    throw "Official cachebuster tool is unavailable: $cachebuster"
                }
                $manifestRelative = "$($item.packagePath)/.codex-plugin/plugin.json"
                $previousText = @(& git show "$Base`:$manifestRelative" 2>$null) -join [Environment]::NewLine
                $currentManifest = Get-Content -LiteralPath (Join-Path $root $manifestRelative) -Raw -Encoding UTF8 | ConvertFrom-Json
                $previousVersion = $null
                if ($LASTEXITCODE -eq 0 -and $previousText) {
                    $previousVersion = ($previousText | ConvertFrom-Json).version
                }
                if (-not $previousVersion -or $previousVersion -eq $currentManifest.version) {
                    & python $cachebuster (Join-Path $root $item.packagePath)
                    if ($LASTEXITCODE -ne 0) { throw "Cachebuster update failed: $id" }
                }
            }
            & (Join-Path $PSScriptRoot 'Test-JuziRelease.ps1') -All -History
        }
        'Install' {
            if (-not $Apply) { throw 'Install requires -Apply because it changes the configured marketplace and plugin installation state.' }
            if (-not $ExpectedCommit) { throw 'Install requires -ExpectedCommit.' }
            $head = (& git rev-parse HEAD).Trim()
            if ($head -ne $ExpectedCommit) { throw "HEAD $head does not match ExpectedCommit $ExpectedCommit" }
            if (& git status --porcelain) { throw 'Install requires a clean working tree.' }
            & codex plugin marketplace upgrade $registry.marketplace.name --json
            if ($LASTEXITCODE -ne 0) { throw 'Marketplace upgrade failed.' }
            foreach ($id in $Project) {
                if ($projectMap[$id].kind -ne 'plugin') { continue }
                & codex plugin add "$id@$($registry.marketplace.name)" --json
                if ($LASTEXITCODE -ne 0) { throw "Plugin install failed: $id" }
            }
        }
        'ConfigureChannel' {
            if (-not $Apply) { throw 'ConfigureChannel requires -Apply because it changes Codex user marketplace configuration.' }
            if (-not $ExpectedCommit) { throw 'ConfigureChannel requires -ExpectedCommit.' }
            $targetRef = if ($Channel -eq 'stable') { $registry.repository.stableRef } else { $registry.repository.betaRef }
            $remote = @(& git ls-remote origin "refs/heads/$targetRef")
            if ($LASTEXITCODE -ne 0 -or $remote.Count -ne 1) { throw "Remote channel ref is unavailable: $targetRef" }
            $remoteCommit = ($remote[0] -split '\s+')[0]
            if ($remoteCommit -ne $ExpectedCommit) { throw "Remote $targetRef is $remoteCommit, expected $ExpectedCommit" }
            $configPath = Join-Path $HOME '.codex/config.toml'
            $config = Get-Content -LiteralPath $configPath -Raw -Encoding UTF8
            $section = [regex]::Match($config, '(?ms)^\[marketplaces\.juzi-skill\]\s*(.*?)(?=^\[|\z)')
            $previousRef = [regex]::Match($section.Groups[1].Value, '(?m)^ref\s*=\s*"([^"]+)"').Groups[1].Value
            if (-not $previousRef) { throw 'Cannot determine the previous juzi-skill marketplace ref.' }
            try {
                & codex plugin marketplace remove $registry.marketplace.name
                if ($LASTEXITCODE -ne 0) { throw 'Marketplace remove failed.' }
                & codex plugin marketplace add 'juziguai/Juzi-Skill' --ref $targetRef --json
                if ($LASTEXITCODE -ne 0) { throw 'Marketplace add for target channel failed.' }
                $verifiedConfig = Get-Content -LiteralPath $configPath -Raw -Encoding UTF8
                $verifiedSection = [regex]::Match($verifiedConfig, '(?ms)^\[marketplaces\.juzi-skill\]\s*(.*?)(?=^\[|\z)')
                $verifiedRef = [regex]::Match($verifiedSection.Groups[1].Value, '(?m)^ref\s*=\s*"([^"]+)"').Groups[1].Value
                if ($verifiedRef -ne $targetRef) { throw "Marketplace ref verification failed: $verifiedRef" }
            }
            catch {
                & codex plugin marketplace remove $registry.marketplace.name 2>$null
                & codex plugin marketplace add 'juziguai/Juzi-Skill' --ref $previousRef --json 2>$null
                throw
            }
        }
        'Verify' {
            & python (Join-Path $PSScriptRoot 'juzi_release.py') health --require-installed
            if ($LASTEXITCODE -ne 0) { throw 'Installed-state verification failed.' }
        }
        'Receipt' {
            $arguments = @((Join-Path $PSScriptRoot 'juzi_release.py'), 'receipt', '--output', $ReceiptPath, '--channel', $Channel)
            foreach ($id in $Project) { $arguments += @('--project', $id) }
            & python @arguments
            if ($LASTEXITCODE -ne 0) { throw 'Release receipt generation failed.' }
        }
    }
}
finally {
    Pop-Location
}
