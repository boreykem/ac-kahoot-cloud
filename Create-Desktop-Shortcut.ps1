$WshShell = New-Object -comObject WScript.Shell
$ScriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Definition }

$TargetExe = Join-Path $ScriptDir "AC-Kahoot.exe"
$VbsPath = Join-Path $ScriptDir "launch.vbs"
$IconPath = Join-Path $ScriptDir "app.ico"

# Resolve Desktop Folders
$DesktopFolders = @()
try { $DesktopFolders += [System.Environment]::GetFolderPath('Desktop') } catch {}
try { $DesktopFolders += [System.Environment]::GetFolderPath('DesktopDirectory') } catch {}
try { $DesktopFolders += $WshShell.SpecialFolders.Item('Desktop') } catch {}
try {
    $regDesktop = (Get-ItemProperty "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders").Desktop
    if ($regDesktop) { $DesktopFolders += [System.Environment]::ExpandEnvironmentVariables($regDesktop) }
} catch {}
try {
    $userProfile = [System.Environment]::GetFolderPath('UserProfile')
    $oneDriveDesktop = Join-Path $userProfile "OneDrive\Desktop"
    if (Test-Path $oneDriveDesktop) { $DesktopFolders += $oneDriveDesktop }
} catch {}

$DesktopFolders = $DesktopFolders | Select-Object -Unique | Where-Object { $_ -and (Test-Path $_) }

foreach ($desktop in $DesktopFolders) {
    # Clean up duplicate emoji shortcut if it exists
    $oldDuplicate = Join-Path $desktop "🎯 AC-Kahoot!.lnk"
    if (Test-Path $oldDuplicate) {
        Remove-Item -Path $oldDuplicate -Force -ErrorAction SilentlyContinue
    }

    $ShortcutPath = Join-Path $desktop "AC-Kahoot.lnk"
    $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
    if (Test-Path $TargetExe) {
        $Shortcut.TargetPath = $TargetExe
        $Shortcut.WorkingDirectory = $ScriptDir
    } elseif (Test-Path $VbsPath) {
        $Shortcut.TargetPath = "wscript.exe"
        $Shortcut.Arguments = "`"$VbsPath`""
        $Shortcut.WorkingDirectory = $ScriptDir
    } else {
        $Shortcut.TargetPath = Join-Path $ScriptDir "Start-AC-Kahoot.bat"
        $Shortcut.WorkingDirectory = $ScriptDir
    }
    $Shortcut.Description = "AC-Kahoot! Interactive Learning Platform"
    if (Test-Path $IconPath) {
        $Shortcut.IconLocation = "$IconPath,0"
    }
    $Shortcut.Save()
    Write-Host "✓ Desktop Shortcut created at: $ShortcutPath" -ForegroundColor Green
}

