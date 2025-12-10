# EAS Build Readiness Check Script
Write-Host "=== EAS Build Readiness Check ===" -ForegroundColor Cyan
Write-Host ""

$allChecksPassed = $true

# Check 1: Git Repository
Write-Host "1. Checking Git Repository..." -ForegroundColor Yellow
if (Test-Path .git) {
    Write-Host "   ✓ .git folder exists" -ForegroundColor Green
    
    try {
        $gitDir = git rev-parse --git-dir 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✓ Valid Git repository" -ForegroundColor Green
            
            # Check for commits
            $commitCount = (git rev-list --count HEAD 2>&1)
            if ($LASTEXITCODE -eq 0 -and [int]$commitCount -gt 0) {
                Write-Host "   ✓ Repository has commits ($commitCount commit(s))" -ForegroundColor Green
                $lastCommit = git log --oneline -1 2>&1
                Write-Host "   Last commit: $lastCommit" -ForegroundColor Gray
            } else {
                Write-Host "   ⚠ No commits found - creating initial commit..." -ForegroundColor Yellow
                git add . 2>&1 | Out-Null
                git commit -m "Initial commit for EAS build" 2>&1 | Out-Null
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "   ✓ Initial commit created" -ForegroundColor Green
                } else {
                    Write-Host "   ✗ Failed to create commit" -ForegroundColor Red
                    $allChecksPassed = $false
                }
            }
        } else {
            Write-Host "   ✗ Invalid Git repository" -ForegroundColor Red
            $allChecksPassed = $false
        }
    } catch {
        Write-Host "   ✗ Error checking Git: $_" -ForegroundColor Red
        $allChecksPassed = $false
    }
} else {
    Write-Host "   ✗ .git folder NOT found - initializing..." -ForegroundColor Yellow
    git init 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✓ Git repository initialized" -ForegroundColor Green
        git add . 2>&1 | Out-Null
        git commit -m "Initial commit for EAS build" 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✓ Initial commit created" -ForegroundColor Green
        } else {
            Write-Host "   ✗ Failed to create commit" -ForegroundColor Red
            $allChecksPassed = $false
        }
    } else {
        Write-Host "   ✗ Failed to initialize Git" -ForegroundColor Red
        $allChecksPassed = $false
    }
}

# Check 2: Long Paths Configuration
Write-Host ""
Write-Host "2. Checking Long Paths Configuration..." -ForegroundColor Yellow
$globalLongPaths = git config --global --get core.longpaths 2>&1
if ($globalLongPaths -eq "true") {
    Write-Host "   ✓ Long paths enabled (global)" -ForegroundColor Green
} else {
    Write-Host "   ⚠ Long paths not enabled (global) - enabling..." -ForegroundColor Yellow
    git config --global core.longpaths true 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✓ Long paths enabled" -ForegroundColor Green
    } else {
        Write-Host "   ✗ Failed to enable long paths" -ForegroundColor Red
    }
}

# Check 3: EAS Configuration
Write-Host ""
Write-Host "3. Checking EAS Configuration..." -ForegroundColor Yellow
if (Test-Path eas.json) {
    Write-Host "   ✓ eas.json exists" -ForegroundColor Green
    try {
        $easConfig = Get-Content eas.json | ConvertFrom-Json
        if ($easConfig.build) {
            Write-Host "   ✓ Build profiles configured" -ForegroundColor Green
        } else {
            Write-Host "   ⚠ No build profiles found" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "   ⚠ Could not parse eas.json" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ✗ eas.json NOT found" -ForegroundColor Red
    $allChecksPassed = $false
}

# Check 4: app.json / expo configuration
Write-Host ""
Write-Host "4. Checking Expo Configuration..." -ForegroundColor Yellow
if (Test-Path app.json) {
    Write-Host "   ✓ app.json exists" -ForegroundColor Green
    try {
        $appConfig = Get-Content app.json | ConvertFrom-Json
        if ($appConfig.expo) {
            Write-Host "   ✓ Expo configuration found" -ForegroundColor Green
            if ($appConfig.expo.extra.eas.projectId) {
                Write-Host "   ✓ EAS Project ID configured" -ForegroundColor Green
            } else {
                Write-Host "   ⚠ EAS Project ID not found" -ForegroundColor Yellow
            }
        }
    } catch {
        Write-Host "   ⚠ Could not parse app.json" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ✗ app.json NOT found" -ForegroundColor Red
    $allChecksPassed = $false
}

# Check 5: package.json
Write-Host ""
Write-Host "5. Checking package.json..." -ForegroundColor Yellow
if (Test-Path package.json) {
    Write-Host "   ✓ package.json exists" -ForegroundColor Green
} else {
    Write-Host "   ✗ package.json NOT found" -ForegroundColor Red
    $allChecksPassed = $false
}

# Final Summary
Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
if ($allChecksPassed) {
    Write-Host "✅ All checks passed! Your project is ready for EAS Build." -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now run:" -ForegroundColor White
    Write-Host "   eas build --platform android" -ForegroundColor Gray
} else {
    Write-Host "⚠️  Some checks failed. Please review the issues above." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Note: For system-level long paths (recommended), run as Administrator:" -ForegroundColor Gray
Write-Host "   git config --system core.longpaths true" -ForegroundColor DarkGray
Write-Host "   Or use: .\enable-long-paths-admin.ps1" -ForegroundColor DarkGray
