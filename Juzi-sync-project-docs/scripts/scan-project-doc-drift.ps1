[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectRoot,

    [ValidateRange(1, 100)]
    [int]$CommitLimit = 30,

    [string]$SinceTag,

    [string]$OutputPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-Utf8Text {
    param([Parameter(Mandatory = $true)][string]$Path)
    return [System.IO.File]::ReadAllText($Path, [System.Text.UTF8Encoding]::new($false))
}

function Invoke-GitText {
    param([Parameter(Mandatory = $true)][string[]]$Arguments)
    $output = & git -C $script:ResolvedRoot @Arguments 2>$null
    if ($LASTEXITCODE -ne 0) {
        return $null
    }
    return @($output)
}

function Add-VersionSource {
    param(
        [System.Collections.Generic.List[object]]$Sources,
        [Parameter(Mandatory = $true)][string]$RelativePath,
        [Parameter(Mandatory = $true)][string]$Kind,
        [string]$Value
    )
    if (-not [string]::IsNullOrWhiteSpace($Value)) {
        $Sources.Add([pscustomobject]@{ path = $RelativePath; kind = $Kind; version = $Value.Trim() })
    }
}

$ResolvedRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path
$insideRepository = Invoke-GitText @('rev-parse', '--is-inside-work-tree')
if ($insideRepository -ne 'true') {
    throw "ProjectRoot is not a Git repository: $ResolvedRoot"
}

$versionSources = [System.Collections.Generic.List[object]]::new()
$versionProbes = @(
    @{ path = 'package.json'; kind = 'node_package' },
    @{ path = 'pyproject.toml'; kind = 'python_project' },
    @{ path = 'Cargo.toml'; kind = 'rust_package' },
    @{ path = 'Directory.Build.props'; kind = 'dotnet_project' },
    @{ path = 'VERSION'; kind = 'version_file' }
)

foreach ($probe in $versionProbes) {
    $fullPath = Join-Path $ResolvedRoot $probe.path
    if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
        continue
    }

    $text = Get-Utf8Text $fullPath
    $value = $null
    switch ($probe.kind) {
        'node_package' {
            try { $value = ($text | ConvertFrom-Json).version } catch { $value = $null }
        }
        'python_project' { if ($text -match '(?m)^\s*version\s*=\s*["'']([^"'']+)["'']') { $value = $Matches[1] } }
        'rust_package' { if ($text -match '(?m)^\s*version\s*=\s*["'']([^"'']+)["'']') { $value = $Matches[1] } }
        'dotnet_project' { if ($text -match '(?s)<Version>([^<]+)</Version>') { $value = $Matches[1] } }
        'version_file' { $value = $text.Trim().Split([Environment]::NewLine)[0] }
    }
    Add-VersionSource -Sources $versionSources -RelativePath $probe.path -Kind $probe.kind -Value $value
}

$canonicalVersion = if ($versionSources.Count -gt 0) { $versionSources[0].version } else { $null }
$branch = (Invoke-GitText @('branch', '--show-current') | Select-Object -First 1)
$status = @(Invoke-GitText @('status', '--porcelain'))
$latestTag = if ($SinceTag) { $SinceTag } else { (Invoke-GitText @('describe', '--tags', '--abbrev=0') | Select-Object -First 1) }
$range = if ($latestTag) { "$latestTag..HEAD" } else { 'HEAD' }

$commitLines = @(Invoke-GitText @('log', "--max-count=$CommitLimit", '--date=short', '--pretty=format:%H%x1f%h%x1f%ad%x1f%an%x1f%s', $range))
$commits = foreach ($line in $commitLines) {
    $parts = $line -split [char]0x1f, 5
    if ($parts.Count -eq 5) {
        [pscustomobject]@{ hash = $parts[0]; short_hash = $parts[1]; date = $parts[2]; author = $parts[3]; subject = $parts[4] }
    }
}

$docPaths = @(Invoke-GitText @('ls-files', '--', '*.md', '*.mdx', '*.rst', '*.adoc', 'README*', 'CHANGELOG*')) |
    Where-Object { $_ -and $_ -notmatch '(^|/)(node_modules|dist|build|vendor)/' } |
    Sort-Object -Unique

$currentVersionTerms = '(?i)(当前|最新|推荐|稳定版|current|latest|recommended|stable)'
$semverPattern = '(?i)(?<![\w.])v?\d+\.\d+\.\d+(?:[-+][\w.-]+)?'
$staleMentions = [System.Collections.Generic.List[object]]::new()

foreach ($relativePath in $docPaths) {
    $fullPath = Join-Path $ResolvedRoot $relativePath
    if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
        continue
    }

    $lineNumber = 0
    foreach ($line in ((Get-Utf8Text $fullPath) -split "`r?`n")) {
        $lineNumber++
        if ($canonicalVersion -and $line -match $currentVersionTerms -and $line -match $semverPattern) {
            $mentioned = $Matches[0].TrimStart('v', 'V')
            if ($mentioned -ne $canonicalVersion) {
                $staleMentions.Add([pscustomobject]@{ path = $relativePath; line = $lineNumber; mentioned_version = $mentioned; text = $line.Trim() })
            }
        }
    }
}

$actions = [System.Collections.Generic.List[string]]::new()
if (-not $canonicalVersion) { $actions.Add('No canonical version source was found; identify the release authority before editing version references.') }
if ($staleMentions.Count -gt 0) { $actions.Add('Review current-version wording in the reported document lines and update only non-historical references.') }
if (-not $latestTag) { $actions.Add('No Git tag was found; choose an explicit documentation baseline or create a release tag when the release process allows it.') }
if ($status.Count -gt 0) { $actions.Add('Working tree is not clean; preserve existing changes and separate generated artifacts from documentation edits.') }
if ($commits.Count -gt 0) { $actions.Add('Inspect changed code for the listed commits before claiming user-visible behavior in README or CHANGELOG.') }

$report = [ordered]@{
    generated_at = (Get-Date).ToUniversalTime().ToString('o')
    project_root = $ResolvedRoot
    git = [ordered]@{
        branch = $branch
        baseline_tag = $latestTag
        range = $range
        working_tree_entries = $status
        working_tree_clean = ($status.Count -eq 0)
    }
    canonical_version = $canonicalVersion
    version_sources = @($versionSources)
    commits = @($commits)
    docs = @($docPaths)
    stale_current_version_mentions = @($staleMentions)
    suggested_actions = @($actions)
}

$json = $report | ConvertTo-Json -Depth 8
if ($OutputPath) {
    $resolvedOutput = [System.IO.Path]::GetFullPath($OutputPath)
    $parent = Split-Path -Parent $resolvedOutput
    if ($parent) { [System.IO.Directory]::CreateDirectory($parent) | Out-Null }
    [System.IO.File]::WriteAllText($resolvedOutput, $json + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))
}

$json
