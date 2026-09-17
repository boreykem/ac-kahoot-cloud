# Simple release script for AC-Kahoot
# If you have your original build-release.ps1, please replace this file with it.

Write-Host "Building frontend..."
npm run build
Write-Host "Compiling backend to .exe..."
./compile-exe.ps1
Write-Host "Release build complete!"
