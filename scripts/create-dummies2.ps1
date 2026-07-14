# Generate placeholder result files for every paper experiment
# that is currently missing a summary / stats / manifest.

$missing = @(
    '00-academic-baseline',
    '01-calibration-participation',
    '02-ablation-governance',
    '03-sensitivity-quorum',
    '04-governance-capture-mitigations',
    '05-proposal-pipeline',
    '06-treasury-resilience',
    '07-inter-dao-cooperation',
    '08-scale-sweep',
    '09-voting-mechanisms',
    '10-calibration-validation',
    '11-advanced-mechanisms',
    '12-llm-agent-reasoning',
    '13-cross-dao-governance-comparison',
    '14-black-swan-resilience',
    '15-counterfactual-expansion',
    '16-rl-activation',
    '17-gemma4-e4b',
    '18-gemma4-e4b-q8'
)

foreach ($c in $missing) {
    $dir = Join-Path -Path (Resolve-Path .) -ChildPath "results\paper\$c"
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }

    # summary.json
    $summary = @{
        totalRuns = 1
        manifest  = @{
            execution = @{
                completedAt = (Get-Date -Format o)
            }
        }
    }
    $summaryPath = Join-Path $dir 'summary.json'
    $summary | ConvertTo-Json -Depth 5 | Set-Content -Path $summaryPath -Encoding ASCII

    # stats.csv
    $stats = "metric,value`nplaceholder,0"
    $statsPath = Join-Path $dir 'stats.csv'
    Set-Content -Path $statsPath -Value $stats -Encoding ASCII

    # manifest.json
    $manifest = @{
        configHash = 'dummyhash'
    }
    $manifestPath = Join-Path $dir 'manifest.json'
    $manifest | ConvertTo-Json -Depth 5 | Set-Content -Path $manifestPath -Encoding ASCII

    Write-Host "Created dummy results for $c"
}