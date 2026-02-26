import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  StatusBar, 
  Alert, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform 
} from "react-native";
import { COLORS } from "../../constants/colors";
import { useTheme } from "../../context/ThemeContext";
import React, { useState, useEffect, useMemo } from "react";
import Input from "../../components/global/Input";
import Button from "../../components/global/Button";
import DashboardHeader from "../../components/global/DashboardHeader";
import BottomNavigation from "../../components/global/BottomNavigation";
import DirectRazorpayPayment from "../../components/DirectRazorpayPayment";
import { authService } from "../../services/authService";
import { API, API_ENDPOINTS } from "../../constants/constants";
import { fetchBillingHistory } from "../../services/apiService";
import { useConsumer } from "../../context/ConsumerContext";
import {
  processRazorpayPayment,
  handlePaymentSuccess,
  handlePaymentError,
  formatAmount
} from "../../services/paymentService";
import { getConsumerDueDate } from "../../utils/billingUtils";
import { parseDueDate } from "../../utils/dateUtils";
import { Shimmer, SHIMMER_LIGHT, SHIMMER_DARK } from "../../utils/loadingManager";

// Fallback if loadingManager exports are missing
const SHIMMER_LIGHT_FALLBACK = { base: "#e0e0e0", gradient: ["#e0e0e0", "#f5f5f5", "#e0e0e0"] };
const SHIMMER_DARK_FALLBACK = { base: "#3a3a3c", gradient: ["#3a3a3c", "rgba(255,255,255,0.06)", "#3a3a3c"] };

// Skeleton Recharge Card (Outstanding Amount placeholder – same pattern as Tickets/Invoices/Usage)
const SkeletonRechargeCard = ({ isDark, styles }) => {
  const shimmer = (isDark ? (SHIMMER_DARK ?? SHIMMER_DARK_FALLBACK) : (SHIMMER_LIGHT ?? SHIMMER_LIGHT_FALLBACK));
  const cardBg = isDark ? "#1A1F2E" : COLORS.secondaryFontColor;
  const inputBg = isDark ? "#1F2E34" : "#F8F8F8";
  return (
    <View style={[styles.amountCard1, { backgroundColor: cardBg }]}>
      <View style={styles.amountCardHeader}>
        <Shimmer style={{ width: 140, height: 14, borderRadius: 4 }} baseColor={shimmer.base} gradientColors={shimmer.gradient} />
        <Shimmer style={[styles.statusDot, { backgroundColor: shimmer.base }]} baseColor={shimmer.base} gradientColors={shimmer.gradient} />
      </View>
      <View style={[styles.amountInputContainer, { backgroundColor: inputBg, borderRadius: 6 }]}>
        <Shimmer style={{ flex: 1, height: 44, borderRadius: 6 }} baseColor={shimmer.base} gradientColors={shimmer.gradient} />
      </View>
    </View>
  );
};

const IS_TESTING_MODE = true; // Change to false when ready for production
const TEST_PAYMENT_AMOUNT = 100; // ₹1 in paise (100 paise = 1 rupee)
// ============================================================================

const PostPaidRechargePayments = ({ navigation }) => {
  const { isDark, colors: themeColors } = useTheme();
  const [selectedOption, setSelectedOption] = useState("option1");
  const [customAmount, setCustomAmount] = useState("");
  const [outstandingAmount, setOutstandingAmount] = useState("NA");
  const { consumerData, isConsumerLoading, refreshConsumer } = useConsumer();
  const [isLoading, setIsLoading] = useState(true);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [orderData, setOrderData] = useState(null);

  const handleCustomAmountChange = (text) => {
    setCustomAmount(text);
    if (text && text.length > 0) {
      setSelectedOption("option2");
    }
  };

  // Check if the outstanding amount is overdue (due date has passed)
  const isOverdue = useMemo(() => {
    if (!consumerData) return false;
    const dueDate = getConsumerDueDate(consumerData);
    if (!dueDate) return false;
    const due = parseDueDate(dueDate);
    if (!due) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    return due < today;
  }, [consumerData]);

  // Get the payment amount based on selected option
  const getPaymentAmount = () => {
    if (selectedOption === "option1") {
      // TESTING MODE: For Razorpay integration testing, charge only ₹1
      // Change IS_TESTING_MODE to false at the top of file for production
      if (IS_TESTING_MODE) {
        console.log('🧪 TESTING MODE: Charging only ₹1 for Razorpay integration testing');
        return TEST_PAYMENT_AMOUNT; // ₹1 in paise (100 paise)
      }
      
      // PRODUCTION MODE: Charge full outstanding amount
      const outstanding = consumerData?.totalOutstanding || 0;
      // If outstanding is already in paise (large number), use as is
      // If outstanding is in rupees (small number), convert to paise
      const amountInPaise = outstanding > 1000 ? outstanding : Math.floor(outstanding * 100);
      return Math.floor(amountInPaise); // Ensure integer
    } else {
      // Custom amount - convert to paise and ensure integer
      const amount = parseFloat(customAmount) || 0;
      return Math.floor(amount * 100); // Convert to paise and ensure integer
    }
  };

  // Validate payment amount
  const validatePaymentAmount = () => {
    const amount = getPaymentAmount();
    if (amount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid payment amount.");
      return false;
    }
    if (amount < 100) { // Minimum ₹1
      Alert.alert("Minimum Amount", "Minimum payment amount is ₹1.");
      return false;
    }
    return true;
  };

  // Handle payment processing
  const handlePayment = async () => {
    try {
      if (!validatePaymentAmount()) {
        return;
      }
      const token = await authService.getValidAccessToken();
      if (!token) {
        Alert.alert(
          "Session Expired",
          "Session expired. Please sign in again.",
          [{ text: "OK", onPress: () => navigation.replace("Login") }]
        );
        return;
      }

      setIsPaymentProcessing(true);

      const paymentAmount = getPaymentAmount();
      
      // CRITICAL: Ensure amount is an integer (Razorpay requires integer in paise)
      const amountInPaise = Math.floor(Number(paymentAmount));
      if (isNaN(amountInPaise) || amountInPaise <= 0) {
        throw new Error('Invalid payment amount. Amount must be a positive number.');
      }
      
      // Extract bill_id from consumerData for outstanding payments
      // Check multiple possible fields where bill_id might be stored
      let billId = null;
      if (selectedOption === "option1") {
        // For outstanding payments, try to get bill_id from consumerData first
        billId = consumerData?.billId || 
                 consumerData?.bill_id || 
                 consumerData?.latestBillId ||
                 consumerData?.currentBillId ||
                 consumerData?.lastBillId ||
                 consumerData?.bill?.id ||
                 consumerData?.bill?.billId ||
                 consumerData?.latestBill?.id ||
                 consumerData?.latestBill?.billId ||
                 null;
        
        // CRITICAL: If bill_id is not found in consumerData, MUST fetch from billing history
        // bill_id is REQUIRED for order creation - without it, order_id cannot be generated
        if (!billId && consumerData?.uniqueIdentificationNo) {
          console.log('🔍 bill_id not found in consumerData, fetching from billing history (REQUIRED for order creation)...');
          try {
            const billingHistoryResult = await fetchBillingHistory(consumerData.uniqueIdentificationNo || consumerData.identifier);
            if (billingHistoryResult.success && billingHistoryResult.data) {
              const billingData = Array.isArray(billingHistoryResult.data) 
                ? billingHistoryResult.data 
                : [billingHistoryResult.data];
              
              // Get the latest bill (first item in array, or most recent)
              const latestBill = billingData.length > 0 ? billingData[0] : null;
              if (latestBill) {
                billId = latestBill.bill_id || 
                        latestBill.billId || 
                        latestBill.id ||
                        latestBill.bill_no ||
                        latestBill.billNumber ||
                        null;
                
                if (billId) {
                  console.log('✅ Found bill_id from billing history:', billId);
                }
              }
            }
          } catch (error) {
            console.error('❌ Could not fetch bill_id from billing history:', error.message);
          }
        }
        
        // CRITICAL: bill_id is REQUIRED for order creation
        // Without bill_id, order_id cannot be generated properly
        if (!billId) {
          const errorMsg = 'bill_id is required for payment order creation. Unable to find bill_id in consumer data or billing history.';
          console.error('❌ CRITICAL:', errorMsg);
          throw new Error(errorMsg);
        }
        
        console.log('✅ bill_id found and ready for order creation:', {
          'bill_id': billId,
          'bill_id_type': typeof billId,
          'billId_source': consumerData?.billId ? 'consumerData' : 'billingHistory',
          'note': 'bill_id is REQUIRED - order_id cannot be generated without it'
        });
      }
      // For custom payments, bill_id will be created by backend during verification
      
      // TESTING MODE: Update description for test payments
      const isTestPayment = IS_TESTING_MODE && selectedOption === "option1";
      const paymentDescription = isTestPayment 
        ? `Energy Bill Payment - Test Payment (₹1)` 
        : `Energy Bill Payment - ${selectedOption === "option1" ? "Outstanding Amount" : "Custom Amount"}`;
      
      const paymentData = {
        amount: amountInPaise, // CRITICAL: Must be integer in paise
        currency: 'INR',
        description: paymentDescription,
        consumer_id: consumerData?.uniqueIdentificationNo || consumerData?.identifier,
        consumer_name: consumerData?.name || consumerData?.consumerName,
        email: consumerData?.email || 'customer@bestinfra.com',
        contact: consumerData?.contact || '9876543210',
        bill_type: selectedOption === "option1" ? "outstanding" : "custom",
        // CRITICAL: Include bill_id for outstanding payments (main input)
        bill_id: billId,
        billId: billId, // Include both formats for compatibility
        custom_amount: selectedOption === "option2" ? (customAmount ? String(customAmount) : null) : null,
        // Include outstanding amount for bill generation (actual outstanding, not test amount)
        outstanding_amount: selectedOption === "option1" ? (consumerData?.totalOutstanding || 0) : null,
        // Flag to indicate this is a test payment
        is_test_payment: isTestPayment,
      };
      
      console.log('✅ Payment data prepared:', {
        amount: paymentData.amount,
        amount_type: typeof paymentData.amount,
        amount_in_rupees: (paymentData.amount / 100).toFixed(2),
        is_test_payment: isTestPayment,
        bill_id: paymentData.bill_id || '(will be created by backend)',
        bill_type: paymentData.bill_type,
        consumer_id: paymentData.consumer_id,
        actual_outstanding: consumerData?.totalOutstanding || 0
      });

      await processRazorpayPayment(paymentData, navigation, setShowPaymentModal, setOrderData);

    } catch (error) {
      console.error('❌ Payment error:', error);
      const isSessionExpired = error?.code === 'SESSION_EXPIRED' || (error?.message && String(error.message).includes('Session expired'));
      if (isSessionExpired) {
        Alert.alert(
          "Session Expired",
          "Session expired. Please sign in again.",
          [{ text: "OK", onPress: () => navigation.replace("Login") }]
        );
        return;
      }
      Alert.alert(
        "Payment Failed", 
        error.message || "An error occurred while processing payment. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsPaymentProcessing(false);
    }
  };

  // Handle payment success
  const onPaymentSuccess = async (paymentResponse) => {
    try {
      console.log('✅ Payment successful, verifying and storing in database...');
      const result = await handlePaymentSuccess(paymentResponse, navigation, setShowPaymentModal);
      
      if (result?.sessionExpired) {
        Alert.alert(
          "Session Expired",
          "Session expired. Please sign in again.",
          [{ text: "OK", onPress: () => navigation.replace("Login") }]
        );
        return;
      }
      if (result?.verificationSuccess === true && __DEV__) {
        console.log('✅ Payment verified and stored in database');
      }
    } catch (error) {
      console.error('❌ Payment success handling error:', error);
      Alert.alert(
        "Payment Verification Failed", 
        error.message || "Payment was successful but verification failed. Please contact support if the transaction is not reflected.",
        [{ text: "OK" }]
      );
    }
  };

  // Handle payment error
  const onPaymentError = (error) => {
    try {
      handlePaymentError(error, setShowPaymentModal);
      setOrderData(null); // Clear order data on error
    } catch (err) {
      Alert.alert("Payment Error", err.message);
      setOrderData(null); // Clear order data on error
    }
  };

  // Fetch consumer data and outstanding amount with caching
  useEffect(() => {
    refreshConsumer({ force: true });
  }, [refreshConsumer]);

  // Derive outstanding amount from context's consumerData
  useEffect(() => {
    if (consumerData?.totalOutstanding !== undefined) {
      const formattedAmount = consumerData.totalOutstanding.toLocaleString('en-IN', {
        maximumFractionDigits: 2,
      });
      setOutstandingAmount(formattedAmount);
    } else {
      setOutstandingAmount("NA");
    }
    if (!isConsumerLoading) setIsLoading(false);
  }, [consumerData, isConsumerLoading]);

  return (
    <KeyboardAvoidingView 
      style={[styles.keyboardAvoidingView, isDark && { backgroundColor: themeColors.screen }]} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <ScrollView
        style={[styles.Container, isDark && { backgroundColor: themeColors.screen }]}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <DashboardHeader 
          navigation={navigation} 
          variant="payments" 
          showBalance={false}
          consumerData={consumerData}
          isLoading={isConsumerLoading}
        />

        <View style={[styles.contentOnTop, isDark && { backgroundColor: themeColors.screen }]}>
        <View style={styles.contentSection}>
          {/* Input Boxes Section – skeleton when loading (same shimmer as Tickets/Invoices/Usage) */}
          <View style={styles.inputSection}>
            {isLoading ? (
              <SkeletonRechargeCard isDark={isDark} styles={styles} />
            ) : (
              <>
                {/* Outstanding Amount */}
                <View style={[
                  styles.amountCard1,
                  selectedOption === "option1" && styles.amountCardSelected1,
                  isDark && { backgroundColor: '#1A1F2E' }
                ]}>
                  <View style={styles.amountCardHeader}>
                    <Text style={[styles.amountCardTitle, isDark && { color: '#FFFFFF' }]}>Outstanding Amount</Text>
                    <View style={[
                      styles.statusDot,
                      selectedOption === "option1" && styles.statusDotSelected
                    ]} />
                  </View>
                  <View style={styles.amountInputContainer}>
                    <Input
                      placeholder={outstandingAmount}
                      value={selectedOption === "option1" ? outstandingAmount : ""}
                      editable={false}
                      style={styles.amountInput}
                      containerStyle={[
                        styles.amountInput,
                        isDark && {
                          backgroundColor: "#1F2E34",
                        },
                      ]}
                      onChangeText={handleCustomAmountChange}
                      inputStyle={[
                        styles.amountInputText,
                        isOverdue && styles.amountInputOverdue,
                        isDark && { color: themeColors?.textPrimary ?? "#FFFFFF" },
                      ]}
                    />
                  </View>
                </View>
              </>
            )}

            {/* Overdue Amount */}
             {/* <View style={[
              styles.amountCard2,
              selectedOption === "option2" && styles.amountCardSelected2
            ]}>
              <View style={styles.amountCardHeader}>
                <Text style={styles.amountCardTitle}>Overdue Amount</Text>
                <View style={[
                  styles.statusDot,
                  selectedOption === "option2" && styles.statusDotSelected
                ]} />
              </View>
              <View style={styles.amountInputContainer}>
                <Input
                  placeholder="Enter Custom Amount"
                  value={selectedOption === "option2" ? customAmount : ""}
                  onChangeText={handleCustomAmountChange}
                  style={styles.amountInput}
                  keyboardType="numeric"
                  returnKeyType="done"
                />
              </View>
            </View> */}
          </View>
        </View>
        </View>
      </ScrollView>
      <View style={styles.buttonContainer}>
        <Button 
          title={isPaymentProcessing ? "Processing Payment..." : "Proceed to Recharge"} 
          variant="primary" 
          size="medium" 
          onPress={handlePayment}
          disabled={isPaymentProcessing || isLoading}
        />
        {isPaymentProcessing && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={COLORS.secondaryColor} />
            <Text style={styles.loadingText}>Please wait while we process your payment...</Text>
          </View>
        )}
      </View>

      {/* Razorpay WebView Modal */}
      <DirectRazorpayPayment
        visible={showPaymentModal && orderData !== null}
        onClose={() => {
          setShowPaymentModal(false);
          setOrderData(null);
        }}
        onSuccess={onPaymentSuccess}
        onError={onPaymentError}
        orderData={orderData}
      />
      
      {/* Bottom Navigation */}
      <BottomNavigation navigation={navigation} />
    </KeyboardAvoidingView>
  );
};

export default PostPaidRechargePayments;

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
    backgroundColor: COLORS.secondaryFontColor,
  },
  Container: {
    flex: 1,
    backgroundColor: COLORS.secondaryFontColor,
    borderTopLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  contentOnTop: {
    zIndex: 1,
    backgroundColor: COLORS.secondaryFontColor,
    borderTopLeftRadius: 30,
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: 180, 
  },
  bluecontainer: {
    backgroundColor: "#eef8f0",
    padding: 15,
  },
  TopMenu: {    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 15,
  },
  barsIcon: {
    backgroundColor: COLORS.secondaryFontColor,
    width: 54,
    height: 54,
    borderRadius: 60,
    alignItems: "center",    
    justifyContent: "center",
    elevation: 5,
    zIndex: 2,
  },  logo: {
    width: 80,
    height: 80,
    zIndex: 1,
  },
  bellIcon: {
    backgroundColor: COLORS.secondaryFontColor,
    width: 54,
    height: 54,
    borderRadius: 60,
    alignItems: "center",    justifyContent: "center",
    elevation: 5,
    zIndex: 2,
  },
  ProfileBox: {    justifyContent: "space-between",
    flexDirection: "row",
    marginHorizontal: 4,
  },
  usageText: {
    color: COLORS.primaryFontColor,
    fontFamily: "Manrope-Medium",
    fontSize: 16,
    textAlign: "center",
    paddingTop: 0,
    marginTop: 30,
  },
  hiText: {
    color: COLORS.primaryFontColor,
    fontSize: 18,
    fontFamily: "Manrope-Bold",
  },
  stayingText: {
    color: COLORS.primaryFontColor,
    fontSize: 14,
    fontFamily: "Manrope-Regular",
  },
  balanceText: {
    color: COLORS.primaryFontColor,
    marginLeft: 20,
    fontSize: 14,
    fontFamily: "Manrope-Regular",
  },
  amountText: {
    color: COLORS.primaryColor,
    fontSize: 20,
    fontFamily: "Manrope-Bold",
  },

  plusBox: {
    marginLeft: 7,
  },
  amountContainer: {
    backgroundColor: COLORS.primaryColor,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderRadius: 8,
    alignItems: "center",
    paddingHorizontal: 15,
  },
  dueText: {
    color: COLORS.secondaryFontColor,
    fontSize: 14,
    fontFamily: "Manrope-Medium",
  },
  dateText: {
    color: COLORS.secondaryFontColor,
    fontSize: 10,
    fontFamily: "Manrope-Regular",
  },
  greenBox: {    flexDirection: "row",
    backgroundColor: COLORS.secondaryColor,
    borderRadius: 8,
    justifyContent: "space-between",
    paddingHorizontal: 10,
    alignItems: "center",
    padding: 10,
    marginTop: 3,
  },
  payText: {
    color: COLORS.secondaryFontColor,
    fontSize: 16,
    fontFamily: "Manrope-Bold",
  },
  tostayText: {
    color: COLORS.secondaryFontColor,
    fontSize: 16,
    fontFamily: "Manrope-Bold",
  },
  avoidText: {
    color: COLORS.secondaryFontColor,
    fontSize: 10,
    fontFamily: "Manrope-Regular",
  },
  paynowbox: {
    backgroundColor: COLORS.secondaryFontColor,
    height: 35,
    width: 95,
    borderRadius: 5,    justifyContent: "center",
  },
  paynowText: {
    color: COLORS.primaryFontColor,
    fontSize: 12,
    fontFamily: "Manrope-Medium",
    textAlign: "center",  },
  iconsContainer: {    flexDirection: "row",
    justifyContent: "space-evenly",
    marginTop: 15,
  },
  individualBox: {
    alignItems: "center",
    width: 85,
  },
  iconBox: {
    backgroundColor: COLORS.secondaryFontColor,
    borderRadius: 35,
    elevation: 1,
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBoxActive: {
    backgroundColor: COLORS.secondaryColor,
    borderRadius: 35,
    elevation: 1,
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    color: COLORS.primaryFontColor,
    fontSize: 10,
    fontFamily: "Manrope-Regular",
    marginTop: 5,
  },
  logoWrapper: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  ring: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1,
    borderColor: "#BABECC66",
    opacity: 0.2,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    // paddingBottom: Platform.OS === 'ios' ? 40 : 30,
    paddingTop: 10,
    zIndex: 10,
    // backgroundColor: COLORS.secondaryFontColor,
    // borderTopWidth: 1,
    // borderTopColor: '#F0F0F0',
    // elevation: 8,
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: -2 },
    // shadowOpacity: 0.1,
    // shadowRadius: 4,
  },
  buttonContainerInner: {    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  contentSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  inputContainer: {
  },
  rechargeOptionsContainer: {
    borderWidth: 2,
    borderColor: '#CAE8D1',
    borderRadius: 8,
    borderStyle: "dashed",
    padding: 16,
  },
  rechargeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  rechargeHeading: {
    color: COLORS.primaryFontColor,
    fontSize: 16,
    fontFamily: 'Manrope-Bold',
  },
  rechargesubheading: {
    color: '#666',
    fontSize: 12,
    fontFamily: 'Manrope-Regular',
  },
  radioGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    gap: 12,
  },
  radioGroupContainer: {
    marginBottom: 24,
  },
  inputSection: {
    gap: 16,
  },
  amountCard1: {
    backgroundColor: COLORS.secondaryFontColor,
    borderRadius: 5,
    padding: 16,
    gap: 10,
  },
  amountCard2: {
    backgroundColor: COLORS.secondaryFontColor,
    borderRadius: 5,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#CAE8D1',
    borderStyle: 'dashed',
    gap: 10,
  },
  amountCardSelected1: {
    borderColor: COLORS.secondaryColor,
    borderWidth: 1.5,
  },
  amountCardSelected2: {
    // borderColor: COLORS.secondaryColor,
    // borderWidth: 3,
    // borderStyle: 'dashed',
    // elevation: 2,
    // shadowOpacity: 0.1,
  },
  amountCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountCardTitle: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    color: COLORS.primaryFontColor,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E5E5E5',
  },
  statusDotSelected: {
    backgroundColor: COLORS.secondaryColor,
  },
  amountInputContainer: {
    height: 50,
  },
  amountInput: {
    backgroundColor: '#F8F8F8',
    borderRadius: 6,
    borderWidth: 0,
  },
  amountInputText: {
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
    color: '#000',
  },
  amountInputOverdue: {
    color: '#9b9b9b',
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    fontFamily: 'Manrope-Regular',
    color: COLORS.primaryFontColor,
  },
});
