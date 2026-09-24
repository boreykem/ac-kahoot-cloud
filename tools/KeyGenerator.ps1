# AC-Kahoot! Interactive License Key Generator for Owner (Baurey)
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "  🎯 AC-Kahoot! Pro & VIP License Key Generator" -ForegroundColor Yellow
Write-Host "  🛡️ Hardware-Locked Offline Cryptographic Licensing" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host ""

$hwid = Read-Host "👉 សូមបញ្ចូល Hardware ID (HWID) របស់អតិថិជន (ឧទាហរណ៍: ACK-HWID-8F92-B73C-4A10)"
if ([string]::IsNullOrWhiteSpace($hwid)) {
    Write-Host "❌ មិនបានបញ្ចូល HWID ឡើយ។ បិទកម្មវិធី..." -ForegroundColor Red
    Start-Sleep -Seconds 2
    exit
}

Write-Host ""
Write-Host "ជ្រើសរើសប្រភេទគម្រោង (Select Plan):" -ForegroundColor Green
Write-Host "  [1] Pro Lifetime (ប្រើមួយជីវិត - Recommended)" -ForegroundColor White
Write-Host "  [2] Pro Annual (គម្រោង ១ ឆ្នាំ / 365 ថ្ងៃ)" -ForegroundColor White
Write-Host "  [3] Pro Monthly (គម្រោង ១ ខែ / 30 ថ្ងៃ)" -ForegroundColor White
Write-Host "  [4] VIP School Edition (សាលារៀន/ស្ថាប័ន)" -ForegroundColor White
$choice = Read-Host "ជ្រើសរើសលេខ (1-4) [Default: 1]"

$plan = "PRO_LIFETIME"
$days = 0

switch ($choice) {
    "2" { $plan = "PRO_ANNUAL"; $days = 365 }
    "3" { $plan = "PRO_MONTHLY"; $days = 30 }
    "4" { $plan = "VIP_SCHOOL"; $days = 0 }
    default { $plan = "PRO_LIFETIME"; $days = 0 }
}

$toolsDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$scriptPath = Join-Path $toolsDir "generate-license.cjs"

Write-Host ""
Write-Host "⏳ កំពុងគណនា និងចុះហត្ថលេខាលើ License Key..." -ForegroundColor Yellow

$nodeCmd = "node"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    $localNode = Join-Path $toolsDir "..\dist-release\AC-Kahoot-Portable\runtime\node.exe"
    if (Test-Path $localNode) {
        $nodeCmd = (Resolve-Path $localNode).Path
    }
}

& $nodeCmd "$scriptPath" "$hwid" "$plan" "$days"

Write-Host ""
Read-Host "ចុច Enter ដើម្បីចាកចេញ..."
