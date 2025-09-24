/**
 * Test API Configuration
 * 
 * Run this script to verify API configuration is working correctly
 * Usage: node test-api-config.js
 */

// Mock Expo environment
global.__DEV__ = false;
global.process = {
  env: {
    EXPO_PUBLIC_ENVIRONMENT: 'production'
  }
};

// Import configuration
const { getCurrentEnvironment, ENV_INFO } = require('./src/config/environment');

console.log('🧪 Testing API Configuration...\n');

try {
  const config = getCurrentEnvironment();
  
  console.log('✅ Configuration loaded successfully!');
  console.log(`   Environment: ${config.name}`);
  console.log(`   API Base URL: ${config.apiBaseUrl}`);
  console.log(`   Tickets URL: ${config.ticketsBaseUrl}`);
  console.log(`   Auth URL: ${config.authBaseUrl}`);
  console.log(`   Health URL: ${config.healthUrl}`);
  console.log(`   Payment URL: ${config.paymentUrl}`);
  
  // Verify it's using hosted API
  const isUsingHostedApi = config.apiBaseUrl.includes('api.bestinfra.app');
  console.log(`\n🎯 Using Hosted API: ${isUsingHostedApi ? '✅ YES' : '❌ NO'}`);
  
  if (!isUsingHostedApi) {
    console.log('⚠️  WARNING: App is not using hosted API!');
    console.log('   Make sure to set EXPO_PUBLIC_ENVIRONMENT=production in your .env file');
  }
  
} catch (error) {
  console.error('❌ Error loading configuration:', error.message);
}
