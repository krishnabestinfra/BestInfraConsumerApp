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
import { Platform, Alert } from 'react-native';

/**
 * BillData Interface - Complete invoice data structure
 */
export const createBillData = (payment, consumerData) => {
  return {
    // Company Information
    companyName: consumerData?.companyName || 'BestInfra Energy',
    companyAddress: consumerData?.companyAddress || 'Energy Solutions Provider',
    companyPhone: consumerData?.companyPhone || '+91-1234567890',
    companyEmail: consumerData?.companyEmail || 'support@bestinfra.com',
    companyGSTIN: consumerData?.companyGSTIN || 'N/A',
    
    // Consumer Information
    consumerName: consumerData?.name || consumerData?.consumerName || 'Consumer',
    consumerId: consumerData?.identifier || consumerData?.consumerNumber || 'N/A',
    consumerNumber: consumerData?.consumerNumber || consumerData?.identifier || 'N/A',
    consumerAddress: consumerData?.address || 'N/A',
    meterSerialNumber: consumerData?.meterSerialNumber || 'N/A',
    meterNumber: consumerData?.meterSerialNumber || 'N/A',
    
    // Bill Details
    billNumber: payment.transactionId || payment.billNumber || `INV-${Date.now()}`,
    invoiceNumber: payment.transactionId || payment.billNumber || `INV-${Date.now()}`,
    billDate: payment.paymentDate || payment.billDate || new Date().toLocaleDateString('en-IN'),
    invoiceDate: payment.paymentDate || payment.billDate || new Date().toLocaleDateString('en-IN'),
    dueDate: payment.dueDate || calculateDueDate(payment.paymentDate || payment.billDate),
    billingPeriod: payment.billingPeriod || 'Monthly',
    billingMonth: payment.billingMonth || new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    
    // Meter Readings
    previousReading: String(payment.previousReading || consumerData?.previousReading || 0),
    currentReading: String(payment.currentReading || consumerData?.currentReading || 0),
    unitsConsumed: String(payment.unitsConsumed || consumerData?.unitsConsumed || 0),
    readingDate: payment.readingDate || new Date().toLocaleDateString('en-IN'),
    
    // Charges & Amounts
    energyCharges: String(payment.energyCharges || 0),
    fixedCharges: String(payment.fixedCharges || 0),
    demandCharges: String(payment.demandCharges || 0),
    powerFactorCharges: String(payment.powerFactorCharges || 0),
    electricityDuty: String(payment.electricityDuty || 0),
    taxAmount: String(payment.taxAmount || 0),
    cgst: String(payment.cgst || 0),
    sgst: String(payment.sgst || 0),
    igst: String(payment.igst || 0),
    subTotal: String(calculateSubTotal(payment)),
    totalAmount: String(payment.creditAmount || payment.totalAmount || 0),
    totalAmountInWords: numberToWords(payment.creditAmount || payment.totalAmount || 0),
    
    // Payment Information
    paymentStatus: payment.creditAmount > 0 ? 'Paid' : 'Pending',
    paymentMode: payment.paymentMode || 'N/A',
    transactionId: payment.transactionId || 'N/A',
    transactionDate: payment.paymentDate || 'N/A',
    
    // Additional Details
    tariffRate: String(consumerData?.tariffRate || 0),
    tariffCategory: consumerData?.tariffCategory || 'Domestic',
    connectionType: consumerData?.connectionType || 'Domestic',
    sanctionedLoad: String(consumerData?.sanctionedLoad || 0),
    outstandingAmount: String(consumerData?.totalOutstanding || 0),
    
    // Timestamps
    generatedDate: new Date().toLocaleDateString('en-IN'),
    generatedTime: new Date().toLocaleTimeString('en-IN'),
  };
};

/**
 * Helper: Calculate due date (30 days from bill date)
 */
const calculateDueDate = (billDate) => {
  if (!billDate) return 'N/A';
  try {
    const date = new Date(billDate);
    date.setDate(date.getDate() + 30);
    return date.toLocaleDateString('en-IN');
  } catch (error) {
    return 'N/A';
  }
};

/**
 * Helper: Calculate subtotal
 */
const calculateSubTotal = (payment) => {
  const energy = Number(payment.energyCharges || 0);
  const fixed = Number(payment.fixedCharges || 0);
  const demand = Number(payment.demandCharges || 0);
  const powerFactor = Number(payment.powerFactorCharges || 0);
  return energy + fixed + demand + powerFactor;
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
 */
const loadPDFTemplate = async () => {
  try {
    console.log('📄 Loading PDF template from assets...');
    
    // Method 1: Try loading from expo-asset
    try {
      const asset = Asset.fromModule(require('../../assets/Invoice.pdf'));
      await asset.downloadAsync();
      
      console.log('✅ Asset loaded:', asset.localUri);
      
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
      
      console.log('✅ PDF template loaded successfully');
      return bytes;
    } catch (assetError) {
      console.log('⚠️ Asset method failed, trying bundle method...');
      
      // Method 2: Try reading from bundle
      try {
        const bundlePath = Asset.fromModule(require('../../assets/Invoice.pdf')).uri;
        const response = await fetch(bundlePath);
        const arrayBuffer = await response.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        
        console.log('✅ PDF template loaded from bundle');
        return bytes;
      } catch (bundleError) {
        console.error('❌ Bundle method also failed:', bundleError);
        throw new Error('Could not load Invoice.pdf template. Please ensure it exists in assets/ and is properly bundled.');
      }
    }
  } catch (error) {
    console.error('❌ Error loading PDF template:', error);
    throw new Error('Could not load Invoice.pdf template. Please ensure it exists in assets/');
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
 * Maps invoice data to PDF form field names (100+ variations supported)
 */
const createFieldMappings = (billData) => {
  return {
    // Company Details - Multiple variations
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
    
    // Consumer/Customer Details
    'ConsumerName': billData.consumerName,
    'consumer_name': billData.consumerName,
    'CustomerName': billData.consumerName,
    'customer_name': billData.consumerName,
    'CONSUMER_NAME': billData.consumerName,
    'Name': billData.consumerName,
    'name': billData.consumerName,
    
    'ConsumerNo': billData.consumerId,
    'consumer_no': billData.consumerId,
    'ConsumerNumber': billData.consumerNumber,
    'consumer_number': billData.consumerNumber,
    'CustomerID': billData.consumerId,
    'customer_id': billData.consumerId,
    'CONSUMER_NO': billData.consumerId,
    'AccountNo': billData.consumerId,
    'account_no': billData.consumerId,
    
    'ConsumerAddress': billData.consumerAddress,
    'consumer_address': billData.consumerAddress,
    'Address': billData.consumerAddress,
    'address': billData.consumerAddress,
    'CONSUMER_ADDRESS': billData.consumerAddress,
    
    'MeterNo': billData.meterSerialNumber,
    'meter_no': billData.meterSerialNumber,
    'MeterNumber': billData.meterNumber,
    'meter_number': billData.meterNumber,
    'MeterSerialNo': billData.meterSerialNumber,
    'meter_serial_no': billData.meterSerialNumber,
    'METER_NO': billData.meterSerialNumber,
    
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
    
    // Timestamps
    'GeneratedDate': billData.generatedDate,
    'generated_date': billData.generatedDate,
    'PrintDate': billData.generatedDate,
    'print_date': billData.generatedDate,
    
    'GeneratedTime': billData.generatedTime,
    'generated_time': billData.generatedTime,
    'PrintTime': billData.generatedTime,
    'print_time': billData.generatedTime,
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
      
      // Step 5: Fill all form fields
      let filledCount = 0;
      let failedCount = 0;
      
      for (const [fieldName, value] of Object.entries(fieldMappings)) {
        if (!value || value === 'N/A' || value === '0' || value === '') {
          continue; // Skip empty values
        }
        
        try {
          const field = form.getField(fieldName);
          
          if (field instanceof PDFTextField) {
            field.setText(String(value));
            filledCount++;
            console.log(`✅ Filled: ${fieldName} = ${value}`);
          } else if (field) {
            // Handle other field types if needed
            console.log(`⚠️ Unsupported field type: ${fieldName}`);
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
 * 2️⃣ openFilledPDF() - OPEN/SHARE PDF
 * 
 * Saves filled PDF to device and opens it for viewing
 */
export const openFilledPDF = async (billData) => {
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
    
    // Step 5: Check if sharing is available
    const isSharingAvailable = await Sharing.isAvailableAsync();
    
    if (isSharingAvailable) {
      // Step 6: Open PDF viewer/share sheet
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Invoice - ${billData.billNumber}`,
        UTI: 'com.adobe.pdf'
      });
      
      console.log('✅ PDF opened successfully');
    } else {
      // Fallback: Show alert with file location
      Alert.alert(
        'PDF Generated',
        `Invoice saved at: ${fileUri}\n\nYou can find it in your device's file manager.`,
        [{ text: 'OK' }]
      );
    }
    
    // Step 7: Clean up after 10 seconds
    setTimeout(async () => {
      try {
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
        console.log('🧹 Cleaned up temporary PDF file');
      } catch (cleanupError) {
        console.warn('Failed to cleanup PDF:', cleanupError);
      }
    }, 10000);
    
    return { success: true, uri: fileUri };
  } catch (error) {
    console.error('❌ Error opening filled PDF:', error);
    throw error;
  }
};

/**
 * 1️⃣ handleViewBill() - MAIN ENTRY POINT
 * 
 * Triggered when user clicks invoice row
 */
export const handleViewBill = async (payment, consumerData) => {
  try {
    console.log('📄 Generating invoice PDF for transaction:', payment?.transactionId);
    
    // Step 1: Create structured bill data
    const billData = createBillData(payment, consumerData);
    
    // Step 2: Generate and open PDF
    await openFilledPDF(billData);
    
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
