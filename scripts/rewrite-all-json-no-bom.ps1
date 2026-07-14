# Rewrite all JSON files in the repository to ASCII (no BOM) to avoid JSON.parse errors

$files = Get-ChildItem -Path . -Recurse -Filter *.json -File
foreach ($f in $files) {
    try {
        # Read the file content using .NET to avoid PowerShell version issues
        $content = [System.IO.File]::ReadAllText($f.FullName)
        # Write back using ASCII encoding (no BOM). If the file contains non‑ASCII characters, they will be replaced with '?'.
        [System.IO.File]::WriteAllText($f.FullName, $content, [System.Text.Encoding]::ASCII)
        Write-Host "Rewrote $($f.FullName)"
    }
    catch {
        Write-Warning "Failed to rewrite $($f.FullName): $_"
    }
}
