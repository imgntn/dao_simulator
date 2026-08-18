[CmdletBinding()]
param(
    [string]$RepositoryRoot = '',
    [string]$ArchiveName = '2026-07-17-pre-publication-foundation',
    [switch]$ResumeIncomplete
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($RepositoryRoot)) {
    $RepositoryRoot = Split-Path -Parent $PSScriptRoot
}
$root = (Resolve-Path -LiteralPath $RepositoryRoot).Path
$archiveRoot = Join-Path $root (Join-Path 'artifacts\legacy' $ArchiveName)
$archiveParent = Split-Path -Parent $archiveRoot

if (Test-Path -LiteralPath $archiveRoot) {
    $existingManifest = Join-Path $archiveRoot 'archive-manifest.json'
    if (Test-Path -LiteralPath $existingManifest) {
        throw "Legacy archive already exists and is immutable: $archiveRoot"
    }
    if (-not $ResumeIncomplete) {
        throw "Incomplete archive exists without a manifest. Re-run with -ResumeIncomplete: $archiveRoot"
    }
} else {
    New-Item -ItemType Directory -Path $archiveRoot -Force | Out-Null
}

$sources = @(
    @{ Source = 'results\paper'; Destination = 'results\paper' },
    @{ Source = 'paper\main.pdf'; Destination = 'paper\main.pdf' },
    @{ Source = 'paper\main.tex'; Destination = 'paper\main.tex' },
    @{ Source = 'paper\sections'; Destination = 'paper\sections' },
    @{ Source = 'EXPERIMENT_STATUS.md'; Destination = 'EXPERIMENT_STATUS.md' }
)

foreach ($entry in $sources) {
    $source = Join-Path $root $entry.Source
    if (-not (Test-Path -LiteralPath $source)) {
        throw "Required legacy source is missing: $source"
    }

    $destination = Join-Path $archiveRoot $entry.Destination
    $destinationParent = Split-Path -Parent $destination
    New-Item -ItemType Directory -Path $destinationParent -Force | Out-Null
    if (-not (Test-Path -LiteralPath $destination)) {
        Copy-Item -LiteralPath $source -Destination $destination -Recurse -Force
    }
}

$files = Get-ChildItem -LiteralPath $archiveRoot -File -Recurse |
    Sort-Object FullName

$manifestEntries = foreach ($file in $files) {
    $relativePath = $file.FullName.Substring($archiveRoot.Length).TrimStart([char[]]@('\', '/')).Replace('\', '/')
    $hash = Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256
    [PSCustomObject]@{
        path = $relativePath
        bytes = $file.Length
        sha256 = $hash.Hash.ToLowerInvariant()
    }
}

$manifest = [ordered]@{
    schemaVersion = 1
    archiveName = $ArchiveName
    createdAt = (Get-Date).ToUniversalTime().ToString('o')
    repositoryRoot = $root
    legacyGitCommit = '5829bdbea511af349fef6aed168d03912ca9baf9'
    status = 'historical-non-publishable'
    fileCount = @($manifestEntries).Count
    totalBytes = (@($manifestEntries) | Measure-Object -Property bytes -Sum).Sum
    files = @($manifestEntries)
}

$manifestPath = Join-Path $archiveRoot 'archive-manifest.json'
$manifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $manifestPath -Encoding utf8

$manifestHash = Get-FileHash -LiteralPath $manifestPath -Algorithm SHA256
[PSCustomObject]@{
    archive = $archiveRoot
    files = $manifest.fileCount
    bytes = $manifest.totalBytes
    manifest = $manifestPath
    manifestSha256 = $manifestHash.Hash.ToLowerInvariant()
} | ConvertTo-Json -Depth 3
