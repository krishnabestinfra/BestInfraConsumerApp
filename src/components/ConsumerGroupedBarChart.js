import React, { useEffect, useState } from "react";
import { View, Dimensions, Text, ActivityIndicator, ScrollView } from "react-native";
import { BarChart as GiftedBarChart } from "react-native-gifted-charts";
import { COLORS } from "../constants/colors";

const ConsumerGroupedBarChart = ({ viewType = "daily", data = null, loading = false, onBarPress = null }) => {
  const { width } = Dimensions.get("window");
  const screenWidth = width;

  const [chartData, setChartData] = useState({
    blue: [8, 7, 7, 5, 7.5, 7, 7.5, 5, 7.5, 7],
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "July", "Aug", "Sept", "Oct"],
  });

  // Process API data for chart - show only latest 10 bars
  useEffect(() => {
    if (data && data.chartData) {
      const chartType = viewType === "daily" ? data.chartData.daily : data.chartData.monthly;
      
      if (chartType && chartType.seriesData && chartType.seriesData.length > 0) {
        const seriesData = chartType.seriesData[0]; // Get first series
        const allData = seriesData.data || [];
        const allLabels = chartType.xAxisData || [];
        
        // Get only the latest 10 bars
        const latestData = allData.slice(-10);
        const latestLabels = allLabels.slice(-10);
        
        setChartData({
          blue: latestData,
          labels: latestLabels,
        });
      }
    } else if (!loading) {
      // Fallback to default data if no API data - same as original
      setChartData({
        blue: [8, 7, 7, 5, 7.5, 7, 7.5, 5, 7.5, 7],
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "July", "Aug", "Sept", "Oct"],
      });
    }
  }, [data, viewType, loading]);

  // Convert data to GiftedCharts format
  const giftedData = chartData.labels.map((label, index) => ({
    value: chartData.blue[index] || 0,
    label: label,
    frontColor: '#163b7c', // Same color as original chart
    spacing: 2, // Increased spacing between bars
    labelTextStyle: {
      color: '#333',
      fontSize: 8,
      fontFamily: 'Manrope-Medium',
      transform: [{ rotate: '-60deg' }], 
    },
    // Add top label component with proper positioning
    topLabelComponent: () => (
      <Text style={{
        color: '#333',
        fontSize: 8,
        fontFamily: 'Manrope-Medium',
      }}>
        {chartData.blue[index] || 0}
      </Text>
    ),
  }));

  // Calculate width for 10 bars with proper spacing
  const barWidth = 35;
  const spacing = 15;
  const chartWidth = (barWidth + spacing) * 8; // Width for exactly 10 bars
  const needsScrolling = chartWidth > screenWidth - 80; // Check if scrolling is needed

  if (loading) {
    return (
      <View style={{ 
        height: 20, 
        width: width - 40, 
        marginHorizontal: 20, 
        borderRadius: 5, 
        marginTop: 25,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#eef8f0'
      }}>
        <ActivityIndicator size="large" color={COLORS.secondaryColor} />
        <Text style={{ 
          marginTop: 10, 
          color: COLORS.primaryFontColor,
          fontFamily: 'Manrope-Regular',
          fontSize: 14
        }}>
          Loading chart data...
        </Text>
      </View>
    );
  }

  // Render chart - no scrolling needed for 10 bars
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
        transform: [{ rotate: '-25deg' }], 
        textAlign: 'right',
      }}
      // Custom spacing for better grouped bar appearance
      barBorderWidth={0}
      barBorderColor="transparent"
      // Ensure bars are well spaced
      barMarginBottom={8}
      // Ensure X-axis labels are visible
      xAxisLabelWidth={50}
      xAxisLabelHeight={20}
      // Better spacing for readability
      barCategoryGap={0.1}
      // Enable bar press functionality
      onPress={(item, index) => {
        if (onBarPress) {
          onBarPress({
            index,
            label: item.label,
            value: item.value,
            date: item.label,
            consumption: item.value
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
      {needsScrolling ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, alignItems: 'center' }}
          style={{ flex: 1 }}
        >
          {renderChart()}
        </ScrollView>
      ) : (
        <View style={{ paddingHorizontal: 16, alignItems: 'center' }}>
          {renderChart()}
        </View>
      )}
    </View>
  );
};

export default ConsumerGroupedBarChart;
