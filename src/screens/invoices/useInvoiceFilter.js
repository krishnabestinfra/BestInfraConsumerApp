/**
 * Hook for invoice filter state (status filter and filter modal).
 * Keeps Invoices screen lean and allows reuse.
 * For prepaid: shows Successful/Failed. For postpaid: shows Paid/Unpaid.
 */
import { useState, useCallback, useMemo } from 'react';
import { INVOICE_FILTERS, PREPAID_INVOICE_FILTERS } from './invoiceConstants';

const DEFAULT_FILTER = 'all';

export function useInvoiceFilter(isPrepaid = false) {
  const [statusFilter, setStatusFilter] = useState(DEFAULT_FILTER);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [pendingStatusFilter, setPendingStatusFilter] = useState(DEFAULT_FILTER);

  const filterOptions = useMemo(
    () => (isPrepaid ? PREPAID_INVOICE_FILTERS : INVOICE_FILTERS),
    [isPrepaid]
  );

  const applyFilter = useCallback(() => {
    setStatusFilter(pendingStatusFilter);
    setIsFilterModalVisible(false);
  }, [pendingStatusFilter]);

  const openFilterModal = useCallback(() => {
    setPendingStatusFilter(statusFilter);
    setIsFilterModalVisible(true);
  }, [statusFilter]);

  const closeFilterModal = useCallback(() => {
    setIsFilterModalVisible(false);
    setPendingStatusFilter(statusFilter);
  }, [statusFilter]);

  return {
    statusFilter,
    setStatusFilter,
    pendingStatusFilter,
    setPendingStatusFilter,
    isFilterModalVisible,
    setIsFilterModalVisible,
    applyFilter,
    openFilterModal,
    closeFilterModal,
    filterOptions,
  };
}

export default useInvoiceFilter;
