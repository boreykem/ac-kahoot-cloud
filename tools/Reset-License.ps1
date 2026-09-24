<#
.SYNOPSIS
  AC-Kahoot! License Reset & Deactivation Tool
  Removes active license files from this computer for testing purposes.
#>

Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  🛡️ AC-Kahoot! License Reset Tool" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Magenta

# Stop running AC-Kahoot node processes
Stop-Process -Name node, "AC-Kahoot" -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 500

$TargetPaths = @(
    "$env:LOCALAPPDATA\license.active.json",
    "$env:LOCALAPPDATA\AC-Kahoot\license.active.json",
    "$PSScriptRoot\..\server\license.active.json",
    "$PSScriptRoot\..\license.active.json"
)

$DeletedCount = 0
foreach ($path in $TargetPaths) {
    if (Test-Path $path) {
        Remove-Item $path -Force -ErrorAction SilentlyContinue
        Write-Host "  🗑️ Deleted: $path" -ForegroundColor Yellow
        $DeletedCount++
    }
}

# Also reset admin/teacher license in userData.json if exists
$userDataPaths = @(
    "$env:LOCALAPPDATA\AC-Kahoot\userData.json",
    "$PSScriptRoot\..\server\userData.json"
)

foreach ($uPath in $userDataPaths) {
    if (Test-Path $uPath) {
        try {
            $users = Get-Content $uPath -Raw | ConvertFrom-Json
            foreach ($u in $users) {
                if ($u.role -ne 'superadmin') {
                    $u.license = 'free'
                    $u.boundDeviceId = $null
                    $u.boundDeviceName = $null
                }
            }
            $users | ConvertTo-Json -Depth 5 | Set-Content $uPath -Encoding UTF8
            Write-Host "  🔄 Reset user licenses to Free in: $uPath" -ForegroundColor DarkGray
        } catch {}
    }
}

if ($DeletedCount -gt 0) {
    Write-Host "`n✅ License successfully removed! This computer is now back to Free Edition." -ForegroundColor Green
} else {
    Write-Host "`nℹ️ No active license file was found (already Free Edition)." -ForegroundColor Cyan
}

Write-Host "`nRestarting AC-Kahoot.exe..." -ForegroundColor DarkGray
$installed = "$env:LOCALAPPDATA\AC-Kahoot"
if (Test-Path "$installed\AC-Kahoot.exe") {
    Start-Process -FilePath "$installed\AC-Kahoot.exe" -WorkingDirectory $installed
}

Write-Host "========================================" -ForegroundColor Magenta
