/**
 * Invoice PDF Test Utility
 * 
 * Use this to test the PDF generation without navigating through the app
 */

import { 
  handleViewBill, 
  inspectPDFFields, 
  fillPDFForm, 
  createBillData 
} from '../services/InvoicePDFService';

/**
 * Test 1: Inspect PDF Fields
 * Run this first to see what fields are available
 */
export const testPDFInspection = async () => {
  console.log('🧪 TEST 1: PDF Field Inspection');
  console.log('═══════════════════════════════════════════════');
  
  try {
    const fields = await inspectPDFFields();
    console.log(`✅ Success: Found ${fields.length} fields`);
    return fields;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    return null;
  }
};

/**
 * Test 2: Test PDF Form Filling
 * Tests the core PDF manipulation logic
 */
export const testPDFFormFilling = async () => {
  console.log('\n🧪 TEST 2: PDF Form Filling');
  console.log('═══════════════════════════════════════════════');
  
  // Create sample data
  const samplePayment = {
    transactionId: 'TEST-INV-001',
    paymentDate: '2025-10-08',
    creditAmount: 1500,
    energyCharges: 1200,
    fixedCharges: 150,
    taxAmount: 150,
    previousReading: 1000,
    currentReading: 1250,
    unitsConsumed: 250,
    paymentMode: 'UPI',
  };
  
  const sampleConsumer = {
    name: 'Test Consumer',
    consumerName: 'Test Consumer',
    identifier: 'TEST-CONSUMER-001',
    consumerNumber: 'TEST-CONSUMER-001',
    meterSerialNumber: 'MTR-12345',
    address: '123 Test Street, Test City',
    companyName: 'BestInfra Energy',
  };
  
  try {
    const billData = createBillData(samplePayment, sampleConsumer);
    console.log('📋 Created BillData:', {
      billNumber: billData.billNumber,
      consumerName: billData.consumerName,
      totalAmount: billData.totalAmount,
      unitsConsumed: billData.unitsConsumed,
    });
    
    const result = await fillPDFForm(billData);
    console.log(`✅ Success: Filled ${result.filledFieldsCount} fields`);
    console.log(`   PDF Size: ${result.bytes.length} bytes`);
    return result;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    return null;
  }
};

/**
 * Test 3: Test Complete Flow
 * Tests the entire invoice generation flow
 */
export const testCompleteInvoiceFlow = async () => {
  console.log('\n🧪 TEST 3: Complete Invoice Generation');
  console.log('═══════════════════════════════════════════════');
  
  const samplePayment = {
    transactionId: 'TEST-INV-002',
    paymentDate: '2025-10-08',
    creditAmount: 2500,
    energyCharges: 2000,
    fixedCharges: 250,
    taxAmount: 250,
    previousReading: 2000,
    currentReading: 2500,
    unitsConsumed: 500,
    paymentMode: 'Credit Card',
  };
  
  const sampleConsumer = {
    name: 'John Doe',
    consumerName: 'John Doe',
    identifier: 'CONS-67890',
    consumerNumber: 'CONS-67890',
    meterSerialNumber: 'MTR-67890',
    address: '456 Energy Avenue, Power City',
    companyName: 'BestInfra Energy',
    companyAddress: '789 Corporate Plaza, Tech City',
    companyPhone: '+91-9876543210',
    companyEmail: 'support@bestinfra.com',
  };
  
  try {
    console.log('📄 Generating invoice PDF...');
    const result = await handleViewBill(samplePayment, sampleConsumer);
    
    if (result.success) {
      console.log('✅ Success: Invoice generated and opened');
      console.log('   Check your device for the PDF viewer');
    } else {
      console.error('❌ Failed:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Run All Tests
 */
export const runAllTests = async () => {
  console.log('🚀 Running All Invoice PDF Tests');
  console.log('═══════════════════════════════════════════════\n');
  
  const results = {
    inspection: await testPDFInspection(),
    formFilling: await testPDFFormFilling(),
    completeFlow: await testCompleteInvoiceFlow(),
  };
  
  console.log('\n═══════════════════════════════════════════════');
  console.log('📊 TEST SUMMARY');
  console.log('═══════════════════════════════════════════════');
  console.log('PDF Inspection:', results.inspection ? '✅ PASS' : '❌ FAIL');
  console.log('Form Filling:', results.formFilling ? '✅ PASS' : '❌ FAIL');
  console.log('Complete Flow:', results.completeFlow?.success ? '✅ PASS' : '❌ FAIL');
  console.log('═══════════════════════════════════════════════\n');
  
  return results;
};

/**
 * Quick Test Button Component
 * Add this to any screen for quick testing
 */
export const createTestButton = (onPress) => {
  return {
    title: '🧪 Test Invoice PDF',
    onPress: async () => {
      console.clear();
      await runAllTests();
      if (onPress) onPress();
    }
  };
};

export default {
  testPDFInspection,
  testPDFFormFilling,
  testCompleteInvoiceFlow,
  runAllTests,
  createTestButton
};

