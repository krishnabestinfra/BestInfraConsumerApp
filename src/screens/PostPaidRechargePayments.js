import { StyleSheet, Text, View, ScrollView, StatusBar } from "react-native";
import { COLORS } from "../constants/colors";
import React, { useState, useEffect } from "react";
import Input from "../components/global/Input";
import Button from "../components/global/Button";
import DashboardHeader from "../components/global/DashboardHeader";
import { getUser } from "../utils/storage";
import { GLOBAL_API_URL } from "../constants/constants";


const PostPaidRechargePayments = ({ navigation }) => {

  const [selectedOption, setSelectedOption] = useState("option1");
  const [customAmount, setCustomAmount] = useState("");
  const [outstandingAmount, setOutstandingAmount] = useState("NA");
  const [isLoading, setIsLoading] = useState(true);

  const handleCustomAmountChange = (text) => {
    setCustomAmount(text);
    if (text && text.length > 0) {
      setSelectedOption("option2");
    }
  };

  // Fetch outstanding amount from API
  useEffect(() => {
    const fetchOutstandingAmount = async () => {
      try {
        setIsLoading(true);
        const user = await getUser();
        
        if (user && user.uid) {
          // Using the UID as the consumer identifier
          const response = await fetch(`http://${GLOBAL_API_URL}:4256/api/consumers/BI25GMRA012`);
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data && data.data.totalOutstanding !== undefined) {
              // Format the number with commas for better readability
              const formattedAmount = data.data.totalOutstanding.toLocaleString('en-IN', {
                maximumFractionDigits: 2
              });
              setOutstandingAmount(formattedAmount);
            } else {
              setOutstandingAmount("NA");
            }
          } else {
            console.error('Failed to fetch outstanding amount:', response.status);
            setOutstandingAmount("NA");
          }
        }
      } catch (error) {
        console.error('Error fetching outstanding amount:', error);
        setOutstandingAmount("NA");
      } finally {
        setIsLoading(false);
      }
    };

    fetchOutstandingAmount();
  }, []);

  return (
    <>
      <ScrollView
        style={styles.Container}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >

        <StatusBar barStyle="dark-content" />
        <DashboardHeader navigation={navigation} variant="payments" showBalance={false} />

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
                />
              </View>
            </View>
          </View>
        </View>

      </ScrollView>
      <View style={styles.buttonContainer}>
        <Button title="Proceed to Recharge" variant="primary" size="medium" onPress={() => navigation.navigate("PaymentStatus")} />
      </View>
    </>
  );
};

export default PostPaidRechargePayments;

const styles = StyleSheet.create({
  Container: {
    backgroundColor: COLORS.secondaryFontColor,
    borderTopLeftRadius: 30,
    borderBottomRightRadius: 30,
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
    paddingBottom: 40,
    paddingTop: 20,
    backgroundColor: COLORS.secondaryFontColor,

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
});