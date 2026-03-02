import { View, ScrollView, InteractionManager } from "react-native";
import React, { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { COLORS } from "../../constants/colors";
import DashboardHeader from "../../components/global/DashboardHeader";
import BottomNavigation from "../../components/global/BottomNavigation";
import { getUser } from "../../utils/storage";
import { useTheme } from "../../context/ThemeContext";
import { useFocusEffect } from "@react-navigation/native";
import ConsumerDetailsBottomSheet from "../../components/ConsumerDetailsBottomSheet";
import { useConsumer } from "../../context/ConsumerContext";
import { formatFrontendDate, parseDueDate, getDueDaysText } from "../../utils/dateUtils";
import { getConsumerDueDate } from "../../utils/billingUtils";
import { useScreenTiming } from "../../utils/useScreenTiming";
import {
  AmountSection,
  MeterCard,
  EnergySummary,
  UsageStatsRow,
  ComparisonCard,
  AlertsTableSection,
} from "./DashboardSections";
import { styles, useDarkOverlay } from "./DashboardStyles";
import useDashboardData, { formatAmount, formatReadingDate, parseDateFromBarLabel } from "./useDashboardData";

const USAGE_CARD_LABELS = {
  "7D": { title: "This Week's Usage:", comparisonLabel: "vs. Last Week." },
  "30D": { title: "This Month's Usage:", comparisonLabel: "vs. Last Month." },
  "90D": { title: "This Quarter's Usage:", comparisonLabel: "vs. Last Quarter." },
  "1Y": { title: "This Year's Usage:", comparisonLabel: "vs. Last Year." },
};

const PostPaidDashboard = ({ navigation, route }) => {
  const { isDark, colors: themeColors } = useTheme();
  const darkOverlay = useDarkOverlay(isDark, themeColors);

  // ── UI state ──
  const [selectedView] = useState("daily");
  const [pickedDateRange, setPickedDateRange] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [displayMode, setDisplayMode] = useState("chart");
  const [showViewDropdown, setShowViewDropdown] = useState(false);
  const [dropdownButtonLayout, setDropdownButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const viewDropdownRef = useRef(null);
  const [timePeriod, setTimePeriod] = useState("7D");

  // ── Consumer data from context (single source of truth) ──
  const { consumerData, latestInvoiceDates, isConsumerLoading: isLoading, refreshConsumer } = useConsumer();

  // ── Lazy-mount below-the-fold sections after first paint ──
  const [belowFoldReady, setBelowFoldReady] = useState(false);
  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => setBelowFoldReady(true));
    return () => handle.cancel();
  }, []);

  // ── Bottom sheet state ──
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [selectedConsumerUid, setSelectedConsumerUid] = useState(null);

  // ── Screen timing (7.1) ──
  const { onLayout: onScreenLayout } = useScreenTiming('PostPaidDashboard', {
    isLoading,
    dataReady: !isLoading && !!consumerData,
  });

  // ── Derived data from custom hook ──
  const {
    pickedRangeReportData, setPickedRangeReportData,
    pickedRangeReportLoading,
    effectiveDataForChart,
    effectiveViewForTable,
    consumptionTableData,
    tableData, isTableLoading,
    averageDailyKwh, peakUsageKwh,
    thisMonthKwh, lastMonthKwh, savingsKwh,
    comparisonDiffKwh, comparisonBarFillPercent,
    getUsageForTimePeriod, getTrendPercentageForTimePeriod,
  } = useDashboardData(consumerData, { pickedDateRange, timePeriod });

  // ── Refresh consumer + reset date range on focus ──
  useFocusEffect(
    useCallback(() => {
      setPickedDateRange(null);
      setPickedRangeReportData(null);
      refreshConsumer();
    }, [setPickedRangeReportData, refreshConsumer])
  );

  // ── Handlers ──
  const handleConsumerPress = useCallback(() => {
    if (consumerData?.uniqueIdentificationNo) {
      setSelectedConsumerUid(consumerData.uniqueIdentificationNo);
      setBottomSheetVisible(true);
    }
  }, [consumerData?.uniqueIdentificationNo]);

  const handleBottomSheetClose = useCallback(() => {
    setBottomSheetVisible(false);
    setSelectedConsumerUid(null);
  }, []);

  const handleBarPress = useCallback(async (barData) => {
    const barLabel = barData?.originalLabel || barData?.date || barData?.label || "";
    const viewTypeForParsing = barData?.viewType || selectedView;
    const formattedDate = parseDateFromBarLabel(barLabel, viewTypeForParsing);

    let meterId = consumerData?.meterId || consumerData?.meterSerialNumber || consumerData?.meterNumber || null;
    if (!meterId) {
      try {
        const user = await getUser();
        meterId = user?.meterId || user?.meterSerialNumber || null;
      } catch { /* ignore */ }
    }
    if (meterId) meterId = String(meterId).trim();
    if (!formattedDate || !meterId) return;

    navigation.navigate("LsDataTable", {
      date: formattedDate, meterId, viewType: viewTypeForParsing,
      barData, consumerData,
    });
  }, [navigation, consumerData, selectedView]);

  // ── Memoized styles to avoid inline objects ──
  const screenRootStyle = useMemo(
    () => [styles.screenRoot, { backgroundColor: isDark ? themeColors.screen : COLORS.secondaryFontColor }],
    [isDark, themeColors.screen]
  );
  const scrollContentStyle = useMemo(() => ({ paddingBottom: 130 }), []);

  return (
    <View style={screenRootStyle} onLayout={onScreenLayout}>
      <ScrollView
        style={[styles.Container, darkOverlay.container]}
        contentContainerStyle={scrollContentStyle}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.Container, darkOverlay.container]}>
          <StatusBar style={isDark ? "light" : "dark"} />
          <DashboardHeader
            navigation={navigation} showBalance={false}
            consumerData={consumerData} isLoading={isLoading}
          />

          <View style={[styles.contentOnTop, darkOverlay.contentOnTop]}>
            <AmountSection
              styles={styles} darkOverlay={darkOverlay} isLoading={isLoading}
              consumerData={consumerData} latestInvoiceDates={latestInvoiceDates}
              formatAmount={formatAmount} getConsumerDueDate={getConsumerDueDate}
              parseDueDate={parseDueDate} formatFrontendDate={formatFrontendDate}
              getDueDaysText={getDueDaysText} themeColors={themeColors} navigation={navigation}
            />

            <MeterCard
              styles={styles} darkOverlay={darkOverlay}
              consumerData={consumerData} handleConsumerPress={handleConsumerPress}
              formatReadingDate={formatReadingDate}
            />

            <EnergySummary
              styles={styles} darkOverlay={darkOverlay} isDark={isDark} themeColors={themeColors}
              isLoading={isLoading} pickedDateRange={pickedDateRange}
              pickedRangeReportLoading={pickedRangeReportLoading}
              showDatePicker={showDatePicker} setShowDatePicker={setShowDatePicker}
              setPickedDateRange={setPickedDateRange} setPickedRangeReportData={setPickedRangeReportData}
              timePeriod={timePeriod} setTimePeriod={setTimePeriod}
              displayMode={displayMode} setDisplayMode={setDisplayMode}
              showViewDropdown={showViewDropdown} setShowViewDropdown={setShowViewDropdown}
              viewDropdownRef={viewDropdownRef}
              dropdownButtonLayout={dropdownButtonLayout} setDropdownButtonLayout={setDropdownButtonLayout}
              selectedView={selectedView} effectiveDataForChart={effectiveDataForChart}
              effectiveViewForTable={effectiveViewForTable}
              consumptionTableData={consumptionTableData} handleBarPress={handleBarPress}
              usageCardLabels={USAGE_CARD_LABELS}
              getUsageForTimePeriod={getUsageForTimePeriod}
              getTrendPercentageForTimePeriod={getTrendPercentageForTimePeriod}
            />

            {belowFoldReady && (
              <>
                <View style={styles.usageStatsContainer}>
                  <UsageStatsRow
                    styles={styles} darkOverlay={darkOverlay} isLoading={isLoading}
                    averageDailyKwh={averageDailyKwh} peakUsageKwh={peakUsageKwh}
                  />
                  <ComparisonCard
                    styles={styles} darkOverlay={darkOverlay} isDark={isDark} themeColors={themeColors}
                    isLoading={isLoading} thisMonthKwh={thisMonthKwh} lastMonthKwh={lastMonthKwh}
                    savingsKwh={savingsKwh} comparisonDiffKwh={comparisonDiffKwh}
                    comparisonBarFillPercent={comparisonBarFillPercent}
                  />
                </View>

                <AlertsTableSection
                  styles={styles} darkOverlay={darkOverlay}
                  tableData={tableData} isTableLoading={isTableLoading}
                />
              </>
            )}
          </View>
        </View>
      </ScrollView>

      <ConsumerDetailsBottomSheet
        visible={bottomSheetVisible}
        consumerUid={selectedConsumerUid}
        onClose={handleBottomSheetClose}
      />
      <BottomNavigation navigation={navigation} />
    </View>
  );
};

export default PostPaidDashboard;
