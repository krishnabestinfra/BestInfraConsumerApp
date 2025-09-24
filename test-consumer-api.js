/**
 * Test Consumer API with Multiple Consumers
 * 
 * This script tests the API client with different consumers to verify
 * that the dynamic identifier handling works correctly
 */

// Mock Expo environment
global.__DEV__ = true;
global.process = {
  env: {
    EXPO_PUBLIC_ENVIRONMENT: 'production'
  }
};

// Mock AsyncStorage
const mockStorage = {
  token: null,
  user: null
};

global.AsyncStorage = {
  getItem: async (key) => {
    if (key === 'token') return mockStorage.token;
    if (key === 'user') return mockStorage.user ? JSON.stringify(mockStorage.user) : null;
    return null;
  },
  setItem: async (key, value) => {
    if (key === 'token') mockStorage.token = value;
    if (key === 'user') mockStorage.user = JSON.parse(value);
  }
};

// Mock fetch
global.fetch = async (url, options = {}) => {
  console.log(`🌐 Mock API Call: ${options.method || 'GET'} ${url}`);
  console.log(`   Headers:`, options.headers);
  
  // Simulate different responses based on consumer
  const consumerId = url.match(/\/consumers\/(.+)$/)?.[1];
  
  if (consumerId === 'BI25GMRA0001') {
    // This consumer works
    return {
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      json: async () => ({
        success: true,
        data: {
          name: 'Test Consumer 1',
          identifier: 'BI25GMRA0001',
          meterSerialNumber: '12345678',
          totalOutstanding: 1000.50,
          dailyConsumption: 50,
          monthlyConsumption: 1500
        }
      })
    };
  } else if (consumerId === 'BI25GMRA0002') {
    // This consumer returns 500 error
    return {
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: new Map([['content-type', 'application/json']]),
      json: async () => ({
        success: false,
        message: 'Consumer data not available',
        error: 'Database connection failed'
      })
    };
  } else if (consumerId === 'BI25GMRA0006') {
    // This consumer returns 404 error
    return {
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: new Map([['content-type', 'application/json']]),
      json: async () => ({
        success: false,
        message: 'Consumer not found',
        error: 'No data available for this consumer'
      })
    };
  } else {
    // Default success response
    return {
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      json: async () => ({
        success: true,
        data: {
          name: `Test Consumer ${consumerId}`,
          identifier: consumerId,
          meterSerialNumber: '87654321',
          totalOutstanding: 2000.75,
          dailyConsumption: 75,
          monthlyConsumption: 2250
        }
      })
    };
  }
};

console.log('🧪 Testing Consumer API with Multiple Consumers...\n');

// Test different consumers
const testConsumers = [
  'BI25GMRA0001', // Should work
  'BI25GMRA0002', // Should return 500 error
  'BI25GMRA0006', // Should return 404 error
  'BI25GMRA0003'  // Should work
];

async function testConsumer(consumerId) {
  console.log(`\n🔍 Testing Consumer: ${consumerId}`);
  
  // Set up mock user and token
  mockStorage.user = {
    identifier: consumerId,
    name: `Test Consumer ${consumerId}`,
    consumerNumber: consumerId
  };
  mockStorage.token = 'mock-jwt-token-12345';
  
  try {
    // Import the API client (this would normally be done in the app)
    const { apiClient } = require('./src/services/apiClient');
    
    const result = await apiClient.getConsumerData(consumerId);
    
    if (result.success) {
      console.log(`✅ Success: ${consumerId}`);
      console.log(`   Data:`, result.data);
    } else {
      console.log(`❌ Failed: ${consumerId}`);
      console.log(`   Error: ${result.error}`);
      console.log(`   Status: ${result.status}`);
    }
    
    return result;
  } catch (error) {
    console.log(`💥 Exception: ${consumerId}`);
    console.log(`   Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  const results = [];
  
  for (const consumerId of testConsumers) {
    const result = await testConsumer(consumerId);
    results.push({ consumerId, result });
  }
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  results.forEach(({ consumerId, result }) => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    const error = result.success ? '' : ` (${result.error})`;
    console.log(`${status} ${consumerId}${error}`);
  });
  
  const passCount = results.filter(r => r.result.success).length;
  const totalCount = results.length;
  
  console.log(`\n🎯 Overall: ${passCount}/${totalCount} tests passed`);
  
  if (passCount === totalCount) {
    console.log('🎉 All tests passed! The API client is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the error handling logic.');
  }
}

// Run the tests
runTests().catch(console.error);
