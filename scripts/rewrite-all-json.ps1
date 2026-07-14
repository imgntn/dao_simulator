# Rewrite all JSON files in the repo to ASCII (no BOM) to fix JSON.parse errors
Get-ChildItem -Path . -Recurse -Filter *.json | ForEach-Object {
    try {
        $text = Get-Content $_.FullName -Raw -ErrorAction Stop
        $text | Out-File -FilePath $_.FullName -Encoding ascii -ErrorAction Stop
        Write-Host "Rewrote $($_.FullName)"
    }
    catch {
        Write-Warning "Failed to process $($_.FullName): $_"
    }
}