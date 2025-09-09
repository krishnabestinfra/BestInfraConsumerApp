import { StyleSheet, Text, View, Pressable, ScrollView, Dimensions, TouchableOpacity, StatusBar } from "react-native";
import { COLORS } from "../constants/colors";
import React, { useEffect, useRef, useState } from "react";
import Button from "../components/global/Button";
import SuccessIcon from "../../assets/icons/checkmark.svg";

const PaymentStatus = ({ navigation }) => {

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
            <Text style={styles.successDescription}>Transaction is successfully completed.</Text>
          </View>
          <View style={styles.amountContainer}>
            <View style={styles.amountSubContainer}>
              <Text style={styles.amountText}>Amount Paid</Text>
              <Text style={styles.amountValueText}>Rs. 560000</Text>
            </View>
            <View style={styles.billingAddressContainer}>
              <View style={{width:"40%"}}>
                <Text style={styles.billingAddressText}>Billing Address</Text>
              </View>
              <View style={styles.billingAddressValueContainer}>
                <Text style={styles.billingAddressValueText}>#209, 2nd Floor, B-Block, Besides Sarath City Capital Mall, Kondaput, Hitech City, Hyderabad, Telangana, India, PIN:500084</Text>
              </View>
            </View>
          </View>

        </View>
      </ScrollView>
      <View style={styles.buttonContainer}>
        <Text style={styles.getInvoiceText}>Get Invoice</Text>
        <Button title="Go to Dashboard" variant="primary" size="medium" onPress={() => navigation.navigate("Dashboard")} />
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
    display: "flex",
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
    display: "flex",
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
});