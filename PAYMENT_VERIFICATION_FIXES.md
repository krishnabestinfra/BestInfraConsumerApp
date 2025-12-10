# Payment Verification Fixes - Backend Implementation Guide

## Problem Summary

After successful payment transactions:
1. ❌ Error: "Invalid `prisma.bills.findUnique()` invocation" with `id: 1722`
2. ❌ Error: "The bill with id 1722 may not exist in the database"
3. ❌ Order ID not being saved in bills table
4. ❌ Payment data not being saved in payments table

## Root Causes

### 1. Bill ID Type Mismatch
- **Frontend sends**: `bill_id: "1722"` (string)
- **Prisma expects**: `id: 1722` (integer)
- **Fix**: Convert bill_id to integer before Prisma query

### 2. Order ID Not Saved in Bills Table
- **Current**: `updatePaymentLink` might not be saving order_id correctly
- **Required**: Order ID must be saved in bills table during order creation

### 3. Payment Record Not Created
- **Current**: `recordPayment` might not be working correctly
- **Required**: Payment must be saved in payments table with order_id reference

## Backend Fixes Required

### Fix 1: Update `createPaymentLink` Function

**File**: `controllers/billingController.js`

```javascript
export const createPaymentLink = async (req, res) => {
  try {
    const { billId, amount } = req.body;
    
    if (!billId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Bill ID and amount are required',
      });
    }

    // CRITICAL FIX: Convert billId to integer (Prisma expects integer)
    const billIdInt = parseInt(billId, 10);
    if (isNaN(billIdInt)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bill ID format',
      });
    }

    // Get bill details using integer ID
    const bill = await BillingDB.getBillById(billIdInt);
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found',
      });
    }

    // Check if payment link already exists
    const existingPaymentLink = await BillingDB.getPaymentLink(billIdInt);
    if (existingPaymentLink) {
      return res.json({
        success: true,
        data: {
          invoice_url: existingPaymentLink,
          order_id: bill.orderId,
          amount: amount,
          currency: 'INR',
          is_existing_order: true,
        },
      });
    }

    // Create Razorpay order
    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: 'INR',
      receipt: bill.billNumber,
      notes: {
        bill_id: billIdInt, // Use integer
        bill_number: bill.billNumber,
        consumer_id: bill.consumerId,
        consumer_name: bill.consumers?.name,
        consumer_phone: bill.consumers?.primaryPhone,
        consumer_email: bill.consumers?.email,
        meter_serial: bill.meters?.serialNumber,
        billing_period: `${bill.billMonth}/${bill.billYear}`,
      },
    };

    const order = await razorpay.orders.create(options);

    // CRITICAL FIX: Save order_id in bills table
    // This MUST update the bills table with order_id
    await BillingDB.updatePaymentLink(billIdInt, order.id, order.id);
    
    // CRITICAL FIX: Also update order_id field in bills table
    // Ensure your BillingDB.updatePaymentLink function saves order_id
    await BillingDB.updateBillOrderId(billIdInt, order.id);

    res.json({
      success: true,
      data: {
        invoice_url: order.id,
        order_id: order.id,
        amount: amount,
        currency: 'INR',
        is_existing_order: false,
      },
    });
  } catch (error) {
    logger.logError(error, { function: 'createPaymentLink', message: 'Error creating payment link' });
    res.status(500).json({
      success: false,
      message: 'Failed to create payment link',
      error: error.message,
    });
  }
};
```

### Fix 2: Update `verifyPayment` Function

**File**: `controllers/billingController.js`

```javascript
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bill_id } = req.body;
    
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !bill_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment verification parameters',
      });
    }

    // CRITICAL FIX: Convert bill_id to integer (Prisma expects integer)
    const billIdInt = parseInt(bill_id, 10);
    if (isNaN(billIdInt)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bill_id format. Must be a valid integer.',
      });
    }

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;
    if (!isAuthentic) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature',
      });
    }

    // Check if payment was already processed
    const paymentExists = await BillingDB.checkPaymentProcessed(razorpay_payment_id);
    if (paymentExists) {
      return res.json({
        success: true,
        message: 'Payment already processed',
        data: {
          payment_id: razorpay_payment_id,
          bill_id: billIdInt,
          order_id: razorpay_order_id,
        }
      });
    }

    // Get payment details from Razorpay
    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    // CRITICAL FIX: Get bill using integer ID
    const bill = await BillingDB.getBillById(billIdInt);
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: `Bill with id ${billIdInt} not found in database`,
        error: `The bill with id ${billIdInt} may not exist in the database. Please ensure the bill exists before payment verification.`
      });
    }

    // CRITICAL FIX: Verify order_id matches
    if (bill.orderId && bill.orderId !== razorpay_order_id) {
      console.warn(`⚠️ Order ID mismatch: Bill has ${bill.orderId}, payment has ${razorpay_order_id}`);
      // Update bill with correct order_id
      await BillingDB.updateBillOrderId(billIdInt, razorpay_order_id);
    } else if (!bill.orderId) {
      // CRITICAL FIX: If order_id not in bill, save it now
      await BillingDB.updateBillOrderId(billIdInt, razorpay_order_id);
    }

    if (payment.status === 'captured') {
      const billAmount = parseFloat(bill.totalAmount);
      const paidAmount = parseFloat(payment.amount) / 100; // Convert from paise to rupees
      const updatedPaidAmount = parseFloat(bill.paidAmount || 0) + paidAmount;

      // Check if this is a test payment (₹1.00)
      const isTestPayment = paidAmount === 1.0;

      let status;
      let updatedDueAmount;

      if (isTestPayment) {
        status = 'VERIFIED';
        updatedDueAmount = 0;
      } else {
        updatedDueAmount = Math.max(0, billAmount - updatedPaidAmount);
        status = updatedDueAmount > 0 ? 'GENERATED' : 'VERIFIED';
      }

      // CRITICAL FIX: Update bill status and order_id
      await BillingDB.updateBillPaymentStatus(billIdInt, {
        amount: billAmount,
        paidAmount: updatedPaidAmount,
        status: status,
        order_id: razorpay_order_id, // Ensure order_id is saved
      });

      // CRITICAL FIX: Record payment transaction with order_id
      const paymentRecord = await BillingDB.recordPayment({
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id, // CRITICAL: Include order_id
        billId: billIdInt, // Use integer
        amount: paidAmount,
        paymentMode: 'UPI',
        paymentStatus: 'SUCCESS',
        gatewayResponse: payment,
        receiptNumber: razorpay_payment_id,
      });

      // CRITICAL FIX: Verify payment was saved
      if (!paymentRecord) {
        console.error('❌ Payment record was not created in database');
        return res.status(500).json({
          success: false,
          message: 'Payment verification succeeded but failed to save payment record',
        });
      }

      return res.json({
        success: true,
        message: isTestPayment
          ? 'Test payment verified and processed successfully'
          : 'Payment verified and processed successfully',
        data: {
          payment_id: razorpay_payment_id,
          order_id: razorpay_order_id,
          bill_id: billIdInt,
          amount_paid: paidAmount,
          remaining_amount: updatedDueAmount,
          bill_status: status,
          is_test_payment: isTestPayment,
          payment_saved: true,
        },
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Payment not captured',
    });
  } catch (error) {
    logger.logError(error, { function: 'verifyPayment', message: 'Error verifying payment' });
    
    // CRITICAL FIX: Better error messages
    if (error.message && error.message.includes('findUnique')) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found in database',
        error: 'The bill with the provided id may not exist. Please ensure the bill exists before payment verification.',
        details: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment',
      error: error.message,
    });
  }
};
```

### Fix 3: Update BillingDB Model Functions

**File**: `models/BillingDB.js`

#### Add `updateBillOrderId` function:

```javascript
/**
 * Update order_id in bills table
 * CRITICAL: This ensures order_id is saved in bills table
 */
static async updateBillOrderId(billId, orderId) {
  try {
    const bill = await prisma.bills.update({
      where: { id: parseInt(billId, 10) }, // CRITICAL: Convert to integer
      data: {
        orderId: orderId,
        updatedAt: new Date(),
      },
    });
    
    console.log('✅ Updated bill order_id:', {
      billId: billId,
      orderId: orderId,
      billNumber: bill.billNumber
    });
    
    return bill;
  } catch (error) {
    console.error('❌ Error updating bill order_id:', error);
    throw error;
  }
}
```

#### Update `getBillById` function:

```javascript
/**
 * Get bill by ID
 * CRITICAL: Ensure ID is converted to integer for Prisma
 */
static async getBillById(billId) {
  try {
    // CRITICAL FIX: Convert to integer
    const billIdInt = parseInt(billId, 10);
    if (isNaN(billIdInt)) {
      throw new Error(`Invalid bill ID format: ${billId}`);
    }

    const bill = await prisma.bills.findUnique({
      where: { id: billIdInt }, // Use integer
      include: {
        consumers: {
          include: {
            locations: true,
          },
        },
        meters: true,
      },
    });

    if (!bill) {
      console.warn(`⚠️ Bill not found with id: ${billIdInt}`);
      return null;
    }

    return bill;
  } catch (error) {
    console.error('❌ Error fetching bill by ID:', error);
    throw error;
  }
}
```

#### Update `updatePaymentLink` function:

```javascript
/**
 * Update payment link and order_id in bills table
 * CRITICAL: This MUST save order_id in bills table
 */
static async updatePaymentLink(billId, paymentLink, orderId) {
  try {
    // CRITICAL FIX: Convert to integer
    const billIdInt = parseInt(billId, 10);
    if (isNaN(billIdInt)) {
      throw new Error(`Invalid bill ID format: ${billId}`);
    }

    const bill = await prisma.bills.update({
      where: { id: billIdInt }, // Use integer
      data: {
        paymentLink: paymentLink,
        orderId: orderId, // CRITICAL: Save order_id
        updatedAt: new Date(),
      },
    });

    console.log('✅ Updated payment link and order_id:', {
      billId: billIdInt,
      orderId: orderId,
      paymentLink: paymentLink
    });

    return bill;
  } catch (error) {
    console.error('❌ Error updating payment link:', error);
    throw error;
  }
}
```

#### Update `recordPayment` function:

```javascript
/**
 * Record payment in payments table
 * CRITICAL: Must include order_id and bill_id
 */
static async recordPayment(paymentData) {
  try {
    // CRITICAL FIX: Convert billId to integer
    const billIdInt = paymentData.billId ? parseInt(paymentData.billId, 10) : null;
    if (paymentData.billId && isNaN(billIdInt)) {
      throw new Error(`Invalid bill ID format: ${paymentData.billId}`);
    }

    const payment = await prisma.payments.create({
      data: {
        paymentId: paymentData.paymentId,
        orderId: paymentData.orderId, // CRITICAL: Include order_id
        billId: billIdInt, // Use integer
        amount: paymentData.amount,
        paymentMode: paymentData.paymentMode || 'UPI',
        paymentStatus: paymentData.paymentStatus || 'SUCCESS',
        gatewayResponse: paymentData.gatewayResponse || {},
        receiptNumber: paymentData.receiptNumber || paymentData.paymentId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log('✅ Payment record created:', {
      paymentId: payment.paymentId,
      orderId: payment.orderId,
      billId: payment.billId,
      amount: payment.amount
    });

    return payment;
  } catch (error) {
    console.error('❌ Error recording payment:', error);
    throw error;
  }
}
```

## Database Schema Requirements

### Bills Table
```sql
ALTER TABLE bills 
ADD COLUMN IF NOT EXISTS order_id VARCHAR(255) NULL;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bills_order_id ON bills(order_id);
CREATE INDEX IF NOT EXISTS idx_bills_id ON bills(id);
```

### Payments Table
```sql
-- Ensure payments table has these columns:
-- payment_id VARCHAR(255) PRIMARY KEY
-- order_id VARCHAR(255) NOT NULL
-- bill_id INTEGER NOT NULL
-- amount DECIMAL(10,2) NOT NULL
-- payment_mode VARCHAR(50)
-- payment_status VARCHAR(50)
-- gateway_response JSONB
-- receipt_number VARCHAR(255)
-- created_at TIMESTAMP
-- updated_at TIMESTAMP

-- Foreign key relationships
ALTER TABLE payments 
ADD CONSTRAINT fk_payments_bill 
FOREIGN KEY (bill_id) REFERENCES bills(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_bill_id ON payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_id ON payments(payment_id);
```

## Testing Checklist

- [ ] Order creation saves order_id in bills table
- [ ] Payment verification converts bill_id string to integer
- [ ] Payment verification finds bill using integer ID
- [ ] Payment record is created in payments table
- [ ] Payment record includes order_id
- [ ] Payment record includes bill_id (integer)
- [ ] Payment is linked to bill correctly
- [ ] No Prisma type errors
- [ ] No "bill not found" errors

## Summary

**Key Fixes:**
1. ✅ Convert `bill_id` from string to integer before Prisma queries
2. ✅ Save `order_id` in bills table during order creation
3. ✅ Save `order_id` in payments table during payment recording
4. ✅ Update `getBillById` to handle integer conversion
5. ✅ Update `updatePaymentLink` to save order_id
6. ✅ Update `recordPayment` to include order_id and integer bill_id
7. ✅ Add proper error handling for missing bills

**Database Updates:**
- Ensure bills table has `order_id` column
- Ensure payments table has `order_id` and `bill_id` columns
- Add proper indexes for performance

