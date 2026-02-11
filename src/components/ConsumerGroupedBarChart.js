import React, { useEffect, useState } from "react";
import { View, Dimensions, Text, ActivityIndicator, ScrollView } from "react-native";
import { BarChart as GiftedBarChart } from "react-native-gifted-charts";
import { SkeletonLoader } from "../utils/loadingManager";
import { useTheme } from "../context/ThemeContext";

// Parse chart label to Date (start of day or first day of month). Returns null if unparseable.
const parseLabelToDate = (label, isDaily) => {
  if (!label || typeof label !== "string") return null;
  const str = label.trim();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  try {
    if (isDaily) {
      // "01 Jan 2026", "1 Jan 2026", "Jan 1, 2026", "2026-01-01"
      const d = new Date(str);
      if (!isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const match = str.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/i);
      if (match) {
        const day = parseInt(match[1], 10);
        const monthIdx = monthNames.findIndex((m) => m.toLowerCase() === match[2].substring(0, 3).toLowerCase());
        const year = parseInt(match[3], 10);
        if (monthIdx !== -1) return new Date(year, monthIdx, day);
      }
      const match2 = str.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (match2) return new Date(parseInt(match2[1], 10), parseInt(match2[2], 10) - 1, parseInt(match2[3], 10));
      return null;
    }
    // Monthly: "Jan 2026", "Mar 2025"
    const m = str.match(/(\w+)\s+(\d{4})/i);
    if (m) {
      const monthIdx = monthNames.findIndex((x) => x.toLowerCase() === m[1].substring(0, 3).toLowerCase());
      const year = parseInt(m[2], 10);
      if (monthIdx !== -1) return new Date(year, monthIdx, 1);
    }
    return null;
  } catch {
    return null;
  }
};

// Normalize to start-of-day for range comparison
const toDayStart = (d) => (d ? new Date(d.getFullYear(), d.getMonth(), d.getDate()) : null);

const ConsumerGroupedBarChart = ({ viewType = "daily", timePeriod = "30D", data = null, loading = false, onBarPress = null, pickedDateRange = null }) => {
  const { isDark, colors: themeColors, getScaledFontSize } = useTheme();
  const scaled6 = getScaledFontSize(6);
  const scaled7 = getScaledFontSize(7);
  const scaled8 = getScaledFontSize(8);
  const scaled10 = getScaledFontSize(10);
  const scaled12 = getScaledFontSize(12);
  const { width } = Dimensions.get("window");
  const [containerWidth, setContainerWidth] = useState(width - 62);

  const [chartData, setChartData] = useState({
    blue: [8, 7, 7, 5, 7.5, 7, 7.5, 5, 7.5, 7],
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "July", "Aug", "Sept", "Oct"],
  });

  // Store original full data for date lookup
  const [originalData, setOriginalData] = useState({
    allLabels: [],
    allData: [],
    startIndex: 0, // Index in original array of first real bar
    dailyPadCount: 0,
  });

  useEffect(() => {
    if (data && data.chartData) {
      const useMonthlyFor90D = timePeriod === "90D";
      const useMonthlyFor1Y = timePeriod === "1Y";
      const chartType = (useMonthlyFor90D || useMonthlyFor1Y)
        ? data.chartData.monthly
        : (viewType === "daily" ? data.chartData.daily : data.chartData.monthly);
      
      if (chartType && chartType.seriesData && chartType.seriesData.length > 0) {
        const seriesData = chartType.seriesData[0]; 
        const allData = seriesData.data || [];
        const allLabels = chartType.xAxisData || [];
        const isDailyView = (useMonthlyFor90D || useMonthlyFor1Y) ? false : viewType === "daily";

        let latestData, latestLabels, startIndex;
        let dailyPadCount = 0;
        const dailyDaysToShow = timePeriod === "7D" ? 7 : timePeriod === "30D" ? 30 : 7;
        const monthlyMonthsToShow = timePeriod === "1Y" ? 12 : 10;

        // When user has picked a date range, filter data to that range only
        if (pickedDateRange && pickedDateRange.startDate && pickedDateRange.endDate) {
          const rangeStart = toDayStart(pickedDateRange.startDate);
          const rangeEnd = toDayStart(pickedDateRange.endDate);
          if (rangeStart && rangeEnd) {
            const indices = [];
            for (let i = 0; i < allLabels.length; i++) {
              const labelDate = parseLabelToDate(allLabels[i], isDailyView);
              if (!labelDate) continue;
              if (isDailyView) {
                if (labelDate.getTime() >= rangeStart.getTime() && labelDate.getTime() <= rangeEnd.getTime()) {
                  indices.push(i);
                }
              } else {
                const monthEnd = new Date(labelDate.getFullYear(), labelDate.getMonth() + 1, 0);
                if (labelDate.getTime() <= rangeEnd.getTime() && monthEnd.getTime() >= rangeStart.getTime()) {
                  indices.push(i);
                }
              }
            }
            if (indices.length > 0) {
              latestData = indices.map((i) => allData[i] ?? 0);
              latestLabels = indices.map((i) => allLabels[i]);
              startIndex = indices[0];
              setOriginalData({
                allLabels: latestLabels,
                allData: latestData,
                startIndex: 0,
                dailyPadCount: 0,
              });
              setChartData({ blue: latestData, labels: latestLabels });
              return;
            }
          }
        }

        // Default: time-period-based slicing (existing behavior)
        if (timePeriod === "1Y") {
          // 1Y: show last 12 months (12 bars) from monthly data; labels "Jan 2026"
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const now = new Date();
          const last12Labels = [];
          for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            last12Labels.push(monthNames[d.getMonth()] + " " + d.getFullYear());
          }
          let slicedData = allData.slice(-12);
          let slicedLabels = allLabels.slice(-12);
          if (slicedData.length >= 12) {
            latestData = slicedData.slice(-12);
            latestLabels = slicedLabels.slice(-12);
          } else if (slicedData.length > 0) {
            const padCount = 12 - slicedData.length;
            latestData = [...Array(padCount).fill(0), ...slicedData];
            latestLabels = last12Labels;
          } else {
            latestData = Array(12).fill(0);
            latestLabels = last12Labels;
          }
          startIndex = Math.max(0, allLabels.length - latestLabels.length);
        } else if (timePeriod === "90D") {
          // 90D: show 3 bars = last 3 months (monthly data); labels "Jan 2026"
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const takeCount = 3;
          const now = new Date();
          const last3Labels = [];
          for (let i = 2; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            last3Labels.push(monthNames[d.getMonth()] + " " + d.getFullYear());
          }
          let slicedData = allData.slice(-takeCount);
          let slicedLabels = allLabels.slice(-takeCount);
          if (slicedData.length >= 3) {
            latestData = slicedData.slice(-3);
            latestLabels = slicedLabels.slice(-3);
          } else if (slicedData.length > 0) {
            const padCount = 3 - slicedData.length;
            latestData = [...Array(padCount).fill(0), ...slicedData];
            latestLabels = last3Labels;
          } else {
            latestData = Array(3).fill(0);
            latestLabels = last3Labels;
          }
          startIndex = Math.max(0, allLabels.length - latestLabels.length);
        } else if (viewType === "daily") {
          // 7D or 30D: daily bars
          const sliceData = allData.slice(-dailyDaysToShow);
          const sliceLabels = allLabels.slice(-dailyDaysToShow);
          startIndex = Math.max(0, allLabels.length - sliceLabels.length);
          if (sliceData.length >= dailyDaysToShow) {
            latestData = sliceData;
            latestLabels = sliceLabels;
          } else {
            dailyPadCount = dailyDaysToShow - sliceData.length;
            latestData = [...Array(dailyPadCount).fill(0), ...sliceData];
            latestLabels = [...Array(dailyPadCount).fill(""), ...sliceLabels];
          }
        } else {
          const takeCount = timePeriod === "1Y" ? 12 : monthlyMonthsToShow;
          let slicedData = allData.slice(-takeCount);
          let slicedLabels = allLabels.slice(-takeCount);
          if (timePeriod === "1Y") {
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const now = new Date();
            const last12Labels = [];
            for (let i = 11; i >= 0; i--) {
              const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
              last12Labels.push(monthNames[d.getMonth()] + " " + d.getFullYear());
            }
            if (slicedData.length >= 12) {
              latestData = slicedData.slice(-12);
              latestLabels = slicedLabels.slice(-12);
            } else if (slicedData.length > 0) {
              const padCount = 12 - slicedData.length;
              latestData = [...Array(padCount).fill(0), ...slicedData];
              latestLabels = last12Labels;
            } else {
              latestData = Array(12).fill(0);
              latestLabels = last12Labels;
            }
          } else {
            latestData = slicedData;
            latestLabels = slicedLabels;
          }
          startIndex = Math.max(0, allLabels.length - latestLabels.length);
        }
        
        setOriginalData({
          allLabels: allLabels,
          allData: allData,
          startIndex: startIndex,
          dailyPadCount: viewType === "daily" ? dailyPadCount : 0,
        });
        
        if (latestData.length > 0 && latestLabels.length > 0) {
          setChartData({
            blue: latestData,
            labels: latestLabels,
          });
        } else {
          // Use fallback: for 1Y always Jan–Dec and 12 empty bars; else default
          const fallback = get1YFallback(timePeriod, viewType);
          setChartData(fallback);
          setOriginalData({
            allLabels: [],
            allData: [],
            startIndex: 0
          });
        }
      } else {
        // No series data: for 1Y use Jan–Dec and 12 empty bars
        const fallback = get1YFallback(timePeriod, viewType);
        setChartData(fallback);
        setOriginalData({
          allLabels: [],
          allData: [],
          startIndex: 0
        });
      }
    } else if (!loading) {
      // No API data: for 1Y use Jan–Dec and 12 empty bars
      const fallback = get1YFallback(timePeriod, viewType);
      setChartData(fallback);
      setOriginalData({
        allLabels: [],
        allData: [],
        startIndex: 0
      });
    }
  }, [data, viewType, timePeriod, loading, pickedDateRange]);

  function get1YFallback(period, view) {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    if (period === "1Y") {
      const now = new Date();
      const last12Labels = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        last12Labels.push(monthNames[d.getMonth()] + " " + d.getFullYear());
      }
      return { blue: Array(12).fill(0), labels: last12Labels };
    }
    if (period === "90D") {
      const now = new Date();
      const last3Labels = [];
      for (let i = 2; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        last3Labels.push(monthNames[d.getMonth()] + " " + d.getFullYear());
      }
      return { blue: Array(3).fill(0), labels: last3Labels };
    }
    if (view === "daily") {
      const dailyCount = period === "7D" ? 7 : period === "30D" ? 30 : 7;
      const labels = Array.from({ length: dailyCount }, (_, i) => String(i + 1));
      return { blue: Array(dailyCount).fill(0), labels };
    }
    return {
      blue: [8, 7, 7, 5, 7.5, 7, 7.5, 5, 7.5, 7],
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"],
    };
  }

  // Convert data to GiftedCharts format; for 30D show all labels (scrollable); else every nth when many bars
  const barColor = isDark ? themeColors.brandBlue : '#163b7c';
  const labelColor = isDark ? themeColors.textSecondary : '#333';
  const barCount = chartData.labels.length;
  const showEveryNthLabel = barCount === 30 ? 1 : (barCount >= 20 ? (barCount <= 60 ? 10 : 15) : 1);
  const giftedData = chartData.labels.map((label, index) => ({
    value: chartData.blue[index] || 0,
    label: showEveryNthLabel > 1 && index % showEveryNthLabel !== 0 ? '' : label,
    frontColor: barColor,
    labelTextStyle: {
      color: labelColor,
      fontSize: chartData.labels.length >= 12 ? scaled6 : scaled7,
      fontFamily: 'Manrope-Medium',
      transform: [{ rotate: '-60deg' }],
    },
    topLabelComponent: () => (
      <Text style={{
        color: labelColor,
        fontSize: scaled7,
        fontFamily: 'Manrope-Medium',
      }}>
        {chartData.blue[index] || 0}
      </Text>
    ),
  }));

  const displayedBars = giftedData.length || 0;
  const chartContainerWidth = containerWidth;

  const manyBars = displayedBars >= 12;
  const threeBarsOnly = displayedBars === 3; 
  const twelveBarsOnly = displayedBars === 12; 
  const thirtyBarsOnly = displayedBars === 30; 

  const edgeSpacing = (threeBarsOnly || twelveBarsOnly || thirtyBarsOnly) ? 20 : 2;

  let spacing, minSpacing, minBarWidth, maxBarWidth;
  if (threeBarsOnly) {
    spacing = 24;
    minSpacing = 16;
    minBarWidth = 24;
    maxBarWidth = 999;
  } else if (thirtyBarsOnly) {
    spacing = 8;
    minSpacing = 6;
    minBarWidth = 24;
    maxBarWidth = 32;
  } else {
    spacing = manyBars ? 4 : 8;
    minSpacing = manyBars ? 2 : 8;
    minBarWidth = manyBars ? 4 : 18;
    maxBarWidth = 40;
  }

  let barWidth = 35;

  if (displayedBars > 0) {
    const gaps = Math.max(0, displayedBars - 1);
    let availableForBars = chartContainerWidth - (edgeSpacing * 2) - (spacing * gaps);
    barWidth = Math.floor(availableForBars / displayedBars);

    if (thirtyBarsOnly) {
      barWidth = 26;
    } else if (!threeBarsOnly && barWidth < minBarWidth && gaps > 0) {
      spacing = Math.max(
        minSpacing,
        Math.floor((chartContainerWidth - (edgeSpacing * 2) - (minBarWidth * displayedBars)) / gaps)
      );
      availableForBars = chartContainerWidth - (edgeSpacing * 2) - (spacing * gaps);
      barWidth = Math.floor(availableForBars / displayedBars);
    }

    barWidth = Math.min(maxBarWidth, Math.max(minBarWidth, barWidth));
  }

  const scrollableChartWidth = thirtyBarsOnly
    ? displayedBars * barWidth + Math.max(0, displayedBars - 1) * spacing + (edgeSpacing * 2)
    : chartContainerWidth;
  const chartWidth = thirtyBarsOnly ? scrollableChartWidth : chartContainerWidth;

  const xAxisLabelWidth = threeBarsOnly || twelveBarsOnly
    ? Math.max(62, barWidth + spacing)
    : (thirtyBarsOnly ? Math.max(38, barWidth + spacing) : (manyBars ? Math.max(12, barWidth + spacing) : Math.max(40, barWidth + spacing)));
  const xAxisFontSize = manyBars ? 8 : 12;
  const isScrollable = timePeriod === "30D" && thirtyBarsOnly;

  if (loading) {
  return (
    <SkeletonLoader variant="barchart" style={{ marginVertical: 20 }} lines={12} />
  );
}

  const renderChart = () => (
    <GiftedBarChart
      data={giftedData}
      barWidth={barWidth}
      noOfSections={4}
      frontColor={barColor}
      height={190}
      width={chartWidth}
      isAnimated
      animationDuration={1000}
      yAxisThickness={0}
      xAxisThickness={0}
      hideYAxisText
      rulesType="none"
      barBorderRadius={4}
      spacing={spacing}
      initialSpacing={edgeSpacing}
      endSpacing={edgeSpacing}
      showGradient={false}
      showReferenceLine1={false}
      showReferenceLine2={false}
      showReferenceLine3={false}
      showStrip={false}
      showTextOnBar={false}
      showTextBelowBar={false}
      showValuesAsTopLabel={false}
      topLabelTextStyle={{
        color: labelColor,
        fontSize: scaled10,
        fontFamily: 'Manrope-Regular',
      }}
      xAxisLabelTextStyle={{
        color: labelColor,
        fontSize: xAxisFontSize,
        fontFamily: 'Manrope-Regular',
        textAlign: 'right',
      }}
      barBorderWidth={0}
      barBorderColor="transparent"
      barMarginBottom={8}
      xAxisLabelWidth={xAxisLabelWidth}
      xAxisLabelHeight={20}
      barCategoryGap={0.5}
      onPress={(item, index) => {
        if (onBarPress) {
          const pad = originalData.dailyPadCount || 0;
          if (index < pad) return;
          const originalIndex = originalData.startIndex + (index - pad);
          const originalLabel = originalData.allLabels[originalIndex] || item.label;
          
          onBarPress({
            index: originalIndex,
            displayIndex: index,
            label: item.label,
            originalLabel: originalLabel,
            value: item.value,
            date: originalLabel,
            consumption: item.value,
            viewType: (timePeriod === "90D" || timePeriod === "1Y") ? "monthly" : viewType,
          });
        }
      }}
    />
  );

  const chartContainerBg = isDark ? '#1A1F2E' : '#eef8f0';

  return (
    <View
      style={{ 
        height: 250, 
        width: '100%', 
        borderRadius: 5, 
        backgroundColor: chartContainerBg,
        overflow: 'hidden',
      }}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0) setContainerWidth(w);
      }}
    >
      <View style={{ flex: 1, paddingHorizontal: 0, alignItems: 'stretch', overflow: 'hidden' }}>
        {isScrollable ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            style={{ width: '100%', overflow: 'hidden' }}
            contentContainerStyle={{ minWidth: chartWidth }}
          >
            {renderChart()}
          </ScrollView>
        ) : (
          renderChart()
        )}
      </View>
    </View>
  );
};

export default React.memo(ConsumerGroupedBarChart);
