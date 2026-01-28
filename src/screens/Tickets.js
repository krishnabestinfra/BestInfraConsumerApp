import { StyleSheet, Text, View, ScrollView, Dimensions, TouchableOpacity, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { COLORS } from "../constants/colors";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Button from "../components/global/Button";
import Table from "../components/global/Table";
import CreateNewTicketModal from "../components/global/CreateNewTicketModal";
import OpenIcon from "../../assets/icons/open.svg";
import ProgressIcon from "../../assets/icons/progress.svg";
import ResolvedIcon from "../../assets/icons/resolved.svg";
import ClosedIcon from "../../assets/icons/closed.svg";
import EyeIcon from "../../assets/icons/eyeFill.svg";
import DashboardHeader from "../components/global/DashboardHeader";
import { LinearGradient } from "expo-linear-gradient";
import { fetchConsumerData, syncConsumerData, fetchTicketStats, fetchTicketsTable } from "../services/apiService";
import { getUser } from "../utils/storage";
import { getCachedConsumerData } from "../utils/cacheManager";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SkeletonLoader } from '../utils/loadingManager';
import CreateNewTicket from "../components/global/CreateNewTicket";

const Tickets = ({ navigation }) => {
  const bottomSheetRef = useRef(null);
  const snapPoints = ['100%']; // Nearly full screen

  const handleOpenBottomSheet = useCallback(() => {
    bottomSheetRef.current?.expand();
  }, []);

  const handleCloseBottomSheet = useCallback(() => {
    bottomSheetRef.current?.close();
  }, []);

  // const [showModal, setShowModal] = useState(false);
  const [consumerData, setConsumerData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [ticketStats, setTicketStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [tableData, setTableData] = useState([]);
  const [tableLoading, setTableLoading] = useState(true);

  // Fetch data function
  const fetchData = async () => {
    try {
      setIsLoading(true);
      setStatsLoading(true);
      setTableLoading(true);
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
        
        // Fetch ticket statistics
        const statsResult = await fetchTicketStats(user.identifier);
        if (statsResult.success) {
          setTicketStats(statsResult.data);
        }
        
        // Fetch tickets table data
        const tableResult = await fetchTicketsTable(user.identifier);
        if (tableResult.success) {
          setTableData(tableResult.data || []);
        } else {
          console.error('Failed to fetch tickets table:', tableResult.message);
          setTableData([]); // Set empty array on failure
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
      setStatsLoading(false);
      setTableLoading(false);
    }
  };

  // Fetch consumer data with caching
  useEffect(() => {
    fetchData();
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [])
  );

  // const handleOpenModal = () => {
  //   setShowModal(true);
  // };

  // const handleCloseModal = () => {
  //   setShowModal(false);
  // };

  const handleCreateTicket = (ticketData) => {
    console.log("New Ticket Created:", ticketData);
  };

  // Handle view ticket details
  const handleViewTicket = useCallback((ticket) => {
    console.log("📄 Viewing ticket:", ticket);
    navigation.navigate('TicketDetails', {
      ticketId: ticket.ticketNumber || ticket.id,
      ticketData: ticket,
      category: ticket.category,
      status: ticket.status,
    });
  }, [navigation]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>

      <ScrollView
        style={styles.Container}
        contentContainerStyle={{flexGrow: 1}}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchData}
            colors={[COLORS.secondaryColor]}
            tintColor={COLORS.secondaryColor}
          />
        }
        nestedScrollEnabled={true}
      >

        <DashboardHeader 
          navigation={navigation} 
          variant="tickets" 
          showBalance={false}
          consumerData={consumerData}
          isLoading={isLoading}
        />
        <View style={styles.TicketContainer}>
          <Text style={styles.usageText}>Tickets</Text>
          <Button
            title="Create New"
            variant="primary"
            size="small"
            textStyle={styles.forgotText}
            // onPress={handleOpenModal}
            onPress={handleOpenBottomSheet}
            // onPress={() => navigation.navigate('TicketDetails')}
          />
        </View>

        <View style={styles.TicketContainerTwo}>
          <View style={styles.TicketBox}>
            <View style={styles.TicketBoxTextContainer}>
              <Text style={styles.TicketBoxtext}>Open Tickets</Text>

              <View style={{ minWidth: 20 }}> 
                {statsLoading ? (
                  <SkeletonLoader variant="lines" lines={1} style={{ height: 60, width: 10 }} />
                ) : (
                  <Text style={styles.TicketBoxNumber}>{ticketStats.open}</Text>
                )}
              </View>
            </View>
                <LinearGradient
                  colors={["#E6F6ED", "#C2EAD2"]}
                  start={{  x: 0.5, y: 0.5  }}
                  end={{ x: 1, y: 1 }}
                  style={styles.TicketBoxIcon}
                >
                  <OpenIcon width={16} height={16} />
              </LinearGradient>
          </View>
          <View style={styles.TicketBox}>
            <View style={styles.TicketBoxTextContainer}>
              <Text style={styles.TicketBoxtext}>In Progress</Text>
              <View style={{ minWidth: 20 }}> 
                {statsLoading ? (
                  <SkeletonLoader variant="lines" lines={1} style={{ height: 30, width: 20 }} />
                ) : (
                  <Text style={styles.TicketBoxNumber}>{ticketStats.inProgress}</Text>
                )}
              </View>
            </View>
              <LinearGradient
                colors={["#E6F6ED", "#C2EAD2"]}
                start={{  x: 0.5, y: 0.5  }}
                end={{ x: 1, y: 1 }}
                style={styles.TicketBoxIcon}
              >
                <ProgressIcon width={16} height={16} />
              </LinearGradient>
          </View>
          <View style={styles.TicketBox}>
            <View style={styles.TicketBoxTextContainer}>
              <Text style={styles.TicketBoxtext}>Resolved</Text>
              <View style={{ minWidth: 20 }}> 
                {statsLoading ? (
                  <SkeletonLoader variant="lines" lines={1} style={{ height: 30, width: 20 }} />
                ) : (
                  <Text style={styles.TicketBoxNumber}>{ticketStats.resolved}</Text>
                )}
              </View>
            </View>
              <LinearGradient
                colors={["#E6F6ED", "#C2EAD2"]}
                start={{  x: 0.5, y: 0.5  }}
                end={{ x: 1, y: 1 }}
                style={styles.TicketBoxIcon}
              >
                <ResolvedIcon width={16} height={16} />
              </LinearGradient>
          </View>
          <View style={styles.TicketBox}>
            <View style={styles.TicketBoxTextContainer}>
              <Text style={styles.TicketBoxtext}>Closed</Text>
              <View style={{ minWidth: 20 }}> 
                {statsLoading ? (
                  <SkeletonLoader variant="lines" lines={1} style={{ height: 30, width: 20 }} />
                ) : (
                  <Text style={styles.TicketBoxNumber}>{ticketStats.closed}</Text>
                )}
              </View>
            </View>
            <LinearGradient
              colors={["#E6F6ED", "#C2EAD2"]}
              start={{  x: 0.5, y: 0.5  }}
              end={{ x: 1, y: 1 }}
              style={styles.TicketBoxIcon}
            >
              <ClosedIcon width={16} height={16} />
            </LinearGradient>
          </View>
        </View>
        <View style={styles.TicketContainerThree}>
          <Table
            data={tableData}
            loading={tableLoading}
            skeletonLines={3}
            emptyMessage="No tickets available"
            showSerial={true}
            showPriority={false}
            inlinePriority
            priorityField="category"
            priorityMapping={{
              "BILLING": "Low",
              "METER": "High",
              "CONNECTION": "High",
              "TECHNICAL": "High"
            }}
            columns={[
              { key: 'ticketNumber', title: 'Ticket ID', flex: 1.2 },
              { key: 'category', title: 'Category', flex: 1.5 },
              { key: 'status', title: 'Status', flex: 1 },
              { 
                key: 'view', 
                title: 'View', 
                flex: 0.7,
                render: (ticket) => (
                  <TouchableOpacity
                    style={styles.viewIconButton}
                    onPress={() => handleViewTicket(ticket)}
                    activeOpacity={0.7}
                  >
                    <EyeIcon width={16} height={16} fill="#6C757D" />
                  </TouchableOpacity>
                )
              }
            ]}
          />
        </View>
        {/* <CreateNewTicket 
        onSubmit={handleCreateTicket}
        onClose={() => setShowModal(false)}    /> */}
      </ScrollView>
        <BottomSheet
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        index={-1} 
        handleComponent={null}
        enablePanDownToClose={false}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.bottomSheetIndicator}
        enableHandlePanningGesture={false} 
        enableContentPanningGesture={false}
        enableOverDrag={false}
        animateOnMount={false}
      >
        <BottomSheetView style={styles.bottomSheetContent}>
          <CreateNewTicket 
            onSubmit={handleCreateTicket}
            onClose={handleCloseBottomSheet}
            title="Create New Ticket"
          />
        </BottomSheetView>
      </BottomSheet>
    </GestureHandlerRootView>
  );
};

export default Tickets;

const styles = StyleSheet.create({
  Container: {
    backgroundColor: COLORS.secondaryFontColor,
    borderTopLeftRadius: 30,
    borderBottomRightRadius: 30,
    flex: 1,
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
    elevation: 5,
    zIndex: 2,
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
    zIndex: 2,
  },
  ProfileBox: {
    justifyContent: "space-between",
    flexDirection: "row",
    marginHorizontal: 4,
  },
  TicketContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(186, 190, 204, 0.4)',
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    // backgroundColor: COLORS.secondaryFontColor,
    // iOS shadow
    shadowColor: "rgba(0, 0, 0, 0.02)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,

    // Android shadow
    elevation: 5,
  },
  usageText: {
    color: COLORS.primaryFontColor,
    fontFamily: "Manrope-Bold",
    fontSize: 14,
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
  greenBox: {
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
    justifyContent: "center",
  },
  paynowText: {
    color: COLORS.primaryFontColor,
    fontSize: 12,
    fontFamily: "Manrope-Medium",
    textAlign: "center",
  },
  iconsContainer: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginTop: 25,
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
  TicketContainerTwo: {
    flexWrap: "wrap",
    flexDirection: "row",
    justifyContent: "center",
    // marginHorizontal: 20,
    marginTop: 15,
    gap: 15,
  },
  TicketBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: 'rgba(186, 190, 204, 0.4)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 5,
    // marginHorizontal: 20,
    // marginTop: 20,
    backgroundColor: COLORS.secondaryFontColor,
    width: "43%",
    height: 80,
  },
  TicketBoxtext: {
    color: COLORS.primaryFontColor,
    fontFamily: "Manrope-Medium",
    fontSize: 12,
  },
  TicketBoxNumber: {
    color: COLORS.secondaryColor,
    fontFamily: "Manrope-Bold",
    fontSize: 20,
  },
  TicketBoxIcon: {
    // backgroundColor: '#BBE1C4',
    borderRadius: 50,
    // padding: 10,
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    overflow: 'hidden',


  },
  TicketBoxTextContainer: {
    height: "100%",
    justifyContent: "space-between",
  },
  TicketContainerThree: {
    marginTop: 15,
    flex: 1,
  },
  bottomSheetBackground:{
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  bottomSheetContent: {
    flex: 1,
  },
  viewIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F3F4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    // iOS shadow
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    // Android shadow
    elevation: 1,
  },
});
