import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Modal,
  Animated,
} from "react-native";
import { COLORS } from "../../constants/colors";
import { SkeletonLoader } from "../../utils/loadingManager";

// ─── StatusBlinkingDot (used by AlertsTableSection) ─────────────────────────
const useBlinkingOpacity = () => {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.2, duration: 700, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);
  return opacity;
};

const StatusBlinkingDot = ({ status, styles }) => {
  const opacity = useBlinkingOpacity();
  const normalized = `${status}`.toLowerCase();
  const color = normalized.includes("resolve") ? "#2ECC71" : "#FF4D4F";
  return <Animated.View style={[styles.statusBlinkDot, { backgroundColor: color, opacity }]} />;
};
import Arrow from "../../../assets/icons/arrow.svg";
import GlobeShield from "../../../assets/icons/globe-shield.svg";
import Meter from "../../../assets/icons/meterWhite.svg";
import LastCommunicationIcon from "../../../assets/icons/signal.svg";
import ComparisonIconBlack from "../../../assets/icons/comparisonBlack.svg";
import ComparisonIconWhite from "../../../assets/icons/comparisonWhite.svg";
import ComparisonHighIcon from "../../../assets/icons/comparison-high.svg";
import DropdownIcon from "../../../assets/icons/dropDown.svg";
import CalendarIcon from "../../../assets/icons/CalendarBlue.svg";
import PiggybankIcon from "../../../assets/icons/piggybank.svg";
import ConsumerGroupedBarChart from "../../components/ConsumerGroupedBarChart";
import Table from "../../components/global/Table";
import CalendarDatePicker from "../../components/global/CalendarDatePicker";

const VIEW_OPTIONS = ["Chart", "Table"];
const TIME_PERIODS = ["7D", "30D", "90D", "1Y"];

// ─── AmountSection ──────────────────────────────────────────────────────────
export const AmountSection = React.memo(({
  styles, darkOverlay, isLoading, consumerData, latestInvoiceDates,
  formatAmount, getConsumerDueDate, parseDueDate, formatFrontendDate,
  getDueDaysText, themeColors, navigation,
}) => (
  <View style={[styles.amountSection, darkOverlay.amountSection]}>
    <View style={[styles.amountContainer, darkOverlay.amountContainer]}>
      <Text style={[styles.dueText, darkOverlay.dueText]}>
        Due Amount: {isLoading ? "Loading..." : formatAmount(consumerData?.totalOutstanding)}
      </Text>
      <Text style={[styles.dateText, darkOverlay.dateText]}>
        Due on {isLoading ? "Loading..." : (() => {
          const dueDateValue = latestInvoiceDates?.dueDate ?? getConsumerDueDate(consumerData);
          const d = parseDueDate(dueDateValue);
          return d ? formatFrontendDate(d) : "N/A";
        })()}
      </Text>
    </View>
    <View style={[styles.greenBox, darkOverlay.greenBox]}>
      <View style={styles.payInfoContainer}>
        <GlobeShield width={28} height={28} fill={themeColors.textOnPrimary} style={styles.shieldIcon} />
        <View>
          <Text style={styles.payText}>Pay securely</Text>
          <Text style={styles.tostayText}>to stay on track.</Text>
          <Text style={styles.avoidText}>Avoid service disruption.</Text>
        </View>
      </View>
      <View style={styles.paynowboxContainer}>
        <Pressable style={[styles.paynowbox, darkOverlay.paynowbox]} onPress={() => navigation.navigate("PostPaidRechargePayments")}>
          <Text style={[styles.paynowText, darkOverlay.paynowText]}>Pay Now</Text>
        </Pressable>
        <Text style={[styles.dueDaysText, darkOverlay.dueDaysText]}>
          {isLoading ? "Loading..." : getDueDaysText(latestInvoiceDates?.dueDate ?? getConsumerDueDate(consumerData))}
        </Text>
      </View>
    </View>
  </View>
));

// ─── MeterCard ──────────────────────────────────────────────────────────────
export const MeterCard = React.memo(({
  styles, darkOverlay, consumerData, handleConsumerPress, formatReadingDate,
}) => (
  <View style={[styles.meterContainer, darkOverlay.meterContainer]}>
    <TouchableOpacity
      style={[styles.meterInfoContainer, darkOverlay.meterInfoContainer]}
      onPress={handleConsumerPress}
    >
      <View style={styles.leftContainer}>
        <View style={styles.meterInfoRow}>
          <Meter width={30} height={30} style={{ marginTop: 5 }} />
          <View style={styles.meterConsumerRow}>
            <Text style={[styles.meterConsumerText, darkOverlay.meterConsumerText]}>
              {consumerData?.name || consumerData?.consumerName || "Loading..."}
            </Text>
          </View>
        </View>
        <View style={styles.lastCommunicationLabelWrap}>
          <Text style={[styles.LastCommunicationText, darkOverlay.LastCommunicationText]}>
            Last Communication
          </Text>
        </View>
      </View>
      <View style={styles.rightContainer}>
        <View style={[styles.tapIndicator, darkOverlay.tapIndicator, styles.rightBlockEnd]}>
          <Text style={[styles.tapIndicatorText, darkOverlay.tapIndicatorText]}>Tap for details</Text>
        </View>
        <View style={[styles.lastCommunicationLeft, styles.rightBlockEnd]}>
          <LastCommunicationIcon width={15} height={10} style={{ marginRight: 5 }} />
          <Text style={[styles.meterNumberText, darkOverlay.meterNumberText]}>
            {consumerData?.meterSerialNumber || "Loading..."}
          </Text>
        </View>
        <View style={styles.rightBlockEnd}>
          <Text style={[styles.lastCommunicationTimeText, darkOverlay.lastCommunicationTimeText]}>
            {formatReadingDate(consumerData?.readingDate)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  </View>
));

// ─── EnergySummary ──────────────────────────────────────────────────────────
export const EnergySummary = React.memo(({
  styles, darkOverlay, isDark, themeColors, isLoading,
  pickedDateRange, pickedRangeReportLoading, showDatePicker,
  setShowDatePicker, setPickedDateRange, setPickedRangeReportData,
  timePeriod, setTimePeriod, displayMode, setDisplayMode,
  showViewDropdown, setShowViewDropdown, viewDropdownRef,
  dropdownButtonLayout, setDropdownButtonLayout,
  selectedView, effectiveDataForChart, effectiveViewForTable,
  consumptionTableData, handleBarPress,
  usageCardLabels, getUsageForTimePeriod, getTrendPercentageForTimePeriod,
}) => {
  const labels = usageCardLabels[timePeriod] || usageCardLabels["30D"];
  const trendPct = getTrendPercentageForTimePeriod();

  return (
    <View style={[styles.graphSection, darkOverlay.graphSection]}>
      <View style={styles.energySummaryHeader}>
        <Text style={[styles.energyText, darkOverlay.energyText]}>Energy Summary</Text>
        <Pressable style={[styles.pickDateRow, darkOverlay.pickDateRow]} onPress={() => setShowDatePicker(true)}>
          <Text style={[styles.pickDateText, darkOverlay.pickDateText]} numberOfLines={1}>
            {pickedDateRange
              ? (pickedDateRange.startDate.getTime() === pickedDateRange.endDate.getTime()
                ? `${pickedDateRange.startDate.getDate().toString().padStart(2, "0")}/${(pickedDateRange.startDate.getMonth() + 1).toString().padStart(2, "0")}/${pickedDateRange.startDate.getFullYear()}`
                : `${pickedDateRange.startDate.getDate().toString().padStart(2, "0")}/${(pickedDateRange.startDate.getMonth() + 1).toString().padStart(2, "0")}/${pickedDateRange.startDate.getFullYear()} - ${pickedDateRange.endDate.getDate().toString().padStart(2, "0")}/${(pickedDateRange.endDate.getMonth() + 1).toString().padStart(2, "0")}/${pickedDateRange.endDate.getFullYear()}`)
              : "Pick a Date"}
          </Text>
          <CalendarIcon width={18} height={18} fill={isDark ? themeColors.textPrimary : COLORS.secondaryFontColor} style={styles.pickDateIcon} />
        </Pressable>
        <CalendarDatePicker
          visible={showDatePicker}
          onClose={() => setShowDatePicker(false)}
          value={pickedDateRange}
          onChange={(range) => setPickedDateRange(range)}
          allowRangeSelection={true}
        />
      </View>

      <View style={[styles.graphsContainer, darkOverlay.graphsContainer]}>
        <View style={styles.usageSummaryRow}>
          <View style={styles.usageSummaryLeft}>
            <Text style={[styles.thismonthText, darkOverlay.thismonthText]}>{labels.title}</Text>
            <View style={styles.usageValueRow}>
              <Text style={[styles.kwhText, darkOverlay.kwhText]}>
                {isLoading ? "Loading..." : getUsageForTimePeriod()} kWh
              </Text>
              <View style={[
                styles.tenPercentageTextContainer,
                trendPct < 0 && styles.negativeTrendContainer
              ]}>
                <Text style={styles.percentText}>
                  {isLoading ? "..." : `${Math.abs(trendPct)}%`}
                </Text>
                <Arrow
                  width={12} height={12}
                  fill={trendPct >= 0 ? themeColors.accent : "#FF6B6B"}
                  style={trendPct < 0 ? { transform: [{ rotate: "180deg" }] } : {}}
                />
              </View>
              <Text style={[styles.lastText, darkOverlay.lastText]}>{labels.comparisonLabel}</Text>
            </View>
          </View>
          <View style={styles.viewDropdownWrapper} ref={viewDropdownRef} collapsable={false}>
            <TouchableOpacity
              style={[styles.viewDropdownButton, darkOverlay.viewDropdownButton]}
              onPress={() => {
                if (showViewDropdown) {
                  setShowViewDropdown(false);
                } else {
                  viewDropdownRef.current?.measureInWindow((x, y, width, height) => {
                    setDropdownButtonLayout({ x, y, width, height });
                    setShowViewDropdown(true);
                  });
                }
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.viewDropdownButtonText, darkOverlay.viewDropdownButtonText]}>
                {displayMode === "chart" ? "Chart" : "Table"}
              </Text>
              <DropdownIcon width={14} height={14} fill={COLORS.secondaryFontColor} />
            </TouchableOpacity>
            {showViewDropdown && (
              <Modal visible={showViewDropdown} transparent animationType="fade" onRequestClose={() => setShowViewDropdown(false)}>
                <Pressable style={styles.viewDropdownOverlay} onPress={() => setShowViewDropdown(false)}>
                  <Pressable
                    style={[
                      styles.viewDropdownContent, darkOverlay.viewDropdownContent,
                      { position: "absolute", top: dropdownButtonLayout.y + dropdownButtonLayout.height + 4, left: dropdownButtonLayout.x, minWidth: dropdownButtonLayout.width },
                    ]}
                    onPress={() => {}}
                  >
                    {VIEW_OPTIONS.map((option) => (
                      <Pressable
                        key={option}
                        style={[
                          styles.viewDropdownItem, darkOverlay.viewDropdownItem,
                          displayMode === option.toLowerCase() && styles.viewDropdownItemSelected,
                          displayMode === option.toLowerCase() && darkOverlay.viewDropdownItemSelected,
                        ]}
                        onPress={() => { setDisplayMode(option.toLowerCase()); setShowViewDropdown(false); }}
                      >
                        <Text style={[
                          styles.viewDropdownItemText, darkOverlay.viewDropdownItemText,
                          displayMode === option.toLowerCase() && styles.viewDropdownItemTextSelected,
                          displayMode === option.toLowerCase() && darkOverlay.viewDropdownItemTextSelected,
                        ]}>
                          {option}
                        </Text>
                      </Pressable>
                    ))}
                  </Pressable>
                </Pressable>
              </Modal>
            )}
          </View>
        </View>

        <View style={styles.timePeriodRow}>
          {TIME_PERIODS.map((period) => {
            const isActive = !pickedDateRange && timePeriod === period;
            return (
              <TouchableOpacity
                key={period}
                style={[
                  styles.timePeriodButton, darkOverlay.timePeriodButton,
                  isActive && [styles.timePeriodButtonActive, darkOverlay.timePeriodButtonActive],
                ]}
                onPress={() => { setPickedDateRange(null); setPickedRangeReportData(null); setTimePeriod(period); }}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.timePeriodButtonText, darkOverlay.timePeriodButtonText,
                  isActive && [styles.timePeriodButtonTextActive, darkOverlay.timePeriodButtonTextActive],
                ]}>
                  {period}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {displayMode === "chart" ? (
          <View style={{ width: "100%", alignItems: "stretch", marginTop: 15 }}>
            {isLoading || (pickedDateRange && pickedRangeReportLoading) ? (
              <SkeletonLoader variant="barchart" style={{ marginVertical: 20 }} lines={6} />
            ) : (
              <ConsumerGroupedBarChart
                viewType={selectedView} timePeriod={timePeriod}
                data={effectiveDataForChart} loading={isLoading}
                onBarPress={handleBarPress} pickedDateRange={pickedDateRange}
              />
            )}
          </View>
        ) : (
          <View style={{ marginTop: 10 }}>
            {isLoading || (pickedDateRange && pickedRangeReportLoading) ? (
              <SkeletonLoader variant="table" style={{ marginVertical: 20 }} lines={3} columns={3} />
            ) : (
              <Table
                data={consumptionTableData} loading={isLoading}
                emptyMessage={`No ${effectiveViewForTable} consumption data available`}
                showSerial={true} showPriority={false}
                containerStyle={styles.consumptionTable}
                columns={[
                  { key: "period", title: effectiveViewForTable === "daily" ? "Date" : "Month", flex: 1.5, align: "left" },
                  { key: "consumption", title: "Consumption (kWh)", flex: 1.5, align: "right",
                    render: (item) => <Text style={[styles.consumptionValue, darkOverlay.consumptionValue]}>{item.consumption.toFixed(2)}</Text> },
                  { key: "cumulative", title: "Cumulative (kWh)", flex: 1.5, align: "right",
                    render: (item) => <Text style={[styles.cumulativeValue, darkOverlay.cumulativeValue]}>{item.cumulative.toFixed(2)}</Text> },
                ]}
              />
            )}
          </View>
        )}
      </View>
    </View>
  );
});

// ─── UsageStatsRow ──────────────────────────────────────────────────────────
export const UsageStatsRow = React.memo(({
  styles, darkOverlay, isLoading, averageDailyKwh, peakUsageKwh,
}) => (
  <View style={styles.usageStatsTopRow}>
    <View style={[styles.usageStatsCard, darkOverlay.usageStatsCard]}>
      <Text style={[styles.usageStatsCardTitle, darkOverlay.usageStatsCardTitle]}>Average Daily</Text>
      {isLoading ? (
        <SkeletonLoader variant="lines" lines={1} style={{ width: 80, height: 20, marginTop: 4 }} />
      ) : (
        <Text style={[styles.usageStatsCardValueBlue, darkOverlay.usageStatsCardValueBlue]}>
          {(averageDailyKwh ?? 0).toLocaleString("en-IN")} kWh
        </Text>
      )}
    </View>
    <View style={[styles.usageStatsCard, darkOverlay.usageStatsCard]}>
      <Text style={[styles.usageStatsCardTitle, darkOverlay.usageStatsCardTitle]}>Peak Usage</Text>
      {isLoading ? (
        <SkeletonLoader variant="lines" lines={1} style={{ width: 80, height: 20, marginTop: 4 }} />
      ) : (
        <Text style={[styles.usageStatsCardValueRed, darkOverlay.usageStatsCardValueRed]}>
          {(peakUsageKwh ?? 0).toLocaleString("en-IN")} kWh
        </Text>
      )}
    </View>
  </View>
));

// ─── ComparisonCard ─────────────────────────────────────────────────────────
export const ComparisonCard = React.memo(({
  styles, darkOverlay, isDark, themeColors, isLoading,
  thisMonthKwh, lastMonthKwh, savingsKwh,
  comparisonDiffKwh, comparisonBarFillPercent,
}) => (
  <View style={[styles.comparisonCard, darkOverlay.comparisonCard]}>
    <View style={styles.comparisonHeader}>
      <View style={styles.doubleArrowIcon}>
        {isDark ? <ComparisonIconWhite width={20} height={20} /> : <ComparisonIconBlack width={20} height={20} />}
      </View>
      <Text style={[styles.comparisonTitle, darkOverlay.comparisonTitle]}>Comparison</Text>
    </View>
    <View style={styles.monthlyValuesContainer}>
      <View style={styles.monthlyValueItem}>
        <Text style={[styles.monthlyValueLabel, darkOverlay.monthlyValueLabel]}>This Month</Text>
        {isLoading ? (
          <SkeletonLoader variant="lines" lines={1} style={{ width: 70, height: 18, marginTop: 2 }} />
        ) : (
          <Text style={[
            comparisonDiffKwh > 0 ? styles.monthlyValueRed : styles.monthlyValueBlue,
            comparisonDiffKwh > 0 ? null : darkOverlay.monthlyValueBlue,
          ]}>
            {(thisMonthKwh ?? 0).toLocaleString("en-IN")} kWh
          </Text>
        )}
      </View>
      <View style={styles.monthlyValueItem2}>
        <Text style={[styles.monthlyValueLabel, darkOverlay.monthlyValueLabel]}>Last Month</Text>
        {isLoading ? (
          <SkeletonLoader variant="lines" lines={1} style={{ width: 70, height: 18, marginTop: 2 }} />
        ) : (
          <Text style={[styles.monthlyValueGrey, darkOverlay.monthlyValueGrey]}>
            {(lastMonthKwh ?? 0).toLocaleString("en-IN")} kWh
          </Text>
        )}
      </View>
    </View>
    {isLoading ? (
      <>
        <View style={styles.progressBarContainer}>
          <SkeletonLoader variant="lines" lines={1} style={{ width: "100%", height: 8, borderRadius: 4 }} />
        </View>
        <View style={styles.savingsMessageRow}>
          <SkeletonLoader variant="lines" lines={1} style={{ width: 140, height: 16 }} />
        </View>
      </>
    ) : (
      <>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, darkOverlay.progressBar]}>
            <View style={[styles.progressBarFill, darkOverlay.progressBarFill, { width: `${Math.min(100, Math.max(0, comparisonBarFillPercent))}%` }]} />
            <View style={[styles.progressBarRemainder, comparisonDiffKwh > 0 && styles.progressBarRemainderGray, { width: `${Math.min(100, Math.max(0, 100 - comparisonBarFillPercent))}%` }]} />
          </View>
        </View>
        <View style={styles.savingsMessageRow}>
          {comparisonDiffKwh < 0 ? (
            <>
              <PiggybankIcon width={16} height={16} fill={isDark ? themeColors.accent : COLORS.secondaryColor} style={styles.savingsMessageIcon} />
              <Text style={[styles.savingsMessage, darkOverlay.savingsMessage]}>
                You saved {(savingsKwh ?? 0).toLocaleString("en-IN")} kWh
              </Text>
            </>
          ) : comparisonDiffKwh > 0 ? (
            <>
              <ComparisonHighIcon width={16} height={16} style={styles.savingsMessageIcon} />
              <Text style={[styles.savingsMessage, styles.excessUsageMessage]}>
                You used {(comparisonDiffKwh ?? 0).toLocaleString("en-IN")} kWh in excess
              </Text>
            </>
          ) : (
            <Text style={[styles.savingsMessage, darkOverlay.savingsMessage]}>Same as last month</Text>
          )}
        </View>
      </>
    )}
  </View>
));

// ─── AlertsTableSection ─────────────────────────────────────────────────────
export const AlertsTableSection = React.memo(({
  styles, darkOverlay, tableData, isTableLoading,
}) => (
  <>
    <View style={[styles.tableContainer, darkOverlay.tableContainer]}>
      <Text style={[styles.tableTitle, darkOverlay.tableTitle]}>Alerts</Text>
    </View>
    <View style={styles.tableScrollWrapper}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tableScrollContent}>
        <View style={styles.tableContent}>
          <Table
            data={tableData} loading={isTableLoading}
            skeletonLines={5} emptyMessage="No tamper events available"
            showSerial={true} showPriority={false}
            containerStyle={styles.alertsTable} minTableWidth={900}
            columns={[
              { key: "meterSerialNumber", title: "Meter SI No", width: 110, align: "left",
                render: (item) => (
                  <View style={styles.meterSiCell}>
                    <StatusBlinkingDot status={item.status} styles={styles} />
                    <Text style={[styles.meterSiText, darkOverlay.meterSiText]}>{item.meterSerialNumber}</Text>
                  </View>
                ),
              },
              { key: "consumerName", title: "Consumer Name", width: 160, align: "left" },
              { key: "eventDateTime", title: "Event Date Time", width: 160, align: "left" },
              { key: "eventDescription", title: "Event Description", width: 140, align: "left" },
              { key: "status", title: "Status", width: 120, align: "left",
                render: (item) => (
                  <View style={[styles.statusBadge, item.status === "Resolved" ? styles.statusResolved : styles.statusActive]}>
                    <Text style={[styles.statusBadgeText, item.status === "Resolved" ? styles.statusResolvedText : styles.statusActiveText]}>
                      {item.status}
                    </Text>
                  </View>
                ),
              },
              { key: "duration", title: "Duration", width: 90, align: "left" },
            ]}
          />
        </View>
      </ScrollView>
    </View>
  </>
));
