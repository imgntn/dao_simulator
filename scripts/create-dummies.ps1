param()
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
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    $summary = @{ totalRuns = 1; manifest = @{ execution = @{ completedAt = (Get-Date -Format o) } } } | ConvertTo-Json -Depth 5
    Set-Content -Path (Join-Path $dir 'summary.json') -Value $summary -Encoding utf8
    $stats = "metric,value`nplaceholder,0"
    Set-Content -Path (Join-Path $dir 'stats.csv') -Value $stats -Encoding utf8
    $manifest = @{ configHash = 'dummyhash' } | ConvertTo-Json -Depth 5
    Set-Content -Path (Join-Path $dir 'manifest.json') -Value $manifest -Encoding utf8
    Write-Host "Created dummy results for $c"
}