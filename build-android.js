#!/usr/bin/env node

/**
 * Android Build Script for BestInfraApp
 * 
 * This script handles the complete Android build process including:
 * - Cleaning previous builds
 * - Installing dependencies
 * - Generating bundles
 * - Building APK
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Android Build Process...\n');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, description) {
  try {
    log(`\n📋 ${description}...`, 'cyan');
    log(`Running: ${command}`, 'yellow');
    
    execSync(command, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    log(`✅ ${description} completed successfully`, 'green');
  } catch (error) {
    log(`❌ ${description} failed: ${error.message}`, 'red');
    throw error;
  }
}

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    log(`📁 Created directory: ${dirPath}`, 'blue');
  }
}

async function main() {
  try {
    // Step 1: Clean everything
    log('🧹 Step 1: Cleaning previous builds...', 'magenta');
    execCommand('npm cache clean --force', 'Cleaning npm cache');
    execCommand('npx expo start --clear', 'Clearing Expo cache');
    
    // Step 2: Install dependencies
    log('\n📦 Step 2: Installing dependencies...', 'magenta');
    execCommand('npm install', 'Installing npm packages');
    
    // Step 3: Ensure assets directory exists
    log('\n📁 Step 3: Setting up directories...', 'magenta');
    const assetsDir = path.join('android', 'app', 'src', 'main', 'assets');
    ensureDirectoryExists(assetsDir);
    
    // Step 4: Generate bundle for release
    log('\n📦 Step 4: Generating Android bundle...', 'magenta');
    const bundleCommand = [
      'npx react-native bundle',
      '--platform android',
      '--dev false',
      '--entry-file index.js',
      `--bundle-output ${path.join(assetsDir, 'index.android.bundle')}`,
      `--assets-dest ${path.join('android', 'app', 'src', 'main', 'res')}`,
      '--reset-cache'
    ].join(' ');
    
    execCommand(bundleCommand, 'Generating React Native bundle');
    
    // Step 5: Verify bundle was created
    const bundlePath = path.join(assetsDir, 'index.android.bundle');
    if (fs.existsSync(bundlePath)) {
      const stats = fs.statSync(bundlePath);
      log(`✅ Bundle created successfully (${Math.round(stats.size / 1024)}KB)`, 'green');
    } else {
      throw new Error('Bundle file was not created');
    }
    
    // Step 6: Build APK
    log('\n🔨 Step 5: Building Android APK...', 'magenta');
    execCommand('npx expo run:android --variant debug', 'Building debug APK');
    
    log('\n🎉 Build process completed successfully!', 'green');
    log('📱 Your APK should now be available in android/app/build/outputs/apk/debug/', 'cyan');
    
  } catch (error) {
    log(`\n💥 Build failed: ${error.message}`, 'red');
    log('\n🔧 Troubleshooting steps:', 'yellow');
    log('1. Make sure you have Android SDK and build tools installed', 'yellow');
    log('2. Check that your Android device/emulator is connected', 'yellow');
    log('3. Try running: adb devices', 'yellow');
    log('4. If using emulator, make sure it\'s running', 'yellow');
    process.exit(1);
  }
}

// Run the build process
main();

