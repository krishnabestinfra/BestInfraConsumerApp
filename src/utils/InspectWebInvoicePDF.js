/**
 * Utility to Inspect Web-Generated Invoice PDF
 * 
 * This utility helps identify all fields in the web-generated PDF
 * to ensure mobile app generates invoices with exact same structure
 */

import { PDFDocument } from 'pdf-lib';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

/**
 * Inspect the web-generated invoice PDF to extract all fields
 */
export const inspectWebInvoicePDF = async (pdfPath) => {
  try {
    console.log('🔍 Inspecting web-generated invoice PDF...');
    console.log('📄 PDF Path:', pdfPath);
    
    // Load the PDF
    let pdfBytes;
    
    if (pdfPath.startsWith('file://') || pdfPath.startsWith('/')) {
      // Local file path
      const base64 = await FileSystem.readAsStringAsync(pdfPath, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const binaryString = atob(base64);
      pdfBytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        pdfBytes[i] = binaryString.charCodeAt(i);
      }
    } else {
      // Asset path
      const asset = Asset.fromModule(require(`../../assets/${pdfPath}`));
      await asset.downloadAsync();
      const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const binaryString = atob(base64);
      pdfBytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        pdfBytes[i] = binaryString.charCodeAt(i);
      }
    }
    
    // Load PDF document
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    console.log(`\n✅ Found ${fields.length} form fields in web-generated PDF:\n`);
    console.log('═══════════════════════════════════════');
    
    // Group fields by category
    const fieldCategories = {
      consumer: [],
      bill: [],
      meter: [],
      charges: [],
      payment: [],
      other: []
    };
    
    fields.forEach((field) => {
      const name = field.getName();
      const type = field.constructor.name;
      
      const fieldInfo = { name, type };
      
      // Categorize fields
      const lowerName = name.toLowerCase();
      if (lowerName.includes('consumer') || lowerName.includes('customer') || lowerName.includes('name') || lowerName.includes('address') || lowerName.includes('email') || lowerName.includes('contact')) {
        fieldCategories.consumer.push(fieldInfo);
      } else if (lowerName.includes('bill') || lowerName.includes('invoice') || lowerName.includes('date') || lowerName.includes('period')) {
        fieldCategories.bill.push(fieldInfo);
      } else if (lowerName.includes('meter') || lowerName.includes('reading') || lowerName.includes('consumption') || lowerName.includes('unit')) {
        fieldCategories.meter.push(fieldInfo);
      } else if (lowerName.includes('charge') || lowerName.includes('amount') || lowerName.includes('tax') || lowerName.includes('gst') || lowerName.includes('imc') || lowerName.includes('demand')) {
        fieldCategories.charges.push(fieldInfo);
      } else if (lowerName.includes('payment') || lowerName.includes('transaction') || lowerName.includes('status')) {
        fieldCategories.payment.push(fieldInfo);
      } else {
        fieldCategories.other.push(fieldInfo);
      }
    });
    
    // Print categorized fields
    Object.entries(fieldCategories).forEach(([category, fields]) => {
      if (fields.length > 0) {
        console.log(`\n📋 ${category.toUpperCase()} Fields (${fields.length}):`);
        fields.forEach(f => {
          console.log(`   - ${f.name} (${f.type})`);
        });
      }
    });
    
    console.log('\n═══════════════════════════════════════');
    console.log('\n💡 Field Mapping Suggestions:');
    console.log('═══════════════════════════════════════\n');
    
    // Generate mapping suggestions
    fields.forEach(field => {
      const name = field.getName();
      const lower = name.toLowerCase();
      
      let suggestion = '';
      if (lower.includes('meter') && (lower.includes('sl') || lower.includes('serial'))) {
        suggestion = `'${name}': billData.meterSLNo,`;
      } else if (lower.includes('consumer') && lower.includes('uid')) {
        suggestion = `'${name}': billData.consumerUID,`;
      } else if (lower.includes('bill') && lower.includes('type')) {
        suggestion = `'${name}': billData.billType,`;
      } else if ((lower.includes('bill') || lower.includes('invoice')) && (lower.includes('no') || lower.includes('number'))) {
        suggestion = `'${name}': billData.billNumber,`;
      } else if (lower.includes('customer') || (lower.includes('consumer') && lower.includes('name'))) {
        suggestion = `'${name}': billData.customerNameWithPrefix,`;
      } else if (lower.includes('address') && !lower.includes('company')) {
        suggestion = `'${name}': billData.address,`;
      } else if (lower.includes('email')) {
        suggestion = `'${name}': billData.emailAddress,`;
      } else if (lower.includes('contact') && (lower.includes('no') || lower.includes('number'))) {
        suggestion = `'${name}': billData.contactNo,`;
      } else if (lower.includes('bill') && lower.includes('date')) {
        suggestion = `'${name}': billData.billDate,`;
      } else if (lower.includes('bill') && lower.includes('period')) {
        suggestion = `'${name}': billData.billingPeriod,`;
      } else if (lower.includes('total') && lower.includes('amount') && lower.includes('payable')) {
        suggestion = `'${name}': billData.totalAmountPayable,`;
      } else if (lower.includes('due') && lower.includes('date')) {
        suggestion = `'${name}': billData.dueDate,`;
      } else if (lower.includes('prev') && lower.includes('reading')) {
        suggestion = `'${name}': billData.previousReading,`;
      } else if ((lower.includes('final') || lower.includes('current')) && lower.includes('reading')) {
        suggestion = `'${name}': billData.currentReading,`;
      } else if (lower.includes('consumption') || (lower.includes('unit') && lower.includes('consumed'))) {
        suggestion = `'${name}': billData.unitsConsumed,`;
      } else if (lower.includes('energy') && lower.includes('charge')) {
        suggestion = `'${name}': billData.energyCharges,`;
      } else if (lower.includes('fixed') && lower.includes('charge')) {
        suggestion = `'${name}': billData.fixedCharges,`;
      } else if (lower.includes('imc') && lower.includes('charge')) {
        suggestion = `'${name}': billData.imcCharges,`;
      } else if (lower.includes('demand') && lower.includes('charge')) {
        suggestion = `'${name}': billData.demandCharges,`;
      } else if (lower.includes('total') && lower.includes('amount') && !lower.includes('payable')) {
        suggestion = `'${name}': billData.totalAmount,`;
      } else {
        suggestion = `'${name}': billData./* TODO: Map this field */,`;
      }
      
      console.log(`    ${suggestion}`);
    });
    
    console.log('\n═══════════════════════════════════════');
    console.log('✅ Inspection complete!');
    console.log('\nCopy the field mappings above to InvoicePDFService.js');
    
    return {
      totalFields: fields.length,
      fields: fields.map(f => ({ name: f.getName(), type: f.constructor.name })),
      categories: fieldCategories
    };
  } catch (error) {
    console.error('❌ Error inspecting PDF:', error);
    console.error('Error details:', error.message);
    return null;
  }
};

/**
 * Compare web PDF fields with mobile app field mappings
 */
export const comparePDFFields = async (webPDFPath, mobileFieldMappings) => {
  const webFields = await inspectWebInvoicePDF(webPDFPath);
  
  if (!webFields) {
    console.error('❌ Could not inspect web PDF');
    return;
  }
  
  console.log('\n🔍 Comparing Web PDF vs Mobile App Mappings...');
  console.log('═══════════════════════════════════════\n');
  
  const webFieldNames = webFields.fields.map(f => f.name.toLowerCase());
  const mobileFieldNames = Object.keys(mobileFieldMappings).map(k => k.toLowerCase());
  
  // Find missing fields
  const missingInMobile = webFieldNames.filter(webField => {
    return !mobileFieldNames.some(mobileField => 
      mobileField.includes(webField) || webField.includes(mobileField)
    );
  });
  
  if (missingInMobile.length > 0) {
    console.log('⚠️  Fields in Web PDF but NOT in Mobile App:');
    missingInMobile.forEach(field => {
      console.log(`   - ${field}`);
    });
  } else {
    console.log('✅ All web PDF fields are mapped in mobile app!');
  }
  
  return {
    missingFields: missingInMobile,
    totalWebFields: webFields.totalFields,
    totalMobileMappings: mobileFieldNames.length
  };
};

export default {
  inspectWebInvoicePDF,
  comparePDFFields
};

