import React, { useEffect, useState } from "react";
import { View, Dimensions, Text, ActivityIndicator, ScrollView } from "react-native";
import { BarChart as GiftedBarChart } from "react-native-gifted-charts";
import { SkeletonLoader } from "../utils/loadingManager";
import { useTheme } from "../context/ThemeContext";

const ConsumerGroupedBarChart = ({ viewType = "daily", timePeriod = "30D", data = null, loading = false, onBarPress = null }) => {
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
        
        let latestData, latestLabels, startIndex;
        let dailyPadCount = 0;
        const dailyDaysToShow = timePeriod === "7D" ? 7 : timePeriod === "30D" ? 30 : 7;
        const monthlyMonthsToShow = timePeriod === "1Y" ? 12 : 10;
        
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
          // Monthly: 1Y = always 12 bars (pad if API returns fewer), otherwise last 10 months
          const takeCount = timePeriod === "1Y" ? 12 : monthlyMonthsToShow;
          let slicedData = allData.slice(-takeCount);
          let slicedLabels = allLabels.slice(-takeCount);
          // For 1Y: always 12 bars with Jan–Dec labels; first (12 - dataLength) bars are 0, then API values; no data = 12 empty (0) bars
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
              // No data for any month: show 12 empty (0) bars with Jan–Dec labels only
              latestData = Array(12).fill(0);
              latestLabels = last12Labels;
            }
          } else {
            latestData = slicedData;
            latestLabels = slicedLabels;
          }
          startIndex = Math.max(0, allLabels.length - latestLabels.length);
        }
        
        // Store original full data (dailyPadCount only set for daily view when padded)
        setOriginalData({
          allLabels: allLabels,
          allData: allData,
          startIndex: startIndex,
          dailyPadCount: viewType === "daily" ? dailyPadCount : 0,
        });
        
        // Ensure we have valid data
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
  }, [data, viewType, timePeriod, loading]);

  // 1Y: 12 bars; daily: 7/30/90 bars depending on period when no data
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
  const threeBarsOnly = displayedBars === 3; // 90D: last 3 months
  const twelveBarsOnly = displayedBars === 12; // 1Y: last 12 months
  const thirtyBarsOnly = displayedBars === 30; // 30D: scrollable with bigger bars

  // 90D: use equal left/right edge spacing so both sides have the same gap
  const edgeSpacing = threeBarsOnly ? 20 : 2;

  let spacing, minSpacing, minBarWidth, maxBarWidth;
  if (threeBarsOnly) {
    // 90D: equal gaps left and right, nice gaps between 3 bars
    spacing = 24;
    minSpacing = 16;
    minBarWidth = 24;
    maxBarWidth = 999; // no cap so 3 bars fill container
  } else if (thirtyBarsOnly) {
    // 30D: bigger bar width, scrollable so dates are visible below
    spacing = 8;
    minSpacing = 6;
    minBarWidth = 24;
    maxBarWidth = 32; // fixed bigger bars
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
      // 30D: use fixed bigger bar width so chart is wider than container (scrollable)
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

  // Chart width: for 30D use full content width (scrollable); otherwise fit container
  const scrollableChartWidth = thirtyBarsOnly
    ? displayedBars * barWidth + Math.max(0, displayedBars - 1) * spacing + (edgeSpacing * 2)
    : chartContainerWidth;
  const chartWidth = thirtyBarsOnly ? scrollableChartWidth : chartContainerWidth;

  // Label width: 3/12 bars need "Jan 2026"; 30D needs room for date labels
  const xAxisLabelWidth = threeBarsOnly || twelveBarsOnly
    ? Math.max(62, barWidth + spacing)
    : (thirtyBarsOnly ? Math.max(38, barWidth + spacing) : (manyBars ? Math.max(12, barWidth + spacing) : Math.max(40, barWidth + spacing)));
  const xAxisFontSize = manyBars ? 8 : 12;
  // Only 30D (30 days) is horizontally scrollable; 7D, 90D, 1Y are not
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
      // Custom spacing for better grouped bar appearance
      barBorderWidth={0}
      barBorderColor="transparent"
      // Ensure bars are well spaced
      barMarginBottom={8}
      // Ensure X-axis labels are visible
      xAxisLabelWidth={xAxisLabelWidth}
      xAxisLabelHeight={20}
      // Better spacing for readability
      barCategoryGap={0.5} // Gap between bar categories (0-1 range)
      // Enable bar press functionality
      onPress={(item, index) => {
        if (onBarPress) {
          // When daily view is padded, first dailyPadCount bars have no original data
          const pad = originalData.dailyPadCount || 0;
          if (index < pad) return;
          const originalIndex = originalData.startIndex + (index - pad);
          const originalLabel = originalData.allLabels[originalIndex] || item.label;
          
          onBarPress({
            index: originalIndex, // Original index in full array
            displayIndex: index, // Index in displayed array
            label: item.label, // Display label
            originalLabel: originalLabel, // Original label from full data
            value: item.value,
            date: originalLabel, // Use original label for date parsing
            consumption: item.value,
            viewType: (timePeriod === "90D" || timePeriod === "1Y") ? "monthly" : viewType, // 90D and 1Y use monthly data
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
