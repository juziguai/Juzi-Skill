[CmdletBinding()]
param(
    [ValidateSet('Install', 'Status', 'Uninstall')]
    [string]$Mode = 'Install',

    [string]$CodexHome = (Join-Path $env:USERPROFILE '.codex')
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-Utf8Text {
    param([Parameter(Mandatory = $true)][string]$Path)
    [System.IO.File]::ReadAllText($Path, [System.Text.UTF8Encoding]::new($false))
}

function Write-Utf8Text {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Text
    )
    [System.IO.File]::WriteAllText($Path, $Text + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))
}

function Get-HookConfig {
    param([Parameter(Mandatory = $true)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        return [pscustomobject]@{ hooks = [pscustomobject]@{} }
    }
    $config = Get-Utf8Text $Path | ConvertFrom-Json
    if (-not $config.hooks) {
        $config | Add-Member -NotePropertyName hooks -NotePropertyValue ([pscustomobject]@{})
    }
    return $config
}

function Get-CommandSet {
    param([Parameter(Mandatory = $true)][object]$Config)
    $commands = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
    foreach ($eventProperty in $Config.hooks.PSObject.Properties) {
        foreach ($group in @($eventProperty.Value)) {
            foreach ($hook in @($group.hooks)) {
                if ($hook.command) { $commands.Add([string]$hook.command) | Out-Null }
            }
        }
    }
    return ,$commands
}

function Merge-OwnHooks {
    param(
        [Parameter(Mandatory = $true)][object]$Target,
        [Parameter(Mandatory = $true)][object]$Source
    )
    $knownCommands = Get-CommandSet $Target
    $changed = $false
    foreach ($eventProperty in $Source.hooks.PSObject.Properties) {
        $targetProperty = $Target.hooks.PSObject.Properties[$eventProperty.Name]
        $groups = if ($targetProperty) { @($targetProperty.Value) } else { @() }
        foreach ($sourceGroup in @($eventProperty.Value)) {
            $sourceCommands = @($sourceGroup.hooks | ForEach-Object { $_.command } | Where-Object { $_ })
            $missingCommands = @($sourceCommands | Where-Object { -not $knownCommands.Contains([string]$_) })
            if ($sourceCommands.Count -eq 0 -or $missingCommands.Count -eq 0) {
                continue
            }
            $groups += $sourceGroup
            foreach ($command in $sourceCommands) { $knownCommands.Add([string]$command) | Out-Null }
            $changed = $true
        }
        if ($targetProperty) {
            $targetProperty.Value = @($groups)
        }
        else {
            $Target.hooks | Add-Member -NotePropertyName $eventProperty.Name -NotePropertyValue @($groups)
        }
    }
    return $changed
}

function Remove-OwnHooks {
    param(
        [Parameter(Mandatory = $true)][object]$Target,
        [Parameter(Mandatory = $true)][object]$Source
    )
    $ownCommands = Get-CommandSet $Source
    $changed = $false
    foreach ($eventProperty in @($Target.hooks.PSObject.Properties)) {
        $remaining = @()
        foreach ($group in @($eventProperty.Value)) {
            $groupCommands = @($group.hooks | ForEach-Object { $_.command } | Where-Object { $_ })
            $ownedCommands = @($groupCommands | Where-Object { $ownCommands.Contains([string]$_) })
            if ($ownedCommands.Count -gt 0) {
                $changed = $true
                continue
            }
            $remaining += $group
        }
        if ($remaining.Count -eq 0) {
            $Target.hooks.PSObject.Properties.Remove($eventProperty.Name)
        }
        else {
            $eventProperty.Value = @($remaining)
        }
    }
    return $changed
}

function Test-IsOurJunction {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$ExpectedTarget
    )
    if (-not (Test-Path -LiteralPath $Path -PathType Container)) { return $false }
    $item = Get-Item -LiteralPath $Path -Force
    if (-not ($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint)) { return $false }
    $target = @($item.Target | Select-Object -First 1)[0]
    return $target -and ([System.IO.Path]::GetFullPath($target).TrimEnd('\') -eq [System.IO.Path]::GetFullPath($ExpectedTarget).TrimEnd('\'))
}

$sourceRoot = Split-Path -Parent $PSScriptRoot
$sourceHooksPath = Join-Path $sourceRoot 'hooks\hooks.json'
if (-not (Test-Path -LiteralPath $sourceHooksPath -PathType Leaf)) {
    throw "Missing bundled hook definition: $sourceHooksPath"
}

$resolvedCodexHome = [System.IO.Path]::GetFullPath($CodexHome)
$skillsRoot = Join-Path $resolvedCodexHome 'skills'
$targetSkillPath = Join-Path $skillsRoot 'Juzi-sync-project-docs'
$globalHooksPath = Join-Path $resolvedCodexHome 'hooks.json'
$sourceHooks = Get-HookConfig $sourceHooksPath
$globalHooks = Get-HookConfig $globalHooksPath
$isInstalled = Test-IsOurJunction -Path $targetSkillPath -ExpectedTarget $sourceRoot
$registeredCommands = Get-CommandSet $globalHooks
$expectedCommands = Get-CommandSet $sourceHooks
$hooksRegistered = (@($expectedCommands | Where-Object { -not $registeredCommands.Contains($_) }).Count -eq 0)

if ($Mode -eq 'Status') {
    [pscustomobject]@{
        codex_home = $resolvedCodexHome
        skill_link = $targetSkillPath
        skill_installed = $isInstalled
        hooks_registered = $hooksRegistered
        restart_required = ($isInstalled -and $hooksRegistered)
    } | ConvertTo-Json
    exit 0
}

if ($Mode -eq 'Install') {
    [System.IO.Directory]::CreateDirectory($skillsRoot) | Out-Null
    if (Test-Path -LiteralPath $targetSkillPath) {
        if (-not $isInstalled) {
            throw "Refusing to replace an existing non-Juzi Skill path: $targetSkillPath"
        }
    }
    else {
        New-Item -ItemType Junction -Path $targetSkillPath -Target $sourceRoot | Out-Null
        $isInstalled = $true
    }

    if (Merge-OwnHooks -Target $globalHooks -Source $sourceHooks) {
        if (Test-Path -LiteralPath $globalHooksPath -PathType Leaf) {
            $backupPath = "$globalHooksPath.bak-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
            Copy-Item -LiteralPath $globalHooksPath -Destination $backupPath
        }
        Write-Utf8Text -Path $globalHooksPath -Text ($globalHooks | ConvertTo-Json -Depth 12)
    }

    [pscustomobject]@{
        installed = $isInstalled
        hooks_registered = $true
        restart_required = $true
        next_step = 'Restart Codex, then trust the new hook once through /hooks.'
    } | ConvertTo-Json
    exit 0
}

$hooksChanged = Remove-OwnHooks -Target $globalHooks -Source $sourceHooks
if ($hooksChanged) {
    if (Test-Path -LiteralPath $globalHooksPath -PathType Leaf) {
        $backupPath = "$globalHooksPath.bak-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        Copy-Item -LiteralPath $globalHooksPath -Destination $backupPath
    }
    Write-Utf8Text -Path $globalHooksPath -Text ($globalHooks | ConvertTo-Json -Depth 12)
}
if (Test-IsOurJunction -Path $targetSkillPath -ExpectedTarget $sourceRoot) {
    Remove-Item -LiteralPath $targetSkillPath -Force
}

[pscustomobject]@{
    uninstalled = $true
    hooks_removed = $hooksChanged
    restart_required = $true
} | ConvertTo-Json
