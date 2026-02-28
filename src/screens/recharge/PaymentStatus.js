import { StyleSheet, Text, View, Pressable, ScrollView, Dimensions, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { COLORS } from "../../constants/colors";
import { useTheme } from "../../context/ThemeContext";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import Button from "../../components/global/Button";
import SuccessIcon from "../../../assets/icons/checkmark.svg";
import { getPaymentStatus, formatAmount, formatPaymentDate } from "../../services/paymentService";
import { handleViewBill } from "../../services/InvoicePDFService";
import { useConsumer } from "../../context/ConsumerContext";

const PaymentStatus = ({ navigation, route }) => {
  const { isDark, colors: themeColors } = useTheme();
  const { consumerData } = useConsumer();
  const { billId, paymentData: initialPaymentData, success } = route?.params || {};
  const [paymentDetails, setPaymentDetails] = useState(initialPaymentData || null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [error, setError] = useState(null);

 
  useEffect(() => {
    const fetchPaymentDetails = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log('🔍 PaymentStatus - Route params:', route?.params);
        console.log('🔍 PaymentStatus - Bill ID:', billId);
        console.log('🔍 PaymentStatus - Initial payment data:', initialPaymentData);

        if (billId) {
          const result = await getPaymentStatus(billId);
          if (result.success) {
            console.log('🔍 PaymentStatus - Fetched payment data:', result.data);
            setPaymentDetails(result.data);
          } else {
            setError(result.message);
          }
        } else if (initialPaymentData) {
          console.log('🔍 PaymentStatus - Using initial payment data:', initialPaymentData);
          setPaymentDetails(initialPaymentData);
        } else {
          setError('No payment information available');
        }
      } catch (error) {
        console.error('Error fetching payment details:', error);
        setError('Failed to fetch payment details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPaymentDetails();
  }, [billId, initialPaymentData]);

  // Build payment object for InvoicePDFService from paymentDetails
  const buildPaymentForInvoice = () => {
    const p = paymentDetails || {};
    const amount = p.amount || p.total_amount || 0;
    const amountNum = typeof amount === 'number' ? amount : parseInt(String(amount).replace(/[^0-9]/g, ''), 10) || 0;
    return {
      ...p,
      amount: amountNum,
      totalAmount: amountNum,
      billNumber: p.transaction_id || p.razorpay_payment_id || p.payment_id || `INV-${p.bill_id || Date.now()}`,
      invoiceNumber: p.transaction_id || p.razorpay_payment_id || p.bill_id,
      transactionId: p.transaction_id || p.razorpay_payment_id,
      billNo: p.bill_id,
      bill_id: p.bill_id || billId,
      billDate: p.created_at || p.payment_date || p.verified_at || new Date(),
      fromDate: p.created_at || new Date(),
      invoiceDate: p.created_at || new Date(),
      dueDate: p.created_at || new Date(),
      status: 'Paid',
      paymentStatus: 'Paid',
      isPaid: true,
      payment_method: p.payment_method || 'UPI',
      customerName: p.consumer_name || consumerData?.name || consumerData?.consumerName,
      consumer_name: p.consumer_name || consumerData?.name,
    };
  };

  // Handle invoice download - generate PDF and open for viewing/sharing
  const handleInvoiceDownload = async () => {
    if (!paymentDetails) {
      Alert.alert("Error", "Payment details not available. Please try again later.", [{ text: "OK" }]);
      return;
    }
    try {
      setIsGeneratingPdf(true);
      const paymentForInvoice = buildPaymentForInvoice();
      const consumer = consumerData || {
        name: paymentDetails.consumer_name || 'Consumer',
        identifier: paymentDetails.consumer_id || paymentDetails.bill_id,
        email: paymentDetails.email || 'customer@bestinfra.com',
        contact: paymentDetails.contact || paymentDetails.phone || '',
        address: paymentDetails.address || '',
      };
      await handleViewBill(paymentForInvoice, consumer);
    } catch (err) {
      console.error('Invoice download error:', err);
      Alert.alert(
        "Error",
        err?.message || "Failed to generate invoice. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Handle navigation to dashboard
  const handleGoToDashboard = () => {
    navigation.navigate("PostPaidDashboard");
  };

  // Render loading state
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, isDark && { backgroundColor: themeColors.screen }]}>
        <ActivityIndicator size="large" color={COLORS.secondaryColor} />
        <Text style={styles.loadingText}>Loading payment details...</Text>
      </View>
    );
  }

  // Render error state
  if (error) {
    return (
      <View style={[styles.errorContainer, isDark && { backgroundColor: themeColors.screen }]}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <Button 
          title="Go to Dashboard" 
          variant="primary" 
          size="medium" 
          onPress={handleGoToDashboard} 
        />
      </View>
    );
  }

  // Render payment success state
  return (
    <>
      <ScrollView
        style={[styles.Container, isDark && { backgroundColor: themeColors.screen }]}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.MainContainer, isDark && { backgroundColor: themeColors.screen }]}>
          <StatusBar style={isDark ? "light" : "dark"} />
          <View style={styles.successContainer}>
            <SuccessIcon width={60} height={60} style={styles.successIcon} />
            <Text style={styles.successText}>Payment Confirmation</Text>
            <Text style={styles.successDescription}>
              {success !== false ? "Transaction is successfully completed." : "Payment details loaded."}
            </Text>
          </View>
          <View style={styles.amountContainer}>
            <View style={styles.amountSubContainer}>
              <Text style={styles.amountText}>Amount Paid</Text>
              <Text style={styles.amountValueText}>
                {paymentDetails ? formatAmount(paymentDetails.amount || paymentDetails.total_amount) : "Rs. 0"}
              </Text>
            </View>
            <View style={styles.billingAddressContainer}>
              <View style={{width:"40%"}}>
                <Text style={styles.billingAddressText}>Transaction Details</Text>
              </View>
              <View style={styles.billingAddressValueContainer}>
                <Text style={styles.billingAddressValueText}>
                  {paymentDetails ? (
                    `Transaction ID: ${paymentDetails.transaction_id || paymentDetails.razorpay_payment_id || paymentDetails.payment_id || 'N/A'}\n` +
                    `Payment ID: ${paymentDetails.razorpay_payment_id || paymentDetails.payment_id || 'N/A'}\n` +
                    `Order ID: ${paymentDetails.razorpay_order_id || paymentDetails.order_id || 'N/A'}\n` +
                    `Payment Date: ${formatPaymentDate(paymentDetails.created_at || paymentDetails.payment_date || paymentDetails.verified_at || new Date())}\n` +
                    `Status: ${paymentDetails.status || paymentDetails.payment_status || 'Completed'}\n` +
                    `Bill ID: ${paymentDetails.bill_id || billId || 'N/A'}\n` +
                    `Payment Method: ${paymentDetails.payment_method || 'UPI'}\n` +
                    `Source: ${paymentDetails.source || 'Mobile App'}`
                  ) : (
                    "Transaction details not available"
                  )}
                </Text>
              </View>
            </View>
          </View>

        </View>
      </ScrollView>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          onPress={handleInvoiceDownload}
          disabled={isGeneratingPdf}
          style={{ opacity: isGeneratingPdf ? 0.6 : 1 }}
        >
          {isGeneratingPdf ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <ActivityIndicator size="small" color="#2D5016" />
              <Text style={styles.getInvoiceText}>Generating invoice…</Text>
            </View>
          ) : (
            <Text style={styles.getInvoiceText}>Get Invoice</Text>
          )}
        </TouchableOpacity>
        <Button title="Go to Dashboard" variant="primary" size="medium" onPress={handleGoToDashboard} />
      </View>
    </>
  );
};

export default PaymentStatus;

const styles = StyleSheet.create({
  Container: {
    backgroundColor: COLORS.secondaryFontColor,
    borderTopLeftRadius: 30,
    borderBottomRightRadius: 30,
    backgroundColor: "#eef8f0",
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
    backgroundColor: "#eef8f0",
    gap: 10,
  },
  getInvoiceText: {
    fontSize: 14,
    fontFamily: "Manrope-Regular",
    color: COLORS.primaryFontColor,
    textAlign: "center",
  },
  MainContainer: {
    padding: 20,
    gap: 10,
  },
  successContainer:{
    alignItems: "center",
    gap: 8,
  },
  successIcon:{
    marginTop: 60,
    marginBottom: 25,
  },
  successText:{
    fontSize: 18,
    fontFamily: "Manrope-Bold",
    color: COLORS.primaryFontColor,
    textAlign: "center",
  },
  successDescription:{
    fontSize: 14,
    fontFamily: "Manrope-Regular",
    color: COLORS.primaryFontColor,
    textAlign: "center",
  },
  amountContainer:{
    marginTop: 10,
  },
  amountSubContainer:{
    backgroundColor: COLORS.primaryColor,
    padding: 8,
    borderRadius: 5,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
  },
  billingAddressContainer:{
    backgroundColor: COLORS.secondaryFontColor,
    padding: 8,
    borderRadius: 5,
    paddingHorizontal: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    // flexWrap: "wrap",
  },
  amountText:{
    fontSize: 14,
    fontFamily: "Manrope-SemiBold",
    color: COLORS.secondaryFontColor,
  },
  
  amountValueText:{
    fontSize: 10,
    fontFamily: "Manrope-Regular",
    color: COLORS.secondaryFontColor,
  },
  billingAddressText:{
    fontSize: 14,
    fontFamily: "Manrope-SemiBold",
    color: COLORS.primaryFontColor,
  },
  billingAddressValueText:{
    fontSize: 11,
    fontFamily: "Manrope-Regular",
    color: COLORS.primaryFontColor,
    textAlign:"right",
  },
  billingAddressValueContainer:{
    width:"60%"
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.secondaryFontColor,
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Manrope-Regular',
    color: COLORS.primaryFontColor,
    marginTop: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.secondaryFontColor,
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Manrope-Regular',
    color: '#FF6B6B',
    marginBottom: 20,
    textAlign: 'center',
  },
});