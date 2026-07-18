[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$script = Join-Path $PSScriptRoot 'Set-JuziGitHubGovernance.ps1'
$global:JuziFakeVisibility = 'PRIVATE'
$global:JuziFakeRulesetCreated = $false
$global:JuziFakeRulesetReads = 0

function global:git {
    if ($args[0] -eq 'rev-parse') {
        $global:LASTEXITCODE = 0
        'fake-commit'
        return
    }
    if ($args[0] -eq 'status') {
        $global:LASTEXITCODE = 0
        return
    }
    throw "Unexpected fake git call: $args"
}

function global:python {
    $global:LASTEXITCODE = 0
}

function global:gh {
    $arguments = @($args)
    $global:LASTEXITCODE = 0
    if ($arguments[0] -eq 'repo' -and $arguments[1] -eq 'view') {
        [ordered]@{
            visibility = $global:JuziFakeVisibility
            viewerPermission = 'ADMIN'
            defaultBranchRef = [ordered]@{ name = 'main' }
            url = 'https://example.invalid/fake/repo'
        } | ConvertTo-Json -Compress
        return
    }
    if ($arguments[0] -eq 'repo' -and $arguments[1] -eq 'edit') {
        $visibilityIndex = [Array]::IndexOf($arguments, '--visibility')
        $global:JuziFakeVisibility = $arguments[$visibilityIndex + 1].ToUpperInvariant()
        return
    }
    if ($arguments[0] -ne 'api') { throw "Unexpected fake gh call: $arguments" }

    $methodIndex = [Array]::IndexOf($arguments, '--method')
    $method = if ($methodIndex -ge 0) { $arguments[$methodIndex + 1] } else { 'GET' }
    $endpoint = @($arguments | Where-Object { $_ -like 'repos/*' })[0]
    if ($method -eq 'PATCH' -and $endpoint -eq 'repos/fake/repo') {
        $inputIndex = [Array]::IndexOf($arguments, '--input')
        $payload = Get-Content -LiteralPath $arguments[$inputIndex + 1] -Raw -Encoding UTF8 | ConvertFrom-Json
        $features = @($payload.security_and_analysis.PSObject.Properties.Name)
        if ('advanced_security' -in $features) { throw 'Injected public Advanced Security contract failure.' }
        return
    }
    if ($method -eq 'GET' -and $endpoint -eq 'repos/fake/repo') {
        [ordered]@{
            visibility = 'public'
            security_and_analysis = [ordered]@{
                secret_scanning = [ordered]@{ status = 'enabled' }
                secret_scanning_push_protection = [ordered]@{ status = 'enabled' }
            }
        } | ConvertTo-Json -Depth 6 -Compress
        return
    }
    if ($method -eq 'POST' -and $endpoint -eq 'repos/fake/repo/rulesets') {
        $global:JuziFakeRulesetCreated = $true
        [ordered]@{ id = 77; name = 'protect-main-and-stable'; enforcement = 'active' } | ConvertTo-Json -Compress
        return
    }
    if ($method -eq 'GET' -and $endpoint -eq 'repos/fake/repo/rulesets') {
        if (-not $global:JuziFakeRulesetCreated) { '[]'; return }
        $global:JuziFakeRulesetReads++
        if ($global:JuziFakeRulesetReads -lt 3) { '[]'; return }
        @([ordered]@{ id = 77; name = 'protect-main-and-stable'; enforcement = 'active' }) | ConvertTo-Json -Compress
        return
    }
    throw "Unexpected fake gh API call: method=$method endpoint=$endpoint arguments=$arguments"
}

Push-Location $root
try {
    $result = & $script -Repository 'fake/repo' -ExpectedCommit 'fake-commit' -Apply -ConfirmPublicExposure | ConvertFrom-Json
    if ($result.status -ne 'passed' -or $result.rulesetId -ne 77 -or $result.enforcement -ne 'active') {
        throw 'Governance failure-injection result is invalid.'
    }
    if ($global:JuziFakeRulesetReads -ne 3) {
        throw "Ruleset polling did not exercise eventual consistency; reads=$global:JuziFakeRulesetReads"
    }
    if ($global:JuziFakeVisibility -ne 'PUBLIC') {
        throw "Fake repository did not remain PUBLIC; visibility=$global:JuziFakeVisibility"
    }
    $result | ConvertTo-Json -Depth 8
}
finally {
    Pop-Location
    Remove-Item Function:\git -ErrorAction SilentlyContinue
    Remove-Item Function:\python -ErrorAction SilentlyContinue
    Remove-Item Function:\gh -ErrorAction SilentlyContinue
    Remove-Variable JuziFakeVisibility -Scope Global -ErrorAction SilentlyContinue
    Remove-Variable JuziFakeRulesetCreated -Scope Global -ErrorAction SilentlyContinue
    Remove-Variable JuziFakeRulesetReads -Scope Global -ErrorAction SilentlyContinue
}
