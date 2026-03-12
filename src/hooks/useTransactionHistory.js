/**
 * Shared hook for fetching transaction history (prepaid recharge or postpaid payments).
 * Used by Invoices (prepaid section) and Transactions screens.
 */
import { useState, useCallback } from "react";
import { getUser } from "../utils/storage";
import { API_ENDPOINTS } from "../constants/constants";
import { apiClient } from "../services/apiClient";
import { formatFrontendDate } from "../utils/dateUtils";
import { isPrepaidConsumer } from "../utils/billingUtils";
import { info, warn, error as logError } from "../utils/logger";

/**
 * Transform raw payment/transaction data to table/card format
 */
export const transformTransactionData = (paymentHistory, isPrepaid) => {
  if (!Array.isArray(paymentHistory) || paymentHistory.length === 0) return [];

  const transformed = paymentHistory.map((payment, index) => {
    const rawAmount = payment.amount ?? payment.creditAmount ?? payment.paymentAmount ?? payment.totalAmount ?? 0;
    const amount = typeof rawAmount === "number" ? rawAmount : parseFloat(rawAmount) || 0;
    const date = payment.paymentDate || payment.date || payment.createdAt || payment.transactionDate || "N/A";
    const transactionId = payment.transactionId || payment.paymentId || payment.razorpay_payment_id || payment.id || `TXN${index + 1}`;
    const paymentMode = payment.transactionType || payment.paymentMode || payment.payment_method || payment.method || (isPrepaid ? "Recharge" : "UPI");
    const status = payment.status || (amount > 0 ? "Success" : "Failed");
    const formattedDate = date !== "N/A" && date ? (formatFrontendDate(date) || date) : date;

    return {
      id: index + 1,
      transactionId,
      date: formattedDate,
      rawDate: date,
      amount,
      amountFormatted: amount ? `₹${parseFloat(amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "₹0.00",
      paymentMode,
      status,
      description: payment.description || "",
      _raw: payment,
    };
  });

  transformed.sort((a, b) => {
    const dateA = new Date(a.rawDate);
    const dateB = new Date(b.rawDate);
    return dateB - dateA;
  });

  return transformed;
};

/**
 * Fetch transaction history (prepaid or postpaid)
 */
export const fetchTransactionHistory = async (user, isPrepaid, consumerData, forceRefresh = false) => {
  let paymentHistory = [];

  if (isPrepaid) {
    const prepaidTxns = forceRefresh ? null : consumerData?.prepaidTransactions?.transactions;
    if (Array.isArray(prepaidTxns) && prepaidTxns.length > 0) {
      paymentHistory = prepaidTxns;
      if (__DEV__) info("useTransactionHistory", "Using prepaid transactions from consumer context");
    }
    if (paymentHistory.length === 0) {
      try {
        const consumerResult = await apiClient.request(API_ENDPOINTS.consumers.get(user.identifier), { method: "GET" });
        if (consumerResult.success) {
          const cd = consumerResult.data ?? consumerResult.rawBody ?? consumerResult;
          const prepaid = cd?.prepaidTransactions?.transactions;
          if (Array.isArray(prepaid) && prepaid.length > 0) {
            paymentHistory = prepaid;
            if (__DEV__) info("useTransactionHistory", "Prepaid transactions from consumer API");
          }
        }
      } catch (consumerError) {
        logError("useTransactionHistory", "Error fetching prepaid transactions", consumerError?.message);
      }
    }
  } else {
    try {
      const paymentHistoryUrl = API_ENDPOINTS.payment.history(user.identifier);
      info("useTransactionHistory", "Fetching payment history");
      const paymentResult = await apiClient.request(paymentHistoryUrl, { method: "GET" });
      if (paymentResult.success) {
        const paymentData = paymentResult.data ?? paymentResult.rawBody ?? paymentResult;
        if (paymentData?.success && paymentData?.data) {
          if (Array.isArray(paymentData.data)) paymentHistory = paymentData.data;
          else if (Array.isArray(paymentData.data.payments)) paymentHistory = paymentData.data.payments;
          else if (Array.isArray(paymentData.data.paymentHistory)) paymentHistory = paymentData.data.paymentHistory;
          else if (Array.isArray(paymentData.data.transactions)) paymentHistory = paymentData.data.transactions;
        } else if (Array.isArray(paymentData)) {
          paymentHistory = paymentData;
        }
      }
    } catch (paymentError) {
      warn("useTransactionHistory", "Payment history endpoint failed, trying consumer endpoint", paymentError?.message);
    }

    if (paymentHistory.length === 0) {
      try {
        const consumerResult = await apiClient.request(API_ENDPOINTS.consumers.get(user.identifier), { method: "GET" });
        if (consumerResult.success) {
          const consumerDataRes = consumerResult.data ?? consumerResult.rawBody ?? consumerResult;
          if (consumerDataRes?.success && consumerDataRes?.data) {
            if (Array.isArray(consumerDataRes.data.paymentHistory)) paymentHistory = consumerDataRes.data.paymentHistory;
            else if (Array.isArray(consumerDataRes.data.payments)) paymentHistory = consumerDataRes.data.payments;
            else if (Array.isArray(consumerDataRes.data.transactions)) paymentHistory = consumerDataRes.data.transactions;
            else if (consumerDataRes.data.billing && Array.isArray(consumerDataRes.data.billing.paymentHistory)) {
              paymentHistory = consumerDataRes.data.billing.paymentHistory;
            }
          }
        }
      } catch (consumerError) {
        logError("useTransactionHistory", "Error fetching from consumer endpoint", consumerError?.message);
      }
    }
  }

  return paymentHistory;
};

/**
 * Hook: useTransactionHistory
 * Returns { transactions, isLoading, fetchTransactions, refresh }
 */
export const useTransactionHistory = (consumerData) => {
  const isPrepaid = isPrepaidConsumer(consumerData);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTransactions = useCallback(
    async (forceRefresh = false) => {
      try {
        setIsLoading(true);
        const user = await getUser();
        if (!user || !user.identifier) {
          setTransactions([]);
          return;
        }

        const paymentHistory = await fetchTransactionHistory(user, isPrepaid, consumerData, forceRefresh);
        const transformed = transformTransactionData(paymentHistory, isPrepaid);
        setTransactions(transformed);
      } catch (error) {
        console.error("❌ Error fetching transaction history:", error);
        setTransactions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [isPrepaid, consumerData]
  );

  const refresh = useCallback(async () => {
    await fetchTransactions(true);
  }, [fetchTransactions]);

  return { transactions, isLoading, fetchTransactions, refresh, isPrepaid };
};
