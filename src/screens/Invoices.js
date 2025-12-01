import { StyleSheet, Text, View, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import React, { useState, useEffect, useCallback } from "react";
import { COLORS } from "../constants/colors";
import Table from "../components/global/Table";
import { getUser, getToken } from "../utils/storage";
import { API_ENDPOINTS } from "../constants/constants";
import { 
  getCachedConsumerData, 
  syncConsumerData,
  fetchBillingHistory
} from "../services/apiService";
import DashboardHeader from "../components/global/DashboardHeader";
import DownloadButton from "../components/global/DownloadButton";
import { handleViewBill } from "../services/InvoicePDFService";
import { authService } from "../services/authService";
import { apiClient } from "../services/apiClient";

const formatDateDisplay = (dateString) => {
  if (!dateString) return 'N/A';
  const parsedDate = new Date(dateString);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'N/A';
  }
  return parsedDate.toLocaleDateString('en-IN');
};

const formatBillingMonth = (month, year) => {
  if (!month || !year) return 'N/A';
  return `${month}/${year}`;
};

const formatCurrencyINR = (value) => {
  if (value === undefined || value === null) {
    return '₹0.00';
  }
  const amount = Number(value);
  if (Number.isNaN(amount)) {
    return '₹0.00';
  }
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatUnits = (value) => {
  if (value === undefined || value === null) {
    return 'N/A';
  }
  const units = Number(value);
  if (Number.isNaN(units)) {
    return 'N/A';
  }
  return units.toLocaleString('en-IN');
};

const normalizeBillingData = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.records)) return data.records;
  if (Array.isArray(data.rows)) return data.rows;
  if (Array.isArray(data.bills)) return data.bills;
  if (Array.isArray(data.data)) return data.data;
  return [data];
};

const getInvoiceDateValue = (invoice) => {
  if (!invoice) return 0;
  const time = new Date(invoice.fromDate || invoice.createdAt || 0).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const mapInvoiceForPDF = (invoice) => {
  const taxes = invoice?.taxes || {};
  
  // Format dates for PDF
  const formatDateForPDF = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateString || '';
    }
  };
  
  // Extract ALL possible fields to ensure nothing is missing
  return {
    // Spread all original invoice data first (ensures nothing is lost)
    ...invoice,
    
    // ========== BASIC INVOICE FIELDS (ALL VARIATIONS) ==========
    transactionId: invoice?.billNumber || invoice?.transactionId || invoice?.id?.toString() || 'N/A',
    billNumber: invoice?.billNumber || invoice?.invoiceNumber || invoice?.billNo || invoice?.id?.toString(),
    invoiceNumber: invoice?.billNumber || invoice?.invoiceNumber || invoice?.invoiceNo || invoice?.id?.toString(),
    billNo: invoice?.billNumber || invoice?.billNo || invoice?.id?.toString(),
    invoiceNo: invoice?.invoiceNumber || invoice?.invoiceNo || invoice?.billNumber,
    
    // ========== DATES (ALL VARIATIONS) ==========
    billDate: formatDateForPDF(invoice?.fromDate || invoice?.billDate || invoice?.invoiceDate),
    invoiceDate: formatDateForPDF(invoice?.createdAt || invoice?.fromDate || invoice?.billDate || invoice?.invoiceDate),
    paymentDate: formatDateForPDF(invoice?.createdAt || invoice?.updatedAt || invoice?.fromDate || invoice?.paymentDate),
    transactionDate: formatDateForPDF(invoice?.paymentDate || invoice?.transactionDate || invoice?.createdAt),
    dueDate: formatDateForPDF(invoice?.dueDate),
    fromDate: formatDateForPDF(invoice?.fromDate),
    toDate: formatDateForPDF(invoice?.toDate),
    readingDate: formatDateForPDF(invoice?.readingDate || invoice?.fromDate || invoice?.billDate),
    
    // ========== BILL TYPE AND PERIOD (ALL VARIATIONS) ==========
    billType: invoice?.billType || invoice?.connectionType || invoice?.tariffCategory || 'Postpaid',
    connectionType: invoice?.connectionType || invoice?.billType || 'Domestic',
    tariffCategory: invoice?.tariffCategory || invoice?.billType || invoice?.category || 'Domestic',
    category: invoice?.category || invoice?.tariffCategory || 'Domestic',
    
    billingMonth: formatBillingMonth(invoice?.billMonth, invoice?.billYear),
    billMonth: invoice?.billMonth || new Date().getMonth() + 1,
    billYear: invoice?.billYear || new Date().getFullYear(),
    billingYear: invoice?.billYear || new Date().getFullYear(),
    billingPeriod: `${formatDateDisplay(invoice?.fromDate)} - ${formatDateDisplay(invoice?.toDate)}`,
    period: `${formatDateDisplay(invoice?.fromDate)} - ${formatDateDisplay(invoice?.toDate)}`,
    
    // ========== METER READINGS (ALL VARIATIONS) ==========
    previousReading: invoice?.previousReading || invoice?.prevReading || invoice?.lastReading || invoice?.oldReading || invoice?.initialReading || 0,
    prevReading: invoice?.previousReading || invoice?.prevReading || 0,
    lastReading: invoice?.lastReading || invoice?.previousReading || 0,
    oldReading: invoice?.oldReading || invoice?.previousReading || 0,
    initialReading: invoice?.initialReading || invoice?.previousReading || 0,
    
    currentReading: invoice?.currentReading || invoice?.finalReading || invoice?.presentReading || invoice?.newReading || invoice?.meterReading || 0,
    finalReading: invoice?.currentReading || invoice?.finalReading || 0,
    presentReading: invoice?.presentReading || invoice?.currentReading || 0,
    newReading: invoice?.newReading || invoice?.currentReading || 0,
    meterReading: invoice?.meterReading || invoice?.currentReading || 0,
    
    unitsConsumed: invoice?.unitsConsumed || invoice?.consumption || invoice?.units || invoice?.totalUnits || invoice?.consumedUnits || 0,
    consumption: invoice?.consumption || invoice?.unitsConsumed || 0,
    units: invoice?.units || invoice?.unitsConsumed || 0,
    totalUnits: invoice?.totalUnits || invoice?.unitsConsumed || 0,
    consumedUnits: invoice?.consumedUnits || invoice?.unitsConsumed || 0,
    
    // ========== CHARGES (ALL VARIATIONS) ==========
    fixedCharges: invoice?.fixedCharge || invoice?.fixedCharges || 0,
    fixedCharge: invoice?.fixedCharge || invoice?.fixedCharges || 0,
    
    energyCharges: invoice?.energyCharge || invoice?.energyCharges || invoice?.consumptionCharges || 0,
    energyCharge: invoice?.energyCharge || invoice?.energyCharges || 0,
    consumptionCharges: invoice?.consumptionCharges || invoice?.energyCharges || 0,
    
    demandCharges: invoice?.demandCharges || invoice?.demandCharge || 0,
    demandCharge: invoice?.demandCharges || invoice?.demandCharge || 0,
    
    powerFactorCharges: invoice?.powerFactorCharges || invoice?.powerFactorCharge || 0,
    powerFactorCharge: invoice?.powerFactorCharges || invoice?.powerFactorCharge || 0,
    
    electricityDuty: invoice?.electricityDuty || invoice?.duty || 0,
    duty: invoice?.duty || invoice?.electricityDuty || 0,
    
    imcCharges: invoice?.imcCharges || invoice?.imcCharge || invoice?.imc || 0,
    imcCharge: invoice?.imcCharges || invoice?.imcCharge || 0,
    imc: invoice?.imc || invoice?.imcCharges || 0,
    
    // ========== TAX INFORMATION (ALL VARIATIONS) ==========
    taxAmount: taxes.total ?? taxes.gst ?? invoice?.taxAmount ?? invoice?.gst ?? invoice?.tax ?? 0,
    tax: invoice?.tax || taxes.total || taxes.gst || 0,
    gst: invoice?.gst || taxes.gst || taxes.total || 0,
    totalTax: taxes.total || invoice?.taxAmount || invoice?.gst || 0,
    
    cgst: taxes.cgst ?? invoice?.cgst ?? (taxes.total ? taxes.total / 2 : 0),
    centralGST: taxes.cgst ?? invoice?.cgst ?? 0,
    
    sgst: taxes.sgst ?? invoice?.sgst ?? (taxes.total ? taxes.total / 2 : 0),
    stateGST: taxes.sgst ?? invoice?.sgst ?? 0,
    
    igst: taxes.igst ?? invoice?.igst ?? 0,
    integratedGST: taxes.igst ?? invoice?.igst ?? 0,
    
    // ========== AMOUNTS (ALL VARIATIONS) ==========
    totalAmount: invoice?.totalAmount || invoice?.amount || invoice?.grandTotal || invoice?.netAmount || 0,
    amount: invoice?.amount || invoice?.totalAmount || 0,
    grandTotal: invoice?.grandTotal || invoice?.totalAmount || 0,
    netAmount: invoice?.netAmount || invoice?.totalAmount || 0,
    creditAmount: invoice?.isPaid ? (invoice?.totalAmount || invoice?.creditAmount || 0) : 0,
    
    // Calculate subtotal
    subTotal: (invoice?.energyCharges || invoice?.energyCharge || 0) +
              (invoice?.fixedCharges || invoice?.fixedCharge || 0) +
              (invoice?.demandCharges || invoice?.demandCharge || 0) +
              (invoice?.powerFactorCharges || invoice?.powerFactorCharge || 0) +
              (invoice?.electricityDuty || 0) +
              (invoice?.imcCharges || invoice?.imcCharge || 0),
    
    // ========== PAYMENT INFORMATION (ALL VARIATIONS) ==========
    paymentStatus: invoice?.isPaid || invoice?.paymentStatus === 'Paid' || invoice?.status === 'Paid' || (invoice?.creditAmount > 0) ? 'Paid' : (invoice?.status || invoice?.paymentStatus || 'Pending'),
    status: invoice?.isPaid ? 'Paid' : (invoice?.status || 'Pending'),
    billStatus: invoice?.isPaid ? 'Paid' : (invoice?.status || 'Pending'),
    invoiceStatus: invoice?.isPaid ? 'Paid' : (invoice?.status || 'Pending'),
    
    paymentMode: invoice?.paymentMode || invoice?.paymentMethod || invoice?.mode || 'N/A',
    paymentMethod: invoice?.paymentMethod || invoice?.paymentMode || 'N/A',
    mode: invoice?.mode || invoice?.paymentMode || 'N/A',
    
    isPaid: invoice?.isPaid || invoice?.paymentStatus === 'Paid' || invoice?.status === 'Paid' || (invoice?.creditAmount > 0),
    paid: invoice?.isPaid || false,
    
    // ========== LAST MONTH DATA (ALL VARIATIONS) ==========
    lastMonth: invoice?.lastMonth || invoice?.previousBill || invoice?.previousPeriod || {
      previousReading: invoice?.lastMonthPreviousReading || invoice?.previousReading || 0,
      finalReading: invoice?.lastMonthFinalReading || invoice?.currentReading || 0,
      consumption: invoice?.lastMonthConsumption || invoice?.unitsConsumed || 0,
      totalAmount: invoice?.lastMonthTotalAmount || 0,
    },
    previousBill: invoice?.previousBill || invoice?.lastMonth || {},
    previousPeriod: invoice?.previousPeriod || invoice?.lastMonth || {},
    
    lastMonthPreviousReading: invoice?.lastMonthPreviousReading || invoice?.lastMonth?.previousReading || invoice?.previousReading || 0,
    lastMonthFinalReading: invoice?.lastMonthFinalReading || invoice?.lastMonth?.finalReading || invoice?.currentReading || 0,
    lastMonthConsumption: invoice?.lastMonthConsumption || invoice?.lastMonth?.consumption || invoice?.unitsConsumed || 0,
    lastMonthTotalAmount: invoice?.lastMonthTotalAmount || invoice?.lastMonth?.totalAmount || 0,
    lastMonthUnits: invoice?.lastMonthConsumption || invoice?.lastMonth?.consumption || invoice?.unitsConsumed || 0,
    
    // ========== MERIT DATA (ALL VARIATIONS) ==========
    merit: invoice?.merit || invoice?.meritData || invoice?.meritCharges || invoice?.additionalCharges || [],
    meritData: invoice?.meritData || invoice?.merit || [],
    meritCharges: invoice?.meritCharges || invoice?.merit || [],
    additionalCharges: invoice?.additionalCharges || invoice?.merit || [],
    
    meritDueDate: formatDateForPDF(invoice?.meritDueDate || invoice?.dueDate),
    meritAmount: invoice?.meritAmount || invoice?.totalAmount || 0,
    
    // ========== METER SERVICES (ALL VARIATIONS) ==========
    meterServices: invoice?.meterServices || invoice?.services || invoice?.serviceCharges || [
      {
        serviceType: 'Energy Charges',
        previousReadings: String(invoice?.previousReading || 0),
        finalReadings: String(invoice?.currentReading || 0),
        consumption: String(invoice?.unitsConsumed || 0),
        unitRate: String(invoice?.unitRate || invoice?.tariffRate || invoice?.rate || 0),
        amount: String(invoice?.energyCharge || invoice?.energyCharges || 0),
      }
    ],
    services: invoice?.services || invoice?.meterServices || [],
    serviceCharges: invoice?.serviceCharges || invoice?.meterServices || [],
    
    // ========== TARIFF & RATE INFORMATION (ALL VARIATIONS) ==========
    unitRate: invoice?.unitRate || invoice?.tariffRate || invoice?.rate || invoice?.perUnitRate || 0,
    tariffRate: invoice?.tariffRate || invoice?.unitRate || invoice?.rate || 0,
    rate: invoice?.rate || invoice?.tariffRate || invoice?.unitRate || 0,
    perUnitRate: invoice?.perUnitRate || invoice?.unitRate || invoice?.tariffRate || 0,
    
    // ========== PRESERVE ALL TAX DATA ==========
    taxes: taxes,
    tax: taxes,
  };
};

const transformInvoicesToRows = (invoices) => {
  return invoices
    .filter(Boolean)
    .sort((a, b) => getInvoiceDateValue(b) - getInvoiceDateValue(a))
    .map((invoice, index) => ({
      id: invoice.id ?? invoice.billNumber ?? index + 1,
      billingMonth: formatBillingMonth(invoice.billMonth, invoice.billYear),
      invoiceNo: invoice.billNumber || 'N/A',
      billFromDate: formatDateDisplay(invoice.fromDate),
      billToDate: formatDateDisplay(invoice.toDate),
      dueDate: formatDateDisplay(invoice.dueDate),
      units: formatUnits(invoice.unitsConsumed),
      totalBill: formatCurrencyINR(invoice.totalAmount),
      _originalData: mapInvoiceForPDF(invoice),
    }));
};

const Invoices = ({ navigation }) => {
  const [tableData, setTableData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [consumerData, setConsumerData] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Fetch invoices and consumer data
  const fetchInvoices = useCallback(async () => {
    try {
      setIsLoading(true);
      const user = await getUser();

      if (!user || !user.identifier) {
        setTableData([]);
        return;
      }

      const identifier = user.identifier;

      // Try to get cached consumer data first for instant UI population
      const cachedResult = await getCachedConsumerData(identifier);
      if (cachedResult.success && cachedResult.data) {
        setConsumerData(cachedResult.data);
      }

      // Fetch latest consumer details for header context with access token
      // Using apiClient for automatic token management and refresh
      try {
        const consumerEndpoint = API_ENDPOINTS.consumers.get(identifier);
        const result = await apiClient.request(consumerEndpoint, {
          method: 'GET',
          showLogs: false, // Reduce logging for this call
        });
        
        if (result.success && result.data) {
          setConsumerData(result.data);
          console.log('✅ Consumer data fetched successfully with access token');
        } else {
          console.warn('⚠️ Failed to fetch consumer data:', result.error || 'Unknown error');
          // If authentication failed, apiClient would have attempted token refresh
          if (result.requiresReauth) {
            console.error('❌ Authentication required - user may need to login again');
          }
        }
      } catch (consumerError) {
        console.error('Error fetching consumer data:', consumerError);
      }

      // Fetch billing history for invoices table
      const billingResult = await fetchBillingHistory(identifier);
      if (billingResult.success) {
        if (billingResult.data && (Array.isArray(billingResult.data) ? billingResult.data.length > 0 : true)) {
          const normalizedInvoices = normalizeBillingData(billingResult.data);
          setTableData(transformInvoicesToRows(normalizedInvoices));
          console.log(`✅ Loaded ${normalizedInvoices.length} invoices`);
        } else {
          // No billing data available
          setTableData([]);
          if (billingResult.warning) {
            console.warn('ℹ️', billingResult.message || 'No billing history available');
          }
        }
      } else {
        console.error('Failed to fetch billing history:', billingResult.message);
        setTableData([]);
      }

      // Background sync for consumer data
      syncConsumerData(identifier).catch(error => {
        console.error('Background sync failed:', error);
      });
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setTableData([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch data on component mount
  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Handle row press to open invoice PDF
  const handleRowPress = useCallback(async (row) => {
    try {
      setIsGeneratingPDF(true);
      console.log('📄 Opening invoice for billing number:', row.invoiceNo);
      
      // Get original payment data
      const paymentData = row._originalData;
      
      // Generate and view PDF
      const result = await handleViewBill(paymentData, consumerData);
      
      if (!result.success) {
        console.error('Failed to generate invoice PDF');
      }
    } catch (error) {
      console.error('Error opening invoice:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  }, [consumerData]);

  return (
    <>
      <ScrollView
        style={styles.Container}
        contentContainerStyle={{ paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchInvoices}
            colors={[COLORS.secondaryColor]}
            tintColor={COLORS.secondaryColor}
          />
        }
      >
        <DashboardHeader
          navigation={navigation}
          variant="invoices"
          showBalance={false}
          consumerData={consumerData}
          isLoading={isLoading}
        />
        
        {/* Invoice Table */}
        <View style={styles.tableWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tableScrollContent}
          >
            <Table
              data={tableData}
              loading={isLoading}
              emptyMessage="No invoices available"
              showSerial={true}
              showPriority={false}
              onRowPress={handleRowPress}
              minTableWidth={900}
              containerStyle={styles.tableContainer}
              rowStyle={styles.tableRow}
              columns={[
                { key: 'billingMonth', title: 'Billing Month', flex: 1 },
                { key: 'invoiceNo', title: 'Invoice No', flex: 1.4 },
                { key: 'billFromDate', title: 'Bill From Date', flex: 1.2 },
                { key: 'billToDate', title: 'Bill To Date', flex: 1.2 },
                { key: 'dueDate', title: 'Due Date', flex: 1 },
                { key: 'units', title: 'No. of Units', flex: 1, align: 'right' },
                { key: 'totalBill', title: 'Total Bill (₹)', flex: 1.4, align: 'right' }
              ]}
            />
          </ScrollView>
        </View>
        
        {/* PDF Generation Overlay */}
        {isGeneratingPDF && (
          <View style={styles.pdfOverlay}>
            <View style={styles.pdfOverlayContent}>
              <ActivityIndicator size="large" color={COLORS.secondaryColor} />
              <Text style={styles.pdfOverlayText}>Generating Invoice PDF...</Text>
            </View>
          </View>
        )}
        
      </ScrollView>
        {/* {tableData.length > 0 && ( 
        <View style={styles.buttonContainer}>
          <View style={styles.buttonContainerInner}>
            <DownloadButton
              data={tableData.map(item => ({
                billingMonth: item.billingMonth,
                invoiceNo: item.invoiceNo,
                billFromDate: item.billFromDate,
                billToDate: item.billToDate,
                dueDate: item.dueDate,
                units: item.units,
                totalBill: item.totalBill
              }))}
              columns={[
                { key: 'billingMonth', title: 'Billing Month' },
                { key: 'invoiceNo', title: 'Invoice No' },
                { key: 'billFromDate', title: 'Bill From Date' },
                { key: 'billToDate', title: 'Bill To Date' },
                { key: 'dueDate', title: 'Due Date' },
                { key: 'units', title: 'No. of Units' },
                { key: 'totalBill', title: 'Total Bill (₹)' }
              ]}
              fileName="invoices"
              title="Download All"
              variant="primary"
              size="medium"
              style={styles.downloadButton}
              textStyle={styles.forgotText}
            />
          </View>
        </View>
      )} */}
    </>
  );
};

export default Invoices;

const styles = StyleSheet.create({
  Container: {
    backgroundColor: COLORS.secondaryFontColor,
    height: '100%',
  },
  tableWrapper: {
    marginTop: 20,
  },
  tableScrollContent: {
    paddingHorizontal: 4,
  },
  tableContainer: {
    paddingBottom: 12,
  },
  tableRow: {
    marginTop: 8,
  },
  buttonContainer:{
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
    backgroundColor: COLORS.secondaryFontColor
  },
  buttonContainerInner:{
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  downloadButton:{
    width: '100%',
  },
  pdfOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  pdfOverlayContent: {
    backgroundColor: COLORS.secondaryFontColor,
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  pdfOverlayText: {
    marginTop: 15,
    fontSize: 16,
    fontFamily: 'Manrope-Medium',
    color: COLORS.primaryFontColor,
  }
});
