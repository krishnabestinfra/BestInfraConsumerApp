import { StyleSheet, Text, View, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import React, { useState, useEffect, useCallback } from "react";
import { COLORS } from "../constants/colors";
import Table from "../components/global/Table";
import { getUser } from "../utils/storage";
import { API_ENDPOINTS } from "../constants/constants";
import { 
  getCachedConsumerData, 
  syncConsumerData,
  fetchBillingHistory
} from "../services/apiService";
import DashboardHeader from "../components/global/DashboardHeader";
import DownloadButton from "../components/global/DownloadButton";
import { handleViewBill } from "../services/InvoicePDFService";

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
  return {
    ...invoice,
    transactionId: invoice?.billNumber || invoice?.id?.toString() || 'N/A',
    billNumber: invoice?.billNumber,
    billDate: invoice?.fromDate,
    invoiceDate: invoice?.createdAt || invoice?.fromDate,
    paymentDate: invoice?.createdAt || invoice?.updatedAt || invoice?.fromDate,
    dueDate: invoice?.dueDate,
    previousReading: invoice?.previousReading,
    currentReading: invoice?.currentReading,
    unitsConsumed: invoice?.unitsConsumed,
    fixedCharges: invoice?.fixedCharge,
    energyCharges: invoice?.energyCharge,
    taxAmount: taxes.total ?? taxes.gst ?? 0,
    cgst: taxes.cgst ?? 0,
    sgst: taxes.sgst ?? 0,
    igst: taxes.igst ?? 0,
    totalAmount: invoice?.totalAmount,
    creditAmount: invoice?.isPaid ? invoice?.totalAmount : 0,
    billingMonth: formatBillingMonth(invoice?.billMonth, invoice?.billYear),
    billingPeriod: `${formatDateDisplay(invoice?.fromDate)} - ${formatDateDisplay(invoice?.toDate)}`,
    status: invoice?.isPaid ? 'Paid' : (invoice?.status || 'Pending'),
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

      // Fetch latest consumer details for header context
      try {
        const response = await fetch(API_ENDPOINTS.consumers.get(identifier));
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setConsumerData(data.data);
          }
        } else {
          console.error('Failed to fetch consumer data:', response.status);
        }
      } catch (consumerError) {
        console.error('Error fetching consumer data:', consumerError);
      }

      // Fetch billing history for invoices table
      const billingResult = await fetchBillingHistory(identifier);
      if (billingResult.success && billingResult.data) {
        const normalizedInvoices = normalizeBillingData(billingResult.data);
        setTableData(transformInvoicesToRows(normalizedInvoices));
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
