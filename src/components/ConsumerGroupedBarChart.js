import React, { useEffect, useState } from "react";
import { View, Dimensions, Text, ActivityIndicator } from "react-native";
import { BarChart as GiftedBarChart } from "react-native-gifted-charts";
import { SkeletonLoader } from "../utils/loadingManager";


const ConsumerGroupedBarChart = ({ viewType = "daily", data = null, loading = false, onBarPress = null }) => {
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

  // Process API data for chart - show only latest 10 bars (excluding current date for daily view)
  useEffect(() => {
    if (data && data.chartData) {
      const chartType = viewType === "daily" ? data.chartData.daily : data.chartData.monthly;
      
      if (chartType && chartType.seriesData && chartType.seriesData.length > 0) {
        const seriesData = chartType.seriesData[0]; // Get first series
        const allData = seriesData.data || [];
        const allLabels = chartType.xAxisData || [];
        
        let latestData, latestLabels, startIndex;
        const dailyDaysToShow = 7;
        
        if (viewType === "daily") {
          // For daily view, include present day and show only last 7 days
          const today = new Date();
          today.setHours(0, 0, 0, 0); // Reset time to start of day
          
          // Helper function to parse date from label
          const parseDateFromLabel = (label) => {
            if (!label) return null;
            try {
              // Try various formats: "25 Nov", "25th Nov", "Nov 25", etc.
              const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                                 "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
              
              // Format: "25 Nov" or "25th Nov"
              const match1 = label.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(\w+)/i);
              if (match1) {
                const day = parseInt(match1[1]);
                const monthName = match1[2].substring(0, 3);
                const monthIndex = monthNames.findIndex(m => 
                  m.toLowerCase() === monthName.toLowerCase()
                );
                if (monthIndex !== -1) {
                  const year = today.getFullYear();
                  return new Date(year, monthIndex, day);
                }
              }
              
              // Try direct date parsing
              const parsed = new Date(label);
              if (!isNaN(parsed.getTime())) {
                return parsed;
              }
              
              return null;
            } catch {
              return null;
            }
          };
          
          // Find the index of today's date in the labels array
          let todayIndex = -1;
          for (let i = allLabels.length - 1; i >= 0; i--) {
            const label = allLabels[i];
            const labelDate = parseDateFromLabel(label);
            if (labelDate) {
              labelDate.setHours(0, 0, 0, 0);
              if (labelDate.getTime() === today.getTime()) {
                todayIndex = i;
                break;
              }
            }
          }
          
          // If today's date is found, include it and get 7 days ending today.
          // Otherwise, fall back to the last 7 available points.
          if (todayIndex >= 0) {
            // Include today
            const endIndexExclusive = todayIndex + 1;
            const startIdx = Math.max(0, endIndexExclusive - dailyDaysToShow);
            latestData = allData.slice(startIdx, endIndexExclusive);
            latestLabels = allLabels.slice(startIdx, endIndexExclusive);
            startIndex = startIdx;
          } else {
            // Today not found, just get last 7 days
            startIndex = Math.max(0, allLabels.length - dailyDaysToShow);
            latestData = allData.slice(startIndex);
            latestLabels = allLabels.slice(startIndex);
          }
        } else {
          // For monthly view, just get last 10 months
          startIndex = Math.max(0, allLabels.length - 10);
          latestData = allData.slice(startIndex);
          latestLabels = allLabels.slice(startIndex);
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
          // Use fallback data if API data is empty
          setChartData({
            blue: [8, 7, 7, 5, 7.5, 7, 7.5, 5, 7.5, 7],
            labels: viewType === "daily" ? ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"] : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"],
          });
          setOriginalData({
            allLabels: [],
            allData: [],
            startIndex: 0
          });
        }
      } else {
        // Use fallback data if no series data
        setChartData({
          blue: [8, 7, 7, 5, 7.5, 7, 7.5, 5, 7.5, 7],
          labels: viewType === "daily" ? ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"] : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"],
        });
        setOriginalData({
          allLabels: [],
          allData: [],
          startIndex: 0
        });
      }
    } else if (!loading) {
      // Fallback to default data if no API data
      setChartData({
        blue: [8, 7, 7, 5, 7.5, 7, 7.5, 5, 7.5, 7],
        labels: viewType === "daily" ? ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"] : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"],
      });
      setOriginalData({
        allLabels: [],
        allData: [],
        startIndex: 0
      });
    }
  }, [data, viewType, loading]);

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
