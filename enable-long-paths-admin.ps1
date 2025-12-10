# Enable Windows Long Paths for Git (System Level)
# This script requires Administrator privileges
# Right-click and select "Run as Administrator"

Write-Host "=== Enabling Windows Long Paths (System Level) ===" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ ERROR: This script requires Administrator privileges!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please:" -ForegroundColor Yellow
    Write-Host "1. Right-click PowerShell" -ForegroundColor White
    Write-Host "2. Select 'Run as Administrator'" -ForegroundColor White
    Write-Host "3. Navigate to this folder" -ForegroundColor White
    Write-Host "4. Run: .\enable-long-paths-admin.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "Or run this command in Administrator PowerShell:" -ForegroundColor Yellow
    Write-Host "   git config --system core.longpaths true" -ForegroundColor Gray
    exit 1
}

Write-Host "✓ Running with Administrator privileges" -ForegroundColor Green
Write-Host ""

# Enable long paths
Write-Host "Enabling long paths..." -ForegroundColor Yellow
try {
    git config --system core.longpaths true
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Long paths enabled successfully!" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to enable long paths" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "✗ Error: $_" -ForegroundColor Red
    exit 1
}

# Verify
Write-Host ""
Write-Host "Verifying configuration..." -ForegroundColor Yellow
$result = git config --system --get core.longpaths
if ($result -eq "true") {
    Write-Host "✓ Verification successful: Long paths are enabled" -ForegroundColor Green
} else {
    Write-Host "⚠ Warning: Could not verify configuration" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Cyan
Write-Host "You can now run EAS Build without path length issues." -ForegroundColor Green
