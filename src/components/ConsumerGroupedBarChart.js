import React, { useEffect, useState } from "react";
import { View, Dimensions, Text, ActivityIndicator } from "react-native";
import { BarChart as GiftedBarChart } from "react-native-gifted-charts";
import { SkeletonLoader } from "../utils/loadingManager";


const ConsumerGroupedBarChart = ({ viewType = "daily", timePeriod = "30D", data = null, loading = false, onBarPress = null }) => {
  const { width } = Dimensions.get("window");
  const screenWidth = width;

  const [chartData, setChartData] = useState({
    blue: [8, 7, 7, 5, 7.5, 7, 7.5, 5, 7.5, 7],
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "July", "Aug", "Sept", "Oct"],
  });

  // Store original full data for date lookup
  const [originalData, setOriginalData] = useState({
    allLabels: [],
    allData: [],
    startIndex: 0 // Index where the displayed data starts in the original array
  });

  // Process API data for chart - 7D: last 7 bars (daily), 1Y: last 12 months (monthly)
  useEffect(() => {
    if (data && data.chartData) {
      const chartType = viewType === "daily" ? data.chartData.daily : data.chartData.monthly;
      
      if (chartType && chartType.seriesData && chartType.seriesData.length > 0) {
        const seriesData = chartType.seriesData[0]; // Get first series
        const allData = seriesData.data || [];
        const allLabels = chartType.xAxisData || [];
        
        let latestData, latestLabels, startIndex;
        const dailyDaysToShow = 7;   // 7D: always last 7 days
        const monthlyMonthsToShow = timePeriod === "1Y" ? 12 : 10;  // 1Y: 12 months, else 10
        
        if (viewType === "daily") {
          // For 7D: take last 7 data points so we always show 7 bars when available
          const count = Math.min(dailyDaysToShow, allData.length);
          startIndex = Math.max(0, allData.length - count);
          latestData = allData.slice(-dailyDaysToShow);
          latestLabels = allLabels.slice(-dailyDaysToShow);
          startIndex = Math.max(0, allLabels.length - latestLabels.length);
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
              last12Labels.push(monthNames[d.getMonth()]);
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
        
        // Store original full data
        setOriginalData({
          allLabels: allLabels,
          allData: allData,
          startIndex: startIndex
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

  // 1Y: always 12 bars with Jan–Dec labels; no data = 12 empty (0) bars (never "7 days" or day labels)
  function get1YFallback(period, view) {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    if (period === "1Y") {
      const now = new Date();
      const last12Labels = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        last12Labels.push(monthNames[d.getMonth()]);
      }
      return { blue: Array(12).fill(0), labels: last12Labels };
    }
    return {
      blue: [8, 7, 7, 5, 7.5, 7, 7.5, 5, 7.5, 7],
      labels: view === "daily" ? ["1", "2", "3", "4", "5", "6", "7"] : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"],
    };
  }

  // Convert data to GiftedCharts format
  const giftedData = chartData.labels.map((label, index) => ({
    value: chartData.blue[index] || 0,
    label: label,
    frontColor: '#163b7c', // Same color as original chart
    labelTextStyle: {
      color: '#333',
      fontSize: 7,
      fontFamily: 'Manrope-Medium',
      transform: [{ rotate: '-60deg' }],
    },
    // Add top label component with proper positioning
    topLabelComponent: () => (
      <Text style={{
        color: '#333',
        fontSize: 7,
        fontFamily: 'Manrope-Medium',
      }}>
        {chartData.blue[index] || 0}
      </Text>
    ),
  }));

  const displayedBars = giftedData.length || 0;
  const chartContainerWidth = screenWidth - 80; // available inner width for the chart

  const desiredSpacing = 8; // target gap between bars
  const minSpacing = 8;
  const edgeSpacing = 11.5; // left/right padding
  const minBarWidth = 18;
  const maxBarWidth = 40;

  let spacing = desiredSpacing;
  let barWidth = 35;

  if (displayedBars > 0) {
    const gaps = Math.max(0, displayedBars - 1);
    let availableForBars = chartContainerWidth - (edgeSpacing * 2) - (spacing * gaps);
    barWidth = Math.floor(availableForBars / displayedBars);

    if (barWidth < minBarWidth && gaps > 0) {
      spacing = Math.max(
        minSpacing,
        Math.floor((chartContainerWidth - (edgeSpacing * 2) - (minBarWidth * displayedBars)) / gaps)
      );
      availableForBars = chartContainerWidth - (edgeSpacing * 2) - (spacing * gaps);
      barWidth = Math.floor(availableForBars / displayedBars);
    }

    barWidth = Math.min(maxBarWidth, Math.max(minBarWidth, barWidth));
  }

  const xAxisLabelWidth = Math.max(40, barWidth + spacing);
  const chartWidth = chartContainerWidth;
  const needsScrolling = false;

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
      frontColor="#163b7c"
      height={190}
      width={chartWidth}
      isAnimated
      animationDuration={1000}
      yAxisThickness={0}    // removes y-axis line
      xAxisThickness={0}    // removes x-axis line
      hideYAxisText          // removes y-axis labels
      rulesType="none"       // removes grid/rule lines
      barBorderRadius={4}    // rounded corners like original
      spacing={spacing}      // spacing between bars
      initialSpacing={edgeSpacing}    // spacing before first bar
      endSpacing={edgeSpacing}        // spacing after last bar
      showGradient={false}   // solid color like original
      showReferenceLine1={false}
      showReferenceLine2={false}
      showReferenceLine3={false}
      showStrip={false}
      showTextOnBar={false}
      showTextBelowBar={false}
      showValuesAsTopLabel={false}  // Use custom topLabelComponent instead
      topLabelTextStyle={{
        color: '#333',
        fontSize: 10,
        fontFamily: 'Manrope-Regular',
      }}
      xAxisLabelTextStyle={{
        color: '#333',
        fontSize: 12,
        fontFamily: 'Manrope-Regular',
        // transform: [{ rotate: '-25deg' }], 
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
          // Calculate the original index in the full data array
          const originalIndex = originalData.startIndex + index;
          const originalLabel = originalData.allLabels[originalIndex] || item.label;
          
          onBarPress({
            index: originalIndex, // Original index in full array
            displayIndex: index, // Index in displayed array (0-9)
            label: item.label, // Display label
            originalLabel: originalLabel, // Original label from full data
            value: item.value,
            date: originalLabel, // Use original label for date parsing
            consumption: item.value,
            viewType: viewType 
          });
        }
      }}
    />
  );

  return (
    <View style={{ 
      height: 250, 
      width: width - 40, 
      marginHorizontal: 20, 
      borderRadius: 5, 
      backgroundColor: '#eef8f0'
    }}>
      <View style={{ paddingHorizontal: 0, alignItems: 'center' }}>
        {renderChart()}
      </View>
    </View>
  );
};

export default ConsumerGroupedBarChart;
