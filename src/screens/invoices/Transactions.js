import { StyleSheet, Text, View, Pressable, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { COLORS } from "../../constants/colors";
import { useTheme } from "../../context/ThemeContext";
import { useNotifications } from "../../context/NotificationsContext";
import Menu from "../../../assets/icons/bars.svg";
import MenuWhite from "../../../assets/icons/menuBarWhite.svg";
import Notification from "../../../assets/icons/notification.svg";
import NotificationWhite from "../../../assets/icons/NotificationWhite.svg";
import BiLogo from "../../../assets/icons/Logo.svg";
import DatePicker from "../../components/global/DatePicker";
import Table from "../../components/global/Table";
import Button from "../../components/global/Button";
import DownloadButton from "../../components/global/DownloadButton";
import { useConsumer } from "../../context/ConsumerContext";
import { useTransactionHistory } from "../../hooks/useTransactionHistory";
import { StatusBar } from "expo-status-bar";


const STALE_THRESHOLD = 120000; // 2 minutes

const Transactions = ({ navigation: navigationProp }) => {
  const navigationFromHook = useNavigation();
  const navigation = navigationProp ?? navigationFromHook;
  const { isDark, colors: themeColors } = useTheme();
  const { unreadCount } = useNotifications();
  const { consumerData, refreshConsumer } = useConsumer();
  const { transactions: tableData, isLoading, fetchTransactions, isPrepaid } = useTransactionHistory(consumerData);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const lastFetchedAtRef = useRef(0);

  // Map hook's transaction format to table columns (date, amount, status, paymentMode)
  const tableRows = tableData.map((t) => ({
    ...t,
    amount: t.amountFormatted,
  }));

  // Only refetch on focus if data is stale (older than 2 minutes)
  useFocusEffect(
    useCallback(() => {
      if (Date.now() - lastFetchedAtRef.current >= STALE_THRESHOLD) {
        fetchTransactions().then(() => {
          lastFetchedAtRef.current = Date.now();
        });
      }
    }, [fetchTransactions])
  );
  return (
    <>
      <ScrollView
        style={[styles.Container, isDark && { backgroundColor: themeColors.screen }]}
        contentContainerStyle={{ paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={async () => {
              if (isPrepaid && refreshConsumer) await refreshConsumer({ force: true });
              fetchTransactions(true);
            }}
            colors={[COLORS.secondaryColor]}
            tintColor={COLORS.secondaryColor}
          />
        }
      >
        <StatusBar style={isDark ? "light" : "dark"} />
        <View style={[styles.bluecontainer, isDark && { backgroundColor: themeColors.screen }]}>
          <View style={styles.TopMenu}>
            <Pressable
              style={[styles.barsIcon, isDark && { backgroundColor: '#1A1F2E' }]}
              onPress={() => navigation.navigate("SideMenu")}
            >
              {isDark ? (
                <MenuWhite width={18} height={18} />
              ) : (
                <Menu width={18} height={18} fill="#202d59" />
              )}
            </Pressable>
            <Pressable onPress={() => navigation.navigate("Dashboard")}>
              <BiLogo width={45} height={45} />
            </Pressable>
            <Pressable
              style={styles.bellWrapper}
              onPress={() => navigation.navigate("Notifications")}
            >
              <View style={[styles.bellIcon, isDark && { backgroundColor: '#1A1F2E' }]}>
                {isDark ? (
                  <NotificationWhite width={18} height={18} />
                ) : (
                  <Notification width={18} height={18} fill="#202d59" />
                )}
              </View>
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        <View style={[styles.TransactionsContainer, isDark && { backgroundColor: themeColors.screen }]}>
          <Text style={styles.ViewText}>{isPrepaid ? "Recharge History" : "View Transactions"}</Text>
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
            data={tableRows}
            loading={isLoading}
            skeletonLines={tableRows.length > 0 ? tableRows.length : 5}
            emptyMessage={isPrepaid ? "No recharge history available" : "No transaction data available"}
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
  bellWrapper: {
    position: "relative",
    overflow: "visible",
  },
  badge: {
    position: "absolute",
    right: -3,
    top: -3,
    backgroundColor: "red",
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: "#fff",
    zIndex: 10,
    elevation: 6,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Manrope-Regular",
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
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
    backgroundColor: COLORS.secondaryFontColor
  },
  buttonContainerInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  button: {
    width: '48%',
  }
});
