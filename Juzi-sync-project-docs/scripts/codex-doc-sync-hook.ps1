[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('UserPromptSubmit', 'Stop')]
    [string]$Event
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-HookJson {
    param([Parameter(Mandatory = $true)][object]$Value)
    [Console]::Out.Write(($Value | ConvertTo-Json -Compress))
}

function Get-GitRoot {
    $root = & git rev-parse --show-toplevel 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $root) {
        return $null
    }
    return ($root | Select-Object -First 1).Trim()
}

function Get-WorkingEntries {
    param(
        [Parameter(Mandatory = $true)][string]$RepositoryRoot,
        [Parameter(Mandatory = $true)][object]$DocSyncConfig
    )

    # Only collect files the enabled project has declared relevant. This preserves
    # dirty-worktree boundaries without hashing generated or unrelated artifacts.
    $lines = & git -C $RepositoryRoot status --porcelain --untracked-files=normal 2>$null
    if ($LASTEXITCODE -ne 0) {
        return @()
    }

    $entries = foreach ($line in @($lines)) {
        if ($line.Length -lt 4) {
            continue
        }

        $relativePath = $line.Substring(3).Trim()
        if ([string]::IsNullOrWhiteSpace($relativePath)) {
            continue
        }

        if (-not (Test-IsDocumentationPath $relativePath) -and -not (Test-IsBehaviorPath -Path $relativePath -DocSyncConfig $DocSyncConfig)) {
            continue
        }

        $fullPath = Join-Path $RepositoryRoot $relativePath
        $hash = if (Test-Path -LiteralPath $fullPath -PathType Leaf) {
            (Get-FileHash -Algorithm SHA256 -LiteralPath $fullPath).Hash
        }
        else {
            'missing'
        }

        [pscustomobject]@{
            path = $relativePath.Replace('\', '/')
            status = $line.Substring(0, 2)
            hash = $hash
        }
    }
    return @($entries)
}

function Test-IsDocumentationPath {
    param([Parameter(Mandatory = $true)][string]$Path)
    $normalized = $Path.Replace('\', '/').ToLowerInvariant()
    $fileName = [System.IO.Path]::GetFileName($normalized)
    return $normalized -match '(^|/)(docs?|documentation|reference|guides?)/' -or
        $normalized -match '\.(md|mdx|rst|adoc)$' -or
        $fileName -match '^(readme|changelog|contributing|release-notes|migration)(\.|$)'
}

function Test-IsDocumentationSignalPath {
    param([Parameter(Mandatory = $true)][string]$Path)
    $normalized = $Path.Replace('\', '/').ToLowerInvariant()
    $fileName = [System.IO.Path]::GetFileName($normalized)
    if ($normalized -match '(^|/)(node_modules|dist|build|coverage|outputs)/' -or
        $fileName -match '(^|\.)(lock|log)$' -or
        $normalized -match '(package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$') {
        return $false
    }

    return $normalized -match '\.(js|cjs|mjs|ts|tsx|jsx|py|go|rs|java|kt|cs|fs|rb|php|swift|scala|sh|ps1)$' -or
        $fileName -match '^(package\.json|pyproject\.toml|cargo\.toml|directory\.build\.props|version)$'
}

function Get-DocSyncConfig {
    param([Parameter(Mandatory = $true)][string]$RepositoryRoot)

    $configPath = Join-Path $RepositoryRoot '.codex\doc-sync.json'
    if (-not (Test-Path -LiteralPath $configPath -PathType Leaf)) {
        return $null
    }

    try {
        $config = (Get-Content -Raw -LiteralPath $configPath -Encoding utf8) | ConvertFrom-Json
        if (-not $config.enabled) {
            return $null
        }

        $behaviorPaths = @($config.behavior_paths | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) })
        if ($behaviorPaths.Count -eq 0) {
            return $null
        }

        $mode = if ([string]$config.mode -eq 'block') { 'block' } else { 'observe' }
        return [pscustomobject]@{
            behavior_paths = $behaviorPaths
            mode = $mode
        }
    }
    catch {
        # An invalid optional config must not block unrelated Codex work.
        return $null
    }
}

function Test-IsBehaviorPath {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][object]$DocSyncConfig
    )

    $normalizedPath = $Path.Replace('\', '/').TrimStart('/').ToLowerInvariant()
    foreach ($configuredPath in @($DocSyncConfig.behavior_paths)) {
        $normalizedConfiguredPath = ([string]$configuredPath).Replace('\', '/').Trim().TrimStart('./').Trim('/').ToLowerInvariant()
        if ([string]::IsNullOrWhiteSpace($normalizedConfiguredPath)) {
            continue
        }

        if ($normalizedPath -eq $normalizedConfiguredPath -or $normalizedPath.StartsWith("$normalizedConfiguredPath/")) {
            return $true
        }
    }
    return $false
}

function Get-StatePath {
    param(
        [Parameter(Mandatory = $true)][string]$RepositoryRoot,
        [object]$Payload
    )
    $sessionKey = if ($Payload.PSObject.Properties['session_id'] -and $Payload.session_id) {
        [string]$Payload.session_id
    }
    elseif ($Payload.PSObject.Properties['turn_id'] -and $Payload.turn_id) {
        [string]$Payload.turn_id
    }
    else {
        'unknown-session'
    }
    $identity = "$RepositoryRoot`n$sessionKey"
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($identity)
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    try {
        $hash = $sha256.ComputeHash($bytes)
    }
    finally {
        $sha256.Dispose()
    }
    $name = ([System.BitConverter]::ToString($hash) -replace '-', '').ToLowerInvariant()
    $stateDirectory = Join-Path $env:LOCALAPPDATA 'Codex\JuziDocSync\state'
    [System.IO.Directory]::CreateDirectory($stateDirectory) | Out-Null
    return Join-Path $stateDirectory "$name.json"
}

try {
    $rawInput = [Console]::In.ReadToEnd()
    $payload = if ([string]::IsNullOrWhiteSpace($rawInput)) { [pscustomobject]@{} } else { $rawInput | ConvertFrom-Json }
    $repositoryRoot = Get-GitRoot
    if (-not $repositoryRoot) {
        if ($Event -eq 'Stop') { Write-HookJson @{} }
        exit 0
    }

    $docSyncConfig = Get-DocSyncConfig -RepositoryRoot $repositoryRoot
    if (-not $docSyncConfig) {
        if ($Event -eq 'Stop') { Write-HookJson @{} }
        exit 0
    }

    $statePath = Get-StatePath -RepositoryRoot $repositoryRoot -Payload $payload
    if ($Event -eq 'UserPromptSubmit') {
        # Save only this turn's dirty-file baseline, preserving pre-existing user work.
        $state = [ordered]@{
            repository_root = $repositoryRoot
            baseline = @(Get-WorkingEntries -RepositoryRoot $repositoryRoot -DocSyncConfig $docSyncConfig)
            prompted = $false
        }
        [System.IO.File]::WriteAllText($statePath, ($state | ConvertTo-Json -Depth 5), [System.Text.UTF8Encoding]::new($false))
        exit 0
    }

    if (-not (Test-Path -LiteralPath $statePath -PathType Leaf)) {
        Write-HookJson @{}
        exit 0
    }

    $state = (Get-Content -Raw -LiteralPath $statePath) | ConvertFrom-Json
    $stopHookActive = $payload.PSObject.Properties['stop_hook_active'] -and [bool]$payload.stop_hook_active
    if ($state.prompted -or $stopHookActive) {
        Remove-Item -LiteralPath $statePath -Force -ErrorAction SilentlyContinue
        Write-HookJson @{}
        exit 0
    }

    $baselineByPath = @{}
    foreach ($entry in @($state.baseline)) {
        $baselineByPath[$entry.path] = $entry.hash
    }

    $changedCode = [System.Collections.Generic.List[string]]::new()
    $changedDocs = [System.Collections.Generic.List[string]]::new()
    foreach ($entry in (Get-WorkingEntries -RepositoryRoot $repositoryRoot -DocSyncConfig $docSyncConfig)) {
        $changedThisTurn = -not $baselineByPath.ContainsKey($entry.path) -or $baselineByPath[$entry.path] -ne $entry.hash
        if (-not $changedThisTurn) {
            continue
        }
        if (Test-IsDocumentationPath $entry.path) {
            $changedDocs.Add($entry.path)
        }
        elseif (Test-IsDocumentationSignalPath $entry.path) {
            $changedCode.Add($entry.path)
        }
    }

    if ($changedCode.Count -gt 0 -and $changedDocs.Count -eq 0 -and $docSyncConfig.mode -eq 'block') {
        $state.prompted = $true
        [System.IO.File]::WriteAllText($statePath, ($state | ConvertTo-Json -Depth 5), [System.Text.UTF8Encoding]::new($false))
        $files = ($changedCode | Select-Object -First 8) -join ', '
        Write-HookJson ([ordered]@{
            decision = 'block'
            reason = "Documentation synchronization is pending for this turn's code/version changes ($files). Inspect the Git diff, run D:\Tools\AI\Juzi-Skill\Juzi-sync-project-docs\scripts\scan-project-doc-drift.ps1, and update only the user-facing documentation justified by verified behavior. Do not commit or push."
        })
        exit 0
    }

    Remove-Item -LiteralPath $statePath -Force -ErrorAction SilentlyContinue
    Write-HookJson @{}
}
catch {
    # Hooks must never block normal Codex work because their own state is unavailable.
    if ($env:CODEX_DOC_SYNC_DEBUG -eq '1') {
        [Console]::Error.WriteLine([string]($_ | Out-String))
    }
    if ($Event -eq 'Stop') {
        Write-HookJson @{}
    }
    exit 0
}
