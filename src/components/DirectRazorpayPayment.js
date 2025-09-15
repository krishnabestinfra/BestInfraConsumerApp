/**
 * Direct Razorpay Payment Component
 * 
 * Uses Razorpay's direct payment method without order creation
 * More reliable for WebView integration
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { COLORS } from '../constants/colors';

const DirectRazorpayPayment = ({ 
  visible, 
  onClose, 
  onSuccess, 
  onError, 
  orderData 
}) => {
  const [loading, setLoading] = useState(true);

  // Handle WebView navigation state changes
  const handleNavigationStateChange = (navState) => {
    const { url } = navState;
    
    // Check for Razorpay success/failure callbacks
    if (url.includes('razorpay_payment_id')) {
      try {
        // Extract payment response from URL
        const urlParams = new URLSearchParams(url.split('?')[1]);
        const paymentId = urlParams.get('razorpay_payment_id');
        const orderId = urlParams.get('razorpay_order_id');
        const signature = urlParams.get('razorpay_signature');
        
        if (paymentId) {
          const paymentResponse = {
            razorpay_payment_id: paymentId,
            razorpay_order_id: orderId || 'direct_order',
            razorpay_signature: signature || 'direct_payment_signature',
          };
          
          onSuccess(paymentResponse);
          onClose();
        }
      } catch (error) {
        console.error('Error parsing payment response:', error);
        onError('Failed to process payment response');
      }
    }
    
    // Check for payment failure
    if (url.includes('payment_failed') || url.includes('error')) {
      onError('Payment was cancelled or failed');
      onClose();
    }
  };

  // Handle messages from WebView
  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('📨 Message from WebView:', data);
      
      if (data.status === 'success' && data.razorpay_payment_id) {
        const paymentResponse = {
          razorpay_payment_id: data.razorpay_payment_id,
          razorpay_order_id: data.razorpay_order_id || 'direct_order',
          razorpay_signature: data.razorpay_signature || 'direct_payment_signature',
        };
        
        onSuccess(paymentResponse);
        onClose();
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  // Handle WebView load end
  const handleLoadEnd = () => {
    setLoading(false);
  };

  // Handle WebView error
  const handleError = (syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView error:', nativeEvent);
    onError('Payment page failed to load');
    onClose();
  };

  // Generate Razorpay payment HTML
  const generatePaymentHTML = () => {
    if (!orderData) {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Error</title>
          <style>
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5; }
            .container { max-width: 400px; margin: 0 auto; background: white; border-radius: 8px; padding: 20px; text-align: center; }
            .error { color: #e74c3c; font-size: 18px; margin-bottom: 20px; }
            .message { color: #7f8c8d; margin-bottom: 30px; }
            .retry-button { background-color: #3498db; color: white; border: none; padding: 12px 24px; font-size: 16px; border-radius: 5px; cursor: pointer; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error">⚠️ Payment Error</div>
            <div class="message">Unable to load payment details. Please try again.</div>
            <button class="retry-button" onclick="window.location.reload()">Retry</button>
          </div>
        </body>
        </html>
      `;
    }

    const {
      amount,
      currency,
      key_id,
      description,
      consumer_name,
      email,
      contact
    } = orderData;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment</title>
        <style>
          body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5; }
          .container { max-width: 400px; margin: 0 auto; background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .loading { text-align: center; padding: 40px; }
          .error { color: #e74c3c; text-align: center; padding: 20px; }
          .payment-form { text-align: center; padding: 20px; }
          .amount { font-size: 24px; font-weight: bold; color: #2c3e50; margin-bottom: 20px; }
          .description { color: #7f8c8d; margin-bottom: 30px; }
          .pay-button { background-color: #4CAF50; color: white; border: none; padding: 15px 30px; font-size: 16px; border-radius: 5px; cursor: pointer; width: 100%; margin-bottom: 20px; }
          .pay-button:hover { background-color: #45a049; }
          .pay-button:disabled { background-color: #cccccc; cursor: not-allowed; }
          .test-info { background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin-bottom: 20px; font-size: 14px; color: #2e7d32; }
        </style>
      </head>
      <body>
        <div class="container">
          <div id="loading" class="loading">
            <h3>Loading Payment Gateway...</h3>
            <p>Please wait while we prepare your payment.</p>
          </div>
          <div id="error" class="error" style="display: none;">
            <h3>Payment Error</h3>
            <p id="error-message">Unable to load payment gateway. Please try again.</p>
          </div>
          <div id="payment-form" class="payment-form" style="display: none;">
            <div class="amount">₹${(amount / 100).toFixed(2)}</div>
            <div class="description">${description}</div>
            <div class="test-info">
              <strong>Test Mode:</strong> Use card number 4111 1111 1111 1111 for testing
            </div>
            <button id="pay-button" class="pay-button" onclick="openRazorpay()">
              Pay Now
            </button>
          </div>
        </div>
        
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
        <script>
          console.log('Razorpay script loaded');
          
          const options = {
            key: '${key_id}',
            amount: ${amount},
            currency: '${currency}',
            name: 'BestInfra',
            description: '${description}',
            prefill: {
              name: '${consumer_name}',
              email: '${email}',
              contact: '${contact}'
            },
            theme: {
              color: '#4CAF50'
            },
            handler: function (response) {
              console.log('Payment successful:', response);
              // For direct payments, we don't have signature, so we'll use a different approach
              // Instead of URL redirection, we'll use postMessage to communicate with React Native
              const paymentData = {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id || 'direct_order',
                razorpay_signature: response.razorpay_signature || 'direct_payment_signature',
                status: 'success'
              };
              
              // Send message to React Native
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify(paymentData));
              } else {
                // Fallback to URL redirection
                const successUrl = 'razorpay://success?razorpay_payment_id=' + 
                  response.razorpay_payment_id + 
                  '&razorpay_order_id=' + (response.razorpay_order_id || 'direct_order') + 
                  '&razorpay_signature=direct_payment_signature';
                window.location.href = successUrl;
              }
            },
            modal: {
              ondismiss: function() {
                console.log('Payment cancelled by user');
                // Redirect to failure URL
                window.location.href = 'razorpay://failure?error=user_cancelled';
              }
            },
            notes: {
              source: 'react_native_app',
              test_payment: true
            }
          };
          
          function openRazorpay() {
            console.log('Opening Razorpay with options:', options);
            
            try {
              const rzp = new Razorpay(options);
              rzp.open().catch(function(error) {
                console.error('Razorpay error:', error);
                document.getElementById('loading').style.display = 'none';
                document.getElementById('payment-form').style.display = 'none';
                document.getElementById('error').style.display = 'block';
                document.getElementById('error-message').textContent = 'Error: ' + (error.description || error.message || 'Unknown error');
              });
            } catch (error) {
              console.error('Error creating Razorpay instance:', error);
              document.getElementById('loading').style.display = 'none';
              document.getElementById('payment-form').style.display = 'none';
              document.getElementById('error').style.display = 'block';
              document.getElementById('error-message').textContent = 'Failed to initialize payment gateway: ' + error.message;
            }
          }
          
          // Show payment form when loaded
          document.addEventListener('DOMContentLoaded', function() {
            console.log('DOM loaded, showing payment form');
            document.getElementById('loading').style.display = 'none';
            document.getElementById('payment-form').style.display = 'block';
          });
        </script>
      </body>
      </html>
    `;
  };

  if (!orderData) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Payment Error</Text>
            <View style={styles.placeholder} />
          </View>
          
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Payment Error</Text>
            <Text style={styles.errorMessage}>
              Unable to load payment details. Please try again.
            </Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={onClose}
            >
              <Text style={styles.retryButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment</Text>
          <View style={styles.placeholder} />
        </View>
        
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.secondaryColor} />
            <Text style={styles.loadingText}>Loading payment gateway...</Text>
          </View>
        )}
        
        <WebView
          source={{ html: generatePaymentHTML() }}
          style={styles.webview}
          onNavigationStateChange={handleNavigationStateChange}
          onMessage={handleMessage}
          onLoadEnd={handleLoadEnd}
          onError={handleError}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
          mixedContentMode="compatibility"
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primaryFontColor,
  },
  placeholder: {
    width: 32,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.primaryFontColor,
  },
  webview: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DirectRazorpayPayment;
