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
import React, { useState, useEffect } from "react";
import Input from "../components/global/Input";
import Button from "../components/global/Button";
import DashboardHeader from "../components/global/DashboardHeader";
import DirectRazorpayPayment from "../components/DirectRazorpayPayment";
import { getUser } from "../utils/storage";
import { GLOBAL_API_URL } from "../constants/constants";
import { fetchConsumerData, syncConsumerData } from "../services/apiService";
import { getCachedConsumerData } from "../utils/cacheManager";
import { 
  processRazorpayPayment, 
  handlePaymentSuccess, 
  handlePaymentError, 
  formatAmount 
} from "../services/paymentService";


const PostPaidRechargePayments = ({ navigation }) => {

  const [selectedOption, setSelectedOption] = useState("option1");
  const [customAmount, setCustomAmount] = useState("");
  const [outstandingAmount, setOutstandingAmount] = useState("NA");
  const [isLoading, setIsLoading] = useState(true);
  const [consumerData, setConsumerData] = useState(null);
  const [isConsumerLoading, setIsConsumerLoading] = useState(true);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [orderData, setOrderData] = useState(null);

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

  // Handle payment processing
  const handlePayment = async () => {
    try {
      if (!validatePaymentAmount()) {
        return;
      }

      setIsPaymentProcessing(true);

      const paymentAmount = getPaymentAmount();
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

      await processRazorpayPayment(paymentData, navigation, setShowPaymentModal, setOrderData);

    } catch (error) {
      console.error('❌ Payment error:', error);
      
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
      await handlePaymentSuccess(paymentResponse, navigation, setShowPaymentModal);
    } catch (error) {
      Alert.alert("Payment Verification Failed", error.message);
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

            {/* Overdue Amount */}
            <View style={[
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
  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: 120, // Space for the button container
  },
  bluecontainer: {
    backgroundColor: "#eef8f0",
    padding: 15,
  },
  TopMenu: {
    display: "flex",
    flexDirection: "row",
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
    verticalAlign: "middle",
    justifyContent: "center",
    elevation: 5,
    zIndex: 2,
  },
  logoImage: {},
  logo: {
    width: 80,
    height: 80,
    zIndex: 1,
  },
  bellIcon: {
    backgroundColor: COLORS.secondaryFontColor,
    width: 54,
    height: 54,
    borderRadius: 60,
    alignItems: "center",
    verticalAlign: "middle",
    justifyContent: "center",
    elevation: 5,
    zIndex: 2,
  },
  ProfileBox: {
    display: "flex",
    justifyContent: "space-between",
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
    display: "flex",
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
  greenBox: {
    display: "flex",
    flexDirection: "row",
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
    borderRadius: 5,
    display: "flex",
    justifyContent: "center",
  },
  paynowText: {
    color: COLORS.primaryFontColor,
    fontSize: 12,
    fontFamily: "Manrope-Medium",
    textAlign: "center",
    verticalAlign: "middle",
  },
  iconsContainer: {
    display: "flex",
    flexDirection: "row",
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
  buttonContainerInner: {
    display: 'flex',
    flexDirection: 'row',
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
    shadowOpacity: 0.1,
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
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
    color: COLORS.primaryFontColor,
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