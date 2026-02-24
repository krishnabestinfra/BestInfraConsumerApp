/**
 * Hook for invoice filter state (status filter and filter modal).
 * Keeps Invoices screen lean and allows reuse.
 */
import { useState, useCallback } from 'react';
import { INVOICE_FILTERS } from './invoiceConstants';

const DEFAULT_FILTER = 'all';

export function useInvoiceFilter() {
  const [statusFilter, setStatusFilter] = useState(DEFAULT_FILTER);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [pendingStatusFilter, setPendingStatusFilter] = useState(DEFAULT_FILTER);

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
    filterOptions: INVOICE_FILTERS,
  };
}

export default useInvoiceFilter;
