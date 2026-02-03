import { StyleSheet, Text, View, ScrollView, ActivityIndicator, RefreshControl, Alert, TouchableOpacity, Pressable, Animated } from "react-native";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../constants/colors";
import { getUser, getToken } from "../utils/storage";
import { API_ENDPOINTS } from "../constants/constants";
import { 
  getCachedConsumerData, 
  syncConsumerData,
  fetchBillingHistory
} from "../services/apiService";
import DashboardHeader from "../components/global/DashboardHeader";
import BottomNavigation from "../components/global/BottomNavigation";
import { handleViewBill } from "../services/InvoicePDFService";
import { authService } from "../services/authService";
import { apiClient } from "../services/apiClient";
import Menu from "../../assets/icons/bars.svg";
import Notification from "../../assets/icons/notification.svg";
import EyeIcon from "../../assets/icons/eyeFill.svg";
import Logo from "../components/global/Logo";
import AnimatedRings from "../components/global/AnimatedRings";
import { StatusBar } from "expo-status-bar";
import FilterIcon from "../../assets/icons/filter.svg";

// Shimmer effect component for skeleton loading
const Shimmer = ({ style }) => {
  const shimmerAnim = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    shimmerAnim.setValue(-1);
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    ).start();
  }, [shimmerAnim]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 300],
  });

  return (
    <View style={[style, { overflow: "hidden", backgroundColor: "#e0e0e0" }]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { transform: [{ translateX }] },
        ]}
      >
        <LinearGradient
          colors={["#e0e0e0", "#f5f5f5", "#e0e0e0"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );
};

// Skeleton Invoice Card Component
const SkeletonInvoiceCard = () => {
  return (
    <View style={styles.invoiceCard}>
      {/* Header skeleton */}
      <View style={styles.cardHeader}>
        <Shimmer style={[styles.skeletonBox, { width: 120, height: 16 }]} />
        <Shimmer style={[styles.skeletonBox, { width: 60, height: 24, borderRadius: 12 }]} />
      </View>

      {/* Dates skeleton */}
      <View style={styles.datesContainer}>
        <Shimmer style={[styles.skeletonBox, { width: 100, height: 14 }]} />
        <Shimmer style={[styles.skeletonBox, { width: 100, height: 14 }]} />
      </View>

      {/* Details section skeleton */}
      <View style={styles.detailsSection}>
        <View style={styles.detailItem}>
          <Shimmer style={[styles.skeletonBox, { width: 80, height: 12, marginBottom: 4 }]} />
          <Shimmer style={[styles.skeletonBox, { width: 60, height: 16 }]} />
        </View>
        <View style={styles.detailItem}>
          <Shimmer style={[styles.skeletonBox, { width: 80, height: 12, marginBottom: 4 }]} />
          <Shimmer style={[styles.skeletonBox, { width: 80, height: 16 }]} />
        </View>
      </View>

      {/* Action buttons skeleton */}
      <View style={styles.actionButtons}>
        <Shimmer style={[styles.skeletonBox, { flex: 1, height: 44, borderRadius: 5 }]} />
        <Shimmer style={[styles.skeletonBox, { flex: 1, height: 44, borderRadius: 5 }]} />
      </View>
    </View>
  );
};

const formatDateDisplay = (dateString) => {
  if (!dateString) return 'N/A';
  const parsedDate = new Date(dateString);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'N/A';
  }
  const day = parsedDate.getDate();
  const month = parsedDate.toLocaleDateString('en-US', { month: 'short' });
  const year = parsedDate.getFullYear();
  return `${day} ${month} ${year}`;
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

const transformInvoicesToCards = (invoices) => {
  return invoices
    .filter(Boolean)
    .sort((a, b) => getInvoiceDateValue(b) - getInvoiceDateValue(a))
    .map((invoice, index) => ({
      id: invoice.id ?? invoice.billNumber ?? index + 1,
      invoiceId: invoice.billNumber || invoice.invoiceNumber || `INV-${index + 1}`,
      isPaid: invoice.isPaid || invoice.paymentStatus === 'Paid' || invoice.status === 'Paid' || (invoice.creditAmount > 0),
      issuedDate: formatDateDisplay(invoice.fromDate || invoice.createdAt || invoice.billDate),
      dueDate: formatDateDisplay(invoice.dueDate),
      unitsConsumed: formatUnits(invoice.unitsConsumed),
      amountDue: formatCurrencyINR(invoice.totalAmount),
      _originalData: mapInvoiceForPDF(invoice),
    }));
};

const Invoices = ({ navigation }) => {
  const [invoiceCards, setInvoiceCards] = useState([]);
  const [filteredInvoiceCards, setFilteredInvoiceCards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [consumerData, setConsumerData] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Fetch invoices and consumer data
  const fetchInvoices = useCallback(async () => {
    try {
      setIsLoading(true);
      const user = await getUser();

      if (!user || !user.identifier) {
        setInvoiceCards([]);
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

      // Fetch billing history for invoices cards
      const billingResult = await fetchBillingHistory(identifier);
      if (billingResult.success) {
        if (billingResult.data && (Array.isArray(billingResult.data) ? billingResult.data.length > 0 : true)) {
          const normalizedInvoices = normalizeBillingData(billingResult.data);
          const cards = transformInvoicesToCards(normalizedInvoices);
          setInvoiceCards(cards);
          setFilteredInvoiceCards(cards);
          console.log(`✅ Loaded ${normalizedInvoices.length} invoices`);
        } else {
          // No billing data available
          setInvoiceCards([]);
          if (billingResult.warning) {
            console.warn('ℹ️', billingResult.message || 'No billing history available');
          }
        }
      } else {
        console.error('Failed to fetch billing history:', billingResult.message);
        setInvoiceCards([]);
      }

      // Background sync for consumer data
      syncConsumerData(identifier).catch(error => {
        console.error('Background sync failed:', error);
      });
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setInvoiceCards([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch data on component mount
  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Handle invoice view/pay/share
  const handleViewInvoice = useCallback(async (invoiceCard) => {
    try {
      setIsGeneratingPDF(true);
      console.log('📄 Fetching invoice data for bill number:', invoiceCard.invoiceId);
      
      const billNumber = invoiceCard.invoiceId;
      if (!billNumber) {
        throw new Error('Bill number is required');
      }

      // Fetch detailed invoice data from API for this specific consumer and bill
      const token = await authService.getValidAccessToken();
      if (!token) {
        throw new Error('No access token available. Please login again.');
      }

      const invoiceUrl = API_ENDPOINTS.billing.invoice(billNumber);
      console.log('🔄 Fetching invoice from:', invoiceUrl);
      
      const response = await fetch(invoiceUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ Invoice data received for consumer:', consumerData?.uniqueIdentificationNo || consumerData?.identifier);

      if (result.status === 'success' && result.data) {
        // Use the API response data directly - it contains all consumer-specific invoice data
        const invoiceData = result.data;
        console.log('📋 Invoice data for consumer:', {
          consumer_uid: invoiceData.consumer_uid,
          bill_no: invoiceData.bill_no,
          customer_name: invoiceData.customer_name,
          customer_email: invoiceData.customer_email,
          customer_contact: invoiceData.customer_contact,
        });
        
        // CRITICAL: Log LAST MONTH section fields from API
        console.log('🔍 LAST MONTH Section - API Response Fields:');
        console.log('  final_reading:', invoiceData.final_reading);
        console.log('  consumption:', invoiceData.consumption);
        console.log('  prev_reading:', invoiceData.prev_reading);
        console.log('  last_month_label:', invoiceData.last_month_label);
        console.log('  last_month_amount:', invoiceData.last_month_amount);
        console.log('  All API keys:', Object.keys(invoiceData).filter(k => 
          k.includes('reading') || k.includes('consumption') || k.includes('final') || k.includes('prev')
        ));
        
        // Generate and view PDF with consumer-specific invoice data
        const pdfResult = await handleViewBill(invoiceData, consumerData);
        
        if (!pdfResult.success) {
          console.error('Failed to generate invoice PDF');
        }
      } else {
        throw new Error('Invalid invoice data received from API');
      }
    } catch (error) {
      console.error('Error fetching/opening invoice:', error);
      Alert.alert(
        'Error',
        `Failed to load invoice. Please try again.\n\n${error.message}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsGeneratingPDF(false);
    }
  }, [consumerData]);

  const handlePayNow = (invoiceCard) => {
    navigation.navigate('PostPaidRechargePayments', {
      invoiceData: invoiceCard._originalData
    });
  };

  const handleShare = (invoiceCard) => {
    // TODO: Implement share functionality
    Alert.alert('Share', 'Share functionality will be implemented');
  };

  const handleFilterPress = () => {
    navigation.navigate("Reports");
  };

  const renderInvoiceCard = (invoiceCard) => {
    const isPaid = invoiceCard.isPaid;
    
    return (
      <View key={invoiceCard.id} style={styles.invoiceCard}>
        {/* Header with Invoice ID and Status */}
        <View style={styles.cardHeader}>
          <Text style={styles.invoiceIdText}>{invoiceCard.invoiceId}</Text>
          <View style={[styles.statusBadge, isPaid ? styles.paidBadge : styles.unpaidBadge]}>
            <Text style={styles.statusText}>{isPaid ? 'Paid' : 'Unpaid'}</Text>
          </View>
        </View>

        {/* Dates */}
        <View style={styles.datesContainer}>
          <Text style={styles.dateLabel}>Issued: {invoiceCard.issuedDate}</Text>
          <Text style={styles.dateLabel}>Due: {invoiceCard.dueDate}</Text>
        </View>

        {/* Details Section */}
        <View style={styles.detailsSection}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Units Consumed</Text>
            <Text style={styles.detailValue}>{invoiceCard.unitsConsumed} kWh</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Amount Due</Text>
            <Text style={styles.detailValue}>{invoiceCard.amountDue}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => isPaid ? handleShare(invoiceCard) : handlePayNow(invoiceCard)}
            activeOpacity={0.7}
          >
            <Text style={styles.primaryButtonText}>{isPaid ? 'Share' : 'Pay Now'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => handleViewInvoice(invoiceCard)}
            activeOpacity={0.7}
          >
            <EyeIcon width={16} height={16} fill={COLORS.secondaryColor} />
            <Text style={styles.secondaryButtonText}>View</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.headerButton}
          onPress={() => navigation.navigate("SideMenu")}
        >
          <Menu width={18} height={18} fill="#202d59" />
        </Pressable>

        <View style={styles.logoWrapper}>
          <AnimatedRings />
          <Logo variant="blue" size="medium" />
        </View>

        <Pressable
          style={styles.headerButton}
          onPress={() => navigation.navigate("Profile")}
        >
          <Notification width={18} height={18} fill="#202d59" />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
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
        {/* Page Title with Filter */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>My Invoices</Text>
          {/* <Pressable style={styles.filterButton}>
            <View style={styles.filterIcon}>
              <View style={styles.filterRow}>
                <View style={styles.filterLine} />
                <View style={styles.filterDot} />
              </View>
              <View style={styles.filterRow}>
                <View style={styles.filterLine} />
                <View style={styles.filterDot} />
              </View>
            </View>
          </Pressable> */}
          <Pressable style={styles.filterButton} onPress={handleFilterPress}>  
            <FilterIcon width={24} height={24} />
          </Pressable>
        </View>

        {/* Invoice Cards */}
        {isLoading ? (
          <View style={styles.cardsContainer}>
            {[1, 2, 3].map((index) => (
              <SkeletonInvoiceCard key={index} />
            ))}
          </View>
        ) : filteredInvoiceCards.length > 0 ? (
          <View style={styles.cardsContainer}>
            {filteredInvoiceCards.map(renderInvoiceCard)}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No invoices available</Text>
          </View>
        )}
      </ScrollView>

      {/* PDF Generation Overlay */}
      {isGeneratingPDF && (
        <View style={styles.pdfOverlay}>
          <View style={styles.pdfOverlayContent}>
            <ActivityIndicator size="large" color={COLORS.secondaryColor} />
            <Text style={styles.pdfOverlayText}>Generating Invoice PDF...</Text>
          </View>
        </View>
      )}

      {/* Bottom Navigation */}
      <BottomNavigation navigation={navigation} />
    </View>
  );
};

export default Invoices;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EEF8F0",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 75,
    paddingBottom: 20,
    paddingHorizontal: 30,
  },
  headerButton: {
    backgroundColor: COLORS.secondaryFontColor,
    width: 54,
    height: 54,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  logoWrapper: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 30,
    paddingBottom: 130,
  },
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 16,
    fontFamily: "Manrope-Bold",
    color: COLORS.primaryFontColor,
  },
  filterButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  filterIcon: {
    width: 24,
    height: 24,
    justifyContent: "space-between",
    alignItems: "center",
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  filterLine: {
    width: 16,
    height: 2,
    backgroundColor: COLORS.primaryFontColor,
    borderRadius: 1,
  },
  filterDot: {
    width: 6,
    height: 6,
    backgroundColor: COLORS.primaryFontColor,
    borderRadius: 3,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Manrope-Regular",
    color: "#9CA3AF",
  },
  cardsContainer: {
    gap: 16,
  },
  invoiceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 5,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  invoiceIdText: {
    fontSize: 14,
    fontFamily: "Manrope-SemiBold",
    color: COLORS.primaryFontColor,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  unpaidBadge: {
    backgroundColor: "#FEF3C7",
  },
  paidBadge: {
    backgroundColor: "#D1FAE5",
  },
  statusText: {
    fontSize: 10,
    fontFamily: "Manrope-SemiBold",
    color: COLORS.primaryFontColor,
  },
  datesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 12,
    fontFamily: "Manrope-Regular",
    color: "#6B7280",
  },
  detailsSection: {
    backgroundColor: "#F3F4F6",
    borderRadius: 5,
    padding: 16,
    marginBottom: 16,
    gap: 12,
    flexDirection: "row",
    justifyContent: "space-around",  
    alignItems: "center",
  },
  detailItem: {
    gap: 4,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: "Manrope-Regular",
    color: "#6B7280",
  },
  detailValue: {
    fontSize: 14,
    fontFamily: "Manrope-Bold",
    color: COLORS.primaryFontColor,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: COLORS.secondaryColor,
    borderRadius: 5,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    fontSize: 14,
    fontFamily: "Manrope-SemiBold",
    color: "#FFFFFF",
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: COLORS.secondaryColor,
    borderRadius: 5,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontFamily: "Manrope-SemiBold",
    color: COLORS.secondaryColor,
  },
  pdfOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  pdfOverlayContent: {
    backgroundColor: COLORS.secondaryFontColor,
    padding: 30,
    borderRadius: 15,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  pdfOverlayText: {
    marginTop: 15,
    fontSize: 16,
    fontFamily: "Manrope-Medium",
    color: COLORS.primaryFontColor,
  },
  skeletonBox: {
    borderRadius: 4,
  },
});
