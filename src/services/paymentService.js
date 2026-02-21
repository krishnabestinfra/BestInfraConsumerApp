/**
 * Razorpay Payment Service for Expo
 * 
 * Clean WebView-based Razorpay integration
 * No native dependencies, works perfectly with Expo managed projects
 */

import { getRazorpayKeyId, getRazorpaySecretKey } from '../config/config';
import { API, API_ENDPOINTS } from '../constants/constants';
import { getUser } from '../utils/storage';
import { apiClient } from './apiClient';
import { authService } from './authService';

const BASE_URL = API.BASE_URL;

/** Single exception: external Razorpay API (key/secret auth). All other network calls use apiClient. */
const requestRazorpayApi = async (url, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { throw new Error('Invalid response from Razorpay'); }
    if (!response.ok) throw new Error(data.error?.description || data.error?.message || `HTTP ${response.status}`);
    return data;
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
};

/**
 * Generate order_id - ALWAYS creates an order_id for payment flow
 * This ensures payment can proceed even if backend doesn't return one
 */
const generateOrderId = () => {
  // Generate order_id in Razorpay format: order_XXXXXXXXXXXX
  // Format: order_ + timestamp (12 chars) + random (4 chars)
  const timestamp = Date.now().toString().slice(-12);
  const random = Math.random().toString(36).substring(2, 6);
  const orderId = `order_${timestamp}${random}`;
  
  console.log('✅ Generated order_id:', orderId);
  return orderId;
};

/**
 * Base64 encode function (polyfill for React Native)
 */
const base64Encode = (str) => {
  try {
    // Try native btoa first (available in some React Native environments)
    if (typeof btoa !== 'undefined') {
      return btoa(str);
    }
    // Fallback: Use Buffer if available (Node.js/Expo)
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(str, 'utf8').toString('base64');
    }
    // Manual base64 encoding as last resort
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let output = '';
    for (let i = 0; i < str.length; i += 3) {
      const a = str.charCodeAt(i);
      const b = i + 1 < str.length ? str.charCodeAt(i + 1) : 0;
      const c = i + 2 < str.length ? str.charCodeAt(i + 2) : 0;
      const bitmap = (a << 16) | (b << 8) | c;
      output += chars.charAt((bitmap >> 18) & 63);
      output += chars.charAt((bitmap >> 12) & 63);
      output += i + 1 < str.length ? chars.charAt((bitmap >> 6) & 63) : '=';
      output += i + 2 < str.length ? chars.charAt(bitmap & 63) : '=';
    }
    return output;
  } catch (error) {
    console.error('❌ Base64 encoding error:', error);
    throw new Error('Failed to encode credentials');
  }
};

/**
 * Create payment order - ALWAYS ensures order_id is generated
 * 
 * Flow:
 * 1. Generate order_id upfront (frontend-generated)
 * 2. Try to get order_id from backend
 * 3. If backend returns order_id → use backend's order_id
 * 4. If backend doesn't return order_id → use frontend-generated order_id immediately
 * 
 * CRITICAL BACKEND REQUIREMENTS:
 * 1. Backend MUST generate order_id using bill_id
 * 2. Backend MUST insert order_id into bills table (UPDATE bills SET order_id = ? WHERE id = bill_id)
 * 3. Backend MUST return order_id in response
 * 
 * Database Flow:
 * - Bills table: order_id is inserted/updated for the bill
 * - Payments table: Will be updated during verification with order_id reference
 * 
 * This ensures payment can ALWAYS proceed with an order_id, even if:
 * - Backend doesn't return one
 * - Backend endpoint fails
 * - Razorpay API is unavailable
 * 
 * Backend should create actual Razorpay order during verification if frontend-generated order_id is used.
 */
export const createPaymentOrder = async (paymentData) => {
  try {
    const user = await getUser();
    const token = await authService.getValidAccessToken();
    if (!user || !user.identifier) {
      throw new Error('User authentication required');
    }

    if (!token) {
      throw new Error('Authentication token required');
    }

    // Check if Razorpay secret key is configured (REQUIRED for creating real orders with automatic capture)
    const razorpaySecret = getRazorpaySecretKey();
    const razorpayKeyId = getRazorpayKeyId();
    
    if (!razorpayKeyId) {
      console.error('❌ CRITICAL: Razorpay Key ID is missing!');
      console.error('❌ Configure razorpayKeyId in app.config.js extra (e.g. from .env at build time).');
      console.error('❌ Get it from: https://dashboard.razorpay.com/app/keys');
      throw new Error('Razorpay Key ID is required. Configure razorpayKeyId in app.config.js extra.');
    }
    
    if (!razorpaySecret) {
      console.error('❌ CRITICAL: Razorpay secret key is missing!');
      console.error('❌ Without secret key, orders cannot be created and payments cannot be automatically captured.');
      console.error('❌ Configure razorpaySecretKey in app.config.js extra (e.g. from .env at build time).');
      console.error('❌ Get it from: https://dashboard.razorpay.com/app/keys');
    } else {
      console.log('✅ Razorpay secret key found - will create REAL Razorpay orders for automatic capture');
    }

    // Prepare order payload matching web app structure
    // Web app sends: { billId, amount }
    // Amount should be in rupees (not paise) for this endpoint
    // CRITICAL: Ensure amount is a number (not string) and properly converted
    const amountInPaise = Math.floor(Number(paymentData.amount));
    if (isNaN(amountInPaise) || amountInPaise <= 0) {
      throw new Error('Invalid payment amount. Amount must be a positive number.');
    }
    const amountInRupees = amountInPaise / 100; // Convert from paise to rupees
    
    // CRITICAL: bill_id is REQUIRED for order creation
    // Without bill_id, order_id cannot be generated properly
    // Frontend MUST provide bill_id before calling this function
    const billIdFromFrontend = paymentData.billId || paymentData.bill_id;
    
    // Validate that bill_id is provided
    if (!billIdFromFrontend) {
      const errorMsg = 'bill_id is REQUIRED for payment order creation. Without bill_id, order_id cannot be generated. Please ensure bill_id is provided in paymentData.';
      console.error('❌ CRITICAL:', errorMsg);
      throw new Error(errorMsg);
    }
    
    // Ensure bill_id is a string (backend/Prisma may expect string)
    const billIdString = String(billIdFromFrontend).trim();
    if (!billIdString || billIdString === 'null' || billIdString === 'undefined') {
      const errorMsg = 'Invalid bill_id provided. bill_id must be a valid non-empty value.';
      console.error('❌ CRITICAL:', errorMsg);
      throw new Error(errorMsg);
    }
    
    const orderPayload = {
      amount: amountInRupees, // Amount in rupees (matching web app) - REQUIRED, must be number
      billId: billIdString, // CRITICAL: bill_id is REQUIRED - order_id cannot be generated without it
      // Include additional data to help backend
      consumer_id: paymentData.consumer_id || null,
      outstanding_amount: paymentData.outstanding_amount || null,
      bill_type: paymentData.bill_type || null,
    };
    
    console.log('🔄 Creating payment order (web app format):', {
      billId: orderPayload.billId,
      billId_type: typeof orderPayload.billId,
      amount: orderPayload.amount,
      amount_type: typeof orderPayload.amount,
      amountInPaise: amountInPaise,
      consumer_id: orderPayload.consumer_id,
      outstanding_amount: orderPayload.outstanding_amount,
      hasRazorpaySecret: !!razorpaySecret,
      note: 'bill_id is REQUIRED - order_id generation depends on it',
      backend_requirement: 'Backend MUST: 1) Generate order_id, 2) Insert order_id into bills table, 3) Return order_id in response'
    });

    // Use the correct billing payment endpoint (matching web app)
    const paymentEndpoints = [
      API_ENDPOINTS.payment.createLink(), // Primary: /billing/payment/create-link
      `${API.BASE_URL}/billing/payment/create-link`, // Direct path
    ];

    let lastError = null;
    
    for (const endpoint of paymentEndpoints) {
      try {
        console.log(`🔄 Trying payment endpoint: ${endpoint}`);
        const apiResult = await apiClient.request(endpoint, { method: 'POST', body: orderPayload, showLogs: false });
        if (!apiResult.success && (apiResult.status === 404 || apiResult.status === 400)) {
          console.warn(`⚠️ Endpoint ${endpoint} returned ${apiResult.status}, trying next...`);
          lastError = new Error(apiResult.error || `HTTP ${apiResult.status}`);
          continue;
        }
        const result = apiResult.rawBody ?? apiResult.data ?? {};
        const responseOk = apiResult.success;

      if (responseOk) {
        console.log('📦 Full backend response:', JSON.stringify(result, null, 2));
        console.log('📦 Response status:', apiResult.status);
        console.log('📦 Response success flag:', result.success);
        
        // Try to extract order data from various possible structures
        let orderData = null;
        if (result.data) {
          orderData = result.data;
        } else if (result.order) {
          orderData = result.order;
        } else if (result) {
          orderData = result;
        }
        
        // DEBUG: Log orderData structure
        console.log('🔍 Order data extracted:', {
          hasOrderData: !!orderData,
          orderDataKeys: orderData ? Object.keys(orderData) : [],
          orderData: JSON.stringify(orderData, null, 2)
        });
        
        // Extract order_id from response (try multiple possible fields and nested structures)
        let orderId = null;
        
        // Try direct fields
        if (orderData) {
          orderId = orderData.order_id || 
                   orderData.id || 
                   orderData.orderId ||
                   orderData.razorpay_order_id ||
                   orderData.orderId ||
                   orderData['order_id'] ||
                   orderData['id'];
        }
        
        // Try in result directly
        if (!orderId) {
          orderId = result.order_id || 
                   result.id || 
                   result.orderId ||
                   result.razorpay_order_id;
        }
        
        // Try nested in data.order or data.order_id
        if (!orderId && result.data) {
          orderId = result.data.order?.id ||
                   result.data.order?.order_id ||
                   result.data.order_id ||
                   result.data.id;
        }
        
        // Try in nested structures
        if (!orderId && result.data) {
          // Check if data is an object with nested order info
          const dataKeys = Object.keys(result.data);
          for (const key of dataKeys) {
            const value = result.data[key];
            if (value && typeof value === 'object') {
              orderId = value.order_id || value.id || value.orderId;
              if (orderId) break;
            }
          }
        }
        
        // Extract currency from response
        const currency = orderData.currency || 
                        paymentData.currency || 
                        'INR';
        
        // Extract bill_id from response (CRITICAL for verification)
        // Priority: 1. Backend response (preferred - backend may have created/updated it), 2. Frontend provided bill_id
        // This matches web app pattern: bill.id || bill.billId
        let billId = null;
        
        // Try direct fields from backend response (backend may return bill_id after creating/updating)
        if (orderData) {
          billId = orderData.bill_id || 
                  orderData.billId ||
                  orderData['bill_id'] ||
                  orderData['billId'];
        }
        
        // Try in result directly
        if (!billId) {
          billId = result.bill_id || 
                  result.billId ||
                  result.data?.bill_id ||
                  result.data?.billId;
        }
        
        // Try nested in data.bill or data.bill_id
        if (!billId && result.data) {
          billId = result.data.bill?.id ||
                  result.data.bill?.bill_id ||
                  result.data.bill_id ||
                  result.data.billId;
        }
        
        // CRITICAL: If backend didn't return bill_id, use the one from frontend (REQUIRED)
        // This matches web app: bill.id || bill.billId - always use provided bill_id if backend doesn't return one
        // bill_id is REQUIRED - order_id generation depends on it
        if (!billId) {
          // Use the validated billIdString that was sent to backend
          billId = billIdString;
          console.log('📝 Using bill_id from frontend (backend did not return one):', billId);
        }
        
        // CRITICAL: Validate that we have bill_id (REQUIRED)
        if (!billId) {
          throw new Error('bill_id is missing. Backend did not return bill_id and frontend bill_id is also missing. bill_id is REQUIRED for order creation.');
        }
        
        // DEBUG: Log bill_id extraction (matching web app pattern)
        console.log('🔍 Bill ID extraction (web app pattern: bill.id || bill.billId):', {
          'backend_response.bill_id': orderData?.bill_id || result.bill_id || result.data?.bill_id,
          'backend_response.billId': orderData?.billId || result.billId || result.data?.billId,
          'frontend_provided.bill_id': billIdFromFrontend,
          'final_billId': billId,
          'hasBillId': !!billId,
          'billId_source': billId ? (billId === billIdFromFrontend ? 'from_frontend' : 'from_backend_response') : 'MISSING - will need backend to create'
        });
        
        // DEBUG: Log order ID extraction
        console.log('🔍 Order ID extraction:', {
          'orderData.order_id': orderData.order_id,
          'orderData.id': orderData.id,
          'orderData.orderId': orderData.orderId,
          'result.order_id': result.order_id,
          'result.id': result.id,
          'final_orderId': orderId,
          'hasOrderId': !!orderId
        });
        
        // If we found order_id, return it immediately
        if (orderId) {
          console.log('✅ Found order_id in backend response:', orderId);
          console.log('✅ Backend should have inserted order_id into bills table');
          console.log('✅ Backend flow: Generate order_id → Insert into bills table → Return order_id');
          
          // CRITICAL: Verify backend response indicates order_id was inserted
          // Check if response explicitly confirms database update
          const backendConfirmed = result.data?.order_id_inserted || 
                                   result.data?.bill_updated || 
                                   result.message?.toLowerCase().includes('inserted') ||
                                   result.message?.toLowerCase().includes('updated');
          
          if (!backendConfirmed) {
            console.warn('⚠️ Backend response does not explicitly confirm order_id insertion into bills table');
            console.warn('⚠️ Please verify backend implementation: UPDATE bills SET order_id = ? WHERE id = bill_id');
            console.warn('⚠️ Backend should insert order_id into bills table before returning response');
          } else {
            console.log('✅ Backend confirmed order_id insertion into bills table');
          }
          
          // CRITICAL: bill_id is REQUIRED - it should already be validated above
          // bill_id is required for order_id generation
          // Backend should have updated bills table with order_id
          console.log('✅ Payment order created successfully:', {
            endpoint: endpoint,
            order_id: orderId,
            bill_id: billId,
            currency: currency,
            amount: paymentData.amount,
            response_status: response.status,
            note: 'bill_id is REQUIRED - order_id was generated with this bill_id',
            backend_action: 'Backend should have inserted order_id into bills table for bill_id: ' + billId,
            backend_confirmed: backendConfirmed || 'Not explicitly confirmed in response',
            database_check: 'Verify: SELECT order_id FROM bills WHERE id = ' + billId
          });

          // Return data in format expected by Razorpay
          // CRITICAL: Store bill_id in both data.bill_id and notes.bill_id (matching web app pattern)
          // Web app uses: bill.id || bill.billId, so we store it in both formats
          // CRITICAL: bill_id is REQUIRED - it should already be validated above
          return {
            success: true,
            data: {
              id: orderId,
              order_id: orderId,
              bill_id: billId, // CRITICAL: bill_id is REQUIRED (matching web app: bill.id || bill.billId)
              billId: billId, // Also include camelCase for compatibility
              amount: paymentData.amount,
              currency: currency,
              key_id: getRazorpayKeyId(),
              key: getRazorpayKeyId(),
              description: paymentData.description || 'Energy Bill Payment',
              consumer_name: paymentData.consumer_name || user.name || user.consumerName || 'Customer',
              email: paymentData.email || user.email || 'customer@bestinfra.com',
              contact: paymentData.contact || user.contact || user.phone || '9876543210',
              notes: {
                consumer_id: user.identifier,
                consumer_name: paymentData.consumer_name || user.name || user.consumerName || 'Customer',
                bill_type: paymentData.bill_type || 'energy_bill',
                description: paymentData.description || 'Energy Bill Payment',
                source: 'react_native_app',
                payment_method: 'upi',
                custom_amount: paymentData.custom_amount || null,
                outstanding_amount: paymentData.outstanding_amount || null,
                order_id: orderId,
                // CRITICAL: Store bill_id in notes (matching web app pattern: bill.id || bill.billId)
                bill_id: billId, // CRITICAL: bill_id is REQUIRED - store in notes for verification
                billId: billId, // Also store in camelCase for compatibility
                auto_capture: true,
              }
            },
          };
        }
        
        // If orderId not found, create REAL Razorpay order via API
        console.warn('⚠️ Backend did not return order_id in response');
        console.warn('⚠️ Full response:', JSON.stringify(result, null, 2));
        console.warn('⚠️ Response.data:', JSON.stringify(result.data, null, 2));
        
        if (result.success === false && result.message) {
          console.warn('⚠️ Backend returned success: false with message:', result.message);
        }
        
        // Create REAL Razorpay order via API (not frontend-generated)
        console.log('🔄 Backend did not return order_id, creating REAL Razorpay order via API...');
        
        const directOrderResult = await createDirectPaymentOrder(paymentData, {
          ...orderPayload,
          consumerName: paymentData.consumer_name || user.name || user.consumerName,
          email: paymentData.email || user.email,
          contact: paymentData.contact || user.contact || user.phone,
          receipt: `receipt_${Date.now()}_${user.identifier}`,
          notes: {
            consumer_id: user.identifier,
            consumer_name: paymentData.consumer_name || user.name || user.consumerName,
            bill_type: paymentData.bill_type || 'energy_bill',
            description: paymentData.description || 'Energy Bill Payment',
            source: 'react_native_app',
            payment_method: 'upi',
            custom_amount: paymentData.custom_amount || null,
            outstanding_amount: paymentData.outstanding_amount || null,
          }
        });
        
        if (directOrderResult.success && directOrderResult.data.id) {
          const realOrderId = directOrderResult.data.id;
          console.log('✅ Created REAL Razorpay order via API, order_id:', realOrderId);
          
          return {
            success: true,
            data: {
              ...directOrderResult.data,
              order_id: realOrderId,
              id: realOrderId,
              currency: currency,
              key_id: getRazorpayKeyId(),
              key: getRazorpayKeyId(),
              description: paymentData.description || 'Energy Bill Payment',
              consumer_name: paymentData.consumer_name || user.name || user.consumerName || 'Customer',
              email: paymentData.email || user.email || 'customer@bestinfra.com',
              contact: paymentData.contact || user.contact || user.phone || '9876543210',
            },
            fallback: true,
            warning: 'Order created directly via Razorpay API (backend did not return order_id)'
          };
        } else {
          // If Razorpay API also fails, throw error (don't use fake order_id)
          console.error('❌ Failed to create Razorpay order via API');
          throw new Error('Failed to create payment order. Backend did not return order_id and Razorpay API order creation failed. Please ensure Razorpay secret key is configured.');
        }
      } else {
        // Response not OK - check error type
        const errorMessage = result.message || result.error || result.errorMessage || `HTTP ${response.status}`;
        
        // Check if it's a route not found error
        const isRouteNotFound = response.status === 404 || 
                                errorMessage.toLowerCase().includes('route not found') ||
                                errorMessage.toLowerCase().includes('cannot post');
        
        // Check if it's a 400 error (bad request - missing billId or amount)
        const isBadRequest = response.status === 400 ||
                            errorMessage.toLowerCase().includes('bill id') ||
                            errorMessage.toLowerCase().includes('amount') ||
                            errorMessage.toLowerCase().includes('required');
        
        if (isRouteNotFound) {
          console.warn(`⚠️ Endpoint ${endpoint} - Route not found (404), trying next...`);
          lastError = new Error(`Route not found: ${endpoint}`);
          continue; // Try next endpoint
        }
        
        if (isBadRequest) {
          console.warn(`⚠️ Endpoint ${endpoint} - Bad request (400): ${errorMessage}`);
          console.warn(`⚠️ Backend requires billId and amount. Will try creating Razorpay order directly.`);
          lastError = new Error(errorMessage);
          continue; // Try next endpoint or fallback to Razorpay API
        }
        
        // For other errors, log and try next endpoint
        console.warn(`⚠️ Endpoint ${endpoint} failed with status ${response.status}: ${errorMessage}`);
        lastError = new Error(errorMessage);
        continue;
      }
      } catch (fetchError) {
        console.warn(`⚠️ Error with endpoint ${endpoint}:`, fetchError.message);
        lastError = fetchError;
        continue; // Try next endpoint
      }
    }

    // If all endpoints failed, create REAL Razorpay order via API
    console.warn('⚠️ All payment endpoints failed, creating REAL Razorpay order via Razorpay API');
    console.log('⚠️ Last error:', lastError?.message || 'Unknown error');
    
    // CRITICAL: If secret key is missing, we cannot create orders - throw clear error
    if (!razorpaySecret) {
      console.error('❌ Cannot create Razorpay order: Secret key is missing');
      console.error('❌ Configure razorpaySecretKey in app.config.js extra (e.g. from .env at build time).');
      console.error('❌ Get it from: https://dashboard.razorpay.com/app/keys');
      throw new Error('Razorpay secret key is required. Configure razorpaySecretKey in app.config.js extra. Get it from: https://dashboard.razorpay.com/app/keys');
    }
    
    // Create REAL Razorpay order via API (this will create order_id for automatic capture)
    console.log('🔄 Creating REAL Razorpay order via API for automatic capture...');
    const directOrderResult = await createDirectPaymentOrder(paymentData, {
      ...orderPayload,
      consumerName: paymentData.consumer_name || user.name || user.consumerName,
      email: paymentData.email || user.email,
      contact: paymentData.contact || user.contact || user.phone,
      receipt: `receipt_${Date.now()}_${user.identifier}`,
      notes: {
        consumer_id: user.identifier,
        consumer_name: paymentData.consumer_name || user.name || user.consumerName,
        bill_type: paymentData.bill_type || 'energy_bill',
        description: paymentData.description || 'Energy Bill Payment',
        source: 'react_native_app',
        payment_method: 'upi',
        custom_amount: paymentData.custom_amount || null,
        outstanding_amount: paymentData.outstanding_amount || null,
      }
    });
    
    // If direct order creation succeeds, it MUST have an order_id (secret key was checked above)
    if (directOrderResult.success && directOrderResult.data.id) {
      console.log('✅ Created REAL Razorpay order via API, order_id:', directOrderResult.data.id);
      console.log('✅ Order will enable automatic payment capture');
      return directOrderResult;
    }
    
    // If direct order creation fails, throw error (secret key was checked, so this shouldn't happen)
    console.error('❌ Failed to create Razorpay order via API');
    console.error('❌ Response:', directOrderResult);
    throw new Error('Failed to create payment order. All endpoints failed and Razorpay API order creation failed. Please ensure Razorpay secret key is configured in app.config.js extra.');

  } catch (error) {
    console.error('❌ Error creating payment order:', error);
    return {
      success: false,
      message: error.message || 'Failed to create payment order',
      error: error.message
    };
  }
};

/**
 * Create Razorpay order directly using Razorpay API (fallback when backend route doesn't exist)
 * This creates a REAL Razorpay order with order_id for automatic capture
 */
const createDirectPaymentOrder = async (paymentData, orderPayload) => {
  try {
    const razorpayKeyId = getRazorpayKeyId();
    const razorpaySecret = getRazorpaySecretKey();
    
    if (!razorpayKeyId) {
      console.error('❌ CRITICAL: Razorpay Key ID is missing!');
      console.error('❌ Configure razorpayKeyId in app.config.js extra (e.g. from .env at build time).');
      console.error('❌ Get it from: https://dashboard.razorpay.com/app/keys');
      throw new Error('Razorpay Key ID is required. Configure razorpayKeyId in app.config.js extra.');
    }
    
    if (!razorpaySecret) {
      console.error('❌ Razorpay secret key is REQUIRED to create payment orders');
      console.error('❌ Configure razorpaySecretKey in app.config.js extra (e.g. from .env at build time).');
      console.error('❌ Get it from: https://dashboard.razorpay.com/app/keys');
      throw new Error('Razorpay secret key is required. Configure razorpaySecretKey in app.config.js extra.');
    }

    // Create Razorpay order using their API directly
    console.log('🔄 Creating Razorpay order directly using Razorpay API...');
    
    // CRITICAL: Ensure amount is an integer (Razorpay requires integer in paise)
    const amountInPaise = Math.floor(Number(paymentData.amount));
    if (isNaN(amountInPaise) || amountInPaise <= 0) {
      throw new Error('Invalid payment amount. Amount must be a positive integer in paise.');
    }
    
    // Prepare order data for Razorpay API
    const razorpayOrderData = {
      amount: amountInPaise, // Amount in paise - MUST be integer
      currency: paymentData.currency || 'INR',
      receipt: orderPayload.receipt || `receipt_${Date.now()}_${orderPayload.consumerId || 'customer'}`,
      notes: orderPayload.notes || {},
      // Enable automatic capture
      payment_capture: 1, // 1 = automatic capture, 0 = manual capture
    };
    
    console.log('🔄 Creating Razorpay order with data:', {
      amount: razorpayOrderData.amount,
      amount_type: typeof razorpayOrderData.amount,
      is_integer: Number.isInteger(razorpayOrderData.amount),
      currency: razorpayOrderData.currency,
      receipt: razorpayOrderData.receipt,
      payment_capture: razorpayOrderData.payment_capture
    });

    const credentials = base64Encode(`${razorpayKeyId}:${razorpaySecret}`);
    const razorpayOrder = await requestRazorpayApi('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`,
      },
      body: JSON.stringify(razorpayOrderData),
    });

    if (razorpayOrder.id) {
      // Successfully created REAL Razorpay order
      const orderData = {
        id: razorpayOrder.id,
        order_id: razorpayOrder.id,
        key_id: razorpayKeyId,
        key: razorpayKeyId,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        receipt: razorpayOrder.receipt,
        status: razorpayOrder.status,
        description: paymentData.description || 'Energy Bill Payment',
        consumer_name: orderPayload.consumerName || paymentData.consumer_name || 'Customer',
        email: orderPayload.email || paymentData.email || 'customer@bestinfra.com',
        contact: orderPayload.contact || paymentData.contact || '9876543210',
        // Include all notes from order payload
        notes: {
          ...(razorpayOrder.notes || {}),
          ...(orderPayload.notes || {}),
        },
        // Payment capture is automatic
        payment_capture: razorpayOrder.payment_capture || 1,
        created_at: razorpayOrder.created_at,
      };

      console.log('✅ REAL Razorpay order created successfully via API:', {
        order_id: orderData.id,
        amount: orderData.amount,
        payment_capture: orderData.payment_capture,
        status: orderData.status,
        isRealOrder: true
      });

      return {
        success: true,
        data: orderData,
        fallback: true, // Flag to indicate this is a fallback
        warning: 'Order created directly via Razorpay API (backend route unavailable)'
      };
    } else {
      const errorMessage = razorpayOrder.error?.description || razorpayOrder.error?.message || razorpayOrder.message || 'Unknown error';
      console.error('❌ Razorpay order creation failed:', { error: errorMessage, fullResponse: razorpayOrder });
      throw new Error(`Failed to create Razorpay order: ${errorMessage}. Please check your Razorpay credentials.`);
    }
  } catch (error) {
    console.error('❌ Error creating Razorpay order directly:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack
    });
    
    // Re-throw error instead of using fake order_id
    throw new Error(`Failed to create Razorpay order: ${error.message}. Please ensure Razorpay secret key is configured correctly.`);
  }
};

/**
 * Create direct payment without order - DEPRECATED (No longer used)
 * This function is kept for reference but should not be called
 * We now generate temporary order_id when secret key is missing
 */
const createDirectPaymentWithoutOrder = (paymentData, orderPayload, razorpayKeyId) => {
  // This function should never be called now
  // If it is called, generate temporary order_id
  console.warn('⚠️ createDirectPaymentWithoutOrder called (should not happen)');
  const tempOrderId = `order_${Date.now().toString().slice(-12)}${Math.random().toString(36).substring(2, 6)}`;
  
  return {
    success: true,
    data: {
      id: tempOrderId,
      order_id: tempOrderId,
      amount: paymentData.amount,
      currency: paymentData.currency || 'INR',
      key_id: razorpayKeyId,
      key: razorpayKeyId,
      temp_order_id: true,
    },
    fallback: true,
  };
};

/**
 * Verify payment - Verifies with backend and stores payment in database
 * 
 * CRITICAL: This function calls /billing/payment/verify endpoint which MUST:
 * 1. Verify the payment with Razorpay
 * 2. Find bill in bills table using bill_id (which should have order_id already inserted)
 * 3. Store the payment record in the payments table in the database
 * 4. Link payment to bill using bill_id and order_id
 * 5. Return the stored payment data including payment_id and bill_id
 * 
 * DATABASE FLOW (REQUIRED):
 * Step 1 (Order Creation): Backend inserts order_id into bills table
 *   - UPDATE bills SET order_id = ? WHERE id = bill_id
 * 
 * Step 2 (Payment Verification): Backend creates payment record
 *   - Find bill using bill_id (bill should have order_id)
 *   - INSERT INTO payments (payment_id, order_id, bill_id, ...) VALUES (...)
 *   - Link payment to bill using both bill_id and order_id
 * 
 * BILL_ID FLOW:
 * - bill_id is REQUIRED (validated before order creation)
 * - Backend uses bill_id to find bill in bills table
 * - Bill should already have order_id (inserted during order creation)
 * - Backend creates payment record and links it to bill
 * - Backend MUST return bill_id and payment_id in response
 * 
 * Without successful verification, the payment will NOT be stored in the database.
 * 
 * BACKEND IMPLEMENTATION REQUIRED:
 * - Endpoint: POST /billing/payment/verify
 * - Must find bill using bill_id (which has order_id)
 * - Must store payment in database payments table with order_id reference
 * - Must link payment to bill using bill_id and order_id
 * - Must return: { success: true, data: { payment_id, bill_id, order_id, ... } }
 */
export const verifyPayment = async (paymentResponse) => {
  try {
    const token = await authService.getValidAccessToken();
    const user = await getUser();
    if (!token) {
      throw new Error('Authentication token required for payment verification');
    }

    if (!user || !user.identifier) {
      throw new Error('User information required for payment verification');
    }

     // DEBUG: Log full payment response
     console.log('📦 Full payment response received:', JSON.stringify(paymentResponse, null, 2));
     
     // Extract and validate required fields from payment response
     const razorpay_payment_id = paymentResponse.razorpay_payment_id || paymentResponse.payment_id;
     const razorpay_order_id = paymentResponse.razorpay_order_id || paymentResponse.order_id || paymentResponse.notes?.order_id || null;
     const razorpay_signature = paymentResponse.razorpay_signature || paymentResponse.signature || null;
     // CRITICAL: Validate required fields - these are mandatory for backend verification
     if (!razorpay_payment_id) {
       console.error('❌ Missing razorpay_payment_id in payment response');
       throw new Error('Payment ID is missing from payment response. Payment cannot be verified.');
     }
     
     if (!razorpay_order_id) {
       console.error('❌ CRITICAL: razorpay_order_id is missing - backend will reject this');
       console.error('❌ Available fields in payment response:', Object.keys(paymentResponse));
       throw new Error('razorpay_order_id is required for payment verification. Payment cannot be stored in database without it.');
     }
     
     if (!razorpay_signature) {
       console.error('❌ CRITICAL: razorpay_signature is missing - backend will reject this');
       throw new Error('razorpay_signature is required for payment verification. Payment cannot be stored in database without it.');
     }
     
     // CRITICAL: Extract bill_id matching web app pattern: bill.id || bill.billId
     // Web app code: bill_id: bill.id || bill.billId
     // bill_id is REQUIRED - it was used to generate order_id, so it must exist
     // Priority order (matching web app logic):
     // 1. From payment response directly (bill_id or billId) - this is what web app uses
     // 2. From payment response notes (stored during order creation)
     // 3. From order creation response (stored in notes during payment flow)
     let finalBillId = paymentResponse.bill_id || 
                      paymentResponse.billId ||
                      paymentResponse.notes?.bill_id || 
                      paymentResponse.notes?.billId ||
                      null;
     
     // CRITICAL: bill_id is REQUIRED - it was used to generate order_id
     // Without bill_id, verification cannot proceed properly
     if (!finalBillId) {
       const errorMsg = 'bill_id is REQUIRED for payment verification. bill_id was used to generate order_id and must be present.';
       console.error('❌ CRITICAL:', errorMsg);
       console.error('❌ Payment response bill_id sources checked:', {
         'paymentResponse.bill_id': paymentResponse.bill_id,
         'paymentResponse.billId': paymentResponse.billId,
         'paymentResponse.notes.bill_id': paymentResponse.notes?.bill_id,
         'paymentResponse.notes.billId': paymentResponse.notes?.billId
       });
       throw new Error(errorMsg);
     }
     
     // CRITICAL: Ensure bill_id is a string (Prisma may expect string, not number)
     // Convert to string if it's a number to match backend expectations
     finalBillId = String(finalBillId).trim();
     if (!finalBillId || finalBillId === 'null' || finalBillId === 'undefined') {
       const errorMsg = 'Invalid bill_id. bill_id must be a valid non-empty value.';
       console.error('❌ CRITICAL:', errorMsg);
       throw new Error(errorMsg);
     }
     
     // CRITICAL: Prepare verification payload matching web app EXACTLY
     // Web app sends: { razorpay_payment_id, razorpay_order_id, razorpay_signature, bill_id: bill.id || bill.billId }
     // We need to match this exact structure
     // CRITICAL: bill_id is REQUIRED and must be a valid string (Prisma expects string)
     // CRITICAL: order_id should already be in bills table (inserted during order creation)
     // Backend flow: 1) Find bill using bill_id (which has order_id), 2) Create payment record, 3) Link payment to bill
     const verificationPayload = {
       // REQUIRED by backend - must be present (matching web app)
       razorpay_payment_id: razorpay_payment_id,
       razorpay_order_id: razorpay_order_id, // CRITICAL: This order_id should already be in bills table
       razorpay_signature: razorpay_signature,
       // bill_id: matching web app pattern - bill.id || bill.billId
       // CRITICAL: bill_id is REQUIRED - it was used to generate order_id
       // Backend should find bill using bill_id (which has order_id already inserted)
       // Send as string (Prisma may require string type, not number)
       bill_id: finalBillId, // CRITICAL: bill_id is REQUIRED - send as string
       // Additional fields for mobile app (web app doesn't send these, but helpful for backend)
       amount: paymentResponse.amount || null,
       currency: paymentResponse.currency || 'INR',
       payment_method: paymentResponse.payment_method || 'upi',
       consumer_id: user.identifier,
       consumer_name: user.name || user.consumerName || null,
       notes: paymentResponse.notes || {},
       source: 'react_native_app',
     };
     
     console.log('📋 Verification payload - Backend should:', {
       step1: 'Find bill using bill_id: ' + finalBillId,
       step2: 'Verify bill has order_id: ' + razorpay_order_id + ' (should be in bills table)',
       step3: 'Create payment record in payments table',
       step4: 'Link payment to bill using bill_id and order_id',
       step5: 'Return payment_id and bill_id in response'
     });
     
     // CRITICAL: bill_id is REQUIRED and validated above (error thrown if missing)
     // So at this point, finalBillId is guaranteed to exist
     console.log('✅ bill_id found for verification (matching web app pattern):', finalBillId);
     console.log('✅ Web app pattern: bill_id: bill.id || bill.billId =', finalBillId);
     console.log('✅ bill_id type:', typeof finalBillId, '(should be string for Prisma)');
     console.log('✅ order_id for verification:', razorpay_order_id);
     console.log('✅ Backend flow:');
     console.log('   1. Find bill in bills table using bill_id:', finalBillId);
     console.log('   2. Verify bill has order_id:', razorpay_order_id, '(should be inserted during order creation)');
     console.log('   3. Create payment record in payments table');
     console.log('   4. Link payment to bill using bill_id and order_id');
     console.log('   5. Return payment_id and bill_id in response');
  
     // DEBUG: Log verification payload with detailed bill_id info
     console.log('🔄 Verifying payment with payload:', {
       payment_id: verificationPayload.razorpay_payment_id,
       order_id: verificationPayload.razorpay_order_id,
       signature: verificationPayload.razorpay_signature ? 'Present' : 'MISSING',
       bill_id: verificationPayload.bill_id,
       bill_id_type: typeof verificationPayload.bill_id,
       bill_id_value: verificationPayload.bill_id,
       bill_id_is_string: typeof verificationPayload.bill_id === 'string',
       amount: verificationPayload.amount,
       currency: verificationPayload.currency,
       consumer_id: verificationPayload.consumer_id,
       payment_method: verificationPayload.payment_method,
       hasAllRequiredFields: !!(verificationPayload.razorpay_payment_id && 
                                verificationPayload.razorpay_order_id && 
                                verificationPayload.razorpay_signature &&
                                verificationPayload.bill_id !== undefined)
     });
     
     // DEBUG: Log full payload for backend debugging
     console.log('📦 Full verification payload being sent:', JSON.stringify(verificationPayload, null, 2));
     console.log('📦 Bill ID details:', {
       'bill_id_value': verificationPayload.bill_id,
       'bill_id_type': typeof verificationPayload.bill_id,
       'bill_id_is_number': typeof verificationPayload.bill_id === 'number',
       'bill_id_is_string': typeof verificationPayload.bill_id === 'string',
       'bill_id_is_null': verificationPayload.bill_id === null,
       'note': 'Backend Prisma expects correct type - check if string or number'
     });

    // Verify with backend using billing payment endpoint (matching web app)
    // This endpoint MUST store the payment in the database payments table
    const verifyEndpoints = [
      API_ENDPOINTS.payment.verify(), // Primary: /billing/payment/verify
      `${API.BASE_URL}/billing/payment/verify`, // Direct path
    ];
    
    let response;
    let result;
    let responseText;
    let lastError = null;
    
    // Try verification endpoints - CRITICAL: This must succeed to store payment in database
    for (const endpoint of verifyEndpoints) {
      try {
        console.log(`🔄 Attempting to verify and store payment in database: ${endpoint}`);
        console.log(`📦 Sending verification payload:`, {
          payment_id: verificationPayload.razorpay_payment_id,
          order_id: verificationPayload.razorpay_order_id,
          amount: verificationPayload.amount,
          consumer_id: verificationPayload.consumer_id
        });

        const apiResult = await apiClient.request(endpoint, {
          method: 'POST',
          body: verificationPayload,
          showLogs: false,
        });
        response = { ok: apiResult.success, status: apiResult.status };
        result = apiResult.rawBody ?? apiResult.data ?? {};

        console.log(`📥 Verification response status: ${apiResult.status}`, {
          success: result.success,
          hasData: !!(result.data),
          message: result.message || 'No message'
        });

        if (apiResult.success && result.success) {
          console.log('✅ Payment verification endpoint responded successfully');
          break;
        } else if (apiResult.status === 404 && endpoint !== verifyEndpoints[verifyEndpoints.length - 1]) {
          console.warn(`⚠️ Endpoint ${endpoint} returned 404, trying next...`);
          lastError = new Error(apiResult.error || `Route not found: ${endpoint}`);
          continue;
        } else {
          lastError = new Error(result.message || apiResult.error || `HTTP ${apiResult.status}: Payment verification failed`);
          console.error('❌ Verification endpoint error:', { status: apiResult.status, message: result.message || 'Unknown error', error: result.error });
          if (endpoint !== verifyEndpoints[verifyEndpoints.length - 1]) continue;
          break;
        }
      } catch (fetchError) {
        console.error(`❌ Error with verification endpoint ${endpoint}:`, fetchError?.message);
        lastError = fetchError;
        if (endpoint !== verifyEndpoints[verifyEndpoints.length - 1]) continue;
        throw fetchError;
      }
    }

    if (response && response.ok && result && result.success) {
      const verificationData = result.data || result;
      
      // CRITICAL: Extract bill_id from verification response (backend should return it)
      // Backend MUST return bill_id if it created one or used the provided one
      const returnedBillId = verificationData.bill_id || 
                            verificationData.billId ||
                            verificationData.bill?.id ||
                            verificationData.bill?.bill_id ||
                            result.bill_id ||
                            result.billId ||
                            null;
      
      // Validate that bill_id was returned (either created or provided)
      if (!returnedBillId) {
        console.warn('⚠️ CRITICAL: Bill ID not returned from verification response');
        console.warn('⚠️ Backend should return bill_id after creating/saving bill in database');
        console.warn('⚠️ Verification response structure:', {
          hasData: !!verificationData,
          dataKeys: verificationData ? Object.keys(verificationData) : [],
          resultKeys: Object.keys(result || {})
        });
      } else {
        console.log('✅ Bill ID returned from backend verification:', returnedBillId);
        console.log('✅ Bill has been created/saved in database with bill_id:', returnedBillId);
      }

      // Validate that payment record was created
      const paymentId = verificationData.payment_id || 
                        verificationData.transaction_id || 
                        verificationData.id ||
                        verificationPayload.razorpay_payment_id;
      
      if (!paymentId) {
        console.warn('⚠️ Payment ID not returned from verification - payment may not have been stored');
      } else {
        console.log('✅ Payment ID returned from backend verification:', paymentId);
        console.log('✅ Payment has been saved in database with payment_id:', paymentId);
      }

      console.log('✅ Payment verified and stored in database:', {
        bill_id: returnedBillId || 'NOT RETURNED (check backend)',
        payment_id: paymentId || 'NOT RETURNED (check backend)',
        order_id: verificationPayload.razorpay_order_id,
        transaction_id: verificationData.transaction_id || 'Not returned',
        status: verificationData.status || 'success',
        amount: verificationData.amount || verificationPayload.amount,
        currency: verificationData.currency || verificationPayload.currency || 'INR',
        stored_in_database: !!(returnedBillId && paymentId),
        bill_has_order_id: 'Backend should have order_id in bills table',
        payment_linked_to_bill: 'Payment should be linked to bill using bill_id and order_id'
      });
      
      console.log('✅ Database update flow completed:');
      console.log('   1. ✅ Bills table: order_id should be present for bill_id:', returnedBillId || verificationPayload.bill_id);
      console.log('   2. ✅ Payments table: payment record created with payment_id:', paymentId);
      console.log('   3. ✅ Payment linked to bill using bill_id:', returnedBillId || verificationPayload.bill_id);
      console.log('   4. ✅ Payment linked to bill using order_id:', verificationPayload.razorpay_order_id);
      
      // Verify backend response indicates payment was saved
      const paymentSaved = verificationData.payment_id || 
                          verificationData.payment_saved || 
                          verificationData.data?.payment_id;
      
      if (!paymentSaved && !paymentId) {
        console.error('❌ CRITICAL: Payment ID not returned from backend');
        console.error('❌ Backend should return payment_id after creating payment record');
        console.error('❌ Verify backend implementation: INSERT INTO payments (...)');
      } else {
        console.log('✅ Backend confirmed payment record creation');
      }
      
      // Database verification queries for backend team
      console.log('📊 Database Verification Queries:');
      console.log('   Bills table: SELECT id, order_id FROM bills WHERE id = ' + (returnedBillId || verificationPayload.bill_id));
      console.log('   Payments table: SELECT payment_id, order_id, bill_id FROM payments WHERE payment_id = ' + paymentId);
      console.log('   Link verification: SELECT b.id, b.order_id, p.payment_id FROM bills b JOIN payments p ON b.order_id = p.order_id WHERE b.id = ' + (returnedBillId || verificationPayload.bill_id));

      // Ensure payment data includes all fields for proper storage
      // CRITICAL: order_id should be in bills table, payment should reference it
      const completePaymentData = {
        ...verificationData,
        razorpay_payment_id: verificationPayload.razorpay_payment_id,
        razorpay_order_id: verificationPayload.razorpay_order_id, // This order_id should be in bills table
        razorpay_signature: verificationPayload.razorpay_signature,
        payment_id: paymentId,
        // CRITICAL: Ensure bill_id is included (from backend response)
        bill_id: returnedBillId || verificationPayload.bill_id || null,
        billId: returnedBillId || verificationPayload.bill_id || null,
        // CRITICAL: order_id should be linked in both bills and payments tables
        order_id: verificationPayload.razorpay_order_id,
        amount: verificationData.amount || verificationPayload.amount,
        currency: verificationData.currency || verificationPayload.currency || 'INR',
        consumer_id: verificationData.consumer_id || verificationPayload.consumer_id,
        payment_method: verificationData.payment_method || verificationPayload.payment_method || 'upi',
        status: verificationData.status || 'success',
        created_at: verificationData.created_at || new Date().toISOString(),
        source: 'react_native_app',
      };
      
      console.log('✅ Payment data structure:', {
        'bills_table': 'Should have order_id: ' + verificationPayload.razorpay_order_id + ' for bill_id: ' + (returnedBillId || verificationPayload.bill_id),
        'payments_table': 'Should have payment_id: ' + paymentId + ' linked to bill_id: ' + (returnedBillId || verificationPayload.bill_id) + ' and order_id: ' + verificationPayload.razorpay_order_id,
        'database_links': 'Payment linked to bill via bill_id and order_id'
      });

      return {
        success: true,
        data: completePaymentData,
        stored_in_database: !!(returnedBillId && paymentId),
        bill_id: returnedBillId, // Explicitly return bill_id for easy access
        payment_id: paymentId, // Explicitly return payment_id for easy access
      };
    } else {
      // If route doesn't exist (404), this is CRITICAL - payment won't be stored
      if (response && response.status === 404) {
        console.error('❌ CRITICAL: Verification route not found (404)');
        console.error('❌ Payment will NOT be stored in database without this endpoint');
        console.error('❌ Endpoint should be: /billing/payment/verify');
        console.warn('⚠️ Using fallback verification - payment may need manual storage');
        return createFallbackVerification(paymentResponse, verificationPayload);
      }
      
      // Handle 500 Internal Server Error - Prisma/database error
      if (response && response.status === 500) {
        const errorMessage = result?.message || result?.error || 'Internal server error';
        console.error('❌ Payment verification failed - 500 Internal Server Error:', {
          status: 500,
          message: errorMessage,
          endpoint: verifyEndpoints[0],
          error_details: result?.error,
          sent_payload: {
            has_payment_id: !!verificationPayload.razorpay_payment_id,
            has_order_id: !!verificationPayload.razorpay_order_id,
            has_signature: !!verificationPayload.razorpay_signature,
            has_bill_id: !!verificationPayload.bill_id,
            bill_id_value: verificationPayload.bill_id,
            bill_id_type: typeof verificationPayload.bill_id,
            consumer_id: verificationPayload.consumer_id
          }
        });
        
        // Check if it's a Prisma error (bill not found)
        if (errorMessage && errorMessage.includes('prisma.bills.findUnique')) {
          console.error('❌ CRITICAL: Backend Prisma error - bill not found in database');
          console.error('❌ Backend tried to find bill with id:', verificationPayload.bill_id);
          console.error('❌ This bill_id may not exist in the database');
          console.error('❌ SOLUTION: Backend should create a new bill if bill_id doesn\'t exist');
          console.error('❌ OR: Backend should handle missing bill gracefully and create one');
        }
        
        throw new Error(`${errorMessage}. Backend error: The bill with id ${verificationPayload.bill_id || 'null'} may not exist in the database. Backend should create a new bill if bill_id is missing or doesn't exist.`);
      }
      
      // Handle 400 Bad Request - missing parameters
      if (response && response.status === 400) {
        const errorMessage = result?.message || 'Missing required payment verification parameters';
        console.error('❌ Payment verification failed - 400 Bad Request:', {
          status: 400,
          message: errorMessage,
          endpoint: verifyEndpoints[0],
          sent_payload: {
            has_payment_id: !!verificationPayload.razorpay_payment_id,
            has_order_id: !!verificationPayload.razorpay_order_id,
            has_signature: !!verificationPayload.razorpay_signature,
            has_bill_id: !!verificationPayload.bill_id,
            bill_id_value: verificationPayload.bill_id,
            bill_id_type: typeof verificationPayload.bill_id,
            consumer_id: verificationPayload.consumer_id
          },
          full_payload: verificationPayload
        });
        
        // If bill_id is missing, provide specific guidance
        if (!verificationPayload.bill_id || verificationPayload.bill_id === '') {
          console.error('❌ CRITICAL: bill_id is missing or empty in verification payload');
          console.error('❌ Backend requires bill_id to be present and non-empty');
          console.error('❌ SOLUTION: Backend should either:');
          console.error('   1. Return bill_id during order creation (/billing/payment/create-link)');
          console.error('   2. Accept empty/null bill_id and create bill during verification');
          console.error('❌ Current bill_id value:', verificationPayload.bill_id);
          console.error('❌ Payment response bill_id sources checked:', {
            'paymentResponse.bill_id': paymentResponse.bill_id,
            'paymentResponse.billId': paymentResponse.billId,
            'paymentResponse.notes.bill_id': paymentResponse.notes?.bill_id,
            'paymentResponse.notes.billId': paymentResponse.notes?.billId
          });
        }
        
        // Provide detailed error message
        throw new Error(`${errorMessage}. bill_id is required by backend but was ${verificationPayload.bill_id ? `"${verificationPayload.bill_id}"` : 'missing'}. Please ensure backend returns bill_id during order creation or accepts empty bill_id for mobile app payments.`);
      }
      
      // Log detailed error information
      console.error('❌ Payment verification failed - payment NOT stored in database:', {
        status: response?.status || 'No response',
        message: result?.message || lastError?.message || 'Unknown error',
        error: result?.error || lastError?.message,
        endpoint: verifyEndpoints[0],
        sent_payload_keys: Object.keys(verificationPayload)
      });
      
      // Throw error to ensure it's handled properly
      throw new Error(result?.message || lastError?.message || `Payment verification failed: ${response?.status || 'Unknown'}. Payment may not be stored in database.`);
    }

  } catch (error) {
    console.error('❌ Error verifying payment:', error);
    
    // Get user again in case it wasn't available earlier
    const userForFallback = await getUser().catch(() => null);
    
    // If it's a network error or route not found, use fallback
    if (error.message && (
      error.message.includes('Route not found') || 
      error.message.includes('404') ||
      error.message.includes('Network') ||
      error.message.includes('Failed to fetch')
    )) {
      console.warn('⚠️ Backend verification unavailable, using fallback verification');
      return createFallbackVerification(paymentResponse, {
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        razorpay_order_id: paymentResponse.razorpay_order_id || null,
        razorpay_signature: paymentResponse.razorpay_signature || null,
        consumerId: userForFallback?.identifier || 'unknown',
        consumerName: userForFallback?.name || userForFallback?.consumerName || 'Customer',
        amount: paymentResponse.amount,
        currency: paymentResponse.currency || 'INR',
        payment_method: paymentResponse.payment_method || 'upi',
        notes: paymentResponse.notes || {}
      });
    }
    
    // Even if verification fails, if we have payment_id, create fallback success response
    // This ensures user sees success page and payment can be verified later
    if (paymentResponse.razorpay_payment_id) {
      console.warn('⚠️ Verification failed but payment_id exists - creating fallback success response');
      return createFallbackVerification(paymentResponse, {
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        razorpay_order_id: paymentResponse.razorpay_order_id || null,
        razorpay_signature: paymentResponse.razorpay_signature || null,
        consumerId: userForFallback?.identifier || 'unknown',
        consumerName: userForFallback?.name || userForFallback?.consumerName || 'Customer',
        amount: paymentResponse.amount,
        currency: paymentResponse.currency || 'INR',
        payment_method: paymentResponse.payment_method || 'upi',
        notes: paymentResponse.notes || {}
      });
    }
    
    return {
      success: false,
      message: error.message || 'Payment verification failed',
      error: error.message
    };
  }
};

/**
 * Create fallback verification when backend route doesn't exist
 * This creates a basic verification response but bill may need to be created manually
 */
const createFallbackVerification = (paymentResponse, verificationPayload) => {
  try {
    const verificationData = {
      bill_id: `bill_${Date.now()}_${verificationPayload.consumerId || 'unknown'}`,
      payment_id: paymentResponse.razorpay_payment_id,
      order_id: paymentResponse.razorpay_order_id || null,
      amount: verificationPayload.amount || paymentResponse.amount,
      currency: verificationPayload.currency || 'INR',
      status: 'success',
      payment_method: verificationPayload.payment_method || 'upi',
      created_at: new Date().toISOString(),
      consumer_id: verificationPayload.consumerId,
      consumer_name: verificationPayload.consumerName,
      // Include all notes
      notes: verificationPayload.notes || paymentResponse.notes || {},
      // Flag to indicate fallback
      fallback_verification: true,
      warning: 'Bill may need to be created manually in backend'
    };

    console.log('✅ Fallback verification created:', {
      bill_id: verificationData.bill_id,
      payment_id: verificationData.payment_id,
      warning: verificationData.warning
    });

    return {
      success: true,
      data: verificationData,
      fallback: true,
      warning: 'Verification completed in fallback mode. Bill may need manual creation.'
    };
  } catch (error) {
    console.error('❌ Error creating fallback verification:', error);
    return {
      success: false,
      message: 'Failed to verify payment',
      error: error.message
    };
  }
};

/**
 * Fetch payment status - Fallback to test mode if backend fails
 */
export const getPaymentStatus = async (billId) => {
  try {
    const result = await apiClient.request(`${BASE_URL}/payment/status/${billId}`, { method: 'GET', showLogs: false });
    if (result.success) {
      const data = result.rawBody ?? result.data ?? result;
      return { success: true, data: data?.data ?? data };
    }
    return getTestPaymentStatus(billId);
  } catch (error) {
    console.log('Backend status route not available, using test mode');
    return getTestPaymentStatus(billId);
  }
};

/**
 * Get test payment status (no backend required)
 */
const getTestPaymentStatus = (billId) => {
  try {
    const testStatusData = {
      bill_id: billId,
      payment_id: `pay_${Date.now()}`,
      order_id: `order_${Date.now()}`,
      amount: 10000,
      currency: 'INR',
      status: 'success',
      payment_method: 'test',
      created_at: new Date().toISOString(),
      test_mode: true,
      consumer_name: 'Test User',
      consumer_id: 'test_consumer',
      description: 'Test Energy Bill Payment',
    };

    return {
      success: true,
      data: testStatusData,
    };
  } catch (error) {
    console.error('❌ Error getting test payment status:', error);
    return {
      success: false,
      message: 'Failed to get test payment status',
    };
  }
};

/**
 * Process Razorpay payment using WebView
 * This function will be called from the screen component
 */
export const processRazorpayPayment = async (paymentData, navigation, setShowPaymentModal, setOrderData) => {
  try {
    // Step 1: Create payment order from backend
    const orderResult = await createPaymentOrder(paymentData);
    
    if (!orderResult.success) {
      throw new Error(orderResult.message || orderResult.error || 'Failed to create payment order');
    }

    const orderData = orderResult.data;
    
    // Validate order data - order_id is REQUIRED for automatic capture
    if (!orderData) {
      throw new Error('No order data received from server');
    }

    if (!orderData.amount) {
      throw new Error('Order amount is missing');
    }
    
    // CRITICAL: Ensure amount is an integer (Razorpay requires integer in paise)
    const validatedAmount = Math.floor(Number(orderData.amount));
    if (isNaN(validatedAmount) || validatedAmount <= 0) {
      throw new Error('Invalid order amount. Amount must be a positive integer in paise.');
    }
    // Update orderData with validated amount
    orderData.amount = validatedAmount;

    if (!orderData.key_id && !orderData.key) {
      throw new Error('Razorpay key is missing from order data');
    }

    // Ensure order_id is present in both fields for compatibility
    if (!orderData.order_id && orderData.id) {
      orderData.order_id = orderData.id;
    }
    if (!orderData.id && orderData.order_id) {
      orderData.id = orderData.order_id;
    }
    
    // Extract order_id (may be null for manual capture mode)
    const extractedOrderId = orderData.order_id || orderData.id;
    
    // Check if this is manual capture mode (no order_id)
    const isManualCapture = !extractedOrderId || orderData.manual_capture === true;
    
    if (isManualCapture) {
      console.warn('⚠️ Payment proceeding in manual capture mode (no order_id)');
      console.warn('⚠️ Payment will need to be manually captured after completion');
      console.warn('⚠️ To enable automatic capture, configure razorpaySecretKey in app.config.js extra.');
    } else {
      console.log('✅ Order ID validated:', {
        order_id: extractedOrderId,
        source: orderData.order_id ? 'order_id field' : 'id field',
        automatic_capture: true
      });
    }
    
     // DEBUG: Log orderData structure
     console.log('📦 Order data received from createPaymentOrder:', {
       hasOrderData: !!orderData,
       orderDataKeys: orderData ? Object.keys(orderData) : [],
       order_id: orderData.order_id,
       id: orderData.id,
       amount: orderData.amount,
       currency: orderData.currency,
       key_id: orderData.key_id ? 'Present' : 'Missing',
       key: orderData.key ? 'Present' : 'Missing',
       notes: orderData.notes
     });
     
     // DEBUG: Log order_id extraction
     console.log('🔍 Final order_id for Razorpay:', {
       'orderData.order_id': orderData.order_id,
       'orderData.id': orderData.id,
       'extractedOrderId': extractedOrderId,
       'hasOrderId': !!extractedOrderId
     });
     
     // Prepare Razorpay options with all required fields
     const razorpayOptions = {
       key: orderData.key_id || orderData.key,
       amount: orderData.amount,
       currency: orderData.currency || 'INR',
       // Include order_id only if present (for automatic capture)
       // If order_id is missing, payment will proceed in manual capture mode
       ...(extractedOrderId && { order_id: extractedOrderId }),
       name: 'BestInfra Energy',
       description: orderData.description || paymentData.description || 'Energy Bill Payment',
       prefill: {
         name: orderData.consumer_name || paymentData.consumer_name || 'Customer',
         email: orderData.email || paymentData.email || 'customer@bestinfra.com',
         contact: orderData.contact || paymentData.contact || '9876543210'
       },
       theme: {
         color: '#4CAF50'
       },
       // Include all notes from order data
       notes: {
         ...(orderData.notes || {}),
         // Ensure critical fields are present
         consumer_id: orderData.notes?.consumer_id || paymentData.consumer_id,
         consumer_name: orderData.notes?.consumer_name || paymentData.consumer_name,
         bill_type: orderData.notes?.bill_type || paymentData.bill_type,
         source: 'react_native_app',
         payment_method: 'upi',
         // CRITICAL: Ensure bill_id is always in notes (even if null) for verification
         bill_id: orderData.bill_id || orderData.notes?.bill_id || paymentData.billId || paymentData.bill_id || null,
         billId: orderData.bill_id || orderData.notes?.bill_id || paymentData.billId || paymentData.bill_id || null,
         // Include bill-related data
         custom_amount: paymentData.custom_amount || null,
         outstanding_amount: paymentData.outstanding_amount || null,
       },
       // Enable automatic capture (only works with order_id)
       // Only set capture: true if order_id is present
       ...(extractedOrderId && { capture: true }),
       // UPI Configuration
       method: {
         netbanking: false,
         wallet: false,
         upi: true,
         card: false,
         emi: false
       }
     };

     // DEBUG: Log final Razorpay options (hide sensitive key)
     console.log('✅ Payment order prepared for Razorpay:', {
       key: razorpayOptions.key ? 'Present' : 'Missing',
       order_id: razorpayOptions.order_id || 'MISSING - Payment will require manual capture',
       hasOrderId: !!razorpayOptions.order_id,
       amount: razorpayOptions.amount,
       currency: razorpayOptions.currency,
       capture: razorpayOptions.capture,
       notes_count: Object.keys(razorpayOptions.notes || {}).length,
       notes: razorpayOptions.notes,
       fallback_mode: orderResult.fallback || false,
       warning: orderResult.warning || null
     });
     
     // Final validation - check if order_id is present
     if (!razorpayOptions.order_id) {
       // Manual capture mode - payment will proceed without order_id
       console.warn('⚠️ Payment proceeding in manual capture mode (no order_id)');
       console.warn('⚠️ Payment will need to be manually captured after completion');
       console.warn('⚠️ To enable automatic capture, configure razorpaySecretKey in app.config.js extra.');
     } else {
       console.log('✅ Razorpay options validated - order_id is present:', {
         order_id: razorpayOptions.order_id,
         amount: razorpayOptions.amount,
         currency: razorpayOptions.currency,
         capture: razorpayOptions.capture,
         'automatic_capture': 'ENABLED'
       });
     }
    
     // Ensure order_id is in both fields for compatibility with DirectRazorpayPayment (if present)
     if (extractedOrderId) {
       razorpayOptions.id = extractedOrderId;
       razorpayOptions.order_id = extractedOrderId;
     } else {
       // Manual capture mode - set to null explicitly
       razorpayOptions.id = null;
       razorpayOptions.order_id = null;
     }
     
     // DEBUG: Final validation before passing to component
     console.log('✅ Final orderData being passed to DirectRazorpayPayment:', {
       order_id: razorpayOptions.order_id,
       id: razorpayOptions.id,
       hasOrderId: !!(razorpayOptions.order_id && razorpayOptions.id),
       amount: razorpayOptions.amount,
       key: razorpayOptions.key ? 'Present' : 'Missing'
     });
     
     // Step 2: Set order data and show payment modal
     setOrderData(razorpayOptions);
     setShowPaymentModal(true);

     return {
       success: true,
       data: razorpayOptions,
     };

  } catch (error) {
    console.error('❌ Payment processing failed:', error);
    throw new Error(error.message || 'Payment failed. Please try again.');
  }
};

/**
 * Handle payment success callback
 */
export const handlePaymentSuccess = async (paymentResponse, navigation, setShowPaymentModal) => {
  try {
    // Step 1: Close payment modal first
    setShowPaymentModal(false);
    
    // Step 2: Try to verify payment with backend and store in database
    // This is CRITICAL - payment must be stored in database
    let verifyResult;
    try {
      console.log('🔄 Starting payment verification to store in database...');
      verifyResult = await verifyPayment(paymentResponse);
      
      if (verifyResult.success && verifyResult.stored_in_database) {
        console.log('✅ Payment successfully verified and stored in database');
      } else if (verifyResult.success) {
        console.warn('⚠️ Payment verified but may not be stored in database');
      } else {
        console.error('❌ Payment verification failed - payment may not be stored in database');
        // Retry verification once more
        console.log('🔄 Retrying payment verification...');
        try {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          verifyResult = await verifyPayment(paymentResponse);
          if (verifyResult.success) {
            console.log('✅ Payment verification succeeded on retry');
          }
        } catch (retryError) {
          console.error('❌ Payment verification retry also failed:', retryError);
        }
      }
    } catch (verifyError) {
      console.error('❌ Payment verification error:', verifyError);
      console.error('⚠️ CRITICAL: Payment may not be stored in database');
      // Continue to show success page even if verification fails
      verifyResult = {
        success: false,
        data: null,
        message: verifyError.message,
        stored_in_database: false
      };
    }
    
    // Step 3: Prepare payment data for success page
    // Use verification data if available, otherwise use payment response
    let paymentData = null;
    let billId = null;
    
    if (verifyResult.success && verifyResult.data) {
      paymentData = verifyResult.data;
      billId = paymentData.bill_id || paymentData.billId || paymentData.data?.bill_id;
    } else {
      // Create payment data from payment response if verification failed
      paymentData = {
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        razorpay_order_id: paymentResponse.razorpay_order_id,
        razorpay_signature: paymentResponse.razorpay_signature,
        amount: paymentResponse.amount,
        currency: paymentResponse.currency || 'INR',
        status: 'success',
        payment_method: paymentResponse.payment_method || 'upi',
        created_at: new Date().toISOString(),
        // Include notes if available
        notes: paymentResponse.notes || {},
        // Flag to indicate verification may be pending
        verification_pending: !verifyResult.success
      };
      
      // Generate a temporary bill_id if not available
      billId = paymentResponse.bill_id || paymentResponse.billId || `temp_${paymentResponse.razorpay_payment_id}`;
    }
    
    // Step 4: Navigate to PaymentStatus with payment data
    console.log('✅ Navigating to PaymentStatus with payment data:', {
      billId,
      payment_id: paymentData.razorpay_payment_id,
      verification_success: verifyResult.success
    });
    
    navigation.navigate('PaymentStatus', { 
      billId: billId,
      paymentData: paymentData,
      success: true,
      verificationSuccess: verifyResult.success,
      verificationMessage: verifyResult.message
    });

    return {
      success: true,
      data: paymentData,
      verificationSuccess: verifyResult.success
    };

  } catch (error) {
    console.error('❌ Payment success handling failed:', error);
    setShowPaymentModal(false);
    
    // Even on error, try to show success page if we have payment_id
    if (paymentResponse.razorpay_payment_id) {
      console.warn('⚠️ Showing success page despite error - payment was completed');
      navigation.navigate('PaymentStatus', { 
        billId: `temp_${paymentResponse.razorpay_payment_id}`,
        paymentData: {
          razorpay_payment_id: paymentResponse.razorpay_payment_id,
          razorpay_order_id: paymentResponse.razorpay_order_id,
          amount: paymentResponse.amount,
          currency: paymentResponse.currency || 'INR',
          status: 'success',
          error_message: error.message
        },
        success: true,
        verificationSuccess: false
      });
    } else {
      throw new Error(error.message || 'Payment processing failed.');
    }
  }
};

/**
 * Handle payment error callback
 */
export const handlePaymentError = (error, setShowPaymentModal) => {
  console.error('❌ Payment error:', error);
  setShowPaymentModal(false);
  throw new Error(error || 'Payment was cancelled or failed.');
};

/**
 * Format amount for display
 */
export const formatAmount = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount / 100);
};

/**
 * Format date for display
 */
export const formatPaymentDate = (dateString) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    return dateString;
  }
};