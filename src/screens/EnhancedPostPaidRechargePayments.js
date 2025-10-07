/**
 * Enhanced PostPaid Recharge Payments Screen
 * 
 * Based on web implementation best practices
 * Uses proper backend integration, verification, and error handling
 */

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
import { COLORS } from "../constants/colors";
import React, { useState, useEffect, useCallback } from "react";
import Input from "../components/global/Input";
import Button from "../components/global/Button";
import DashboardHeader from "../components/global/DashboardHeader";
import DirectRazorpayPayment from "../components/DirectRazorpayPayment";
import { getUser } from "../utils/storage";
import { API, API_ENDPOINTS } from "../constants/constants";
import { fetchConsumerData, syncConsumerData } from "../services/apiService";
import { getCachedConsumerData } from "../utils/cacheManager";
import { 
  processCompletePayment,
  handlePaymentSuccess,
  handlePaymentError,
  validatePaymentData
} from "../services/EnhancedPaymentService";

const EnhancedPostPaidRechargePayments = ({ navigation }) => {
  const [selectedOption, setSelectedOption] = useState("option1");
  const [customAmount, setCustomAmount] = useState("");
  const [outstandingAmount, setOutstandingAmount] = useState("NA");
  const [isLoading, setIsLoading] = useState(true);
  const [consumerData, setConsumerData] = useState(null);
  const [isConsumerLoading, setIsConsumerLoading] = useState(true);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [paymentError, setPaymentError] = useState(null);

  const handleCustomAmountChange = (text) => {
    setCustomAmount(text);
    if (text && text.length > 0) {
      setSelectedOption("option2");
    }
  };

  // Get the payment amount based on selected option
  const getPaymentAmount = () => {
    if (selectedOption === "option1") {
      // Outstanding amount
      return consumerData?.totalOutstanding || 0;
    } else {
      // Custom amount
      const amount = parseFloat(customAmount) || 0;
      return amount * 100; // Convert to paise
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

  // Enhanced payment handler (like web version)
  const handlePayment = useCallback(async () => {
    try {
      setPaymentError(null);
      setIsPaymentProcessing(true);

      const paymentAmount = getPaymentAmount();
      
      // Prepare payment data (like web version)
      const paymentData = {
        amount: paymentAmount,
        currency: 'INR',
        description: `Energy Bill Payment - ${selectedOption === "option1" ? "Outstanding Amount" : "Custom Amount"}`,
        consumer_id: consumerData?.uniqueIdentificationNo || consumerData?.identifier,
        consumer_name: consumerData?.name || consumerData?.consumerName,
        email: consumerData?.email || 'customer@bestinfra.com',
        contact: consumerData?.contact || '9876543210',
        bill_type: selectedOption === "option1" ? "outstanding" : "custom",
        custom_amount: selectedOption === "option2" ? customAmount : null,
      };

      // Validate payment data (like web version)
      const validation = validatePaymentData(paymentData);
      if (!validation.isValid) {
        setPaymentError(validation.errors[0]);
        return;
      }

      console.log('🚀 Processing payment:', paymentData);

      // Process payment using enhanced service
      const result = await processCompletePayment(
        paymentData,
        navigation,
        setShowPaymentModal,
        setOrderData
      );

      // Log fallback mode only in development
      if (result && result.fallback && __DEV__) {
        console.log('ℹ️ Payment processing in fallback mode (backend routes not available)');
      }

    } catch (error) {
      console.error('❌ Payment error:', error);
      
      const errorMessage = error.message || "An error occurred while processing payment. Please try again.";
      setPaymentError(errorMessage);
      
      // Show user-friendly error alert (like web version)
      Alert.alert(
        "Payment Failed", 
        errorMessage,
        [
          { 
            text: "Try Again", 
            onPress: () => setPaymentError(null) 
          },
          { 
            text: "Cancel", 
            style: "cancel" 
          }
        ]
      );
    } finally {
      setIsPaymentProcessing(false);
    }
  }, [selectedOption, consumerData, customAmount, navigation]);

  // Enhanced payment success handler (like web version)
  const onPaymentSuccess = useCallback(async (paymentResponse) => {
    try {
      console.log('✅ Payment successful:', paymentResponse);
      
      // Get bill ID for tracking (like web version)
      const billId = consumerData?.uniqueIdentificationNo || consumerData?.identifier;
      
      const result = await handlePaymentSuccess(
        paymentResponse, 
        navigation, 
        setShowPaymentModal,
        billId
      );

      // Log fallback verification only in development
      if (result && result.fallback && __DEV__) {
        console.log('ℹ️ Payment verification in fallback mode (backend routes not available)');
      }
      
    } catch (error) {
      console.error('❌ Payment success handling failed:', error);
      
      Alert.alert(
        "Payment Verification Failed", 
        error.message || "Payment was successful but verification failed. Please contact support.",
        [
          { 
            text: "Contact Support", 
            onPress: () => {
              // Navigate to support or show contact info
              console.log('Navigate to support');
            }
          },
          { 
            text: "OK", 
            style: "default" 
          }
        ]
      );
    }
  }, [navigation, consumerData]);

  // Enhanced payment error handler (like web version)
  const onPaymentError = useCallback((error) => {
    try {
      console.error('❌ Payment error:', error);
      
      handlePaymentError(error, setShowPaymentModal);
      setOrderData(null);
      
    } catch (err) {
      console.error('❌ Payment error handling failed:', err);
      
      Alert.alert(
        "Payment Error", 
        err.message || "An unexpected error occurred. Please try again.",
        [{ text: "OK" }]
      );
      
      setOrderData(null);
    }
  }, []);

  // Fetch consumer data and outstanding amount with caching
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsConsumerLoading(true);
        setIsLoading(true);
        const user = await getUser();
        
        if (user && user.identifier) {
          // Try to get cached data first for instant display
          const cachedResult = await getCachedConsumerData(user.identifier);
          if (cachedResult.success) {
            setConsumerData(cachedResult.data);
            
            // Extract outstanding amount from cached data
            if (cachedResult.data && cachedResult.data.totalOutstanding !== undefined) {
              const formattedAmount = cachedResult.data.totalOutstanding.toLocaleString('en-IN', {
                maximumFractionDigits: 2
              });
              setOutstandingAmount(formattedAmount);
            }
            
            setIsConsumerLoading(false);
            setIsLoading(false);
          }
          
          // Fetch fresh data
          const result = await fetchConsumerData(user.identifier);
          if (result.success) {
            setConsumerData(result.data);
            
            // Extract outstanding amount from fresh data
            if (result.data && result.data.totalOutstanding !== undefined) {
              const formattedAmount = result.data.totalOutstanding.toLocaleString('en-IN', {
                maximumFractionDigits: 2
              });
              setOutstandingAmount(formattedAmount);
            } else {
              setOutstandingAmount("NA");
            }
          } else {
            setOutstandingAmount("NA");
          }
          
          // Background sync
          syncConsumerData(user.identifier).catch(error => {
            console.error('Background sync failed:', error);
          });
        }
      } catch (error) {
        console.error('Error fetching consumer data:', error);
        setOutstandingAmount("NA");
      } finally {
        setIsConsumerLoading(false);
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <KeyboardAvoidingView 
      style={styles.keyboardAvoidingView} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <StatusBar barStyle="dark-content" />
      <ScrollView
        style={styles.Container}
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

        <View style={styles.contentSection}>
          {/* Input Boxes Section */}
          <View style={styles.inputSection}>
            {/* Outstanding Amount */}
            <View style={[
              styles.amountCard1,
              selectedOption === "option1" && styles.amountCardSelected1
            ]}>
              <View style={styles.amountCardHeader}>
                <Text style={styles.amountCardTitle}>Outstanding Amount</Text>
                <View style={[
                  styles.statusDot,
                  selectedOption === "option1" && styles.statusDotSelected
                ]} />
              </View>
              <View style={styles.amountInputContainer}>
                <Input
                  placeholder={isLoading ? "Loading..." : outstandingAmount}
                  value={selectedOption === "option1" ? (isLoading ? "Loading..." : outstandingAmount) : ""}
                  editable={false}
                  style={styles.amountInput}
                />
              </View>
            </View>

            {/* Custom Amount */}
            <View style={[
              styles.amountCard2,
              selectedOption === "option2" && styles.amountCardSelected2
            ]}>
              <View style={styles.amountCardHeader}>
                <Text style={styles.amountCardTitle}>Custom Amount</Text>
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
            </View>
          </View>
        </View>
        
        {/* Payment Error Display */}
        {paymentError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {paymentError}</Text>
          </View>
        )}
      </ScrollView>
      
      <View style={styles.buttonContainer}>
        <Button 
          title={isPaymentProcessing ? "Processing Payment..." : "Proceed to Payment"} 
          variant="primary" 
          size="medium" 
          onPress={handlePayment}
          disabled={isPaymentProcessing || isLoading || !validatePaymentAmount()}
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
    </KeyboardAvoidingView>
  );
};

export default EnhancedPostPaidRechargePayments;

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
  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: 120, // Space for the button container
  },
  contentSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
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
    shadowOpacity: 0.1,
  },
  amountCardSelected2: {
    borderColor: COLORS.secondaryColor,
    borderWidth: 1.5,
    borderStyle: 'solid',
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
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
    color: COLORS.primaryFontColor,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    borderColor: '#f44336',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
    textAlign: 'center',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 30,
    paddingTop: 20,
    backgroundColor: COLORS.secondaryFontColor,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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

