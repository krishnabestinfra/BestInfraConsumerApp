import { StyleSheet, Text, View, ScrollView, Dimensions, TouchableOpacity, RefreshControl, Alert, Animated } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { COLORS } from "../../constants/colors";
import { useTheme } from "../../context/ThemeContext";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Button from "../../components/global/Button";
import Table from "../../components/global/Table";
import CreateNewTicketModal from "../../components/global/CreateNewTicketModal";
import OpenIcon from "../../../assets/icons/open.svg";
import ProgressIcon from "../../../assets/icons/progress.svg";
import ResolvedIcon from "../../../assets/icons/resolved.svg";
import ClosedIcon from "../../../assets/icons/closed.svg";
import EyeIcon from "../../../assets/icons/eyeFill.svg";
import DashboardHeader from "../../components/global/DashboardHeader";
import BottomNavigation from "../../components/global/BottomNavigation";
import { LinearGradient } from "expo-linear-gradient";
import { fetchTicketStats, fetchTicketsTable, createTicket, invalidateTicketCache } from "../../services/apiService";
import { getAppIdForTickets } from "../../config/apiConfig";
import { getUser } from "../../utils/storage";
import { useConsumer } from "../../context/ConsumerContext";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SkeletonLoader } from '../../utils/loadingManager';
import CreateNewTicket from "../../components/global/CreateNewTicket";

// Shimmer constants (same as Invoices for consistent skeleton effect)
const SHIMMER_LIGHT = { base: "#e0e0e0", gradient: ["#e0e0e0", "#f5f5f5", "#e0e0e0"] };
const SHIMMER_DARK = { base: "#3a3a3c", gradient: ["#3a3a3c", "rgba(255,255,255,0.06)", "#3a3a3c"] };

// Shimmer effect component for skeleton loading (theme-aware)
const Shimmer = ({ style, baseColor, gradientColors }) => {
  const shimmerAnim = useRef(new Animated.Value(-1)).current;
  const base = baseColor ?? SHIMMER_LIGHT.base;
  const gradient = gradientColors ?? SHIMMER_LIGHT.gradient;
  useEffect(() => {
    shimmerAnim.setValue(-1);
    Animated.loop(
      Animated.timing(shimmerAnim, { toValue: 1, duration: 1500, useNativeDriver: true })
    ).start();
  }, [shimmerAnim]);
  const translateX = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [-200, 300] });
  return (
    <View style={[style, { overflow: "hidden", backgroundColor: base }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]}>
        <LinearGradient colors={gradient} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1 }} />
      </Animated.View>
    </View>
  );
};

// Skeleton Ticket Box (one stat box placeholder, theme-aware)
const SkeletonTicketBox = ({ isDark, styles }) => {
  const shimmer = isDark ? SHIMMER_DARK : SHIMMER_LIGHT;
  const boxBg = isDark ? "#1A1F2E" : COLORS.secondaryFontColor;
  return (
    <View style={[styles.TicketBox, { backgroundColor: boxBg }]}>
      <View style={styles.TicketBoxTextContainer}>
        <Shimmer style={{ width: 70, height: 12, borderRadius: 4 }} baseColor={shimmer.base} gradientColors={shimmer.gradient} />
        <Shimmer style={{ width: 28, height: 20, borderRadius: 4, marginTop: 6 }} baseColor={shimmer.base} gradientColors={shimmer.gradient} />
      </View>
      <Shimmer style={[styles.TicketBoxIcon, { backgroundColor: shimmer.base }]} baseColor={shimmer.base} gradientColors={shimmer.gradient} />
    </View>
  );
};
import TicketSuccessModal from "../../components/global/TicketSuccessModal";
import { isDemoUser, DEMO_TICKET_STATS, DEMO_TICKETS } from "../../constants/demoData";
import { useScreenTiming } from "../../utils/useScreenTiming";

const STALE_THRESHOLD = 30000; // 30 seconds — refetch when returning to screen if data is older than this

const Tickets = ({ navigation }) => {
  const { isDark, colors: themeColors } = useTheme();
  const bottomSheetRef = useRef(null);
  const pendingSuccessModalRef = useRef(false);
  const lastFetchedAtRef = useRef(0);
  const consumerNumberRef = useRef(null);
  const snapPoints = ['100%']; // Nearly full screen

  const handleOpenBottomSheet = useCallback(() => {
    bottomSheetRef.current?.expand();
  }, []);

  const handleCloseBottomSheet = useCallback(() => {
    bottomSheetRef.current?.close();
  }, []);

  const handleBottomSheetClosed = useCallback(() => {
    if (pendingSuccessModalRef.current) {
      pendingSuccessModalRef.current = false;
      setShowSuccessModal(true);
    }
  }, []);


  // const [showModal, setShowModal] = useState(false);
  const { consumerData, isConsumerLoading: isLoading, refreshConsumer } = useConsumer();
  consumerNumberRef.current = consumerData?.consumerNumber ?? consumerData?.uniqueIdentificationNo ?? null;
  const consumerDataRef = useRef(consumerData);
  consumerDataRef.current = consumerData;
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdTicket, setCreatedTicket] = useState(null);

  const abortRef = useRef(null);
  const { onLayout: onScreenLayout } = useScreenTiming('Tickets', {
    isLoading: statsLoading || tableLoading,
    dataReady: !statsLoading && !tableLoading,
  });

  const fetchData = useCallback(async (forceRefreshTickets = false, signal, ensureTicketInList = null) => {
    try {
      const user = await getUser();
      if (!user?.identifier || signal?.aborted) return;

      if (isDemoUser(user.identifier)) {
        setTicketStats(DEMO_TICKET_STATS);
        setTableData(DEMO_TICKETS);
        setStatsLoading(false);
        setTableLoading(false);
        return;
      }

      setStatsLoading(true);
      setTableLoading(true);

      const consumerNumber = consumerNumberRef.current ?? user?.consumerNumber ?? user?.identifier;
      const appId = getAppIdForTickets();

      const [statsResult, tableResult] = await Promise.all([
        fetchTicketStats(consumerNumber, forceRefreshTickets),
        fetchTicketsTable(consumerNumber, forceRefreshTickets, { appId, page: 1, limit: 10 }),
      ]);
      if (signal?.aborted) return;

      if (statsResult.success) setTicketStats(statsResult.data);
      if (tableResult.success) {
        let list = Array.isArray(tableResult.data) ? tableResult.data : tableResult.data?.data ?? [];
        // If we have a ticket that might be missing from API (backend delay), prepend it
        if (ensureTicketInList?.ticketNumber || ensureTicketInList?.id) {
          const hasMatch = list.some(
            (t) =>
              String(t?.id) === String(ensureTicketInList.id) ||
              String(t?.ticketNumber) === String(ensureTicketInList.ticketNumber)
          );
          if (!hasMatch) list = [ensureTicketInList, ...list];
        }
        setTableData(list);
      } else {
        setTableData((prev) => (ensureTicketInList ? prev : []));
      }

      lastFetchedAtRef.current = Date.now();
    } catch (error) {
      if (error?.name === 'AbortError') return;
      console.error('Error fetching ticket data:', error);
    } finally {
      if (!signal?.aborted) { setStatsLoading(false); setTableLoading(false); }
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      refreshConsumer();
      // Always fetch when screen gains focus so newly created tickets persist after navigating away and back.
      // On remount lastFetchedAtRef=0, so we force refresh. Otherwise use cache if data is < 30s old.
      const dataAge = Date.now() - lastFetchedAtRef.current;
      const shouldForceRefresh = dataAge >= STALE_THRESHOLD;
      fetchData(shouldForceRefresh, controller.signal);
      return () => controller.abort();
    }, [fetchData, refreshConsumer])
  );

  // const handleOpenModal = () => {
  //   setShowModal(true);
  // };

  // const handleCloseModal = () => {
  //   setShowModal(false);
  // };

  const handleCreateTicket = useCallback(async (ticketData) => {
    try {
      const user = await getUser();
      if (!user?.identifier) {
        Alert.alert("Error", "Please sign in to create a ticket.");
        return false;
      }
      // Use consumerNumber from consumers API (e.g. CON-1002 from /consumers/BI25GMRA0001)
      const consumerNumber = consumerNumberRef.current ?? user?.consumerNumber ?? user?.identifier;
      const appId = getAppIdForTickets();
      console.log('🎫 Creating ticket for consumer:', consumerNumber, 'appId:', appId, 'data:', ticketData);
      const result = await createTicket(consumerNumber, { ...ticketData, appId }, { consumerData: consumerDataRef.current, user });
      console.log('🎫 Create ticket result (Tickets screen):', result?.success, result);
      const isSuccess = result?.success === true || result?.status === "success" || (result?.data && !result?.error);
      if (isSuccess) {
        console.log('🎫 Ticket created successfully');
        const raw = result.data || result;
        const ticket = raw.ticket || raw.data || raw;
        const ticketNumber = ticket.ticketNumber ?? ticket.ticket_number ?? ticket.id ?? ticket.number ?? ticket.ticketId ?? raw.ticketNumber ?? raw.ticketId ?? raw.id;
        const created = { ...ticket, ticketNumber: ticketNumber ?? ticket.ticketNumber };
        setCreatedTicket(created);

        // Optimistic update: show new ticket in list immediately
        const tableRow = {
          ...created,
          id: created.id ?? created.ticketId ?? ticketNumber,
          ticketNumber: ticketNumber ?? created.ticketNumber,
          type: created.type ?? ticketData?.category ?? 'TECHNICAL',
          status: created.status ?? 'OPEN',
          category: created.category ?? ticketData?.category ?? 'TECHNICAL',
        };
        setTableData((prev) => [tableRow, ...prev]);

        // Invalidate cache and force refresh so stats + list stay in sync
        await invalidateTicketCache(consumerNumber, appId);
        await fetchData(true, undefined, tableRow);

        pendingSuccessModalRef.current = true;
        handleCloseBottomSheet();
        return true;
      } else {
        console.log('🎫 Create ticket failed:', result?.message || result?.error);
        Alert.alert("Error", result?.message || result?.error || "Failed to create ticket.");
        return false;
      }
    } catch (error) {
      console.error("🎫 Create ticket error:", error);
      Alert.alert("Error", error.message || "Failed to create ticket.");
      return false;
    }
  }, [fetchData, handleCloseBottomSheet]);

  const handleCloseSuccessModal = useCallback(() => {
    setShowSuccessModal(false);
    setCreatedTicket(null);
  }, []);

  const handleReturnToHome = useCallback(() => {
    setShowSuccessModal(false);
    setCreatedTicket(null);
    navigation.navigate("PostPaidDashboard");
  }, [navigation]);

  const handleViewTicketFromSuccess = useCallback(() => {
    setShowSuccessModal(false);
    if (createdTicket) {
      navigation.navigate("TicketDetails", {
        ticketId: createdTicket.id ?? createdTicket.ticketNumber,
        ticketData: createdTicket,
        category: createdTicket.category,
        status: createdTicket.status,
      });
    }
    setCreatedTicket(null);
  }, [createdTicket, navigation]);

  const handleViewTicket = useCallback((ticket) => {
    console.log("📄 Viewing ticket:", ticket);
    navigation.navigate('TicketDetails', {
      ticketId: ticket.id ?? ticket.ticketNumber,
      ticketData: ticket,
      category: ticket.category,
      status: ticket.status,
    });
  }, [navigation]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onScreenLayout}>
      <View style={styles.mainContentWrapper}>
      <ScrollView
        style={[styles.Container, isDark && { backgroundColor: themeColors.screen }]}
        contentContainerStyle={{flexGrow: 1, paddingBottom: 130}}
        showsVerticalScrollIndicator={false}
        // refreshControl={
        //   <RefreshControl
        //     refreshing={isLoading}
        //     onRefresh={fetchData}
        //     colors={[COLORS.secondaryColor]}
        //     tintColor={COLORS.secondaryColor}
        //   />
        // }
        nestedScrollEnabled={true}
      >

        <DashboardHeader 
          navigation={navigation} 
          variant="tickets" 
          showBalance={false}
          consumerData={consumerData}
          isLoading={isLoading}
        />
        <View style={[styles.contentOnTop, isDark && { backgroundColor: themeColors.screen }]}>
        <View style={styles.TicketContainer}>
          <Text style={[styles.usageText, isDark && { color: '#FFFFFF' }]}>Tickets</Text>
          <Button
            title="Create New"
            variant="primary"
            size="small"
            textStyle={styles.forgotText}
            onPress={handleOpenBottomSheet}
          />
        </View>

        <View style={styles.TicketContainerTwo}>
          {statsLoading ? (
            [1, 2, 3, 4].map((key) => <SkeletonTicketBox key={key} isDark={isDark} styles={styles} />)
          ) : (
            <>
              <View style={[styles.TicketBox, isDark && { backgroundColor: '#1A1F2E' }]}>
                <View style={styles.TicketBoxTextContainer}>
                  <Text style={[styles.TicketBoxtext, isDark && { color: '#FFFFFF' }]}>Open Tickets</Text>
                  <Text style={styles.TicketBoxNumber}>{ticketStats.open}</Text>
                </View>
                <LinearGradient colors={["#E6F6ED", "#C2EAD2"]} start={{ x: 0.5, y: 0.5 }} end={{ x: 1, y: 1 }} style={styles.TicketBoxIcon}>
                  <OpenIcon width={16} height={16} />
                </LinearGradient>
              </View>
              <View style={[styles.TicketBox, isDark && { backgroundColor: '#1A1F2E' }]}>
                <View style={styles.TicketBoxTextContainer}>
                  <Text style={[styles.TicketBoxtext, isDark && { color: '#FFFFFF' }]}>In Progress</Text>
                  <Text style={styles.TicketBoxNumber}>{ticketStats.inProgress}</Text>
                </View>
                <LinearGradient colors={["#E6F6ED", "#C2EAD2"]} start={{ x: 0.5, y: 0.5 }} end={{ x: 1, y: 1 }} style={styles.TicketBoxIcon}>
                  <ProgressIcon width={16} height={16} />
                </LinearGradient>
              </View>
              <View style={[styles.TicketBox, isDark && { backgroundColor: '#1A1F2E' }]}>
                <View style={styles.TicketBoxTextContainer}>
                  <Text style={[styles.TicketBoxtext, isDark && { color: '#FFFFFF' }]}>Resolved</Text>
                  <Text style={styles.TicketBoxNumber}>{ticketStats.resolved}</Text>
                </View>
                <LinearGradient colors={["#E6F6ED", "#C2EAD2"]} start={{ x: 0.5, y: 0.5 }} end={{ x: 1, y: 1 }} style={styles.TicketBoxIcon}>
                  <ResolvedIcon width={16} height={16} />
                </LinearGradient>
              </View>
              <View style={[styles.TicketBox, isDark && { backgroundColor: '#1A1F2E' }]}>
                <View style={styles.TicketBoxTextContainer}>
                  <Text style={[styles.TicketBoxtext, isDark && { color: '#FFFFFF' }]}>Closed</Text>
                  <Text style={styles.TicketBoxNumber}>{ticketStats.closed}</Text>
                </View>
                <LinearGradient colors={["#E6F6ED", "#C2EAD2"]} start={{ x: 0.5, y: 0.5 }} end={{ x: 1, y: 1 }} style={styles.TicketBoxIcon}>
                  <ClosedIcon width={16} height={16} />
                </LinearGradient>
              </View>
            </>
          )}
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
            priorityMapping={useMemo(() => ({
              BILLING: "Low",
              METER: "High",
              CONNECTION: "High",
              TECHNICAL: "High",
            }), [])}
            columns={useMemo(() => [
              { key: 'ticketNumber', title: 'Ticket ID', flex: 1.2 },
              { key: 'type', title: 'Category', flex: 1.5 },
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
            ], [handleViewTicket])}
          />
        </View>
        {/* <CreateNewTicket 
        onSubmit={handleCreateTicket}
        onClose={() => setShowModal(false)}    /> */}
        </View>
      </ScrollView>

      {/* Bottom Navigation - in background layer, visible behind modal blur */}
      <BottomNavigation navigation={navigation} />
      </View>

      <View style={styles.sheetOverlayWrapper} pointerEvents="box-none">
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
        onClose={handleBottomSheetClosed}
      >
        <BottomSheetView style={styles.bottomSheetContent}>
          <CreateNewTicket 
            onSubmit={handleCreateTicket}
            onClose={handleCloseBottomSheet}
            title="Create New Ticket"
          />
        </BottomSheetView>
      </BottomSheet>
      </View>

      <TicketSuccessModal
        visible={showSuccessModal}
        ticketNumber={createdTicket?.ticketNumber ?? createdTicket?.ticket_number ?? createdTicket?.id}
        ticketData={createdTicket}
        onViewDetails={handleViewTicketFromSuccess}
        onReturnHome={handleReturnToHome}
      />
    </GestureHandlerRootView>
  );
};

export default Tickets;

const styles = StyleSheet.create({
  mainContentWrapper: {
    flex: 1,
    zIndex: 0,
  },
  sheetOverlayWrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  Container: {
    backgroundColor: COLORS.secondaryFontColor,
    borderTopLeftRadius: 30,
    borderBottomRightRadius: 30,
    flex: 1,
  },
  contentOnTop: {
    zIndex: 1,
    backgroundColor: COLORS.secondaryFontColor,
    borderTopLeftRadius: 30,
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
