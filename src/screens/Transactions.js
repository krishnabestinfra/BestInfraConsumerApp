import { StyleSheet, Text, View, Pressable, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import React, { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { COLORS } from "../constants/colors";
import Menu from "../../assets/icons/bars.svg";
import Notification from "../../assets/icons/notification.svg";
import BiLogo from "../../assets/icons/Logo.svg";
import DatePicker from "../components/global/DatePicker";
import Table from "../components/global/Table";
import Button from "../components/global/Button";
import DownloadButton from "../components/global/DownloadButton";
import { getUser, getToken } from "../utils/storage";
import { API, API_ENDPOINTS } from "../constants/constants";


const Transactions = ({ navigation }) => {
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [tableData, setTableData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch payment history from API - try multiple endpoints
  const fetchPaymentHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      const user = await getUser();
      const token = await getToken();
      
      if (!user || !user.identifier) {
        setTableData([]);
        setIsLoading(false);
        return;
      }

      let paymentHistory = [];
      
      // Try payment history endpoint first
      try {
        const paymentHistoryUrl = API_ENDPOINTS.payment.history(user.identifier);
        console.log('🔄 Fetching payment history from:', paymentHistoryUrl);
        
        const paymentResponse = await fetch(paymentHistoryUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
        });
        
        if (paymentResponse.ok) {
          const paymentData = await paymentResponse.json();
          console.log('📦 Payment history response:', paymentData);
          
          // Handle different response structures
          if (paymentData.success && paymentData.data) {
            if (Array.isArray(paymentData.data)) {
              paymentHistory = paymentData.data;
            } else if (Array.isArray(paymentData.data.payments)) {
              paymentHistory = paymentData.data.payments;
            } else if (Array.isArray(paymentData.data.paymentHistory)) {
              paymentHistory = paymentData.data.paymentHistory;
            } else if (Array.isArray(paymentData.data.transactions)) {
              paymentHistory = paymentData.data.transactions;
            }
          } else if (Array.isArray(paymentData)) {
            paymentHistory = paymentData;
          }
        }
      } catch (paymentError) {
        console.warn('⚠️ Payment history endpoint failed, trying consumer endpoint:', paymentError);
      }
      
      // Fallback: Try consumer endpoint for payment history
      if (paymentHistory.length === 0) {
        try {
          const consumerResponse = await fetch(API_ENDPOINTS.consumers.get(user.identifier), {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              ...(token && { 'Authorization': `Bearer ${token}` }),
            },
          });
          
          if (consumerResponse.ok) {
            const consumerData = await consumerResponse.json();
            console.log('📦 Consumer data response:', consumerData);
            
            if (consumerData.success && consumerData.data) {
              // Try different possible locations for payment history
              if (Array.isArray(consumerData.data.paymentHistory)) {
                paymentHistory = consumerData.data.paymentHistory;
              } else if (Array.isArray(consumerData.data.payments)) {
                paymentHistory = consumerData.data.payments;
              } else if (Array.isArray(consumerData.data.transactions)) {
                paymentHistory = consumerData.data.transactions;
              } else if (consumerData.data.billing && Array.isArray(consumerData.data.billing.paymentHistory)) {
                paymentHistory = consumerData.data.billing.paymentHistory;
              }
            }
          }
        } catch (consumerError) {
          console.error('❌ Error fetching from consumer endpoint:', consumerError);
        }
      }
      
      // Transform payment history data for the table
      if (paymentHistory.length > 0) {
        const transformedData = paymentHistory.map((payment, index) => {
          // Handle different payment data structures
          const amount = payment.amount || payment.creditAmount || payment.paymentAmount || payment.totalAmount || 0;
          const date = payment.paymentDate || payment.date || payment.createdAt || payment.transactionDate || 'N/A';
          const transactionId = payment.transactionId || payment.paymentId || payment.razorpay_payment_id || payment.id || `TXN${index + 1}`;
          const paymentMode = payment.paymentMode || payment.payment_method || payment.method || 'UPI';
          const status = payment.status || (amount > 0 ? 'Success' : 'Failed');
          
          // Format date if it's a valid date string
          let formattedDate = date;
          if (date !== 'N/A' && date) {
            try {
              const dateObj = new Date(date);
              if (!isNaN(dateObj.getTime())) {
                formattedDate = dateObj.toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                });
              }
            } catch (e) {
              // Keep original date if parsing fails
            }
          }
          
          return {
            id: index + 1,
            transactionId: transactionId,
            date: formattedDate,
            amount: amount ? `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₹0.00',
            paymentMode: paymentMode,
            status: status
          };
        });
        
        // Sort by date (newest first)
        transformedData.sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateB - dateA;
        });
        
        setTableData(transformedData);
        console.log('✅ Loaded', transformedData.length, 'transactions');
      } else {
        setTableData([]);
        console.log('ℹ️ No payment history found');
      }
    } catch (error) {
      console.error('❌ Error fetching payment history:', error);
      setTableData([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchPaymentHistory();
  }, [fetchPaymentHistory]);

  // Refresh when screen is focused (e.g., after returning from payment)
  useFocusEffect(
    useCallback(() => {
      fetchPaymentHistory();
    }, [fetchPaymentHistory])
  );
  return (
    <>
    <ScrollView
      style={styles.Container}
      contentContainerStyle={{ paddingBottom: 30 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={fetchPaymentHistory}
          colors={[COLORS.secondaryColor]}
          tintColor={COLORS.secondaryColor}
        />
      }
    >
      <View style={styles.bluecontainer}>
        <View style={styles.TopMenu}>
          <Pressable
            style={styles.barsIcon}
            onPress={() => navigation.navigate("SideMenu")}
          >
            <Menu width={18} height={18} fill="#202d59" />
          </Pressable>
          <Pressable onPress={() => navigation.navigate("Dashboard")}>
            <BiLogo width={45} height={45} />
          </Pressable>
          <Pressable
            style={styles.bellIcon}
            onPress={() => navigation.navigate("Profile")}
          >
            <Notification width={18} height={18} fill="#202d59" />
          </Pressable>
        </View>
      </View>

      <View style={styles.TransactionsContainer}>
        <Text style={styles.ViewText}>View Transactions</Text>
        <TouchableOpacity>
          <Text style={styles.CreateText}>Pick Date</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.datePickerSection}>
        <DatePicker
          placeholder="Start Date"
          value={startDate}
          onChange={setStartDate}
        />
        <DatePicker
          placeholder="End Date"
          value={endDate}
          onChange={setEndDate}
        />
      </View>

      <View>
        <Table
          data={tableData}
          loading={isLoading}
          skeletonLines={tableData.length > 0 ? tableData.length : 5}
          emptyMessage="No transaction data available"
          showSerial={true}
          showPriority={false}
          columns={[
            { key: 'date', title: 'Date', flex: 1.2 },
            // { key: 'transactionId', title: 'Transaction ID', flex: 2 },
            { key: 'amount', title: 'Amount', flex: 1 },
            { key: 'status', title: 'Status', flex: 1 },
            { key: 'paymentMode', title: 'Mode', flex: 1 },
           
          ]}
        />
      </View>
    </ScrollView>
    {/* {tableData.length > 0 && ( 
     <View style={styles.buttonContainer}>
     <View style={styles.buttonContainerInner}>
       <Button title="View"
         variant="outline"
         size="medium"
         style={styles.button}
         textStyle={styles.forgotText}
       />
       <DownloadButton 
         data={tableData}
         columns={[
           // { key: 'transactionId', title: 'Transaction ID' },
           { key: 'date', title: 'Date' },
           { key: 'amount', title: 'Amount' },
           { key: 'paymentMode', title: 'Mode' },
           { key: 'status', title: 'Status' }
         ]}
         fileName="transactions"
         title="Download"
         variant="primary"
         size="medium"
         style={styles.button}
         textStyle={styles.forgotText}
       />
     </View>
   </View>
    )}  */}
    </>
  );
};

export default Transactions;

const styles = StyleSheet.create({
  Container: {
    backgroundColor: COLORS.secondaryFontColor,
  },
  bluecontainer: {
    backgroundColor: "#eef8f0",
    padding: 15,
  },
  TopMenu: {
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
    justifyContent: "center",
    // Android shadow
    elevation: 5,
  },
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
    justifyContent: "center",
    elevation: 5,
  },
  ProfileBox: {
    justifyContent: "space-between",
    flexDirection: "row",
    marginHorizontal: 4,
  },
  usageText: {
    color: COLORS.primaryFontColor,
    fontFamily: "Manrope-Medium",
    fontSize: 16,
    // textAlign: "center",
    // marginTop:30,
  },
  TransactionsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: COLORS.secondaryFontColor,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 8,
    // iOS shadow
    shadowColor: "rgba(0, 0, 0, 0.02)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    // Android shadow
    elevation: 5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(186, 190, 204, 0.4)',
  },
  ViewText: {
    color: COLORS.primaryFontColor,
    fontFamily: "Manrope-Bold",
    fontSize: 14,
  },
  CreateText: {
    color: COLORS.secondaryColor,
    fontFamily: "Manrope-Bold",
    fontSize: 12,
  },
  datePickerSection: {
    gap: 10,
    padding: 20,
  },
  buttonContainer:{
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
    backgroundColor: COLORS.secondaryFontColor
  },
  buttonContainerInner:{
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  button:{
    width: '48%',
  }
});
