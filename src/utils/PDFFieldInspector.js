/**
 * PDF Field Inspector Utility
 * 
 * Use this to discover field names in your Invoice.pdf template
 * Run this once to see all available form fields
 */

import { inspectPDFFields } from '../services/InvoicePDFService';

/**
 * Run this function to inspect all fields in Invoice.pdf
 * 
 * Usage:
 * import { runPDFInspection } from './utils/PDFFieldInspector';
 * await runPDFInspection();
 */
export const runPDFInspection = async () => {
  try {
    console.log('🔍 Starting PDF Field Inspection...');
    console.log('═══════════════════════════════════════');
    
    const fields = await inspectPDFFields();
    
    if (fields.length === 0) {
      console.log('⚠️  No form fields found in PDF');
      console.log('This might mean:');
      console.log('  1. The PDF is not a fillable form');
      console.log('  2. The PDF has no interactive fields');
      console.log('  3. Fields are flattened (not editable)');
      return;
    }
    
    console.log(`✅ Found ${fields.length} form fields:\n`);
    
    // Group fields by type
    const fieldsByType = fields.reduce((acc, field) => {
      const type = field.type || 'Unknown';
      if (!acc[type]) acc[type] = [];
      acc[type].push(field.name);
      return acc;
    }, {});
    
    // Print organized by type
    Object.entries(fieldsByType).forEach(([type, names]) => {
      console.log(`\n📋 ${type} (${names.length} fields):`);
      names.forEach(name => console.log(`   - ${name}`));
    });
    
    console.log('\n═══════════════════════════════════════');
    console.log('✅ Inspection complete!');
    console.log('\nNow update the field mappings in InvoicePDFService.js');
    console.log('to match these exact field names.');
    
    return fields;
  } catch (error) {
    console.error('❌ PDF Inspection Failed:', error);
    console.error('Error details:', error.message);
    return null;
  }
};

/**
 * Quick field name suggestions based on common patterns
 */
export const suggestFieldMappings = (fields) => {
  if (!fields || fields.length === 0) return;
  
  console.log('\n💡 Suggested Field Mappings:');
  console.log('═══════════════════════════════════════\n');
  
  fields.forEach(field => {
    const name = field.name;
    const lower = name.toLowerCase();
    
    // Suggest mappings based on field name patterns
    if (lower.includes('name') && lower.includes('consumer')) {
      console.log(`'${name}': billData.consumerName,`);
    } else if (lower.includes('name') && lower.includes('customer')) {
      console.log(`'${name}': billData.consumerName,`);
    } else if (lower.includes('invoice') && lower.includes('no')) {
      console.log(`'${name}': billData.billNumber,`);
    } else if (lower.includes('bill') && lower.includes('no')) {
      console.log(`'${name}': billData.billNumber,`);
    } else if (lower.includes('date')) {
      console.log(`'${name}': billData.billDate,`);
    } else if (lower.includes('amount') || lower.includes('total')) {
      console.log(`'${name}': billData.totalAmount,`);
    } else if (lower.includes('reading') && lower.includes('prev')) {
      console.log(`'${name}': billData.previousReading,`);
    } else if (lower.includes('reading') && lower.includes('current')) {
      console.log(`'${name}': billData.currentReading,`);
    } else if (lower.includes('unit') || lower.includes('consumption')) {
      console.log(`'${name}': billData.unitsConsumed,`);
    } else {
      console.log(`'${name}': billData./* FILL THIS */,`);
    }
  });
  
  console.log('\n═══════════════════════════════════════');
};

export default {
  runPDFInspection,
  suggestFieldMappings
};

