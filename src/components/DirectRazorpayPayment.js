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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { useTheme } from '../context/ThemeContext';
import { UPI_ICON_BASE64, SHIELD_ICON_BASE64 } from '../utils/paymentIcons';

const DirectRazorpayPayment = ({
  visible,
  onClose,
  onSuccess,
  onError,
  orderData
}) => {
  const { getScaledFontSize } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 24) + 16;
  const s18 = getScaledFontSize(18);
  const s16 = getScaledFontSize(16);
  const s24 = getScaledFontSize(24);
  const s48 = getScaledFontSize(48);
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
          // DEBUG: Log extracted values
          console.log('🔍 Extracted from URL:', {
            paymentId,
            orderId,
            signature: signature ? 'Present' : 'Missing',
            orderData_order_id: orderData?.order_id,
            orderData_id: orderData?.id
          });
          
          // Use actual order_id from orderData if not in URL
          const finalOrderId = orderId || orderData?.order_id || orderData?.id;
          const finalSignature = signature || null;
          
          // Validate required fields - payment_id is mandatory, others can be handled by backend
          if (!paymentId) {
            console.error('❌ Payment ID missing - cannot proceed');
            onError('Payment ID is missing. Payment cannot be processed.');
            onClose();
            return;
          }
          
          // Warn if order_id or signature is missing, but still proceed
          if (!finalOrderId) {
            console.warn('⚠️ Order ID missing - payment verification may be limited');
          }
          
          if (!finalSignature) {
            console.warn('⚠️ Signature missing - payment verification may be limited');
          }
          
          const paymentResponse = {
            razorpay_payment_id: paymentId,
            razorpay_order_id: finalOrderId || null,
            razorpay_signature: finalSignature || null,
            // Include bill_id from orderData if available (CRITICAL for verification)
            bill_id: orderData?.bill_id || orderData?.notes?.bill_id || null,
            billId: orderData?.bill_id || orderData?.notes?.bill_id || null,
            // Include additional payment details from orderData
            amount: orderData?.amount || 0,
            currency: orderData?.currency || 'INR',
            description: orderData?.description || 'Payment',
            key_id: orderData?.key || orderData?.key_id,
            // Include notes for verification (preserve bill_id if in notes)
            notes: {
              ...(orderData?.notes || {}),
              // Ensure bill_id is in notes for verification
              bill_id: orderData?.bill_id || orderData?.notes?.bill_id || null,
            },
          };
          
          console.log('✅ DirectRazorpayPayment - Payment success response:', {
            payment_id: paymentResponse.razorpay_payment_id,
            order_id: paymentResponse.razorpay_order_id,
            signature: paymentResponse.razorpay_signature ? 'Present' : 'Missing',
            hasAllRequiredFields: !!(paymentResponse.razorpay_payment_id && 
                                    paymentResponse.razorpay_order_id && 
                                    paymentResponse.razorpay_signature)
          });
          
          onSuccess(paymentResponse);
          onClose();
        } else {
          console.error('❌ Payment ID not found in URL');
          onError('Payment ID not found in response');
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
        // DEBUG: Log received data
        console.log('🔍 Received payment data from WebView:', {
          payment_id: data.razorpay_payment_id,
          order_id: data.razorpay_order_id,
          signature: data.razorpay_signature ? 'Present' : 'Missing',
          orderData_order_id: orderData?.order_id,
          orderData_id: orderData?.id
        });
        
        // Use actual order_id from orderData if not in message
        const finalOrderId = data.razorpay_order_id || orderData?.order_id || orderData?.id;
        const finalSignature = data.razorpay_signature || null;
        
        // Validate required fields - payment_id is mandatory
        if (!data.razorpay_payment_id) {
          console.error('❌ Payment ID missing in payment response');
          onError('Payment ID is missing. Payment cannot be processed.');
          onClose();
          return;
        }
        
        // Warn if order_id or signature is missing, but still proceed
        if (!finalOrderId) {
          console.warn('⚠️ Order ID missing - payment verification may be limited');
        }
        
        if (!finalSignature) {
          console.warn('⚠️ Signature missing - payment verification may be limited');
        }
        
        const paymentResponse = {
          razorpay_payment_id: data.razorpay_payment_id,
          razorpay_order_id: finalOrderId || null,
          razorpay_signature: finalSignature || null,
          // Include bill_id from data or orderData (CRITICAL for verification)
          bill_id: data.bill_id || data.billId || orderData?.bill_id || orderData?.notes?.bill_id || null,
          billId: data.bill_id || data.billId || orderData?.bill_id || orderData?.notes?.bill_id || null,
          // Include additional payment details from orderData
          amount: data.amount || orderData?.amount || 0,
          currency: data.currency || orderData?.currency || 'INR',
          description: orderData?.description || 'Payment',
          key_id: orderData?.key || orderData?.key_id,
          // Include notes from data or orderData (preserve bill_id)
          notes: {
            ...(data.notes || {}),
            ...(orderData?.notes || {}),
            // Ensure bill_id is in notes for verification
            bill_id: data.bill_id || data.billId || orderData?.bill_id || orderData?.notes?.bill_id || null,
          },
        };
        
        console.log('✅ DirectRazorpayPayment - Message success response:', {
          payment_id: paymentResponse.razorpay_payment_id,
          order_id: paymentResponse.razorpay_order_id,
          signature: paymentResponse.razorpay_signature ? 'Present' : 'Missing',
          hasAllRequiredFields: !!(paymentResponse.razorpay_payment_id && 
                                  paymentResponse.razorpay_order_id && 
                                  paymentResponse.razorpay_signature)
        });
        
        onSuccess(paymentResponse);
        onClose();
      } else {
        console.warn('⚠️ Payment message received but status is not success:', data);
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

  // Load Razorpay script dynamically
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Generate Razorpay payment HTML
  const generatePaymentHTML = () => {
    if (!orderData) {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
          <title>Payment Error</title>
          <style>
            body { margin: 0; padding: 20px; font-family: 'Manrope', sans-serif; background-color: #f5f5f5; }
            .container { max-width: 400px; margin: 0 auto; background: white; border-radius: 5px; padding: 20px; text-align: center; }
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
      key,
      key_id,
      order_id,
      description,
      consumer_name,
      email,
      contact,
      notes
    } = orderData;

    // Use key or key_id
    const razorpayKey = key || key_id;
    
    if (!razorpayKey) {
      console.error('❌ Razorpay key is missing from orderData');
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
        <title>Payment</title>
        <style>
          body { margin: 0; padding: 24px 20px 48px; font-family: 'Manrope', sans-serif; background: transparent; }
          .container { max-width: 100%; background: #FFFFFF; border-radius: 5px; padding: 24px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
          .loading { text-align: center; padding: 40px; }
          .error { color: #e74c3c; text-align: center; padding: 20px; }
          .payment-form { padding: 0; text-align: center; }
          .amount-section { margin-bottom: 20px; }
          .amount-label { font-size: 15px; color: #424242; margin-bottom: 8px; font-weight: 400; }
          .amount { font-size: 32px; font-weight: 900; color: #000; margin-bottom: 5px; }
          .description { font-size: 14px; color: #757575; margin-bottom: 10px; line-height: 20px; }
          .separator { border: none; border-top: 1px dashed #BDBDBD; margin: 0 0 24px 0; }
          .upi-box { background: #FBFFFC; border-radius: 10px; padding: 16px; margin-bottom: 24px; display: flex; align-items: center; gap: 12px; text-align: left; }
          .upi-logo { width: 50px; min-height: 24px; flex-shrink: 0; display: flex; align-items: center; justify-content: flex-start; }
          .upi-logo img { width: 41px; height: 14px; object-fit: contain; }
          .upi-content { flex: 1; }
          .upi-title { font-size: 15px; font-weight: 800; color: #55B56C; margin-bottom: 4px; }
          .upi-subtitle { font-size: 13px; color: #9E9E9E; line-height: 18px; }
          .pay-button { background-color: ${COLORS.secondaryColor}; color: white; border: none; padding: 16px 24px; font-size: 16px; font-weight: 600; border-radius: 5px; cursor: pointer; width: 100%; margin-bottom: 15px; }
          .pay-button:hover { opacity: 0.9; }
          .pay-button:disabled { background-color: #cccccc; cursor: not-allowed; }
          .security-row { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 1px; }
          .security-icon { display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
          .security-icon img { width: 16px; height: 16px; }
          .security-text { font-size: 13px; color: #9E9E9E; }
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
            <div class="amount-section">
              <div class="amount-label">Amount to Pay</div>
              <div class="amount">₹${(amount / 100).toFixed(2)}</div>
              <div class="description">${description}</div>
            </div>
            <hr class="separator" />
            <div class="upi-box">
              <div class="upi-logo"><img src="data:image/svg+xml;base64,${UPI_ICON_BASE64}" alt="UPI" /></div>
              <div class="upi-content">
                <div class="upi-title">UPI Payment</div>
                <div class="upi-subtitle">Pay using UPI apps like PhonePe, Google Pay, Paytm</div>
              </div>
            </div>
            <button id="pay-button" class="pay-button" onclick="openRazorpay()">
              Pay Now
            </button>
            <div class="security-row">
              <span class="security-icon"><img src="data:image/svg+xml;base64,${SHIELD_ICON_BASE64}" alt="Secured" /></span>
              <span class="security-text">Secured by BestInfra Payment Gateway</span>
            </div>
          </div>
        </div>
        
        <script>
          console.log('Payment page loaded');
          
          // Load Razorpay script dynamically - YOUR EXACT FUNCTION
          const loadRazorpayScript = () => {
            return new Promise((resolve) => {
              const script = document.createElement("script");
              script.src = "https://checkout.razorpay.com/v1/checkout.js";
              script.onload = () => resolve(true);
              script.onerror = () => resolve(false);
              document.body.appendChild(script);
            });
          };
          
          // Extract order_id and notes from orderData
          const orderId = ${order_id ? `'${order_id}'` : 'null'};
          const paymentNotes = ${JSON.stringify(notes || {})};
          
          // Payment options - Optimized for UPI
          const options = {
            key: '${razorpayKey}',
            amount: ${amount},
            currency: '${currency}',
            ${order_id ? `order_id: '${order_id}',` : '// No order_id - manual capture mode'}
            name: 'BestInfra Energy',
            description: '${description}',
            prefill: {
              name: '${consumer_name}',
              email: '${email}',
              contact: '${contact}'
            },
            theme: {
              color: '#4CAF50'
            },
            ${order_id ? 'capture: true, // Automatic capture (requires order_id)' : '// Manual capture (no order_id)'}
            // UPI Configuration
            method: {
              netbanking: false,
              wallet: false,
              upi: true,
              card: false,
              emi: false
            },
            // UPI specific settings
            upi: {
              flow: 'collect',
              vpa: '${consumer_name}@paytm' // Optional: pre-fill UPI ID
            },
            handler: function (response) {
              console.log('✅ UPI Payment successful - Full response:', response);
              
              // DEBUG: Log all response fields
              console.log('🔍 Payment response details:', {
                payment_id: response.razorpay_payment_id,
                order_id: response.razorpay_order_id,
                signature: response.razorpay_signature ? 'Present' : 'Missing',
                expected_order_id: orderId,
                hasAllFields: !!(response.razorpay_payment_id && response.razorpay_order_id && response.razorpay_signature)
              });
              
              // Validate required fields
              if (!response.razorpay_payment_id) {
                console.error('❌ Payment ID missing in Razorpay response');
                const errorData = {
                  status: 'error',
                  message: 'Payment ID missing from Razorpay response'
                };
                if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(JSON.stringify(errorData));
                }
                return;
              }
              
              // CRITICAL: Backend requires order_id and signature for verification
              // If order_id is missing, try to use the one from orderData
              const finalOrderId = response.razorpay_order_id || orderId;
              
              if (!finalOrderId) {
                console.error('❌ Order ID missing in Razorpay response and orderData');
                const errorData = {
                  status: 'error',
                  message: 'Order ID missing - payment cannot be verified. Please ensure order_id is present.'
                };
                if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(JSON.stringify(errorData));
                }
                return;
              }
              
              if (!response.razorpay_signature) {
                console.error('❌ Signature missing in Razorpay response');
                const errorData = {
                  status: 'error',
                  message: 'Payment signature missing - payment cannot be verified'
                };
                if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(JSON.stringify(errorData));
                }
                return;
              }
              
              const paymentData = {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: finalOrderId,
                razorpay_signature: response.razorpay_signature,
                // Include bill_id from order notes (CRITICAL for verification)
                bill_id: paymentNotes.bill_id || null,
                billId: paymentNotes.bill_id || null,
                status: 'success',
                payment_method: 'upi',
                amount: ${amount},
                currency: '${currency}',
                // Include all notes from order (preserve bill_id)
                notes: {
                  ...paymentNotes,
                  bill_id: paymentNotes.bill_id || null
                }
              };
              
              console.log('✅ Sending payment data to React Native:', {
                payment_id: paymentData.razorpay_payment_id,
                order_id: paymentData.razorpay_order_id,
                signature: paymentData.razorpay_signature ? 'Present' : 'Missing',
                hasAllRequiredFields: !!(paymentData.razorpay_payment_id && 
                                        paymentData.razorpay_order_id && 
                                        paymentData.razorpay_signature)
              });
              
              // Send message to React Native
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify(paymentData));
              } else {
                // Fallback to URL redirection
                const successUrl = 'razorpay://success?razorpay_payment_id=' + 
                  encodeURIComponent(response.razorpay_payment_id) + 
                  '&razorpay_order_id=' + encodeURIComponent(finalOrderId) + 
                  '&razorpay_signature=' + encodeURIComponent(response.razorpay_signature);
                console.log('🔄 Redirecting to:', successUrl);
                window.location.href = successUrl;
              }
            },
            modal: {
              ondismiss: function() {
                console.log('UPI Payment cancelled by user');
                const errorData = {
                  status: 'error',
                  message: 'UPI Payment cancelled by user'
                };
                
                if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(JSON.stringify(errorData));
                } else {
                  window.location.href = 'razorpay://failure?error=user_cancelled';
                }
              }
            },
            // Include all notes from orderData
            notes: paymentNotes
          };
          
          // This function runs when button is clicked
          async function openRazorpay() {
            console.log('Button clicked - Loading Razorpay script...');
            
            try {
              // Load Razorpay script when button is clicked
              const scriptLoaded = await loadRazorpayScript();
              
              if (!scriptLoaded) {
                throw new Error('Failed to load Razorpay script');
              }
              
              console.log('Razorpay script loaded, initializing payment...');
              
              // Wait for script to be ready
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Check if Razorpay is available
              if (typeof Razorpay === 'undefined') {
                throw new Error('Razorpay not available after loading');
              }
              
              // DEBUG: Log options (hide sensitive key)
              console.log('🔧 Creating Razorpay instance with options:', {
                key: options.key ? 'Present' : 'Missing',
                amount: options.amount,
                currency: options.currency,
                order_id: options.order_id || 'MISSING - Payment will require manual capture',
                hasOrderId: !!options.order_id,
                capture: options.capture,
                notes: options.notes
              });
              
              const rzp = new Razorpay(options);
              
              console.log('✅ Razorpay instance created, opening payment modal...');
              
              var openResult = rzp.open();
              if (openResult && typeof openResult.catch === 'function') {
                openResult.catch(function() {});
              }
              
            } catch (error) {
              console.error('Error in openRazorpay:', error);
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  status: 'error',
                  message: error.message || 'Failed to initialize payment'
                }));
              }
            }
          }
          
          function showError(message) {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('payment-form').style.display = 'none';
            document.getElementById('error').style.display = 'block';
            document.getElementById('error-message').textContent = message;
          }
          
          // Show payment form when page loads
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
              <Text style={[styles.closeButtonText, { fontSize: s18 }]}>✕</Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { fontSize: s18 }]}>Payment Error</Text>
            <View style={styles.placeholder} />
          </View>
          
          <View style={styles.errorContainer}>
            <Text style={[styles.errorIcon, { fontSize: s48 }]}>⚠️</Text>
            <Text style={[styles.errorTitle, { fontSize: s24 }]}>Payment Error</Text>
            <Text style={[styles.errorMessage, { fontSize: s16 }]}>
              Unable to load payment details. Please try again.
            </Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={onClose}
            >
              <Text style={[styles.retryButtonText, { fontSize: s16 }]}>Close</Text>
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
      <View style={[styles.container, { paddingBottom: bottomPadding }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={[styles.closeButtonText, { fontSize: s18 }]}>✕</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontSize: s18 }]}>Payment</Text>
          <View style={styles.placeholder} />
        </View>
        
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.secondaryColor} />
            <Text style={[styles.loadingText, { fontSize: s16 }]}>Loading payment gateway...</Text>
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
    backgroundColor: '#F5F5F5',
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
    fontFamily: 'Manrope-Bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primaryFontColor,
    fontFamily: 'Manrope-SemiBold',
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
    fontFamily: 'Manrope-Regular',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
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
    fontFamily: 'Manrope-Bold',
  },
  errorMessage: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
    fontFamily: 'Manrope-Regular',
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
    fontFamily: 'Manrope-SemiBold',
  },
});

export default DirectRazorpayPayment;
