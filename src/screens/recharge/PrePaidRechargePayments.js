import { 
    StyleSheet, 
    View, 
    ScrollView, 
    Alert, 
    ActivityIndicator, 
    KeyboardAvoidingView, 
    Platform 
  } from "react-native";
  import { Text } from "@components/global/Text";
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
    processPrepaidRazorpayPayment,
    handlePrepaidPaymentSuccess,
    handlePaymentError,
    formatAmount
  } from "../../services/paymentService";
  import { getConsumerDueDate, getPrepaidBalance } from "../../utils/billingUtils";
  import { parseDueDate } from "../../utils/dateUtils";
  import { Shimmer, SHIMMER_LIGHT, SHIMMER_DARK } from "../../utils/loadingManager";
import { StatusBar } from "expo-status-bar";
  
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
  
// ============================================================================
  
  const PrePaidRechargePayments = ({ navigation }) => {
    const { isDark, colors: themeColors } = useTheme();
    const [selectedOption, setSelectedOption] = useState("customAmount");
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
        setSelectedOption("customAmount");
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
  
    // Get the payment amount - prepaid always uses custom recharge amount
    const getPaymentAmount = () => {
      // Prepaid: only custom amount (recharge)
      const amount = parseFloat(customAmount) || 0;
      return Math.floor(amount * 100); // Convert to paise and ensure integer
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

        // accountId: use prepaidAccountId from consumer API (required for prepaid recharge)
        const accountId = consumerData?.prepaidAccountId ?? consumerData?.accountId ?? consumerData?.id ?? consumerData?.account_id;
        const accountIdNum = accountId != null ? Number(accountId) : NaN;
        if (isNaN(accountIdNum) || accountIdNum <= 0) {
          Alert.alert(
            "Account Not Found",
            "Unable to load your prepaid account. Please ensure you're logged in with a valid prepaid account and try again.",
            [{ text: "OK" }]
          );
          return;
        }
        
        const paymentDescription = `Prepaid Recharge - ₹${(amountInPaise / 100).toFixed(2)}`;
        
        // Payload for create-order: only accountId and amount (from API or fallback)
        const paymentData = {
          amount: amountInPaise,
          accountId: accountIdNum,
          description: paymentDescription,
          consumer_name: consumerData?.name || consumerData?.consumerName || 'Customer',
          email: consumerData?.emailId || consumerData?.email || 'customer@bestinfra.com',
          contact: consumerData?.mobileNo || consumerData?.contact || '9876543210',
        };
        
        console.log('✅ Prepaid recharge data prepared:', {
          accountId: paymentData.accountId,
          amount: paymentData.amount,
          amount_in_rupees: (paymentData.amount / 100).toFixed(2),
        });
  
        await processPrepaidRazorpayPayment(paymentData, navigation, setShowPaymentModal, setOrderData);
  
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
  
    // Handle payment success - verify via prepaid endpoint and refresh balance
    const onPaymentSuccess = async (paymentResponse) => {
      try {
        console.log('✅ Prepaid recharge successful, verifying...');
        const result = await handlePrepaidPaymentSuccess(paymentResponse, navigation, setShowPaymentModal, refreshConsumer);
        
        if (result?.sessionExpired) {
          Alert.alert(
            "Session Expired",
            "Session expired. Please sign in again.",
            [{ text: "OK", onPress: () => navigation.replace("Login") }]
          );
          return;
        }
        if (result?.verificationSuccess === true && __DEV__) {
          console.log('✅ Prepaid recharge verified, balance will be updated');
        }
      } catch (error) {
        console.error('❌ Prepaid payment success handling error:', error);
        Alert.alert(
          "Recharge Verification Failed", 
          error.message || "Recharge was successful but verification failed. Your balance will update shortly.",
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
  
    // Fetch consumer data from API only (skipDemo=true) - no demo data for prepaid recharge
    useEffect(() => {
      refreshConsumer({ force: true, skipDemo: true });
    }, [refreshConsumer]);
  
  // Derive balance from context's consumerData (prepaid: prepaidTransactions.balance)
  useEffect(() => {
    const balance = getPrepaidBalance(consumerData);
    if (balance !== null && balance !== undefined) {
      const formattedAmount = Number(balance).toLocaleString('en-IN', {
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
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
      <StatusBar style={isDark ? "light" : "dark"} />
      <ScrollView
          style={[styles.Container, isDark && { backgroundColor: themeColors.screen }]}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
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
                  {/* Balance (prepaid) */}
                  <View style={[
                    styles.amountCard1,
                    isDark && { backgroundColor: '#1A1F2E' }
                  ]}>
                    <View style={styles.amountCardHeader}>
                      <Text style={[styles.amountCardTitle, isDark && { color: '#FFFFFF' }]}>Balance</Text>
                      <View style={styles.statusDot} />
                    </View>
                    <View style={styles.amountInputContainer}>
                      <Input
                        placeholder={outstandingAmount}
                        value={outstandingAmount}
                        editable={false}
                        style={styles.amountInput}
                        containerStyle={[
                          styles.amountInput,
                          isDark && {
                            backgroundColor: "#1F2E34",
                          },
                        ]}
                        inputStyle={[
                          styles.amountInputText,
                          isDark && { color: themeColors?.textPrimary ?? "#FFFFFF" },
                          { opacity: 1 },
                        ]}
                      />
                    </View>
                  </View>
                </>
              )}

              {/* Custom Amount */}
               <View style={[
                styles.amountCard2,
                selectedOption === "customAmount" && styles.amountCardSelected2
              ]}>
                <View style={styles.amountCardHeader}>
                  <Text style={styles.amountCardTitle}>Custom Amount</Text>
                  <View style={[
                    styles.statusDot,
                    selectedOption === "customAmount" && styles.statusDotSelected
                  ]} />
                </View>
                <View style={styles.amountInputContainer}>
                  <Input
                    placeholder="Enter Recharge Amount"
                    value={selectedOption === "customAmount" ? customAmount : ""}
                    onChangeText={handleCustomAmountChange}
                    style={styles.amountInput}
                    keyboardType="numeric"
                    returnKeyType="done"
                  />
                </View>
              </View>
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
  
  export default PrePaidRechargePayments;
  
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
      bottom: 120,
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
      borderRadius: 5,
      borderWidth: 0,
    },
    amountInputText: {
      fontSize: 14,
      fontFamily: 'Manrope-Medium',
      color: COLORS.secondaryColor,
    },
    amountInputOverdue: {
      color: '#9b9b9b',
      fontWeight: '600',
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    loadingText: {
      fontSize: 12,
      fontFamily: 'Manrope-Regular',
      color: COLORS.primaryFontColor,
    },
  });
  