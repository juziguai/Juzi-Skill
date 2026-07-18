[CmdletBinding()]
param(
    [string]$Repository = 'juziguai/Juzi-Skill',
    [string]$ExpectedCommit,
    [switch]$Apply,
    [switch]$ConfirmPublicExposure
)

$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$rulesetName = 'protect-main-and-stable'
$requiredChecks = @(
    'ubuntu-latest / Python 3.10',
    'ubuntu-latest / Python 3.12',
    'windows-latest / Python 3.10',
    'windows-latest / Python 3.12'
)
$payload = [ordered]@{
    name = $rulesetName
    target = 'branch'
    enforcement = 'active'
    conditions = [ordered]@{
        ref_name = [ordered]@{
            include = @('refs/heads/main', 'refs/heads/stable')
            exclude = @()
        }
    }
    rules = @(
        [ordered]@{ type = 'deletion' },
        [ordered]@{ type = 'non_fast_forward' },
        [ordered]@{ type = 'required_linear_history' },
        [ordered]@{
            type = 'required_status_checks'
            parameters = [ordered]@{
                strict_required_status_checks_policy = $true
                do_not_enforce_on_create = $true
                required_status_checks = @($requiredChecks | ForEach-Object { [ordered]@{ context = $_ } })
            }
        }
    )
}
$desiredSecurity = [ordered]@{
    security_and_analysis = [ordered]@{
        secret_scanning = [ordered]@{ status = 'enabled' }
        secret_scanning_push_protection = [ordered]@{ status = 'enabled' }
    }
}

Push-Location $root
try {
    $view = gh repo view $Repository --json visibility,viewerPermission,defaultBranchRef,url | ConvertFrom-Json
    $plan = [ordered]@{
        repository = $Repository
        currentVisibility = $view.visibility
        viewerPermission = $view.viewerPermission
        targetVisibility = 'PUBLIC'
        security = $desiredSecurity
        ruleset = $payload
        apply = [bool]$Apply
    }
    if (-not $Apply) {
        $plan | ConvertTo-Json -Depth 12
        return
    }
    if (-not $ConfirmPublicExposure) {
        throw 'Apply requires -ConfirmPublicExposure because public exposure cannot be fully rolled back.'
    }
    if ($view.viewerPermission -ne 'ADMIN') { throw 'GitHub ADMIN permission is required.' }
    if (-not $ExpectedCommit) { throw 'Apply requires -ExpectedCommit.' }
    $head = (& git rev-parse HEAD).Trim()
    $origin = (& git rev-parse origin/main).Trim()
    if ($head -ne $ExpectedCommit -or $origin -ne $ExpectedCommit) {
        throw "ExpectedCommit must equal HEAD and origin/main; head=$head origin=$origin expected=$ExpectedCommit"
    }
    if (& git status --porcelain) { throw 'Governance apply requires a clean working tree.' }
    & python (Join-Path $PSScriptRoot 'juzi_release.py') public-audit
    if ($LASTEXITCODE -ne 0) { throw 'Public readiness audit did not pass.' }

    $changedVisibility = $false
    try {
        if ($view.visibility -ne 'PUBLIC') {
            & gh repo edit $Repository --visibility public --accept-visibility-change-consequences
            if ($LASTEXITCODE -ne 0) { throw 'GitHub visibility change failed.' }
            $changedVisibility = $true
        }
        $verified = gh repo view $Repository --json visibility | ConvertFrom-Json
        if ($verified.visibility -ne 'PUBLIC') { throw 'Repository did not verify as PUBLIC.' }

        $governanceRoot = Join-Path $root '.codex\governance'
        $null = New-Item -ItemType Directory -Path $governanceRoot -Force
        $securityPath = Join-Path $governanceRoot 'security.json'
        [System.IO.File]::WriteAllText(
            $securityPath,
            (($desiredSecurity | ConvertTo-Json -Depth 8) + [Environment]::NewLine),
            [System.Text.UTF8Encoding]::new($false)
        )
        & gh api --method PATCH "repos/$Repository" --input $securityPath | Out-Null
        $securityPatchExitCode = $LASTEXITCODE
        $repositoryState = gh api "repos/$Repository" | ConvertFrom-Json
        if ($LASTEXITCODE -ne 0) { throw 'GitHub security state query failed.' }
        $secretScanning = $repositoryState.security_and_analysis.secret_scanning.status
        $pushProtection = $repositoryState.security_and_analysis.secret_scanning_push_protection.status
        if ($secretScanning -ne 'enabled' -or $pushProtection -ne 'enabled') {
            throw "GitHub security feature verification failed; patchExit=$securityPatchExitCode secretScanning=$secretScanning pushProtection=$pushProtection"
        }

        $payloadPath = Join-Path $governanceRoot 'ruleset.json'
        [System.IO.File]::WriteAllText(
            $payloadPath,
            (($payload | ConvertTo-Json -Depth 12) + [Environment]::NewLine),
            [System.Text.UTF8Encoding]::new($false)
        )
        $rulesetResponse = gh api "repos/$Repository/rulesets" | ConvertFrom-Json
        if ($LASTEXITCODE -ne 0) { throw 'Ruleset query failed.' }
        $existing = @($rulesetResponse | Where-Object name -eq $rulesetName)
        if ($existing.Count -gt 1) { throw "Multiple rulesets named $rulesetName exist." }
        if ($existing.Count -eq 1) {
            $rulesetMutation = gh api --method PUT "repos/$Repository/rulesets/$($existing[0].id)" --input $payloadPath | ConvertFrom-Json
        }
        else {
            $rulesetMutation = gh api --method POST "repos/$Repository/rulesets" --input $payloadPath | ConvertFrom-Json
        }
        if ($LASTEXITCODE -ne 0) { throw 'Ruleset apply failed.' }
        if ($rulesetMutation.name -ne $rulesetName -or $rulesetMutation.enforcement -ne 'active') {
            throw 'Ruleset mutation response did not verify the active target.'
        }
        $finalRuleset = $null
        $observed = @()
        foreach ($attempt in 1..5) {
            $rulesetResponse = gh api "repos/$Repository/rulesets" | ConvertFrom-Json
            if ($LASTEXITCODE -ne 0) { throw 'Ruleset verification query failed.' }
            $observed = @($rulesetResponse | Where-Object name -eq $rulesetName)
            if ($observed.Count -gt 1) { throw "Multiple rulesets named $rulesetName exist." }
            if ($observed.Count -eq 1 -and $observed[0].enforcement -eq 'active') {
                $finalRuleset = $observed[0]
                break
            }
            if ($attempt -lt 5) { Start-Sleep -Seconds 2 }
        }
        if (-not $finalRuleset) {
            $observedEnforcement = if ($observed.Count -eq 1) { $observed[0].enforcement } else { 'missing' }
            throw "Active ruleset verification failed after 5 attempts; count=$($observed.Count) enforcement=$observedEnforcement"
        }
        [ordered]@{
            status = 'passed'
            visibility = 'PUBLIC'
            rulesetId = $finalRuleset.id
            enforcement = $finalRuleset.enforcement
            advancedSecurity = 'available-public'
            secretScanning = $repositoryState.security_and_analysis.secret_scanning.status
            pushProtection = $repositoryState.security_and_analysis.secret_scanning_push_protection.status
        } | ConvertTo-Json
    }
    catch {
        $failure = $_
        if ($changedVisibility) {
            & gh repo edit $Repository --visibility private --accept-visibility-change-consequences
            $restoreExitCode = $LASTEXITCODE
            $restored = gh repo view $Repository --json visibility | ConvertFrom-Json
            if ($restoreExitCode -ne 0 -or $restored.visibility -ne 'PRIVATE') {
                throw "Governance failed and PRIVATE rescue could not be verified: $failure"
            }
        }
        throw $failure
    }
}
finally {
    Pop-Location
}
