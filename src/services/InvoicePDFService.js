/**
 * Advanced Invoice PDF Service for React Native (Expo)
 * 
 * Uses pdf-lib to dynamically fill Invoice.pdf template with real data
 * Replaces HTML-based generation with actual PDF form filling
 */

import { PDFDocument, PDFTextField, PDFCheckBox, StandardFonts } from 'pdf-lib';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Asset } from 'expo-asset';
import { Platform, Alert, Linking } from 'react-native';
// expo-intent-launcher is Android-only; used to open PDF in system viewer
const IntentLauncher = Platform.OS === 'android' ? require('expo-intent-launcher') : null;

/**
 * Helper: Calculate due date (30 days from bill date)
 */
const calculateDueDate = (billDate) => {
  if (!billDate) return '';
  try {
    const date = new Date(billDate);
    date.setDate(date.getDate() + 30);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch (error) {
    return '';
  }
};

/**
 * Helper: Calculate subtotal
 */
const calculateSubTotal = (payment) => {
  const energy = Number(payment.energyCharges || payment.energyCharge || 0);
  const fixed = Number(payment.fixedCharges || payment.fixedCharge || 0);
  const demand = Number(payment.demandCharges || payment.demandCharge || 0);
  const powerFactor = Number(payment.powerFactorCharges || payment.powerFactorCharge || 0);
  const electricityDuty = Number(payment.electricityDuty || payment.duty || 0);
  const imc = Number(payment.imcCharges || payment.imcCharge || payment.imc || 0);
  return energy + fixed + demand + powerFactor + electricityDuty + imc;
};

/**
 * Sanitize text for PDF - removes currency symbols and special characters
 * Matches TypeScript implementation
 * IMPORTANT: For readings and consumption, preserve the full value including units
 */
const sanitizeTextForPDF = (text, preserveFormat = false) => {
  if (text === undefined || text === null) return "";
  let str = String(text);
  
  // For readings and consumption, preserve the format (including units like "kVAh")
  if (preserveFormat) {
    // Only remove currency symbols, keep everything else including decimals and units
    str = str
      .replace(/₹/g, "") 
      .replace(/Rs\./g, "") 
      .replace(/Rs\s/g, "") 
      .replace(/INR\s/g, "") 
      .trim();
    str = str.replace(/\s+/g, " ").trim(); // Normalize whitespace only
    return str;
  }
  
  // For other fields, use standard sanitization
  str = str
    .replace(/₹/g, "") 
    .replace(/Rs\./g, "") 
    .replace(/Rs\s/g, "") 
    .replace(/INR\s/g, "") 
    .replace(/[^\x20-\x7E\s]/g, "") 
    .trim();
  str = str.replace(/\.\d+/g, "");
  str = str.replace(/\s+/g, " ").trim();
  return str;
};

/**
 * Get value from bill data with fallback fields
 * Matches TypeScript implementation
 * Also checks originalPaymentData for API response fields
 */
const getValueFromBill = (bill, sourceFields, defaultValue) => {
  // First check billData fields
  for (const field of sourceFields) {
    if (
      bill[field] !== undefined &&
      bill[field] !== null &&
      bill[field] !== ""
    ) {
      return String(bill[field]);
    }
  }
  
  // Also check originalPaymentData (API response) for direct field access
  if (bill.originalPaymentData) {
    for (const field of sourceFields) {
      const apiValue = bill.originalPaymentData[field];
      if (
        apiValue !== undefined &&
        apiValue !== null &&
        apiValue !== ""
      ) {
        return String(apiValue);
      }
    }
  }
  
  return defaultValue || "";
};

/**
 * BillData Interface - Complete invoice data structure
 * Updated to match EXACT web-generated invoice PDF structure
 * Includes ALL possible fields to ensure nothing is missing
 */
export const createBillData = (payment, consumerData) => {
  // Check if this is API response data (has API-specific fields)
  const isApiResponse = payment?.statement_for || payment?.bill_date || payment?.meter_sl_no || payment?.consumer_uid;
  
  console.log('🔍 createBillData - API Response Detection:');
  console.log('  isApiResponse:', isApiResponse);
  console.log('  payment keys:', Object.keys(payment || {}));
  
  // Format dates consistently (DD/MM/YYYY or preserve API format)
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      // If already formatted (like "Nov 20, 2025"), try to parse it
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString; // Return as-is if can't parse
      }
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateString || '';
    }
  };

  // Format currency - keep as-is if already formatted (e.g., "₹ 30,83,284.40")
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '0.00';
    // If already formatted with currency symbol, return as-is
    if (typeof amount === 'string' && (amount.includes('₹') || amount.includes(','))) {
      return amount;
    }
    const num = Number(amount);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  // Format number - keep as-is if already formatted with units (e.g., "11863500 kVAh")
  const formatNumber = (value) => {
    if (!value && value !== 0) return '0';
    // If already formatted with units, extract just the number
    if (typeof value === 'string' && (value.includes('kVAh') || value.includes('kWh') || value.includes('KL'))) {
      const numMatch = value.match(/([\d,]+)/);
      return numMatch ? numMatch[1].replace(/,/g, '') : '0';
    }
    const num = Number(value);
    return isNaN(num) ? '0' : Math.floor(num).toString();
  };

  // Extract readings from formatted strings (e.g., "11863500 kVAh" -> "11863500")
  const extractReading = (value) => {
    if (!value) return '0';
    if (typeof value === 'string') {
      const numMatch = value.match(/([\d,]+)/);
      return numMatch ? numMatch[1].replace(/,/g, '') : '0';
    }
    return String(value || '0');
  };

  // If API response, use API fields directly - PRESERVE EXACT FORMAT
  if (isApiResponse) {
    console.log('  ✅ Detected API response format');
    
    // Build meter services from API response (service_type_1, service_prev_1, etc.)
    const buildMeterServicesFromApi = () => {
      const services = [];
      for (let i = 1; i <= 4; i++) {
        const serviceType = payment[`service_type_${i}`];
        if (serviceType) {
          services.push({
            serviceType: serviceType,
            // Preserve exact format with units (e.g., "11863500 kVAh", "0 KL")
            previousReadings: payment[`service_prev_${i}`] || '0',
            finalReadings: payment[`service_final_${i}`] || '0',
            // For consumption, keep number only (no units in table)
            consumption: String(payment[`service_consumption_${i}`] || '0'),
            // Preserve unit rate as-is
            unitRate: String(payment[`service_unit_rate_${i}`] || '0'),
            // Preserve amount with currency symbol (e.g., "₹ 30,83,284.40")
            amount: payment[`service_amount_${i}`] || '₹ 0',
          });
        }
      }
      return services;
    };

    // Combine address lines
    const fullAddress = [
      payment.customer_address_line1,
      payment.customer_address_line2
    ].filter(Boolean).join(', ');

    // Get customer name with prefix
    const customerName = payment.customer_name || 'Consumer';
    let customerNameWithPrefix = customerName;
    if (!customerName.startsWith('Mr.') && 
        !customerName.startsWith('Mrs.') && 
        !customerName.startsWith('Ms.') && 
        !customerName.startsWith('Dr.') && 
        !customerName.startsWith('Prof.')) {
      customerNameWithPrefix = `${customerName}`;
    }

    // Format bill date - preserve format from API (e.g., "Nov 20, 2025")
    const billDateFormatted = payment.bill_date || payment.statement_date || '';
    
    // Format due date - preserve format from API (e.g., "09/10/2025")
    const dueDateFormatted = payment.due_date || '';

    const billData = {
      // ========== TOP SECTION FIELDS (API Response) - EXACT GMR FORMAT ==========
      statementFor: String(payment.statement_for || 'POSTPAID'),
      meterSLNo: String(payment.meter_sl_no || 'N/A'),
      consumerUID: String(payment.consumer_uid || 'N/A'),
      // Use statement_for for billType (not bill_type which might be meter number)
      billType: String(payment.statement_for || 'POSTPAID'),
      billNumber: String(payment.bill_no || 'N/A'),
      customerName: customerNameWithPrefix,
      customerNameWithPrefix: customerNameWithPrefix,
      address: String(fullAddress || 'N/A'),
      // Extract email and contact directly from API - don't default to 'N/A' if empty
      emailAddress: payment.customer_email ? String(payment.customer_email) : '',
      contactNo: payment.customer_contact ? String(payment.customer_contact) : '',
      // Also store original API fields for direct access
      customer_email: payment.customer_email || '',
      customer_contact: payment.customer_contact || '',
      customer_address_line1: payment.customer_address_line1 || '',
      customer_address_line2: payment.customer_address_line2 || '',
      billDate: billDateFormatted,
      billingPeriod: payment.statement_period || '',
      totalAmountPayable: payment.total_amount_payable || '0.00',
      dueDate: dueDateFormatted,
      
      // ========== LAST MONTH SECTION (API Response) ==========
      lastMonthLabel: payment.last_month_label || '',
      lastMonthPrevReading: payment.prev_reading || '0',
      // Ensure final_reading is extracted correctly (e.g., "12291140 kVAh")
      // Preserve exact format from API with units - DO NOT MODIFY
      lastMonthFinalReading: payment.final_reading || payment.finalReading || '0',
      // Ensure consumption is extracted correctly (e.g., "427640")
      // Keep as string to preserve exact value - DO NOT MODIFY
      lastMonthConsumption: String(payment.consumption || payment.consumptionUnits || '0'),
      // Also store for general use - these are used in field mappings
      finalReading: payment.final_reading || payment.finalReading || '0',
      consumption: String(payment.consumption || payment.consumptionUnits || '0'),
      // Store direct API fields for getValueFromBill to access (with underscore)
      final_reading: payment.final_reading || '0',
      lastMonthTotalAmount: payment.last_month_amount || '₹ 0',
      lastMonthStatus: payment.last_month_status || 'N/A',
      
      // ========== METER SERVICES TABLE (API Response) ==========
      meterServices: buildMeterServicesFromApi(),
      
      // Debug: Log the actual values from API (after billData is created)
      // This will be logged after the return statement
      
      // Charges - preserve formats exactly
      imcCharges: payment.imc_charges || '₹ 0',
      demandCharges: payment.demand_charges || '₹ 0',
      totalAmount: payment.total_amount || '₹ 0',
      energyCharges: payment.energy_charges || '₹ 0',
      
      // ========== METER READINGS (API Response) ==========
      previousReading: payment.prev_reading || '0',
      finalReading: payment.final_reading || '0',
      consumption: String(payment.consumption || '0'),
      
      // ========== ADDITIONAL API FIELDS ==========
      gst: payment.gst || 'N/A',
      qrCodeLink: payment.qr_code_link || '',
      qrCodeData: payment.qr_code_link || '',
      
      // Preserve original data
      originalPaymentData: payment,
      originalConsumerData: consumerData,
    };
    
    console.log('📊 createBillData - Created Bill Data (API Response):');
    console.log('  Statement FOR:', billData.statementFor);
    console.log('  Meter SL No:', billData.meterSLNo);
    console.log('  Consumer UID:', billData.consumerUID);
    console.log('  Bill No:', billData.billNumber);
    console.log('  Customer Name:', billData.customerName);
    console.log('  Meter Services Count:', billData.meterServices?.length || 0);
    console.log('  📋 LAST MONTH Section - Raw API Values:');
    console.log('    payment.final_reading:', payment.final_reading);
    console.log('    payment.consumption:', payment.consumption);
    console.log('    payment.finalReading:', payment.finalReading);
    console.log('    payment.consumptionUnits:', payment.consumptionUnits);
    console.log('  📋 LAST MONTH Section - Extracted Values:');
    console.log('    lastMonthFinalReading:', billData.lastMonthFinalReading);
    console.log('    lastMonthConsumption:', billData.lastMonthConsumption);
    console.log('    finalReading:', billData.finalReading);
    console.log('    consumption:', billData.consumption);
    console.log('    final_reading:', billData.final_reading);
    
    return billData;
  }

  // Get customer name with prefix
  const customerName = consumerData?.name || consumerData?.consumerName || payment?.customerName || 'Consumer';
  const customerNameWithPrefix = customerName.startsWith('Mr.') || customerName.startsWith('Mrs.') || customerName.startsWith('Ms.') || customerName.startsWith('Dr.') || customerName.startsWith('Prof.')
    ? customerName 
    : `Mr. ${customerName}`;

  // Calculate billing period
  const billingPeriod = payment.billingPeriod || 
    (payment.fromDate && payment.toDate 
      ? `${formatDate(payment.fromDate)} - ${formatDate(payment.toDate)}`
      : payment.billMonth 
        ? `${payment.billMonth}/${payment.billYear || new Date().getFullYear()}`
        : 'Monthly');

  // Get meter services data (array of service charges)
  const meterServices = payment.meterServices || payment.services || payment.serviceCharges || [];
  
  // Calculate IMC charges (if not provided, calculate from other charges)
  const imcCharges = Number(payment.imcCharges || payment.imcCharge || payment.imc || 
    (payment.fixedCharges ? Number(payment.fixedCharges) * 0.1 : 0));

  // Get last month data (previous billing period)
  const lastMonthData = payment.lastMonth || payment.previousBill || payment.previousPeriod || {};

  // Get merit data (could be array for multiple periods)
  const meritData = payment.merit || payment.meritData || payment.additionalCharges || payment.meritCharges || [];

  // Extract all tax information
  const taxes = payment.taxes || payment.tax || {};
  const totalTax = taxes.total || taxes.gst || payment.taxAmount || payment.gst || 0;
  const cgst = taxes.cgst || payment.cgst || (totalTax / 2);
  const sgst = taxes.sgst || payment.sgst || (totalTax / 2);
  const igst = taxes.igst || payment.igst || 0;

  // Calculate subtotal (sum of all charges before tax)
  const energyCharges = Number(payment.energyCharges || payment.energyCharge || 0);
  const fixedCharges = Number(payment.fixedCharges || payment.fixedCharge || 0);
  const demandCharges = Number(payment.demandCharges || payment.demandCharge || 0);
  const powerFactorCharges = Number(payment.powerFactorCharges || payment.powerFactorCharge || 0);
  const electricityDuty = Number(payment.electricityDuty || payment.duty || 0);
  const subTotal = energyCharges + fixedCharges + demandCharges + powerFactorCharges + electricityDuty + imcCharges;
  
  // Total amount
  const totalAmount = Number(payment.totalAmount || payment.creditAmount || payment.amount || 0);
  
  // Get all readings
  const previousReading = formatNumber(payment.previousReading || payment.prevReading || payment.lastReading || consumerData?.previousReading || 0);
  const currentReading = formatNumber(payment.currentReading || payment.finalReading || payment.currentMeterReading || consumerData?.currentReading || 0);
  const unitsConsumed = formatNumber(payment.unitsConsumed || payment.consumption || payment.units || consumerData?.unitsConsumed || 0);
  
  // Get tariff information
  const unitRate = payment.unitRate || payment.tariffRate || payment.rate || consumerData?.tariffRate || 0;
  const tariffCategory = payment.tariffCategory || payment.billType || consumerData?.tariffCategory || 'Domestic';
  const connectionType = payment.connectionType || consumerData?.connectionType || 'Postpaid';
  
  // Get bill type (must be defined before use)
  const billType = payment.billType || payment.connectionType || consumerData?.connectionType || 'Postpaid';
  
  // Get payment information
  const isPaid = payment.isPaid || payment.paymentStatus === 'Paid' || payment.status === 'Paid' || (payment.creditAmount > 0);
  const paymentStatus = isPaid ? 'Paid' : (payment.status || payment.paymentStatus || 'Pending');
  const paymentMode = payment.paymentMode || payment.paymentMethod || payment.mode || 'N/A';
  
  // Get contact information
  const email = consumerData?.email || payment.email || consumerData?.contactEmail || consumerData?.emailAddress || 'N/A';
  const phone = consumerData?.phone || consumerData?.mobile || consumerData?.contactNumber || consumerData?.phoneNumber || payment.contactNo || payment.phone || 'N/A';
  const address = consumerData?.address || payment.address || consumerData?.fullAddress || consumerData?.billingAddress || 'N/A';
  
  // Get meter information
  const meterSerialNumber = consumerData?.meterSerialNumber || payment.meterSerialNumber || payment.meterNumber || consumerData?.meterNumber || 'N/A';
  const consumerUID = consumerData?.identifier || consumerData?.consumerNumber || payment.consumerId || payment.consumerUID || 'N/A';
  const consumerNumber = consumerData?.consumerNumber || consumerData?.identifier || payment.consumerNumber || 'N/A';
  
  // Get bill information
  const billNumber = payment.billNumber || payment.invoiceNumber || payment.transactionId || payment.billNo || `INV-${Date.now()}`;
  const billDate = formatDate(payment.billDate || payment.fromDate || payment.invoiceDate || payment.createdAt);
  const dueDate = formatDate(payment.dueDate || calculateDueDate(payment.billDate || payment.fromDate));
  
  // Get outstanding amount
  const outstandingAmount = consumerData?.totalOutstanding || consumerData?.outstanding || payment.outstandingAmount || payment.outstanding || 0;
  
  // Get sanctioned load
  const sanctionedLoad = consumerData?.sanctionedLoad || payment.sanctionedLoad || payment.load || '0';

  return {
    // ========== TOP SECTION FIELDS (Web Invoice PDF) ==========
    // Meter Information - ALL variations
    meterSLNo: String(meterSerialNumber),
    meterSerialNumber: String(meterSerialNumber),
    meterNumber: String(meterSerialNumber),
    meterNo: String(meterSerialNumber),
    
    // Consumer Information - ALL variations
    consumerUID: String(consumerUID),
    consumerId: String(consumerUID),
    consumerNumber: String(consumerNumber),
    consumerNo: String(consumerNumber),
    accountNumber: String(consumerNumber),
    accountNo: String(consumerNumber),
    
    // Bill Information - ALL variations
    billType: String(billType),
    billNumber: String(billNumber),
    billNo: String(billNumber),
    invoiceNumber: String(billNumber),
    invoiceNo: String(billNumber),
    
    // Customer Details - ALL variations with proper formatting
    customerName: customerNameWithPrefix,
    consumerName: customerName,
    customerNameWithPrefix: customerNameWithPrefix,
    name: customerNameWithPrefix,
    customerFullName: customerNameWithPrefix,
    
    address: String(address),
    fullAddress: String(address),
    billingAddress: String(address),
    consumerAddress: String(address),
    customerAddress: String(address),
    
    emailAddress: String(email),
    email: String(email),
    contactEmail: String(email),
    customerEmail: String(email),
    
    contactNo: String(phone),
    contactNumber: String(phone),
    phone: String(phone),
    phoneNumber: String(phone),
    mobile: String(phone),
    mobileNumber: String(phone),
    
    // Bill Dates - ALL variations
    billDate: billDate,
    invoiceDate: billDate,
    date: billDate,
    billingDate: billDate,
    fromDate: formatDate(payment.fromDate),
    toDate: formatDate(payment.toDate),
    
    billingPeriod: billingPeriod,
    period: billingPeriod,
    billPeriod: billingPeriod,
    
    totalAmountPayable: formatCurrency(totalAmount),
    amountPayable: formatCurrency(totalAmount),
    payableAmount: formatCurrency(totalAmount),
    
    dueDate: dueDate,
    paymentDueDate: dueDate,
    
    // ========== LAST MONTH SECTION ==========
    lastMonthPrevReading: formatNumber(lastMonthData.previousReading || payment.lastMonthPreviousReading || previousReading),
    lastMonthFinalReading: formatNumber(lastMonthData.finalReading || payment.lastMonthFinalReading || currentReading),
    lastMonthConsumption: formatNumber(lastMonthData.consumption || payment.lastMonthConsumption || unitsConsumed),
    lastMonthTotalAmount: formatCurrency(lastMonthData.totalAmount || payment.lastMonthTotalAmount || 0),
    lastMonthUnits: formatNumber(lastMonthData.consumption || payment.lastMonthConsumption || unitsConsumed),
    
    // ========== MERIT SECTION ==========
    meritDueDate: formatDate(payment.meritDueDate || dueDate),
    meritPrevReading: previousReading,
    meritFinalReading: currentReading,
    meritConsumption: unitsConsumed,
    meritTotalAmount: formatCurrency(payment.meritAmount || totalAmount),
    meritDataArray: Array.isArray(meritData) ? meritData : [meritData].filter(Boolean),
    
    // ========== METER SERVICES TABLE ==========
    meterServices: meterServices.length > 0 ? meterServices.map(service => ({
      serviceType: service.serviceType || 'Energy Charges',
      previousReadings: formatNumber(service.previousReadings || service.previousReading || previousReading),
      finalReadings: formatNumber(service.finalReadings || service.finalReading || service.currentReading || currentReading),
      consumption: formatNumber(service.consumption || service.unitsConsumed || unitsConsumed),
      unitRate: formatCurrency(service.unitRate || service.rate || unitRate),
      amount: formatCurrency(service.amount || service.charge || 0),
    })) : [
      {
        serviceType: 'Energy Charges',
        previousReadings: previousReading,
        finalReadings: currentReading,
        consumption: unitsConsumed,
        unitRate: formatCurrency(unitRate),
        amount: formatCurrency(energyCharges),
      }
    ],
    imcCharges: formatCurrency(imcCharges),
    imcCharge: formatCurrency(imcCharges),
    imc: formatCurrency(imcCharges),
    demandCharges: formatCurrency(demandCharges),
    demandCharge: formatCurrency(demandCharges),
    totalAmount: formatCurrency(totalAmount),
    grandTotal: formatCurrency(totalAmount),
    netAmount: formatCurrency(totalAmount),
    
    // ========== METER READINGS (General) - ALL variations ==========
    previousReading: previousReading,
    prevReading: previousReading,
    lastReading: previousReading,
    oldReading: previousReading,
    initialReading: previousReading,
    
    currentReading: currentReading,
    finalReading: currentReading,
    presentReading: currentReading,
    newReading: currentReading,
    meterReading: currentReading,
    
    unitsConsumed: unitsConsumed,
    consumption: unitsConsumed,
    units: unitsConsumed,
    totalUnits: unitsConsumed,
    consumedUnits: unitsConsumed,
    
    readingDate: formatDate(payment.readingDate || payment.billDate || payment.fromDate),
    meterReadingDate: formatDate(payment.readingDate || payment.billDate || payment.fromDate),
    
    // ========== CHARGES & AMOUNTS - ALL variations ==========
    energyCharges: formatCurrency(energyCharges),
    energyCharge: formatCurrency(energyCharges),
    consumptionCharges: formatCurrency(energyCharges),
    
    fixedCharges: formatCurrency(fixedCharges),
    fixedCharge: formatCurrency(fixedCharges),
    
    powerFactorCharges: formatCurrency(powerFactorCharges),
    powerFactorCharge: formatCurrency(powerFactorCharges),
    
    electricityDuty: formatCurrency(electricityDuty),
    duty: formatCurrency(electricityDuty),
    
    taxAmount: formatCurrency(totalTax),
    tax: formatCurrency(totalTax),
    gst: formatCurrency(totalTax),
    totalTax: formatCurrency(totalTax),
    
    cgst: formatCurrency(cgst),
    centralGST: formatCurrency(cgst),
    
    sgst: formatCurrency(sgst),
    stateGST: formatCurrency(sgst),
    
    igst: formatCurrency(igst),
    integratedGST: formatCurrency(igst),
    
    subTotal: formatCurrency(subTotal),
    subtotal: formatCurrency(subTotal),
    totalBeforeTax: formatCurrency(subTotal),
    
    totalAmountInWords: numberToWords(totalAmount),
    amountInWords: numberToWords(totalAmount),
    totalInWords: numberToWords(totalAmount),
    
    // ========== PAYMENT INFORMATION - ALL variations ==========
    paymentStatus: paymentStatus,
    status: paymentStatus,
    billStatus: paymentStatus,
    invoiceStatus: paymentStatus,
    
    paymentMode: paymentMode,
    paymentMethod: paymentMode,
    mode: paymentMode,
    
    transactionId: String(payment.transactionId || billNumber),
    transactionNo: String(payment.transactionId || billNumber),
    paymentId: String(payment.transactionId || billNumber),
    paymentTransactionId: String(payment.transactionId || billNumber),
    
    transactionDate: formatDate(payment.paymentDate || payment.transactionDate || payment.createdAt),
    paymentDate: formatDate(payment.paymentDate || payment.transactionDate || payment.createdAt),
    
    isPaid: isPaid,
    paid: isPaid,
    
    // ========== ADDITIONAL DETAILS - ALL variations ==========
    tariffRate: formatCurrency(unitRate),
    unitRate: formatCurrency(unitRate),
    rate: formatCurrency(unitRate),
    perUnitRate: formatCurrency(unitRate),
    
    tariffCategory: String(tariffCategory),
    category: String(tariffCategory),
    billCategory: String(tariffCategory),
    
    connectionType: String(connectionType),
    connectionCategory: String(connectionType),
    
    sanctionedLoad: String(sanctionedLoad),
    load: String(sanctionedLoad),
    sanctionedCapacity: String(sanctionedLoad),
    
    outstandingAmount: formatCurrency(outstandingAmount),
    outstanding: formatCurrency(outstandingAmount),
    totalOutstanding: formatCurrency(outstandingAmount),
    previousDues: formatCurrency(outstandingAmount),
    dues: formatCurrency(outstandingAmount),
    
    // ========== COMPANY INFORMATION ==========
    companyName: consumerData?.companyName || 'BestInfra Energy',
    companyAddress: consumerData?.companyAddress || 'Energy Solutions Provider',
    companyPhone: consumerData?.companyPhone || '+91-1234567890',
    companyEmail: consumerData?.companyEmail || 'support@bestinfra.com',
    companyGSTIN: consumerData?.companyGSTIN || 'N/A',
    gstin: consumerData?.companyGSTIN || 'N/A',
    
    // ========== BILLING MONTH/YEAR ==========
    billingMonth: payment.billMonth || new Date().getMonth() + 1,
    billingYear: payment.billYear || new Date().getFullYear(),
    billMonth: payment.billMonth || new Date().getMonth() + 1,
    billYear: payment.billYear || new Date().getFullYear(),
    
    // ========== TIMESTAMPS ==========
    generatedDate: new Date().toLocaleDateString('en-IN'),
    generatedTime: new Date().toLocaleTimeString('en-IN'),
    printDate: new Date().toLocaleDateString('en-IN'),
    printTime: new Date().toLocaleTimeString('en-IN'),
    
    // ========== ADDITIONAL FIELDS (for web PDF compatibility) ==========
    // QR Code related (if PDF has QR code field)
    qrCodeData: `${billNumber}|${consumerUID}|${totalAmount}`,
    
    // Statement for field
    statementFor: customerNameWithPrefix,
    
    // All original payment data preserved
    originalPaymentData: payment,
    originalConsumerData: consumerData,
  };
};


/**
 * Helper: Convert number to words (Indian style)
 */
const numberToWords = (amount) => {
  if (!amount || amount === 0) return 'Zero Rupees Only';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  
  const convertLessThanThousand = (num) => {
    if (num === 0) return '';
    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) return tens[Math.floor(num / 10)] + ' ' + ones[num % 10];
    return ones[Math.floor(num / 100)] + ' Hundred ' + convertLessThanThousand(num % 100);
  };
  
  try {
    const num = Math.floor(Number(amount));
    if (num === 0) return 'Zero Rupees Only';
    
    const crore = Math.floor(num / 10000000);
    const lakh = Math.floor((num % 10000000) / 100000);
    const thousand = Math.floor((num % 100000) / 1000);
    const remainder = num % 1000;
    
    let result = '';
    if (crore > 0) result += convertLessThanThousand(crore) + ' Crore ';
    if (lakh > 0) result += convertLessThanThousand(lakh) + ' Lakh ';
    if (thousand > 0) result += convertLessThanThousand(thousand) + ' Thousand ';
    if (remainder > 0) result += convertLessThanThousand(remainder);
    
    return (result.trim() + ' Rupees Only').replace(/\s+/g, ' ');
  } catch (error) {
    return 'Amount Error';
  }
};

/**
 * 🔧 UTILITY: Load PDF Template from Assets
 * Updated to use Invoice2.pdf
 */
const loadPDFTemplate = async () => {
  try {
    console.log('📄 Loading PDF template (Invoice2.pdf) from assets...');
    
    // Method 1: Try loading Invoice2.pdf first
    try {
      const asset = Asset.fromModule(require('../../assets/Invoice2.pdf'));
      await asset.downloadAsync();
      
      console.log('✅ Invoice2.pdf asset loaded:', asset.localUri);
      
      // Read the file as base64
      const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Convert base64 to Uint8Array
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      console.log('✅ Invoice2.pdf template loaded successfully');
      return bytes;
    } catch (assetError) {
      console.log('⚠️ Invoice2.pdf not found, trying Invoice.pdf...');
      
      // Method 2: Fallback to Invoice.pdf
      try {
        const asset = Asset.fromModule(require('../../assets/Invoice.pdf'));
        await asset.downloadAsync();
        
        console.log('✅ Invoice.pdf asset loaded (fallback):', asset.localUri);
        
        const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        console.log('✅ Invoice.pdf template loaded (fallback)');
        return bytes;
      } catch (fallbackError) {
        console.log('⚠️ Invoice.pdf also not found, trying bundle method...');
        
        // Method 3: Try reading from bundle
        try {
          // Try Invoice2.pdf first
          try {
            const bundlePath = Asset.fromModule(require('../../assets/Invoice2.pdf')).uri;
            const { apiClient } = await import('./apiClient');
            const response = await apiClient.fetchLocal(bundlePath);
            const arrayBuffer = await response.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            
            console.log('✅ Invoice2.pdf template loaded from bundle');
            return bytes;
          } catch (invoice2Error) {
            // Fallback to Invoice.pdf
            const bundlePath = Asset.fromModule(require('../../assets/Invoice.pdf')).uri;
            const { apiClient } = await import('./apiClient');
            const response = await apiClient.fetchLocal(bundlePath);
            const arrayBuffer = await response.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            
            console.log('✅ Invoice.pdf template loaded from bundle (fallback)');
            return bytes;
          }
        } catch (bundleError) {
          console.error('❌ Bundle method also failed:', bundleError);
          throw new Error('Could not load Invoice2.pdf or Invoice.pdf template. Please ensure it exists in assets/ and is properly bundled.');
        }
      }
    }
  } catch (error) {
    console.error('❌ Error loading PDF template:', error);
    throw new Error('Could not load Invoice2.pdf template. Please ensure it exists in assets/');
  }
};

/**
 * 🔧 UTILITY: Get All Form Fields from PDF
 * Useful for debugging and discovering field names
 */
export const inspectPDFFields = async () => {
  try {
    const pdfBytes = await loadPDFTemplate();
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    console.log('📋 PDF Form Fields:');
    fields.forEach((field) => {
      const name = field.getName();
      const type = field.constructor.name;
      console.log(`  - ${name} (${type})`);
    });
    
    return fields.map(field => ({
      name: field.getName(),
      type: field.constructor.name
    }));
  } catch (error) {
    console.error('❌ Error inspecting PDF fields:', error);
    return [];
  }
};

/**
 * 📝 COMPREHENSIVE FIELD MAPPING
 * Maps invoice data to PDF form field names (Invoice2.pdf structure)
 * Updated to match EXACT TypeScript implementation field mappings
 * 
 * PDF Structure (Invoice2.pdf):
 * 1. STATEMENT FOR (header)
 * 2. Top Section: Meter SL No, Bill Type, Consumer UID, Bill No, Customer Name, Address, 
 *    Bill Date, Bill Period, Total Amount Payable, Email Address, Contact No, Due Date
 * 3. LAST MONTH Section: Prev Reading, Final Reading, Consumption, Total Amount
 * 4. MERIT Sections (3 sections): Each with Due Date, Prev Reading, Final Reading, Consumption, Total Amount
 * 5. Meter Services Table: 4 service rows, IMC Charges, Demand Charges, TOTAL AMOUNT
 */
const createFieldMappings = (billData) => {
  // Get today's date in format "Nov 20, 2025"
  const getTodayDate = () => {
    const now = new Date();
    return now.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Create comprehensive field mappings matching TypeScript implementation
  const pdfFieldMapping = {
    // Organization and company info
    'organization_name': getValueFromBill(billData, ['organization_name'], 'GMR GROUP NEW UDAAN BHAWAN'),
    'Client_Address': getValueFromBill(billData, [], 'Opp. Terminal 3, IGI Airport New Delhi, India - 110037'),
    'Contact_No': getValueFromBill(billData, [], '+91 8801711851'),
    'clientAddress1': getValueFromBill(billData, [], 'GMR GROUP NEW UDAAN BHAWAN'),
    'clientAddress2': getValueFromBill(billData, [], 'Opp. Terminal 3, IGI Airport New Delhi, India - 110037'),
    'clientAddress3': getValueFromBill(billData, [], 'Andhra Pradesh, India'),
    
    // Statement and billing info - EXACT CASE from TypeScript
    'Statment_For': getValueFromBill(billData, ['statement_for', 'statementFor', 'billType', 'tariffType'], 'POSTPAID'),
    'StatementType': getValueFromBill(billData, ['StatementType', 'statementFor', 'bill_type', 'statement_for'], 'POSTPAID'),
    'bill_date': getValueFromBill(billData, ['bill_date', 'billDate'], getTodayDate()),
    'statement_date': getValueFromBill(billData, ['statement_date', 'billDate'], ''),
    'statement_period': getValueFromBill(billData, ['statement_period', 'billingPeriod'], ''),
    
    // Meter and consumer info
    'meter_sl_no': getValueFromBill(billData, ['meter_sl_no', 'meterSLNo', 'meterSerial', 'meterNo'], ''),
    'consumer_uid': getValueFromBill(billData, ['consumer_uid', 'consumerUID', 'aldCompanyCode', 'consumerNumber'], ''),
    // Use statement_for for bill_type (not bill_type field which might be meter number)
    'bill_type': getValueFromBill(billData, ['statement_for', 'statementFor'], 'POSTPAID'),
    'BillingType': getValueFromBill(billData, ['statement_for', 'statementFor', 'BillingType'], 'POSTPAID'),
    'BillType': getValueFromBill(billData, ['statement_for', 'statementFor', 'billType'], 'POSTPAID'),
    'bill_no': getValueFromBill(billData, ['bill_no', 'billNumber', 'id', 'billId'], ''),
    
    // Customer info - Check API response directly first
    'customer_name': getValueFromBill(billData, ['customer_name', 'customerName', 'unitName', 'Name'], 'Consumer'),
    'customer_address_line': getValueFromBill(billData, ['customer_address_line1', 'address', 'Address', 'consumerAddress'], ''),
    'customer_pincode_state': getValueFromBill(billData, ['customer_address_line2'], ''),
    'customer_email': getValueFromBill(billData, ['customer_email', 'emailAddress', 'aldCompanyEmail', 'EmailAddress', 'Email', 'email'], ''),
    'customer_contact': getValueFromBill(billData, ['customer_contact', 'contactNo', 'aldCompanyPhone', 'PhoneNumber', 'phoneNumber', 'phone'], ''),
    'consumerAddress2': getValueFromBill(billData, ['customer_address_line2'], ''),
    
    // Dates and amounts
    'due_date': getValueFromBill(billData, ['due_date', 'dueDate', 'DueDate'], ''),
    'totalAmount': getValueFromBill(billData, ['totalAmount'], ''),
    'total_amount_payable': getValueFromBill(billData, ['total_amount_payable', 'totalAmountPayable'], ''),
    'total_amount': getValueFromBill(billData, ['total_amount', 'TotalAmount', 'totalAmount', 'totalCharges'], ''),
    
    // Last month section - ensure Final Reading and Consumption are filled
    // IMPORTANT: Use direct API fields first, then fallback to billData
    'last_month_label': getValueFromBill(billData, ['last_month_label', 'lastMonthLabel'], ''),
    'prev_reading': getValueFromBill(billData, ['prev_reading', 'previousReading1', 'openingReading', 'lastMonthPrevReading'], '0'),
    // Final Reading - check API response directly first, then billData fields
    'final_reading': getValueFromBill(billData, [
      'final_reading',           // Direct API field
      'lastMonthFinalReading',   // From billData
      'finalReading',             // From billData
      'FinalReading1',           // Alternative
      'closingReading'           // Alternative
    ], '0'),
    // Consumption - check API response directly first, then billData fields
    'consumption': getValueFromBill(billData, [
      'consumption',             // Direct API field
      'lastMonthConsumption',    // From billData
      'consumption1',            // Alternative
      'service_consumption_1',    // Alternative
      'consumptionUnits'         // Alternative
    ], '0'),
    'last_month_amount': getValueFromBill(billData, ['last_month_amount', 'lastMonthTotalAmount'], '₹ 0'),
    'last_month_status': getValueFromBill(billData, ['last_month_status', 'lastMonthStatus'], 'N/A'),
    
    // Service fields (1-4) - Check API response directly first
    'service_type_1': getValueFromBill(billData, ['service_type_1'], billData.meterServices?.[0]?.serviceType || ''),
    'service_prev_1': getValueFromBill(billData, ['service_prev_1', 'prev_reading'], billData.meterServices?.[0]?.previousReadings || ''),
    'service_final_1': getValueFromBill(billData, ['service_final_1', 'final_reading'], billData.meterServices?.[0]?.finalReadings || ''),
    'service_consumption_1': getValueFromBill(billData, ['service_consumption_1', 'consumption'], billData.meterServices?.[0]?.consumption || ''),
    'service_unit_rate_1': getValueFromBill(billData, ['service_unit_rate_1', 'unitRate', 'UnitRate1'], billData.meterServices?.[0]?.unitRate || ''),
    'service_amount_1': getValueFromBill(billData, ['service_amount_1', 'energyCharges', 'electricity_charge', 'Amount1'], billData.meterServices?.[0]?.amount || ''),
    
    'service_type_2': getValueFromBill(billData, ['service_type_2'], billData.meterServices?.[1]?.serviceType || ''),
    'service_prev_2': getValueFromBill(billData, ['service_prev_2'], billData.meterServices?.[1]?.previousReadings || ''),
    'service_final_2': getValueFromBill(billData, ['service_final_2'], billData.meterServices?.[1]?.finalReadings || ''),
    'service_consumption_2': getValueFromBill(billData, ['service_consumption_2'], billData.meterServices?.[1]?.consumption || ''),
    'service_unit_rate_2': getValueFromBill(billData, ['service_unit_rate_2'], billData.meterServices?.[1]?.unitRate || ''),
    'service_amount_2': getValueFromBill(billData, ['service_amount_2'], billData.meterServices?.[1]?.amount || ''),
    
    'service_type_3': getValueFromBill(billData, ['service_type_3'], billData.meterServices?.[2]?.serviceType || ''),
    'service_prev_3': getValueFromBill(billData, ['service_prev_3'], billData.meterServices?.[2]?.previousReadings || ''),
    'service_final_3': getValueFromBill(billData, ['service_final_3'], billData.meterServices?.[2]?.finalReadings || ''),
    'service_consumption_3': getValueFromBill(billData, ['service_consumption_3'], billData.meterServices?.[2]?.consumption || ''),
    'service_unit_rate_3': getValueFromBill(billData, ['service_unit_rate_3'], billData.meterServices?.[2]?.unitRate || ''),
    'service_amount_3': getValueFromBill(billData, ['service_amount_3'], billData.meterServices?.[2]?.amount || ''),
    
    'service_type_4': getValueFromBill(billData, ['service_type_4'], billData.meterServices?.[3]?.serviceType || ''),
    'service_prev_4': getValueFromBill(billData, ['service_prev_4'], billData.meterServices?.[3]?.previousReadings || ''),
    'service_final_4': getValueFromBill(billData, ['service_final_4'], billData.meterServices?.[3]?.finalReadings || ''),
    'service_consumption_4': getValueFromBill(billData, ['service_consumption_4'], billData.meterServices?.[3]?.consumption || ''),
    'service_unit_rate_4': getValueFromBill(billData, ['service_unit_rate_4'], billData.meterServices?.[3]?.unitRate || ''),
    'service_amount_4': getValueFromBill(billData, ['service_amount_4'], billData.meterServices?.[3]?.amount || ''),
    
    // Charges
    'imc_charges': getValueFromBill(billData, ['imc_charges', 'imcCharges'], '₹ 0'),
    'demand_charges': getValueFromBill(billData, ['demand_charges', 'demandCharges'], '₹ 0'),
    
    // Additional fields
    'gst': getValueFromBill(billData, ['gst', 'GST'], 'N/A'),
    'qr_code_link': getValueFromBill(billData, ['qr_code_link', 'qrCodeLink'], ''),
  };

  // Merge with comprehensive field mappings for backward compatibility
  return {
    // Primary mappings from TypeScript implementation
    ...pdfFieldMapping,
    
    // Additional variations for compatibility
    // ========== TOP SECTION (Invoice2.pdf - GMR Format) ==========
    // Statement FOR
    'STATEMENT FOR': billData.statementFor,
    'Statement FOR': billData.statementFor,
    'StatementFor': billData.statementFor,
    'statement_for': billData.statementFor,
    'Statment_For': billData.statementFor,
    'STATEMENT_FOR': billData.statementFor,
    
    // Meter Information
    'Meter SL No': billData.meterSLNo,
    'MeterSLNo': billData.meterSLNo,
    'meter_sl_no': billData.meterSLNo,
    'METER_SL_NO': billData.meterSLNo,
    'MeterSerialNo': billData.meterSerialNumber,
    'meter_serial_no': billData.meterSerialNumber,
    'MeterNo': billData.meterSerialNumber,
    'meter_no': billData.meterSerialNumber,
    'MeterNumber': billData.meterSerialNumber,
    'meter_number': billData.meterSerialNumber,
    'METER_NO': billData.meterSerialNumber,
    
    // Consumer UID
    'Consumer UID': billData.consumerUID,
    'ConsumerUID': billData.consumerUID,
    'consumer_uid': billData.consumerUID,
    'CONSUMER_UID': billData.consumerUID,
    'ConsumerNo': billData.consumerId,
    'consumer_no': billData.consumerId,
    'ConsumerNumber': billData.consumerNumber,
    'consumer_number': billData.consumerNumber,
    'CustomerID': billData.consumerId,
    'customer_id': billData.consumerId,
    'CONSUMER_NO': billData.consumerId,
    'AccountNo': billData.consumerId,
    'account_no': billData.consumerId,
    
    // Bill Type
    'Bill Type': billData.billType || billData.statementFor || 'POSTPAID',
    'Bill Type:': billData.billType || billData.statementFor || 'POSTPAID',
    'BillType': billData.billType || billData.statementFor || 'POSTPAID',
    'bill_type': billData.billType || billData.statementFor || 'POSTPAID',
    'BILL_TYPE': billData.billType || billData.statementFor || 'POSTPAID',
    'ConnectionType': billData.connectionType,
    'connection_type': billData.connectionType,
    
    // Bill No
    'Bill No': billData.billNumber,
    'BillNo': billData.billNumber,
    'bill_no': billData.billNumber,
    'BILL_NO': billData.billNumber,
    'InvoiceNo': billData.billNumber,
    'invoice_no': billData.billNumber,
    'InvoiceNumber': billData.invoiceNumber,
    'invoice_number': billData.invoiceNumber,
    'INVOICE_NO': billData.billNumber,
    
    // Customer Name (with Mr./Mrs./Ms. prefix)
    'Customer Name': billData.customerNameWithPrefix,
    'Customer Name:': billData.customerNameWithPrefix,
    'CustomerName': billData.customerNameWithPrefix,
    'customer_name': billData.customerNameWithPrefix,
    'Name': billData.customerNameWithPrefix,
    'unitName': billData.customerNameWithPrefix,
    'ConsumerName': billData.consumerName,
    'consumer_name': billData.consumerName,
    'CONSUMER_NAME': billData.consumerName,
    'Name': billData.customerNameWithPrefix,
    'name': billData.customerNameWithPrefix,
    
    // Address
    'Address': billData.address,
    'Address:': billData.address,
    'address': billData.address,
    'ConsumerAddress': billData.address,
    'customer_address_line1': billData.address,
    'customer_address_line': billData.address,
    'consumer_address': billData.address,
    'CONSUMER_ADDRESS': billData.address,
    
    // Email Address
    'Email Address': billData.emailAddress,
    'Email Address:': billData.emailAddress,
    'EmailAddress': billData.emailAddress,
    'email_address': billData.emailAddress,
    'customer_email': billData.emailAddress,
    'Email': billData.emailAddress,
    'aldCompanyEmail': billData.emailAddress,
    'EMAIL_ADDRESS': billData.emailAddress,
    'Email': billData.emailAddress,
    'email': billData.emailAddress,
    'ContactEmail': billData.emailAddress,
    'contact_email': billData.emailAddress,
    
    // Contact No
    'Contact No': billData.contactNo,
    'Contact No:': billData.contactNo,
    'ContactNo': billData.contactNo,
    'contact_no': billData.contactNo,
    'customer_contact': billData.contactNo,
    'PhoneNumber': billData.contactNo,
    'aldCompanyPhone': billData.contactNo,
    'CONTACT_NO': billData.contactNo,
    'Phone': billData.contactNo,
    'phone': billData.contactNo,
    'Mobile': billData.contactNo,
    'mobile': billData.contactNo,
    'PhoneNumber': billData.contactNo,
    'phone_number': billData.contactNo,
    
    // Bill Date
    'Bill Date': billData.billDate,
    'Bill Date:': billData.billDate,
    'BillDate': billData.billDate,
    'bill_date': billData.billDate,
    'statement_date': billData.billDate,
    'BILL_DATE': billData.billDate,
    'InvoiceDate': billData.invoiceDate,
    'invoice_date': billData.invoiceDate,
    'Date': billData.billDate,
    'date': billData.billDate,
    'INVOICE_DATE': billData.invoiceDate,
    
    // Bill Period
    'Bill Period': billData.billingPeriod,
    'Bill Period:': billData.billingPeriod,
    'BillPeriod': billData.billingPeriod,
    'bill_period': billData.billingPeriod,
    'statement_period': billData.billingPeriod,
    'BILL_PERIOD': billData.billingPeriod,
    'BillingPeriod': billData.billingPeriod,
    'billing_period': billData.billingPeriod,
    'Period': billData.billingPeriod,
    'period': billData.billingPeriod,
    
    // Total Amount Payable
    'Total Amount Payable': billData.totalAmountPayable,
    'Total Amount Payable:': billData.totalAmountPayable,
    'TotalAmountPayable': billData.totalAmountPayable,
    'total_amount_payable': billData.totalAmountPayable,
    'totalAmount': billData.totalAmountPayable,
    'TOTAL_AMOUNT_PAYABLE': billData.totalAmountPayable,
    'AmountPayable': billData.totalAmountPayable,
    'amount_payable': billData.totalAmountPayable,
    
    // Due Date
    'Due Date': billData.dueDate,
    'DueDate': billData.dueDate,
    'due_date': billData.dueDate,
    'DUE_DATE': billData.dueDate,
    'PaymentDueDate': billData.dueDate,
    'payment_due_date': billData.dueDate,
    
    // ========== LAST MONTH SECTION (GMR Format) ==========
    'LAST MONTH': billData.lastMonthLabel,
    'Last Month': billData.lastMonthLabel,
    'LastMonth': billData.lastMonthLabel,
    'last_month': billData.lastMonthLabel,
    
    'Prev Reading': billData.lastMonthPrevReading,
    'Prev Reading:': billData.lastMonthPrevReading,
    'PrevReading': billData.lastMonthPrevReading,
    'prev_reading': billData.lastMonthPrevReading,
    'PREV_READING': billData.lastMonthPrevReading,
    'LastMonthPrevReading': billData.lastMonthPrevReading,
    'last_month_prev_reading': billData.lastMonthPrevReading,
    
    // Final Reading - LAST MONTH section (with all variations including colons)
    // IMPORTANT: Preserve exact format from API (e.g., "12291140 kVAh")
    'Final Reading': billData.lastMonthFinalReading || billData.finalReading || billData.final_reading || billData.originalPaymentData?.final_reading || '0',
    'Final Reading:': billData.lastMonthFinalReading || billData.finalReading || billData.final_reading || billData.originalPaymentData?.final_reading || '0',
    'FinalReading': billData.lastMonthFinalReading || billData.finalReading || billData.final_reading || billData.originalPaymentData?.final_reading || '0',
    'final_reading': billData.lastMonthFinalReading || billData.finalReading || billData.final_reading || billData.originalPaymentData?.final_reading || '0',
    'FINAL_READING': billData.lastMonthFinalReading || billData.finalReading || billData.final_reading || billData.originalPaymentData?.final_reading || '0',
    'LastMonthFinalReading': billData.lastMonthFinalReading || billData.finalReading || billData.final_reading || billData.originalPaymentData?.final_reading || '0',
    'last_month_final_reading': billData.lastMonthFinalReading || billData.finalReading || billData.final_reading || billData.originalPaymentData?.final_reading || '0',
    
    // Consumption - LAST MONTH section (with all variations including colons)
    // IMPORTANT: Preserve exact value from API (e.g., "427640")
    'Consumption': billData.lastMonthConsumption || billData.consumption || billData.originalPaymentData?.consumption || '0',
    'Consumption:': billData.lastMonthConsumption || billData.consumption || billData.originalPaymentData?.consumption || '0',
    'consumption': billData.lastMonthConsumption || billData.consumption || billData.originalPaymentData?.consumption || '0',
    'CONSUMPTION': billData.lastMonthConsumption || billData.consumption || billData.originalPaymentData?.consumption || '0',
    'LastMonthConsumption': billData.lastMonthConsumption || billData.consumption || billData.originalPaymentData?.consumption || '0',
    'last_month_consumption': billData.lastMonthConsumption || billData.consumption || billData.originalPaymentData?.consumption || '0',
    
    'Total Amount': billData.lastMonthTotalAmount,
    'TotalAmount': billData.lastMonthTotalAmount,
    'total_amount': billData.lastMonthTotalAmount,
    'TOTAL_AMOUNT': billData.lastMonthTotalAmount,
    'LastMonthTotalAmount': billData.lastMonthTotalAmount,
    'last_month_total_amount': billData.lastMonthTotalAmount,
    
    // ========== MERIT SECTION ==========
    'MeritDueDate': billData.meritDueDate,
    'merit_due_date': billData.meritDueDate,
    'Merit Prev Reading': billData.meritPrevReading,
    'MeritPrevReading': billData.meritPrevReading,
    'merit_prev_reading': billData.meritPrevReading,
    'Merit Final Reading': billData.meritFinalReading,
    'MeritFinalReading': billData.meritFinalReading,
    'merit_final_reading': billData.meritFinalReading,
    'Merit Consumption': billData.meritConsumption,
    'MeritConsumption': billData.meritConsumption,
    'merit_consumption': billData.meritConsumption,
    'Merit Total Amount': billData.meritTotalAmount,
    'MeritTotalAmount': billData.meritTotalAmount,
    'merit_total_amount': billData.meritTotalAmount,
    
    // ========== METER SERVICES TABLE (GMR Format) ==========
    // Service fields are handled dynamically, but add static mappings for service_type_1, etc.
    'service_type_1': billData.meterServices?.[0]?.serviceType || '',
    'service_prev_1': billData.meterServices?.[0]?.previousReadings || '',
    'service_final_1': billData.meterServices?.[0]?.finalReadings || '',
    'service_consumption_1': billData.meterServices?.[0]?.consumption || '',
    'service_unit_rate_1': billData.meterServices?.[0]?.unitRate || '',
    'service_amount_1': billData.meterServices?.[0]?.amount || '',
    
    'service_type_2': billData.meterServices?.[1]?.serviceType || '',
    'service_prev_2': billData.meterServices?.[1]?.previousReadings || '',
    'service_final_2': billData.meterServices?.[1]?.finalReadings || '',
    'service_consumption_2': billData.meterServices?.[1]?.consumption || '',
    'service_unit_rate_2': billData.meterServices?.[1]?.unitRate || '',
    'service_amount_2': billData.meterServices?.[1]?.amount || '',
    
    'service_type_3': billData.meterServices?.[2]?.serviceType || '',
    'service_prev_3': billData.meterServices?.[2]?.previousReadings || '',
    'service_final_3': billData.meterServices?.[2]?.finalReadings || '',
    'service_consumption_3': billData.meterServices?.[2]?.consumption || '',
    'service_unit_rate_3': billData.meterServices?.[2]?.unitRate || '',
    'service_amount_3': billData.meterServices?.[2]?.amount || '',
    
    'service_type_4': billData.meterServices?.[3]?.serviceType || '',
    'service_prev_4': billData.meterServices?.[3]?.previousReadings || '',
    'service_final_4': billData.meterServices?.[3]?.finalReadings || '',
    'service_consumption_4': billData.meterServices?.[3]?.consumption || '',
    'service_unit_rate_4': billData.meterServices?.[3]?.unitRate || '',
    'service_amount_4': billData.meterServices?.[3]?.amount || '',
    
    // IMC Charges
    'IMC Charges': billData.imcCharges,
    'IMC Charges:': billData.imcCharges,
    'IMCCharges': billData.imcCharges,
    'imc_charges': billData.imcCharges,
    'IMC_CHARGES': billData.imcCharges,
    'IMCCharge': billData.imcCharges,
    'imc_charge': billData.imcCharges,
    
    // Demand Charges
    'Demand Charges': billData.demandCharges,
    'Demand Charges:': billData.demandCharges,
    'DemandCharges': billData.demandCharges,
    'demand_charges': billData.demandCharges,
    'DEMAND_CHARGES': billData.demandCharges,
    
    // TOTAL AMOUNT (from Meter Services table)
    'TOTAL AMOUNT': billData.totalAmount,
    'TOTAL AMOUNT:': billData.totalAmount,
    'TOTAL_AMOUNT': billData.totalAmount,
    'total_amount': billData.totalAmount,
    'TotalAmount': billData.totalAmount,
    
    // ========== GENERAL METER READINGS ==========
    'Previous Reading': billData.previousReading,
    'PreviousReading': billData.previousReading,
    'previous_reading': billData.previousReading,
    'PREVIOUS_READING': billData.previousReading,
    'OldReading': billData.previousReading,
    'old_reading': billData.previousReading,
    
    'Current Reading': billData.currentReading,
    'CurrentReading': billData.currentReading,
    'current_reading': billData.currentReading,
    'CURRENT_READING': billData.currentReading,
    'PresentReading': billData.currentReading,
    'present_reading': billData.currentReading,
    'NewReading': billData.currentReading,
    'new_reading': billData.currentReading,
    
    'Units Consumed': billData.unitsConsumed,
    'UnitsConsumed': billData.unitsConsumed,
    'units_consumed': billData.unitsConsumed,
    'UNITS_CONSUMED': billData.unitsConsumed,
    'Units': billData.unitsConsumed,
    'units': billData.unitsConsumed,
    'TotalUnits': billData.unitsConsumed,
    'total_units': billData.unitsConsumed,
    
    'ReadingDate': billData.readingDate,
    'reading_date': billData.readingDate,
    'MeterReadingDate': billData.readingDate,
    'meter_reading_date': billData.readingDate,
    'READING_DATE': billData.readingDate,
    
    // ========== CHARGES & AMOUNTS ==========
    'EnergyCharges': billData.energyCharges,
    'energy_charges': billData.energyCharges,
    'EnergyCharge': billData.energyCharges,
    'energy_charge': billData.energyCharges,
    'ENERGY_CHARGES': billData.energyCharges,
    'ConsumptionCharges': billData.energyCharges,
    'consumption_charges': billData.energyCharges,
    
    'FixedCharges': billData.fixedCharges,
    'fixed_charges': billData.fixedCharges,
    'FixedCharge': billData.fixedCharges,
    'fixed_charge': billData.fixedCharges,
    'FIXED_CHARGES': billData.fixedCharges,
    
    'PowerFactorCharges': billData.powerFactorCharges,
    'power_factor_charges': billData.powerFactorCharges,
    'POWER_FACTOR_CHARGES': billData.powerFactorCharges,
    
    'ElectricityDuty': billData.electricityDuty,
    'electricity_duty': billData.electricityDuty,
    'ELECTRICITY_DUTY': billData.electricityDuty,
    
    'Tax': billData.taxAmount,
    'tax': billData.taxAmount,
    'TaxAmount': billData.taxAmount,
    'tax_amount': billData.taxAmount,
    'TAX': billData.taxAmount,
    'GST': billData.taxAmount,
    'gst': billData.taxAmount,
    
    'CGST': billData.cgst,
    'cgst': billData.cgst,
    'CentralGST': billData.cgst,
    'central_gst': billData.cgst,
    
    'SGST': billData.sgst,
    'sgst': billData.sgst,
    'StateGST': billData.sgst,
    'state_gst': billData.sgst,
    
    'IGST': billData.igst,
    'igst': billData.igst,
    'IntegratedGST': billData.igst,
    'integrated_gst': billData.igst,
    
    'SubTotal': billData.subTotal,
    'sub_total': billData.subTotal,
    'Subtotal': billData.subTotal,
    'subtotal': billData.subTotal,
    'SUB_TOTAL': billData.subTotal,
    
    'TotalAmount': billData.totalAmount,
    'total_amount': billData.totalAmount,
    'Total': billData.totalAmount,
    'total': billData.totalAmount,
    'GrandTotal': billData.totalAmount,
    'grand_total': billData.totalAmount,
    'NetAmount': billData.totalAmount,
    'net_amount': billData.totalAmount,
    
    'AmountInWords': billData.totalAmountInWords,
    'amount_in_words': billData.totalAmountInWords,
    'TotalInWords': billData.totalAmountInWords,
    'total_in_words': billData.totalAmountInWords,
    'AMOUNT_IN_WORDS': billData.totalAmountInWords,
    
    // ========== COMPANY INFORMATION ==========
    'CompanyName': billData.companyName,
    'company_name': billData.companyName,
    'COMPANY_NAME': billData.companyName,
    'CompanyAddress': billData.companyAddress,
    'company_address': billData.companyAddress,
    'CompanyPhone': billData.companyPhone,
    'company_phone': billData.companyPhone,
    'CompanyEmail': billData.companyEmail,
    'company_email': billData.companyEmail,
    'CompanyGSTIN': billData.companyGSTIN,
    'company_gstin': billData.companyGSTIN,
    'GSTIN': billData.companyGSTIN,
    
    // Invoice/Bill Details
    'InvoiceNo': billData.billNumber,
    'invoice_no': billData.billNumber,
    'InvoiceNumber': billData.invoiceNumber,
    'invoice_number': billData.invoiceNumber,
    'BillNo': billData.billNumber,
    'bill_no': billData.billNumber,
    'BillNumber': billData.billNumber,
    'bill_number': billData.billNumber,
    'INVOICE_NO': billData.billNumber,
    'BILL_NO': billData.billNumber,
    
    'InvoiceDate': billData.invoiceDate,
    'invoice_date': billData.invoiceDate,
    'BillDate': billData.billDate,
    'bill_date': billData.billDate,
    'Date': billData.billDate,
    'date': billData.billDate,
    'INVOICE_DATE': billData.invoiceDate,
    'BILL_DATE': billData.billDate,
    
    'DueDate': billData.dueDate,
    'due_date': billData.dueDate,
    'PaymentDueDate': billData.dueDate,
    'payment_due_date': billData.dueDate,
    'DUE_DATE': billData.dueDate,
    
    'BillingPeriod': billData.billingPeriod,
    'billing_period': billData.billingPeriod,
    'BillingMonth': billData.billingMonth,
    'billing_month': billData.billingMonth,
    'Period': billData.billingPeriod,
    'period': billData.billingPeriod,
    'BILLING_PERIOD': billData.billingPeriod,
    
    // Meter Readings
    'PreviousReading': billData.previousReading,
    'previous_reading': billData.previousReading,
    'PrevReading': billData.previousReading,
    'prev_reading': billData.previousReading,
    'PREVIOUS_READING': billData.previousReading,
    'OldReading': billData.previousReading,
    'old_reading': billData.previousReading,
    
    'CurrentReading': billData.currentReading,
    'current_reading': billData.currentReading,
    'PresentReading': billData.currentReading,
    'present_reading': billData.currentReading,
    'CURRENT_READING': billData.currentReading,
    'NewReading': billData.currentReading,
    'new_reading': billData.currentReading,
    
    'UnitsConsumed': billData.unitsConsumed,
    'units_consumed': billData.unitsConsumed,
    'Consumption': billData.unitsConsumed,
    'consumption': billData.unitsConsumed,
    'Units': billData.unitsConsumed,
    'units': billData.unitsConsumed,
    'UNITS_CONSUMED': billData.unitsConsumed,
    'TotalUnits': billData.unitsConsumed,
    'total_units': billData.unitsConsumed,
    
    'ReadingDate': billData.readingDate,
    'reading_date': billData.readingDate,
    'MeterReadingDate': billData.readingDate,
    'meter_reading_date': billData.readingDate,
    'READING_DATE': billData.readingDate,
    
    // Charges & Amounts
    'EnergyCharges': billData.energyCharges,
    'energy_charges': billData.energyCharges,
    'EnergyCharge': billData.energyCharges,
    'energy_charge': billData.energyCharges,
    'ENERGY_CHARGES': billData.energyCharges,
    'ConsumptionCharges': billData.energyCharges,
    'consumption_charges': billData.energyCharges,
    
    'FixedCharges': billData.fixedCharges,
    'fixed_charges': billData.fixedCharges,
    'FixedCharge': billData.fixedCharges,
    'fixed_charge': billData.fixedCharges,
    'FIXED_CHARGES': billData.fixedCharges,
    
    'DemandCharges': billData.demandCharges,
    'demand_charges': billData.demandCharges,
    'DEMAND_CHARGES': billData.demandCharges,
    
    'PowerFactorCharges': billData.powerFactorCharges,
    'power_factor_charges': billData.powerFactorCharges,
    'POWER_FACTOR_CHARGES': billData.powerFactorCharges,
    
    'ElectricityDuty': billData.electricityDuty,
    'electricity_duty': billData.electricityDuty,
    'ELECTRICITY_DUTY': billData.electricityDuty,
    
    'Tax': billData.taxAmount,
    'tax': billData.taxAmount,
    'TaxAmount': billData.taxAmount,
    'tax_amount': billData.taxAmount,
    'TAX': billData.taxAmount,
    'GST': billData.taxAmount,
    'gst': billData.taxAmount,
    
    'CGST': billData.cgst,
    'cgst': billData.cgst,
    'CentralGST': billData.cgst,
    'central_gst': billData.cgst,
    
    'SGST': billData.sgst,
    'sgst': billData.sgst,
    'StateGST': billData.sgst,
    'state_gst': billData.sgst,
    
    'IGST': billData.igst,
    'igst': billData.igst,
    'IntegratedGST': billData.igst,
    'integrated_gst': billData.igst,
    
    'SubTotal': billData.subTotal,
    'sub_total': billData.subTotal,
    'Subtotal': billData.subTotal,
    'subtotal': billData.subTotal,
    'SUB_TOTAL': billData.subTotal,
    
    'TotalAmount': billData.totalAmount,
    'total_amount': billData.totalAmount,
    'Total': billData.totalAmount,
    'total': billData.totalAmount,
    'TOTAL_AMOUNT': billData.totalAmount,
    'GrandTotal': billData.totalAmount,
    'grand_total': billData.totalAmount,
    'NetAmount': billData.totalAmount,
    'net_amount': billData.totalAmount,
    'AmountPayable': billData.totalAmount,
    'amount_payable': billData.totalAmount,
    
    'AmountInWords': billData.totalAmountInWords,
    'amount_in_words': billData.totalAmountInWords,
    'TotalInWords': billData.totalAmountInWords,
    'total_in_words': billData.totalAmountInWords,
    'AMOUNT_IN_WORDS': billData.totalAmountInWords,
    
    // Payment Information
    'PaymentStatus': billData.paymentStatus,
    'payment_status': billData.paymentStatus,
    'Status': billData.paymentStatus,
    'status': billData.paymentStatus,
    'PAYMENT_STATUS': billData.paymentStatus,
    
    'PaymentMode': billData.paymentMode,
    'payment_mode': billData.paymentMode,
    'PaymentMethod': billData.paymentMode,
    'payment_method': billData.paymentMode,
    'PAYMENT_MODE': billData.paymentMode,
    
    'TransactionID': billData.transactionId,
    'transaction_id': billData.transactionId,
    'TransactionNo': billData.transactionId,
    'transaction_no': billData.transactionId,
    'TRANSACTION_ID': billData.transactionId,
    'PaymentID': billData.transactionId,
    'payment_id': billData.transactionId,
    
    'TransactionDate': billData.transactionDate,
    'transaction_date': billData.transactionDate,
    'PaymentDate': billData.transactionDate,
    'payment_date': billData.transactionDate,
    'TRANSACTION_DATE': billData.transactionDate,
    
    // Additional Details
    'TariffRate': billData.tariffRate,
    'tariff_rate': billData.tariffRate,
    'Rate': billData.tariffRate,
    'rate': billData.tariffRate,
    'TARIFF_RATE': billData.tariffRate,
    
    'TariffCategory': billData.tariffCategory,
    'tariff_category': billData.tariffCategory,
    'Category': billData.tariffCategory,
    'category': billData.tariffCategory,
    'TARIFF_CATEGORY': billData.tariffCategory,
    
    'ConnectionType': billData.connectionType,
    'connection_type': billData.connectionType,
    'ConnectionCategory': billData.connectionType,
    'connection_category': billData.connectionType,
    'CONNECTION_TYPE': billData.connectionType,
    
    'SanctionedLoad': billData.sanctionedLoad,
    'sanctioned_load': billData.sanctionedLoad,
    'Load': billData.sanctionedLoad,
    'load': billData.sanctionedLoad,
    'SANCTIONED_LOAD': billData.sanctionedLoad,
    
    'OutstandingAmount': billData.outstandingAmount,
    'outstanding_amount': billData.outstandingAmount,
    'Outstanding': billData.outstandingAmount,
    'outstanding': billData.outstandingAmount,
    'OUTSTANDING_AMOUNT': billData.outstandingAmount,
    'PreviousDues': billData.outstandingAmount,
    'previous_dues': billData.outstandingAmount,
    'TotalOutstanding': billData.outstandingAmount,
    'total_outstanding': billData.outstandingAmount,
    'Dues': billData.outstandingAmount,
    'dues': billData.outstandingAmount,
    
    // Timestamps
    'GeneratedDate': billData.generatedDate,
    'generated_date': billData.generatedDate,
    'PrintDate': billData.generatedDate,
    'print_date': billData.generatedDate,
    
    'GeneratedTime': billData.generatedTime,
    'generated_time': billData.generatedTime,
    'PrintTime': billData.generatedTime,
    'print_time': billData.generatedTime,
    
    // ========== ADDITIONAL WEB PDF COMPATIBILITY FIELDS ==========
    // Statement For
    'Statement For': billData.statementFor,
    'StatementFor': billData.statementFor,
    'statement_for': billData.statementFor,
    'STATEMENT_FOR': billData.statementFor,
    
    // QR Code Data
    'QRCode': billData.qrCodeData,
    'qr_code': billData.qrCodeData,
    'QR_CODE': billData.qrCodeData,
    'QRCodeData': billData.qrCodeData,
    'qr_code_data': billData.qrCodeData,
    
    // Billing Month/Year
    'BillingMonth': String(billData.billingMonth),
    'billing_month': String(billData.billingMonth),
    'BillingYear': String(billData.billingYear),
    'billing_year': String(billData.billingYear),
    'BillMonth': String(billData.billMonth),
    'bill_month': String(billData.billMonth),
    'BillYear': String(billData.billYear),
    'bill_year': String(billData.billYear),
    
    // From/To Dates
    'FromDate': billData.fromDate,
    'from_date': billData.fromDate,
    'FROM_DATE': billData.fromDate,
    'ToDate': billData.toDate,
    'to_date': billData.toDate,
    'TO_DATE': billData.toDate,
    'BillFromDate': billData.fromDate,
    'bill_from_date': billData.fromDate,
    'BillToDate': billData.toDate,
    'bill_to_date': billData.toDate,
    
    // Additional reading variations
    'LastReading': billData.previousReading,
    'last_reading': billData.previousReading,
    'InitialReading': billData.previousReading,
    'initial_reading': billData.previousReading,
    'MeterReading': billData.currentReading,
    'meter_reading': billData.currentReading,
    'FinalReading': billData.currentReading,
    'final_reading': billData.currentReading,
    
    // Additional amount variations
    'PayableAmount': billData.totalAmountPayable,
    'payable_amount': billData.totalAmountPayable,
    
    // Additional status variations
    'BillStatus': billData.paymentStatus,
    'bill_status': billData.paymentStatus,
    'InvoiceStatus': billData.paymentStatus,
    'invoice_status': billData.paymentStatus,
    
    // Additional fields from TypeScript implementation
    'gst': billData.gst || 'N/A',
    'GST': billData.gst || 'N/A',
    'qr_code_link': billData.qrCodeLink || billData.qrCodeData || '',
    'customer_address_line2': billData.originalPaymentData?.customer_address_line2 || '',
    'customer_pincode_state': billData.originalPaymentData?.customer_address_line2 || '',
    'BillingType': billData.billType,
    'BillType': billData.billType,
    'StatementType': billData.statementFor,
    
    // Additional transaction variations
    'TransactionNo': billData.transactionId,
    'transaction_no': billData.transactionId,
    'PaymentTransactionId': billData.transactionId,
    'payment_transaction_id': billData.transactionId,
    
    // Additional rate variations
    'PerUnitRate': billData.tariffRate,
    'per_unit_rate': billData.tariffRate,
    'UnitRate': billData.unitRate,
    'unit_rate': billData.unitRate,
    
    // Additional load variations
    'SanctionedCapacity': billData.sanctionedLoad,
    'sanctioned_capacity': billData.sanctionedLoad,
    
    // Additional account variations
    'AccountNumber': billData.consumerNumber,
    'account_number': billData.consumerNumber,
    'AccountNo': billData.consumerNumber,
    'account_no': billData.consumerNumber,
    
    // Additional name variations
    'CustomerFullName': billData.customerNameWithPrefix,
    'customer_full_name': billData.customerNameWithPrefix,
    'FullName': billData.customerNameWithPrefix,
    'full_name': billData.customerNameWithPrefix,
    
    // Additional address variations
    'FullAddress': billData.address,
    'full_address': billData.address,
    'BillingAddress': billData.address,
    'billing_address': billData.address,
    
    // Additional contact variations
    'PhoneNumber': billData.contactNo,
    'phone_number': billData.contactNo,
    'MobileNumber': billData.contactNo,
    'mobile_number': billData.contactNo,
  };
};

/**
 * 🔄 FALLBACK: HTML-based PDF Generation
 * Used when PDF template loading fails
 */
const generateHTMLPDF = async (billData) => {
  try {
    console.log('📄 Using HTML fallback for PDF generation...');
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice - ${billData.billNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background: #f5f5f5; }
          .total { font-weight: bold; background: #e8f5e9; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>ENERGY INVOICE</h1>
          <p>${billData.companyName}</p>
        </div>
        <div class="content">
          <h2>Bill To:</h2>
          <p><strong>Consumer:</strong> ${billData.consumerName}</p>
          <p><strong>Consumer ID:</strong> ${billData.consumerId}</p>
          <p><strong>Meter No:</strong> ${billData.meterSerialNumber}</p>
          
          <h2>Invoice Details:</h2>
          <p><strong>Invoice No:</strong> ${billData.billNumber}</p>
          <p><strong>Date:</strong> ${billData.billDate}</p>
          <p><strong>Status:</strong> ${billData.paymentStatus}</p>
          
          <h2>Meter Readings:</h2>
          <table>
            <tr><th>Description</th><th>Value</th></tr>
            <tr><td>Previous Reading</td><td>${billData.previousReading} kWh</td></tr>
            <tr><td>Current Reading</td><td>${billData.currentReading} kWh</td></tr>
            <tr><td>Units Consumed</td><td>${billData.unitsConsumed} kWh</td></tr>
          </table>
          
          <h2>Billing Details:</h2>
          <table>
            <tr><th>Description</th><th>Amount (₹)</th></tr>
            <tr><td>Energy Charges</td><td>₹${billData.energyCharges}</td></tr>
            <tr><td>Fixed Charges</td><td>₹${billData.fixedCharges}</td></tr>
            <tr><td>Tax</td><td>₹${billData.taxAmount}</td></tr>
            <tr class="total"><td><strong>Total Amount</strong></td><td><strong>₹${billData.totalAmount}</strong></td></tr>
          </table>
        </div>
      </body>
      </html>
    `;
    
    const { uri } = await Print.printToFileAsync({ html });
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    // Convert base64 to Uint8Array
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Clean up temporary file
    await FileSystem.deleteAsync(uri, { idempotent: true });
    
    return {
      bytes,
      filledFieldsCount: 0,
      success: true,
      method: 'html'
    };
  } catch (error) {
    console.error('❌ HTML fallback also failed:', error);
    throw error;
  }
};

/**
 * 3️⃣ fillPDFForm() - MAIN PDF FORM FILLING FUNCTION
 * 
 * Loads PDF template and fills it with invoice data
 * Falls back to HTML generation if PDF template fails
 */
export const fillPDFForm = async (billData) => {
  try {
    console.log('📝 Starting PDF form filling process...');
    
    // Step 1: Try to load the PDF template
    try {
      const pdfBytes = await loadPDFTemplate();
      console.log('✅ PDF template loaded, size:', pdfBytes.length, 'bytes');
      
      // Step 2: Load PDF document
      const pdfDoc = await PDFDocument.load(pdfBytes);
      console.log('✅ PDF document parsed successfully');
      
      // Step 3: Get the form
      const form = pdfDoc.getForm();
      
      // Set NeedAppearances flag for better Acrobat compatibility
      try {
        const acroForm = pdfDoc.catalog.lookup(pdfDoc.context.obj({ Type: 'AcroForm' }));
        if (acroForm) {
          acroForm.set(pdfDoc.context.obj({ NeedAppearances: true }));
        }
      } catch (error) {
        console.warn('Could not set NeedAppearances flag:', error.message);
      }
      
      // Step 4: Create field mappings
      const fieldMappings = createFieldMappings(billData);
      
      // Debug: Log LAST MONTH section field mappings
      console.log('📋 LAST MONTH Section Field Mappings:');
      console.log('  Final Reading:', fieldMappings['Final Reading'] || fieldMappings['Final Reading:'] || 'NOT FOUND');
      console.log('  Consumption:', fieldMappings['Consumption'] || fieldMappings['Consumption:'] || 'NOT FOUND');
      console.log('  final_reading:', fieldMappings['final_reading'] || 'NOT FOUND');
      console.log('  consumption:', fieldMappings['consumption'] || 'NOT FOUND');
      
      // Step 5: Fill all form fields
      let filledCount = 0;
      let failedCount = 0;
      
      // CRITICAL: Try to fill Final Reading and Consumption with ALL possible field name variations
      // This ensures we find the correct PDF field names even if they don't match exactly
      const tryFillReadingField = (fieldNames, value) => {
        if (!value || value === '0') return false;
        const sanitized = sanitizeTextForPDF(String(value), true); // preserve format
        const valueToSet = sanitized || String(value) || '0';
        
        for (const fieldName of fieldNames) {
          try {
            const field = form.getField(fieldName);
            if (field instanceof PDFTextField) {
              field.setText(valueToSet);
              console.log(`✅ Filled Final Reading/Consumption: ${fieldName} = "${valueToSet}"`);
              return true;
            } else if (field && typeof field.setText === 'function') {
              field.setText(valueToSet);
              console.log(`✅ Filled Final Reading/Consumption (non-textfield): ${fieldName} = "${valueToSet}"`);
              return true;
            }
          } catch (error) {
            // Field doesn't exist, try next variation
            continue;
          }
        }
        return false;
      };
      
      // Try to fill Final Reading with all possible field name variations
      const finalReadingValue = billData.lastMonthFinalReading || billData.finalReading || billData.final_reading || billData.originalPaymentData?.final_reading || '0';
      if (finalReadingValue && finalReadingValue !== '0') {
        const finalReadingFields = [
          'Final Reading', 'Final Reading:', 'FinalReading', 'final_reading', 'FINAL_READING',
          'LastMonthFinalReading', 'last_month_final_reading', 'Final_Reading', 'finalReading',
          'FinalReading:', 'Final Reading ', 'Final_Reading:', 'FINAL READING'
        ];
        if (tryFillReadingField(finalReadingFields, finalReadingValue)) {
          filledCount++;
        }
      }
      
      // Try to fill Consumption with all possible field name variations
      const consumptionValue = billData.lastMonthConsumption || billData.consumption || billData.originalPaymentData?.consumption || '0';
      if (consumptionValue && consumptionValue !== '0') {
        const consumptionFields = [
          'Consumption', 'Consumption:', 'consumption', 'CONSUMPTION',
          'LastMonthConsumption', 'last_month_consumption', 'Consumption ', 'Consumption_',
          'Consumption:', 'CONSUMPTION:', 'consumption:', 'Last Month Consumption'
        ];
        if (tryFillReadingField(consumptionFields, consumptionValue)) {
          filledCount++;
        }
      }
      
      // Fill standard fields - TRY TO FILL ALL FIELDS, even if value seems empty
      for (const [fieldName, value] of Object.entries(fieldMappings)) {
        // Only skip if value is truly null or undefined
        // Allow empty strings, '0', 'N/A' as they might be valid for some fields
        if (value === null || value === undefined) {
          continue; // Skip only null/undefined
        }
        
        // Convert value to string for filling
        const stringValue = String(value);
        
        // Skip if value is 'N/A' for email, contact, or address fields
        if (stringValue === 'N/A' && (
          fieldName.includes('email') || 
          fieldName.includes('contact') || 
          fieldName.includes('address') ||
          fieldName.includes('customer_email') ||
          fieldName.includes('customer_contact') ||
          fieldName.includes('customer_address')
        )) {
          continue; // Skip 'N/A' for these fields - they should be empty if not available
        }
        
        // For Final Reading and Consumption fields, preserve format (including units)
        const isReadingField = fieldName.toLowerCase().includes('reading') || 
                               fieldName.toLowerCase().includes('final') ||
                               fieldName.toLowerCase().includes('consumption') ||
                               fieldName.toLowerCase().includes('prev_reading') ||
                               fieldName.toLowerCase().includes('final_reading');
        
        // Sanitize value for PDF - preserve format for readings
        const sanitizedValue = sanitizeTextForPDF(stringValue, isReadingField);
        
        // For reading fields, NEVER skip even if value seems empty - always try to fill
        // This ensures "0" or empty strings are still displayed
        if (!isReadingField) {
          // Skip if sanitized value is empty (but allow "0") for non-reading fields
          if (!sanitizedValue && sanitizedValue !== "0") {
            continue;
          }
        } else {
          // For reading fields, use original value if sanitized is empty
          const valueToUse = sanitizedValue || stringValue || '0';
          if (!valueToUse && valueToUse !== "0") {
            continue;
          }
        }
        
        try {
          const field = form.getField(fieldName);
          
          if (field instanceof PDFTextField) {
            // Use sanitized value for non-reading fields, original for reading fields
            const valueToSet = isReadingField ? (sanitizedValue || stringValue || '0') : sanitizedValue;
            
            // CRITICAL: For Final Reading and Consumption, ensure we have a value
            if (isReadingField && (!valueToSet || valueToSet === '')) {
              console.warn(`⚠️ Empty value for reading field: ${fieldName}, trying original value: "${stringValue}"`);
              // Try to use original value if sanitized is empty
              const fallbackValue = stringValue || '0';
              field.setText(fallbackValue);
              filledCount++;
              console.log(`✅ Filled Reading/Consumption (fallback): ${fieldName} = "${fallbackValue}"`);
            } else {
              field.setText(valueToSet);
              filledCount++;
              // Log Final Reading and Consumption specifically for debugging
              if (isReadingField) {
                console.log(`✅ Filled Reading/Consumption: ${fieldName} = "${valueToSet}" (original: "${stringValue}", sanitized: "${sanitizedValue}")`);
              } else if (__DEV__) {
                console.log(`✅ Filled: ${fieldName} = ${sanitizedValue}`);
              }
            }
          } else if (field) {
            // Try to set text even for non-PDFTextField (some fields might accept text)
            try {
              if (typeof field.setText === 'function') {
                field.setText(sanitizedValue);
                filledCount++;
                if (__DEV__) {
                  console.log(`✅ Filled (non-textfield): ${fieldName} = ${sanitizedValue}`);
                }
              }
            } catch (setError) {
              if (__DEV__) {
                console.log(`⚠️ Unsupported field type: ${fieldName} (${field.constructor.name})`);
              }
            }
          }
        } catch (error) {
          failedCount++;
          // Field doesn't exist - this is normal, we try many variations
          // Only log if in development
          if (__DEV__) {
            console.log(`⚠️ Field not found: ${fieldName}`);
          }
        }
      }
      
      // Step 5b: Fill Meter Services table dynamically
      // Handle multiple service rows if the PDF has array fields
      if (billData.meterServices && Array.isArray(billData.meterServices)) {
        billData.meterServices.forEach((service, index) => {
          const serviceFields = {
            [`ServiceType${index}`]: service.serviceType,
            [`ServiceType_${index}`]: service.serviceType,
            [`PreviousReadings${index}`]: service.previousReadings,
            [`PreviousReadings_${index}`]: service.previousReadings,
            [`FinalReadings${index}`]: service.finalReadings,
            [`FinalReadings_${index}`]: service.finalReadings,
            [`Consumption${index}`]: service.consumption,
            [`Consumption_${index}`]: service.consumption,
            [`UnitRate${index}`]: service.unitRate,
            [`UnitRate_${index}`]: service.unitRate,
            [`Amount${index}`]: service.amount,
            [`Amount_${index}`]: service.amount,
          };
          
          // Also try without index for first service
          if (index === 0) {
            Object.assign(serviceFields, {
              'ServiceType': service.serviceType,
              'PreviousReadings': service.previousReadings,
              'FinalReadings': service.finalReadings,
              'Consumption': service.consumption,
              'UnitRate': service.unitRate,
              'Amount': service.amount,
            });
          }
          
          for (const [fieldName, value] of Object.entries(serviceFields)) {
            // Only skip if value is truly null, undefined, or "N/A"
            if (value === null || value === undefined || value === "N/A") {
              continue;
            }
            
            // Sanitize value for PDF
            const stringValue = String(value);
            const sanitizedValue = sanitizeTextForPDF(stringValue);
            
            // Skip if sanitized value is empty
            if (!sanitizedValue && sanitizedValue !== "0") {
              continue;
            }
            
            try {
              const field = form.getField(fieldName);
              if (field instanceof PDFTextField) {
                field.setText(sanitizedValue);
                filledCount++;
                if (__DEV__) {
                  console.log(`✅ Filled service field: ${fieldName} = ${sanitizedValue}`);
                }
              } else if (field) {
                // Try to set text even for non-PDFTextField
                try {
                  if (typeof field.setText === 'function') {
                    field.setText(sanitizedValue);
                    filledCount++;
                    if (__DEV__) {
                      console.log(`✅ Filled service field (non-textfield): ${fieldName} = ${sanitizedValue}`);
                    }
                  }
                } catch (setError) {
                  // Field type doesn't support setText
                }
              }
            } catch (error) {
              // Field doesn't exist - continue
            }
          }
        });
      }
      
      console.log(`✅ Form filling complete: ${filledCount} fields filled, ${failedCount} fields not found`);
      
      // Step 6: Save the filled PDF
      const filledPdfBytes = await pdfDoc.save();
      console.log('✅ PDF saved, size:', filledPdfBytes.length, 'bytes');
      
      return {
        bytes: filledPdfBytes,
        filledFieldsCount: filledCount,
        success: true,
        method: 'pdf'
      };
    } catch (pdfError) {
      console.warn('⚠️ PDF template method failed, using HTML fallback:', pdfError.message);
      return await generateHTMLPDF(billData);
    }
  } catch (error) {
    console.error('❌ Error filling PDF form:', error);
    throw new Error(`PDF form filling failed: ${error.message}`);
  }
};

/**
 * 2️⃣ openFilledPDF() - PREVIEW PDF
 * 
 * Saves filled PDF to device and opens it for preview (without sharing)
 */
export const openFilledPDF = async (billData, options = {}) => {
  const { previewOnly = true } = options;
  
  try {
    console.log('📄 Generating filled PDF...');
    
    // Step 1: Fill the PDF form
    const { bytes } = await fillPDFForm(billData);
    
    // Step 2: Create temporary file path
    const fileName = `Invoice_${billData.billNumber}_${Date.now()}.pdf`;
    const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
    
    // Step 3: Convert bytes to base64
    const base64 = btoa(
      new Uint8Array(bytes).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    
    // Step 4: Write to file
    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    console.log('✅ PDF file created:', fileUri);
    
    if (previewOnly) {
      // Step 5: Open PDF in system viewer (View action) — not the share sheet
      try {
        if (Platform.OS === 'android') {
          // Android: Open in default PDF viewer via VIEW intent with content URI
          const contentUri = await FileSystem.getContentUriAsync(fileUri);
          await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: contentUri,
            type: 'application/pdf',
            flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
          });
          console.log('✅ PDF opened in viewer (Android)');
        } else {
          // iOS: Share sheet is the standard way to "view" (user can pick Quick Look / Open in)
          const isSharingAvailable = await Sharing.isAvailableAsync();
          if (isSharingAvailable) {
            await Sharing.shareAsync(fileUri, {
              mimeType: 'application/pdf',
              dialogTitle: `View invoice - ${billData.billNumber}`,
              UTI: 'com.adobe.pdf'
            });
            console.log('✅ PDF opened for viewing (iOS)');
          } else {
            throw new Error('Sharing not available');
          }
        }
      } catch (previewError) {
        console.warn('Open in viewer failed, falling back to share:', previewError);
        const isSharingAvailable = await Sharing.isAvailableAsync();
        if (isSharingAvailable) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/pdf',
            dialogTitle: `Invoice - ${billData.billNumber}`,
            UTI: 'com.adobe.pdf'
          });
          console.log('✅ PDF opened via sharing (fallback)');
        } else {
          Alert.alert(
            'PDF Generated',
            `Invoice saved at: ${fileUri}\n\nYou can find it in your device's file manager.`,
            [{ text: 'OK' }]
          );
        }
      }
    } else {
      // Original sharing behavior
      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Invoice - ${billData.billNumber}`,
          UTI: 'com.adobe.pdf'
        });
        console.log('✅ PDF opened via sharing');
      } else {
        Alert.alert(
          'PDF Generated',
          `Invoice saved at: ${fileUri}\n\nYou can find it in your device's file manager.`,
          [{ text: 'OK' }]
        );
      }
    }
    
    // Step 6: Clean up after 30 seconds (longer for preview)
    setTimeout(async () => {
      try {
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
        console.log('🧹 Cleaned up temporary PDF file');
      } catch (cleanupError) {
        console.warn('Failed to cleanup PDF:', cleanupError);
      }
    }, 30000);
    
    return { success: true, uri: fileUri };
  } catch (error) {
    console.error('❌ Error opening filled PDF:', error);
    throw error;
  }
};

/**
 * Returns the filled PDF as base64 for in-app viewer (no share sheet).
 * Use this when you want to display the invoice inside the app (e.g. WebView).
 */
export const getFilledPDFBase64 = async (payment, consumerData) => {
  const billData = createBillData(payment, consumerData);
  const { bytes } = await fillPDFForm(billData);
  const base64 = btoa(
    new Uint8Array(bytes).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );
  return { base64, billNumber: billData.billNumber };
};

/**
 * 1️⃣ handleViewBill() - MAIN ENTRY POINT
 * 
 * Triggered when user clicks invoice row.
 * If options.openInAppViewer is true, returns { base64 } for caller to show in WebView; otherwise opens viewer or share.
 */
export const handleViewBill = async (payment, consumerData, options = {}) => {
  try {
    console.log('📄 Generating invoice PDF for transaction:', payment?.transactionId);
    
    const billData = createBillData(payment, consumerData);
    
    if (options.openInAppViewer) {
      const { bytes } = await fillPDFForm(billData);
      const base64 = btoa(
        new Uint8Array(bytes).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      return { success: true, base64, billNumber: billData.billNumber };
    }
    
    await openFilledPDF(billData, { previewOnly: true, ...options });
    return { success: true };
  } catch (error) {
    console.error('❌ Error viewing bill:', error);
    Alert.alert(
      'Error',
      'Failed to generate invoice. Please try again.\n\nError: ' + error.message,
      [{ text: 'OK' }]
    );
    return { success: false, error: error.message };
  }
};

/**
 * 🔧 UTILITY: Download/Save PDF Permanently
 */
export const downloadInvoicePDF = async (payment, consumerData) => {
  try {
    const billData = createBillData(payment, consumerData);
    const { bytes } = await fillPDFForm(billData);
    
    const fileName = `Invoice_${billData.billNumber}.pdf`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;
    
    const base64 = btoa(
      new Uint8Array(bytes).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    
    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    Alert.alert(
      'Success',
      `Invoice saved to: ${fileUri}`,
      [{ text: 'OK' }]
    );
    
    return { success: true, uri: fileUri };
  } catch (error) {
    console.error('❌ Error downloading invoice:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 🔧 DIAGNOSTIC: Log PDF generation info
 */
export const logDiagnostics = (billData) => {
  console.log('🔍 Invoice PDF Generation Diagnostics:');
  console.log('  Bill Number:', billData.billNumber);
  console.log('  Consumer:', billData.consumerName);
  console.log('  Amount:', billData.totalAmount);
  console.log('  Status:', billData.paymentStatus);
  console.log('  Platform:', Platform.OS);
  console.log('  Date:', billData.billDate);
};

export default {
  handleViewBill,
  openFilledPDF,
  fillPDFForm,
  createBillData,
  inspectPDFFields,
  downloadInvoicePDF,
  logDiagnostics
};
