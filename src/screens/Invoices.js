import { StyleSheet, Text, View, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import React, { useState, useEffect, useCallback } from "react";
import { COLORS } from "../constants/colors";
import Table from "../components/global/Table";
import { getUser } from "../utils/storage";
import { API, API_ENDPOINTS } from "../constants/constants";
import { useApp } from "../context/AppContext";
import { 
  getCachedConsumerData, 
  fetchConsumerData, 
  syncConsumerData 
} from "../services/apiService";
import DashboardHeader from "../components/global/DashboardHeader";
import Button from "../components/global/Button";
import DownloadButton from "../components/global/DownloadButton";
import { handleViewBill } from "../services/InvoicePDFService";

const Invoices = ({ navigation }) => {
  const [tableData, setTableData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [consumerData, setConsumerData] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

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
              amount: payment.creditAmount ? `₹${payment.creditAmount}` : 'N/A',
              status: payment.creditAmount > 0 ? 'Paid' : 'Pending',
              // Keep original payment data for PDF generation
              _originalData: payment
            }));
            setTableData(transformedData);
            setIsLoading(false);
          }
        }

        // Fetch fresh data from API
        const response = await fetch(API_ENDPOINTS.consumers.get(user.identifier));

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
                amount: payment.creditAmount ? `₹${payment.creditAmount}` : 'N/A',
                status: payment.creditAmount > 0 ? 'Paid' : 'Pending',
                // Keep original payment data for PDF generation
                _originalData: payment
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

  // Handle row press to open invoice PDF
  const handleRowPress = useCallback(async (row) => {
    try {
      setIsGeneratingPDF(true);
      console.log('📄 Opening invoice for transaction:', row.transactionId);
      
      // Get original payment data
      const paymentData = row._originalData;
      
      // Generate and view PDF
      const result = await handleViewBill(paymentData, consumerData);
      
      if (!result.success) {
        console.error('Failed to generate invoice PDF');
      }
    } catch (error) {
      console.error('Error opening invoice:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  }, [consumerData]);

  return (
    <>
      <ScrollView
        style={styles.Container}
        contentContainerStyle={{ paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchPaymentHistory}
            colors={[COLORS.secondaryColor]}
            tintColor={COLORS.secondaryColor}
          />
        }
      >
        <DashboardHeader
          navigation={navigation}
          variant="invoices"
          showBalance={false}
          consumerData={consumerData}
          isLoading={isLoading}
        />
        
        {/* Invoice Table */}
        <View style={{marginTop: 20}}>
          <Table
            data={tableData}
            loading={isLoading}
            emptyMessage="No invoices available"
            showSerial={true}
            showPriority={false}
            onRowPress={handleRowPress}
            columns={[
              { key: 'transactionId', title: 'Invoice ID', flex: 2 },
              { key: 'date', title: 'Date', flex: 1.5 },
              { key: 'amount', title: 'Amount', flex: 1.2 },
              { key: 'status', title: 'Status', flex: 1 }
            ]}
          />
        </View>
        
        {/* PDF Generation Overlay */}
        {isGeneratingPDF && (
          <View style={styles.pdfOverlay}>
            <View style={styles.pdfOverlayContent}>
              <ActivityIndicator size="large" color={COLORS.secondaryColor} />
              <Text style={styles.pdfOverlayText}>Generating Invoice PDF...</Text>
            </View>
          </View>
        )}
        
      </ScrollView>
      {/* {tableData.length > 0 && ( 
        <View style={styles.buttonContainer}>
          <View style={styles.buttonContainerInner}>
            <DownloadButton
              data={tableData.map(item => ({
                transactionId: item.transactionId,
                date: item.date,
                amount: item.amount,
                status: item.status
              }))}
              columns={[
                { key: 'transactionId', title: 'Invoice ID' },
                { key: 'date', title: 'Date' },
                { key: 'amount', title: 'Amount' },
                { key: 'status', title: 'Status' }
              ]}
              fileName="invoices"
              title="Download All"
              variant="primary"
              size="medium"
              style={styles.downloadButton}
              textStyle={styles.forgotText}
            />
          </View>
        </View>
      )} */}
    </>
  );
};

export default Invoices;

const styles = StyleSheet.create({
  Container: {
    backgroundColor: COLORS.secondaryFontColor,
    height: '100%',
  },
  buttonContainer:{
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
    backgroundColor: COLORS.secondaryFontColor
  },
  buttonContainerInner:{
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  downloadButton:{
    width: '100%',
  },
  pdfOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  pdfOverlayContent: {
    backgroundColor: COLORS.secondaryFontColor,
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  pdfOverlayText: {
    marginTop: 15,
    fontSize: 16,
    fontFamily: 'Manrope-Medium',
    color: COLORS.primaryFontColor,
  }
});
