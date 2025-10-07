import { StyleSheet, Text, View, ScrollView, StatusBar } from "react-native";
import { COLORS } from "../constants/colors";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import Input from "../components/global/Input";
import Button from "../components/global/Button";
import RechargeRadioButton from "../components/global/RechargeRadioButton";
import DashboardHeader from "../components/global/DashboardHeader";
import { fetchConsumerData, syncConsumerData } from "../services/apiService";
import { getUser } from "../utils/storage";
import { getCachedConsumerData } from "../utils/cacheManager";


const Payments = React.memo(({ navigation }) => {
  const [selectedOption, setSelectedOption] = useState("option3");
  const [customAmount, setCustomAmount] = useState("");
  const [consumerData, setConsumerData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch consumer data with caching
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const user = await getUser();
        
        if (user && user.identifier) {
          // Try to get cached data first for instant display
          const cachedResult = await getCachedConsumerData(user.identifier);
          if (cachedResult.success) {
            setConsumerData(cachedResult.data);
            setIsLoading(false);
          }
          
          // Fetch fresh data
          const result = await fetchConsumerData(user.identifier);
          if (result.success) {
            setConsumerData(result.data);
          }
          
          // Background sync
          syncConsumerData(user.identifier).catch(error => {
            console.error('Background sync failed:', error);
          });
        }
      } catch (error) {
        console.error('Error fetching consumer data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const rechargeOptions = useMemo(() => [
    {
      value: "option1",
      label: "Option 1",
      amount: "₹1,245"
    },
    {
      value: "option2", 
      label: "Option 2",
      amount: "₹1,245"
    },
    {
      value: "option3",
      label: "Option 3", 
      amount: "₹1,245"
    }
  ], []);

  const handleOptionSelect = useCallback((value) => {
    setSelectedOption(value);
  }, []);

  const handleCustomAmountChange = useCallback((text) => {
    setCustomAmount(text);
    if (text && text.length > 0) {
      setSelectedOption("");
    }
  }, []);

  return (
    <>
      <ScrollView
        style={styles.Container}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >

        <StatusBar barStyle="dark-content" />
        <DashboardHeader 
          navigation={navigation} 
          variant="payments" 
          showBalance={false}
          consumerData={consumerData}
          isLoading={isLoading}
        />

        <View style={styles.contentSection}>
          <View style={styles.inputContainer}>
            <Input 
              placeholder="Enter Custom Amount" 
              value={customAmount}
              onChangeText={handleCustomAmountChange}
              keyboardType="numeric"
            />
          </View>
          
          <View style={styles.rechargeOptionsContainer}>
            <View style={styles.rechargeHeader}>
              <Text style={styles.rechargeHeading}>Recommended Options</Text>
              <Text style={styles.rechargesubheading}>Optional</Text>
            </View>
            <View style={styles.radioGroup}>
              {rechargeOptions.map((option) => (
                <RechargeRadioButton
                  key={option.value}
                  label={option.label}
                  amount={option.amount}
                  value={option.value}
                  selectedValue={selectedOption}
                  onSelect={handleOptionSelect}
                />
              ))}
            </View>
          </View>
        </View>

      </ScrollView>
      <View style={styles.buttonContainer}>
        <Button title="Proceed to Recharge" variant="primary" size="medium" onPress={() => navigation.navigate("PostPaidRechargePayments")} />
      </View>
    </>
  );
});

Payments.displayName = 'Payments';

export default Payments;

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
    alignItems: "center",    justifyContent: "center",
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
  buttonContainerInner: {    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  contentSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
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
    gap: 6,
  },
});