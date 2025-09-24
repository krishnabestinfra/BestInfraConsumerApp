import { StyleSheet, Text, View, Pressable, ScrollView, TouchableOpacity } from "react-native";
import React, { useState, useEffect } from "react";
import { COLORS } from "../constants/colors";
import Menu from "../../assets/icons/bars.svg";
import Notification from "../../assets/icons/notification.svg";
import BiLogo from "../../assets/icons/Logo.svg";
import DatePicker from "../components/global/DatePicker";
import Table from "../components/global/Table";
import Button from "../components/global/Button";
import DownloadButton from "../components/global/DownloadButton";
import { getUser } from "../utils/storage";
import { API, API_ENDPOINTS } from "../constants/constants";


const Transactions = ({ navigation }) => {
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [tableData, setTableData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch payment history from API
  useEffect(() => {
    const fetchPaymentHistory = async () => {
      try {
        setIsLoading(true);
        const user = await getUser();
        
        if (user && user.identifier) {
          // Using the authenticated user's identifier
          const response = await fetch(API_ENDPOINTS.consumers.get(user.identifier));
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data && data.data.paymentHistory) {
              // Transform payment history data for the table
              const transformedData = data.data.paymentHistory.map((payment, index) => ({
                id: index + 1,
                transactionId: payment.transactionId || 'N/A',
                date: payment.paymentDate || 'N/A',
                // amount: payment.creditAmount ? `₹${payment.creditAmount}` : 'N/A',
                // paymentMode: payment.paymentMode || 'N/A',
                status: payment.creditAmount > 0 ? 'Success' : 'Failed'
              }));
              setTableData(transformedData);
            } else {
              setTableData([]);
            }
          } else {
            console.error('Failed to fetch payment history:', response.status);
            setTableData([]);
          }
        }
      } catch (error) {
        console.error('Error fetching payment history:', error);
        setTableData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPaymentHistory();
  }, []);
  return (
    <>
    <ScrollView
      style={styles.Container}
      contentContainerStyle={{ paddingBottom: 30 }}
      showsVerticalScrollIndicator={false}
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
            { key: 'transactionId', title: 'Transaction ID', flex: 2 },
            { key: 'date', title: 'Date', flex: 1.2 },
            // { key: 'amount', title: 'Amount', flex: 1 },
            // { key: 'paymentMode', title: 'Mode', flex: 1 },
            { key: 'status', title: 'Status', flex: 1 }
          ]}
        />
      </View>
    </ScrollView>
    {tableData.length > 0 && ( 
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
           { key: 'transactionId', title: 'Transaction ID' },
           { key: 'date', title: 'Date' },
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
    )} 
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
    // Android shadow
    elevation: 5,
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
  },
  ProfileBox: {
    display: "flex",
    justifyContent: "space-between",
    flexDirection: "row",
    marginHorizontal: 4,
  },
  textContainer: {},
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
    display: 'flex',
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
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  button:{
    width: '48%',
  }
});
