import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from "react";
import { getUser, isLikelyConsumerIdentifier } from "../utils/storage";
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

  const refreshConsumer = useCallback(async ({ force = false, skipDemo = false } = {}) => {
    if (!force && Date.now() - lastFetchedAtRef.current < STALE_THRESHOLD) {
      return;
    }

    // Deduplicate concurrent calls
    if (fetchInFlightRef.current) return fetchInFlightRef.current;

    const promise = (async () => {
      try {
        const user = await getUser();
        if (!user?.identifier) { setIsLoading(false); return; }

        // Admin/backoffice accounts (e.g., NTPL_Admin) are valid auth users
        // but do not map to /consumers/{identifier} resources.
        if (!isLikelyConsumerIdentifier(user.identifier)) {
          setConsumerData({
            name: user?.name || user?.identifier || "User",
            meterSerialNumber: user?.meterSerialNumber || "N/A",
            uniqueIdentificationNo: user?.identifier || "N/A",
            consumerNumber: user?.consumerNumber || null,
            readingDate: new Date().toLocaleString(),
            totalOutstanding: 0,
            dailyConsumption: 0,
            monthlyConsumption: 0,
          });
          setLatestInvoiceDates({ issueDate: null, dueDate: null });
          setIsLoading(false);
          lastFetchedAtRef.current = Date.now();
          return;
        }

        // Stale data guard: if we have consumerData for a different user, clear it immediately
        const currentId = consumerDataRef.current?.uniqueIdentificationNo || consumerDataRef.current?.identifier || consumerDataRef.current?.consumerNumber;
        if (currentId && currentId !== user.identifier) {
          setConsumerData(null);
          setLatestInvoiceDates({ issueDate: null, dueDate: null });
        }

        // Demo mode - skip when skipDemo=true (e.g. prepaid recharge needs real API data)
        if (!skipDemo && isDemoUser(user.identifier)) {
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

        // Fetch consumer first so dashboard can render quickly.
        const result = await apiClient.getConsumerData(user.identifier);

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

        lastFetchedAtRef.current = Date.now();
        setIsLoading(false);

        // Billing is not critical for first paint; fetch it in background.
        fetchBillingHistory(user.identifier)
          .then((billingResult) => {
            if (billingResult.success && billingResult.data) {
              setLatestInvoiceDates(getLatestInvoiceDates(billingResult.data));
            } else {
              setLatestInvoiceDates({ issueDate: null, dueDate: null });
            }
          })
          .catch(() => {
            setLatestInvoiceDates({ issueDate: null, dueDate: null });
          });
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

  const value = useMemo(
    () => ({
      consumerData,
      latestInvoiceDates,
      isConsumerLoading: isLoading,
      refreshConsumer,
      clearConsumer,
    }),
    [consumerData, latestInvoiceDates, isLoading, refreshConsumer, clearConsumer]
  );

  return (
    <ConsumerContext.Provider value={value}>
      {children}
    </ConsumerContext.Provider>
  );
}

export function useConsumer() {
  const ctx = useContext(ConsumerContext);
  if (!ctx) throw new Error("useConsumer must be used within <ConsumerProvider>");
  return ctx;
}
