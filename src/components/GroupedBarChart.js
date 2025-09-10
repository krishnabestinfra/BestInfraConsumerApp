import React, { useRef, useEffect, useState } from "react";
import { View, Dimensions } from "react-native";
import { WebView } from "react-native-webview";

const GroupedBarChart = () => {
  const webRef = useRef();
  const { width } = Dimensions.get("window");

  const [chartData, setChartData] = useState({
    blue: [8, 7, 7, 5, 7.5, 7, 7.5, 5, 7.5, 7],
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun","July", "Aug","Sept","Oct"],
  });

  useEffect(() => {
    setTimeout(() => {
      setChartData({
        blue: [8, 7, 7, 5, 7.5, 7, 7.5, 5, 7.5, 7],
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun","July", "Aug","Sept","Oct"],
      });
    }, 3000);
  }, []);

  useEffect(() => {
    if (webRef.current) {
      const injectData = `
        if(window.chart){
          chart.setOption({
            xAxis: { data: ${JSON.stringify(chartData.labels)} },
            series: [
              { data: ${JSON.stringify(chartData.blue)} }
            ]
          });
        }
        true;
      `;
      webRef.current.injectJavaScript(injectData);
    }
  }, [chartData]);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        html, body, #main {
          margin: 0;
          padding: 0;
          background:#eef8f0;
        }
      </style>
    </head>
    <body style="display: flex; justify-content: center; align-items: center; margin: 0; padding: 0; width: 100vw; height: 90vh;">
      <div style="width: 900px; height: 600px;" id="main"></div>
      <script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>
      <script>
        window.chart = echarts.init(document.getElementById('main'));
        var option = {
          grid: { left:30, right: 20, bottom: 50, top: 60 },
          tooltip: {},
          legend: { show: false },
          xAxis: {
            type: 'category',
            data: ${JSON.stringify(chartData.labels)},
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
              color: '#333',
              fontSize: 30
            }
          },
          yAxis: {
            type: 'value',
            splitLine: { show: false },
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { show: false }
          },
          series: [
           
            {
              name: 'Blue',
              type: 'bar',
              data: ${JSON.stringify(chartData.blue)},
              barWidth: 55,
              barGap: '10%',
              itemStyle: {
                color: '#163b7c',

                // color: '#b5ead7',
                // color: '#ffd6a5',
                // color: '#a9def9',
                // color: '#e0bbf9',
                // color: '#fca5a5',
                // color: '#dbeafe',
                // color: '#fff4e6',
                // color: '#d3e0ea',
                // color: '#0090ff',

                borderRadius: [4, 4, 0, 0]
              }
            }
          ],
          barCategoryGap: '10%'
        };
        chart.setOption(option);
      </script>
    </body>
    </html>
  `;

  return (
    <View style={{ height: 210, width: width - 40, marginHorizontal: 20 ,borderRadius:5, marginTop: 25}}>
      <WebView
        ref={webRef}
        originWhitelist={["*"]}
        source={{ html }}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
      />
    </View>
  );
};

export default GroupedBarChart;
