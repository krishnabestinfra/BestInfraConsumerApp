import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { getUser } from "../utils/storage";
import { apiClient } from "../services/apiClient";
import { getCachedConsumerData } from "../utils/cacheManager";
import { fetchBillingHistory } from "../services/apiService";
import { isDemoUser, getDemoDashboardConsumerData, DEMO_INVOICES } from "../constants/demoData";
import { getLatestInvoiceDates } from "../utils/billingUtils";

const STALE_THRESHOLD = 120_000; // 2 minutes — skip refresh if fetched recently

const ConsumerContext = createContext(null);

export function ConsumerProvider({ children }) {
  const [consumerData, setConsumerData] = useState(null);
  const [latestInvoiceDates, setLatestInvoiceDates] = useState({ issueDate: null, dueDate: null });
  const [isLoading, setIsLoading] = useState(true);
  const lastFetchedAtRef = useRef(0);
  const fetchInFlightRef = useRef(null);
  const consumerDataRef = useRef(consumerData);
  consumerDataRef.current = consumerData;

  const refreshConsumer = useCallback(async ({ force = false } = {}) => {
    if (!force && Date.now() - lastFetchedAtRef.current < STALE_THRESHOLD) {
      return;
    }

    // Deduplicate concurrent calls
    if (fetchInFlightRef.current) return fetchInFlightRef.current;

    const promise = (async () => {
      try {
        const user = await getUser();
        if (!user?.identifier) { setIsLoading(false); return; }

        // Demo mode
        if (isDemoUser(user.identifier)) {
          setConsumerData(getDemoDashboardConsumerData(user.identifier));
          setLatestInvoiceDates(getLatestInvoiceDates(DEMO_INVOICES));
          setIsLoading(false);
          lastFetchedAtRef.current = Date.now();
          return;
        }

        // Stale-while-revalidate: show cache instantly, only show skeleton if no cache
        const cachedResult = await getCachedConsumerData(user.identifier);
        if (cachedResult.success && cachedResult.data) {
          setConsumerData(cachedResult.data);
          setIsLoading(false);
        } else {
          setIsLoading(true);
        }

        // Network refresh (always runs, silently updates when cache was shown)
        const [result, billingResult] = await Promise.all([
          apiClient.getConsumerData(user.identifier),
          fetchBillingHistory(user.identifier),
        ]);

        if (result.success) {
          setConsumerData(result.data);
        } else if (!cachedResult.success) {
          setConsumerData({
            name: user?.name || "Consumer",
            meterSerialNumber: user?.meterSerialNumber || "N/A",
            uniqueIdentificationNo: user?.identifier || user?.consumerNumber || "N/A",
            consumerNumber: user?.consumerNumber || user?.identifier || null,
            readingDate: new Date().toLocaleString(),
            totalOutstanding: 0,
            dailyConsumption: 0,
            monthlyConsumption: 0,
          });
        }

        if (billingResult.success && billingResult.data) {
          setLatestInvoiceDates(getLatestInvoiceDates(billingResult.data));
        } else {
          setLatestInvoiceDates({ issueDate: null, dueDate: null });
        }

        lastFetchedAtRef.current = Date.now();
      } catch (error) {
        console.error("ConsumerContext refresh error:", error);
        try {
          const user = await getUser();
          if (!consumerDataRef.current) {
            setConsumerData({
              name: user?.name || "Consumer",
              meterSerialNumber: user?.meterSerialNumber || "N/A",
              uniqueIdentificationNo: user?.identifier || user?.consumerNumber || "N/A",
              consumerNumber: user?.consumerNumber || user?.identifier || null,
              readingDate: new Date().toLocaleString(),
              totalOutstanding: 0,
              dailyConsumption: 0,
              monthlyConsumption: 0,
            });
          }
          setLatestInvoiceDates({ issueDate: null, dueDate: null });
        } catch { /* ignore nested error */ }
      } finally {
        setIsLoading(false);
        fetchInFlightRef.current = null;
      }
    })();

    fetchInFlightRef.current = promise;
    return promise;
  }, []);

  const clearConsumer = useCallback(() => {
    setConsumerData(null);
    setLatestInvoiceDates({ issueDate: null, dueDate: null });
    setIsLoading(true);
    lastFetchedAtRef.current = 0;
  }, []);

  return (
    <ConsumerContext.Provider
      value={{
        consumerData,
        latestInvoiceDates,
        isConsumerLoading: isLoading,
        refreshConsumer,
        clearConsumer,
      }}
    >
      {children}
    </ConsumerContext.Provider>
  );
}

export function useConsumer() {
  const ctx = useContext(ConsumerContext);
  if (!ctx) throw new Error("useConsumer must be used within <ConsumerProvider>");
  return ctx;
}
