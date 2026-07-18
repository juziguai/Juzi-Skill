[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$scanner = Join-Path $repositoryRoot 'Juzi-sync-project-docs\scripts\scan-project-doc-drift.ps1'
$tempBase = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\', '/')
$fixtureRoot = Join-Path $tempBase ("juzi-doc-sync-no-tag-" + [guid]::NewGuid().ToString('N'))
$reportPath = Join-Path $fixtureRoot 'report.json'

try {
    New-Item -ItemType Directory -Path $fixtureRoot | Out-Null
    & git -C $fixtureRoot init --quiet --initial-branch=main
    if ($LASTEXITCODE -ne 0) { throw 'Failed to initialize the no-tag Git fixture.' }
    & git -C $fixtureRoot config user.name 'Juzi Skill Fixture'
    & git -C $fixtureRoot config user.email 'fixture@example.invalid'
    [IO.File]::WriteAllText(
        (Join-Path $fixtureRoot 'README.md'),
        "# No-tag fixture`n",
        [Text.UTF8Encoding]::new($false)
    )
    & git -C $fixtureRoot add README.md
    & git -C $fixtureRoot commit --quiet -m 'fixture: initial commit'
    if ($LASTEXITCODE -ne 0) { throw 'Failed to commit the no-tag Git fixture.' }

    & $scanner -ProjectRoot $fixtureRoot -OutputPath $reportPath | Out-Null
    $report = Get-Content -LiteralPath $reportPath -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($null -ne $report.git.baseline_tag) { throw 'No-tag scan must serialize baseline_tag as null.' }
    if ($report.git.range -ne 'HEAD') { throw "No-tag scan must use HEAD, got $($report.git.range)." }
    if ('README.md' -notin @($report.docs)) { throw 'No-tag scan did not discover the tracked README.' }
    if (-not (@($report.suggested_actions) -match '^No Git tag was found;')) {
        throw 'No-tag scan did not preserve the expected release-baseline guidance.'
    }

    Write-Output 'Doc-sync scanner no-tag smoke test passed.'
}
finally {
    $resolvedFixture = [IO.Path]::GetFullPath($fixtureRoot)
    if ($resolvedFixture.StartsWith($tempBase + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase) -and
        (Test-Path -LiteralPath $resolvedFixture)) {
        Remove-Item -LiteralPath $resolvedFixture -Recurse -Force
    }
}
