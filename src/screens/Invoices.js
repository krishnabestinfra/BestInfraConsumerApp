import { StyleSheet, Text, View, ScrollView } from "react-native";
import React, { useState, useEffect, useCallback } from "react";
import { COLORS } from "../constants/colors";
import Table from "../components/global/Table";
import { getUser } from "../utils/storage";
import { GLOBAL_API_URL } from "../constants/constants";
import { useApp } from "../context/AppContext";
import { 
  getCachedConsumerData, 
  fetchConsumerData, 
  syncConsumerData 
} from "../services/apiService";
import DashboardHeader from "../components/global/DashboardHeader";

const Invoices = ({ navigation }) => {
  const [tableData, setTableData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [consumerData, setConsumerData] = useState(null);

  // Fetch payment history data
  const fetchPaymentHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      const user = await getUser();

      if (user && user.identifier) {
        // Try to get cached consumer data first for instant display
        const cachedResult = await getCachedConsumerData(user.identifier);
        if (cachedResult.success) {
          setConsumerData(cachedResult.data);
          // Extract payment history from cached data
          if (cachedResult.data && cachedResult.data.paymentHistory) {
            const transformedData = cachedResult.data.paymentHistory.map((payment, index) => ({
              id: index + 1,
              transactionId: payment.transactionId || 'N/A',
              date: payment.paymentDate || 'N/A',
              status: payment.creditAmount > 0 ? 'Success' : 'Failed'
            }));
            setTableData(transformedData);
            setIsLoading(false);
          }
        }

        // Fetch fresh data from API
        const response = await fetch(`http://${GLOBAL_API_URL}:4256/api/consumers/${user.identifier}`);

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setConsumerData(data.data);
            
            // Transform payment history data for the table
            if (data.data.paymentHistory && Array.isArray(data.data.paymentHistory)) {
              const transformedData = data.data.paymentHistory.map((payment, index) => ({
                id: index + 1,
                transactionId: payment.transactionId || 'N/A',
                date: payment.paymentDate || 'N/A',
                status: payment.creditAmount > 0 ? 'Success' : 'Failed'
              }));
              setTableData(transformedData);
            } else {
              setTableData([]);
            }
          } else {
            setTableData([]);
          }
        } else {
          console.error('Failed to fetch payment history:', response.status);
          setTableData([]);
        }

        // Background sync for fresh data
        syncConsumerData(user.identifier).catch(error => {
          console.error('Background sync failed:', error);
        });
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
      setTableData([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch data on component mount
  useEffect(() => {
    fetchPaymentHistory();
  }, [fetchPaymentHistory]);
  return (
    <>
      <ScrollView
        style={styles.Container}
        contentContainerStyle={{ paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
      >
        <DashboardHeader
          navigation={navigation}
          variant="invoices"
          showBalance={false}
          consumerData={consumerData}
          isLoading={isLoading}
        />
        <View style={{marginTop: 20}}>
          <Table
            data={tableData}
            loading={isLoading}
            emptyMessage="No payment history available"
            showSerial={true}
            showPriority={false}
            columns={[
              { key: 'transactionId', title: 'Transaction ID', flex: 2 },
              { key: 'date', title: 'Date', flex: 1.2 },
              { key: 'status', title: 'Status', flex: 1 }
            ]}
          />
        </View>
      </ScrollView>

    </>
  );
};

export default Invoices;

const styles = StyleSheet.create({
  Container: {
    backgroundColor: COLORS.secondaryFontColor,
  },
});
