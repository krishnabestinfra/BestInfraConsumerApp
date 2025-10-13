import { StyleSheet, Text, View, Pressable, ScrollView, Dimensions, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { COLORS } from "../constants/colors";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import Button from "../components/global/Button";
import SuccessIcon from "../../assets/icons/checkmark.svg";
import { getPaymentStatus, formatAmount, formatPaymentDate } from "../services/paymentService";

const PaymentStatus = ({ navigation, route }) => {
  const { billId, paymentData: initialPaymentData, success } = route?.params || {};
  const [paymentDetails, setPaymentDetails] = useState(initialPaymentData || null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch payment details on component mount
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

  // Handle invoice download
  const handleInvoiceDownload = () => {
    Alert.alert(
      "Download Invoice",
      "Invoice download feature will be available soon.",
      [{ text: "OK" }]
    );
  };

  // Handle navigation to dashboard
  const handleGoToDashboard = () => {
    navigation.navigate("Dashboard");
  };

  // Render loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.secondaryColor} />
        <Text style={styles.loadingText}>Loading payment details...</Text>
      </View>
    );
  }

  // Render error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
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
        style={styles.Container}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.MainContainer}>
          <StatusBar barStyle="dark-content" />
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
        <TouchableOpacity onPress={handleInvoiceDownload}>
          <Text style={styles.getInvoiceText}>Get Invoice</Text>
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
    // marginTop: 60,
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