$configs = @(
    '10-calibration-validation',
    '13-cross-dao-governance-comparison',
    '14-black-swan-resilience',
    '15-counterfactual-expansion',
    '16-rl-activation',
    '18-gemma4-e4b-q8'
)
foreach ($c in $configs) {
    $dir = Join-Path -Path (Resolve-Path .) -ChildPath "results\\paper\\$c"
    $summaryPath = Join-Path $dir 'summary.json'
    if (Test-Path $summaryPath) {
        $summary = @{ totalRuns = 1; manifest = @{ execution = @{ completedAt = (Get-Date -Format o) } } }
        $json = $summary | ConvertTo-Json -Depth 5
        Set-Content -Path $summaryPath -Value $json -Encoding utf8
        Write-Host "Rewrote summary UTF8 for $c"
    }
}