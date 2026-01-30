$ErrorActionPreference = "Stop"

# Run all research-quick experiments sequentially and log output.
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$logDir = "results/research-quick"
if (-not (Test-Path $logDir)) {
  New-Item -ItemType Directory -Path $logDir | Out-Null
}

$runLog = Join-Path $logDir "run.log"

$files = Get-ChildItem -Recurse -Filter *.yaml experiments/research-quick |
  Sort-Object FullName

foreach ($file in $files) {
  $stamp = Get-Date -Format o
  "=== [$stamp] Running $($file.FullName) ===" | Out-File -FilePath $runLog -Append -Encoding ASCII

  # Run experiment manager; stream all output to the run log to avoid console pipe issues.
  npx tsx scripts/experiment-manager.ts run $file.FullName *>> $runLog

  if ($LASTEXITCODE -ne 0) {
    "=== [$stamp] FAILED $($file.FullName) (exit $LASTEXITCODE) ===" | Out-File -FilePath $runLog -Append -Encoding ASCII
    break
  }
}

Get-Date -Format o | ForEach-Object { "=== [$_] Completed research-quick run ===" } |
  Out-File -FilePath $runLog -Append -Encoding ASCII
