"use client";
import { getErrorMessage } from "@/utils/error.util";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useDebounce } from "@/hooks/useDebounce";
import { saleAdminService } from "@/services/sale-admin.service";
import {
  SaCallResult,
  SaIcpGroup,
  SaInterestLevel,
  SaRecordItem,
  SaRecordListParams,
} from "@/types/sale-admin.type";
import { useTablePagination } from "@/hooks/useTablePagination";

export function useSaRecords() {
  const [items, setItems] = useState<SaRecordItem[]>([]);
  const [count, setCount] = useState(0);
  
  const pagination = useTablePagination(count);

  const [callResults, setCallResults] = useState<SaCallResult[]>([]);
  const [icpGroups, setIcpGroups] = useState<SaIcpGroup[]>([]);
  const [interestLevels, setInterestLevels] = useState<SaInterestLevel[]>([]);

  // Grouping all filter states into one object to optimize renders and make reset cleaner
  const [filters, setFilters] = useState({
    recordCode: "",
    accountNo: "",
    customerName: "",
    branchName: "",
    accountStatus: "",
    vipClassification: "",
    pic: "",
    followNo: "",
    callResult: "",
    interestLevel: "",
    icpGroup: "",
    introducedProduct: "",
    reactivation: "",
    supportInfo: "",
    handoverToBroker: "",
    transactionValueMin: "",
    transactionValueMax: "",
    transactionFeeMin: "",
    transactionFeeMax: "",
    note: "",
    callDateFrom: "",
    callDateTo: "",
  });

  // Individual getters for backwards compatibility
  const recordCode = filters.recordCode;
  const accountNo = filters.accountNo;
  const customerName = filters.customerName;
  const branchName = filters.branchName;
  const accountStatus = filters.accountStatus;
  const vipClassification = filters.vipClassification;
  const pic = filters.pic;
  const followNo = filters.followNo;
  const callResult = filters.callResult;
  const interestLevel = filters.interestLevel;
  const icpGroup = filters.icpGroup;
  const introducedProduct = filters.introducedProduct;
  const reactivation = filters.reactivation;
  const supportInfo = filters.supportInfo;
  const handoverToBroker = filters.handoverToBroker;
  const transactionValueMin = filters.transactionValueMin;
  const transactionValueMax = filters.transactionValueMax;
  const transactionFeeMin = filters.transactionFeeMin;
  const transactionFeeMax = filters.transactionFeeMax;
  const note = filters.note;
  const callDateFrom = filters.callDateFrom;
  const callDateTo = filters.callDateTo;

  // Stable individual setters using useCallback for backwards compatibility
  const setRecordCode = useCallback((val: string) => {
    setFilters((prev) => ({ ...prev, recordCode: val }));
  }, []);

  const setAccountNo = useCallback((val: string) => {
    setFilters((prev) => ({ ...prev, accountNo: val }));
  }, []);

  const setCustomerName = useCallback((val: string) => {
    setFilters((prev) => ({ ...prev, customerName: val }));
  }, []);

  const setBranchName = useCallback((val: string) => {
    setFilters((prev) => ({ ...prev, branchName: val }));
  }, []);

  const setAccountStatus = useCallback((val: string) => {
    setFilters((prev) => ({ ...prev, accountStatus: val }));
  }, []);

  const setVipClassification = useCallback((val: string) => {
    setFilters((prev) => ({ ...prev, vipClassification: val }));
  }, []);

  const setPic = useCallback((val: string) => {
    setFilters((prev) => ({ ...prev, pic: val }));
  }, []);

  const setFollowNo = useCallback((val: string) => {
    setFilters((prev) => ({ ...prev, followNo: val }));
  }, []);

  const setCallResult = useCallback((val: string) => {
    setFilters((prev) => ({ ...prev, callResult: val }));
  }, []);

  const setInterestLevel = useCallback((val: string) => {
    setFilters((prev) => ({ ...prev, interestLevel: val }));
  }, []);

  const setIcpGroup = useCallback((val: string) => {
    setFilters((prev) => ({ ...prev, icpGroup: val }));
  }, []);

  const setIntroducedProduct = useCallback((val: string) => {
    setFilters((prev) => ({ ...prev, introducedProduct: val }));
  }, []);

  const setReactivation = useCallback((val: string) => {
    setFilters((prev) => ({ ...prev, reactivation: val }));
  }, []);

  const setSupportInfo = useCallback((val: string) => {
    setFilters((prev) => ({ ...prev, supportInfo: val }));
  }, []);

  const setHandoverToBroker = useCallback((val: string) => {
    setFilters((prev) => ({ ...prev, handoverToBroker: val }));
  }, []);

  const setTransactionValueMin = useCallback((val: string) => {
    setFilters((prev) => ({ ...prev, transactionValueMin: val }));
  }, []);

  const setTransactionValueMax = useCallback((val: string) => {
    setFilters((prev) => ({ ...prev, transactionValueMax: val }));
  }, []);

  const setTransactionFeeMin = useCallback((val: string) => {
    setFilters((prev) => ({ ...prev, transactionFeeMin: val }));
  }, []);

  const setTransactionFeeMax = useCallback((val: string) => {
    setFilters((prev) => ({ ...prev, transactionFeeMax: val }));
  }, []);

  const setNote = useCallback((val: string) => {
    setFilters((prev) => ({ ...prev, note: val }));
  }, []);

  const setCallDateFrom = useCallback((val: string) => {
    setFilters((prev) => ({ ...prev, callDateFrom: val }));
  }, []);

  const setCallDateTo = useCallback((val: string) => {
    setFilters((prev) => ({ ...prev, callDateTo: val }));
  }, []);

  const [loading, setLoading] = useState(true);
  const [masterLoading, setMasterLoading] = useState(true);
  const [error, setError] = useState("");
  const [masterError, setMasterError] = useState("");

  const textFilters = useMemo<SaRecordListParams>(
    () => ({
      record_code: filters.recordCode,
      account_no: filters.accountNo,
      customer_name: filters.customerName,
      branch_name: filters.branchName,
      account_status: filters.accountStatus,
      vip_classification: filters.vipClassification,
      pic: filters.pic,
      follow_no: filters.followNo,
      transaction_value_min: filters.transactionValueMin,
      transaction_value_max: filters.transactionValueMax,
      transaction_fee_min: filters.transactionFeeMin,
      transaction_fee_max: filters.transactionFeeMax,
      note: filters.note,
    }),
    [
      filters.recordCode,
      filters.accountNo,
      filters.customerName,
      filters.branchName,
      filters.accountStatus,
      filters.vipClassification,
      filters.pic,
      filters.followNo,
      filters.transactionValueMin,
      filters.transactionValueMax,
      filters.transactionFeeMin,
      filters.transactionFeeMax,
      filters.note,
    ]
  );

  const debouncedTextFilters = useDebounce(textFilters, 500);

  const buildParams = useCallback(
    (customParams?: Partial<SaRecordListParams>, pageValue = 1): SaRecordListParams => ({
      ...debouncedTextFilters,

      page: String(pageValue),

      call_result: filters.callResult,
      interest_level: filters.interestLevel,
      icp_group: filters.icpGroup,

      introduced_product: filters.introducedProduct,
      reactivation: filters.reactivation,
      support_info: filters.supportInfo,
      handover_to_broker: filters.handoverToBroker,

      call_date_from: filters.callDateFrom,
      call_date_to: filters.callDateTo,

      ...customParams,
    }),
    [debouncedTextFilters, filters]
  );

  const loadMasterData = useCallback(async () => {
    try {
      setMasterLoading(true);
      setMasterError("");

      const [callResultData, icpGroupData, interestLevelData] =
        await Promise.all([
          saleAdminService.getCallResults(),
          saleAdminService.getIcpGroups(),
          saleAdminService.getInterestLevels(),
        ]);

      setCallResults(callResultData);
      setIcpGroups(icpGroupData);
      setInterestLevels(interestLevelData);
    } catch (err) {
      setMasterError(
        getErrorMessage(err, "Không tải được dữ liệu lọc SA Records")
      );
    } finally {
      setMasterLoading(false);
    }
  }, []);

  const loadRecords = useCallback(
    async (params?: SaRecordListParams, pageValue = 1) => {
      try {
        setLoading(true);
        setError("");

        const data = await saleAdminService.getSaRecords(
          params || buildParams({}, pageValue)
        );

        setItems(data.results || []);
        setCount(data.count || 0);
      } catch (err) {
        setError(getErrorMessage(err, "Không tải được danh sách SA Records"));
      } finally {
        setLoading(false);
      }
    },
    [buildParams]
  );

  const goToPage = useCallback(
    (nextPage: number) => {
      const safePage = Math.min(Math.max(nextPage, 1), pagination.totalPages);

      pagination.setPage(safePage);
      void loadRecords(buildParams({ page: String(safePage) }, safePage), safePage);
    },
    [pagination, loadRecords, buildParams]
  );

  const previousPage = useCallback(() => {
    if (pagination.page <= 1) return;
    goToPage(pagination.page - 1);
  }, [pagination.page, goToPage]);

  const nextPage = useCallback(() => {
    if (pagination.page >= pagination.totalPages) return;
    goToPage(pagination.page + 1);
  }, [pagination.page, pagination.totalPages, goToPage]);

  const search = useCallback(() => {
    pagination.resetPage();

    void loadRecords(
      {
        page: "1",

        record_code: filters.recordCode,
        account_no: filters.accountNo,
        customer_name: filters.customerName,
        branch_name: filters.branchName,
        account_status: filters.accountStatus,
        vip_classification: filters.vipClassification,
        pic: filters.pic,
        follow_no: filters.followNo,

        call_result: filters.callResult,
        interest_level: filters.interestLevel,
        icp_group: filters.icpGroup,

        introduced_product: filters.introducedProduct,
        reactivation: filters.reactivation,
        support_info: filters.supportInfo,
        handover_to_broker: filters.handoverToBroker,

        transaction_value_min: filters.transactionValueMin,
        transaction_value_max: filters.transactionValueMax,
        transaction_fee_min: filters.transactionFeeMin,
        transaction_fee_max: filters.transactionFeeMax,

        note: filters.note,

        call_date_from: filters.callDateFrom,
        call_date_to: filters.callDateTo,
      },
      1
    );
  }, [pagination, loadRecords, filters]);

  const clearFilter = useCallback(() => {
    setFilters({
      recordCode: "",
      accountNo: "",
      customerName: "",
      branchName: "",
      accountStatus: "",
      vipClassification: "",
      pic: "",
      followNo: "",
      callResult: "",
      interestLevel: "",
      icpGroup: "",
      introducedProduct: "",
      reactivation: "",
      supportInfo: "",
      handoverToBroker: "",
      transactionValueMin: "",
      transactionValueMax: "",
      transactionFeeMin: "",
      transactionFeeMax: "",
      note: "",
      callDateFrom: "",
      callDateTo: "",
    });

    pagination.resetPage();
    
    void loadRecords({
      record_code: "",
      account_no: "",
      customer_name: "",
      branch_name: "",
      account_status: "",
      vip_classification: "",
      pic: "",
      follow_no: "",

      call_result: "",
      interest_level: "",
      icp_group: "",

      introduced_product: "",
      reactivation: "",
      support_info: "",
      handover_to_broker: "",

      transaction_value_min: "",
      transaction_value_max: "",
      transaction_fee_min: "",
      transaction_fee_max: "",

      note: "",

      call_date_from: "",
      call_date_to: "",
    });
  }, [pagination, loadRecords]);

  useEffect(() => {
    void loadMasterData();
  }, [loadMasterData]);

  useEffect(() => {
    void loadRecords(buildParams({ page: "1" }, 1), 1);
  }, [
    debouncedTextFilters,
    filters.callResult,
    filters.interestLevel,
    filters.icpGroup,
    filters.introducedProduct,
    filters.reactivation,
    filters.supportInfo,
    filters.handoverToBroker,
    filters.callDateFrom,
    filters.callDateTo,
    loadRecords,
    buildParams,
  ]);

  return {
    items,
    count,

    page: pagination.page,
    pageSize: pagination.pageSize,
    totalPages: pagination.totalPages,
    fromRecord: pagination.fromRecord,
    toRecord: pagination.toRecord,
    previousPage,
    nextPage,
    goToPage,

    callResults,
    icpGroups,
    interestLevels,

    recordCode,
    setRecordCode,

    accountNo,
    setAccountNo,

    customerName,
    setCustomerName,

    branchName,
    setBranchName,

    accountStatus,
    setAccountStatus,

    vipClassification,
    setVipClassification,

    pic,
    setPic,

    followNo,
    setFollowNo,

    callResult,
    setCallResult,

    interestLevel,
    setInterestLevel,

    icpGroup,
    setIcpGroup,

    introducedProduct,
    setIntroducedProduct,

    reactivation,
    setReactivation,

    supportInfo,
    setSupportInfo,

    handoverToBroker,
    setHandoverToBroker,

    transactionValueMin,
    setTransactionValueMin,

    transactionValueMax,
    setTransactionValueMax,

    transactionFeeMin,
    setTransactionFeeMin,

    transactionFeeMax,
    setTransactionFeeMax,

    note,
    setNote,

    callDateFrom,
    setCallDateFrom,

    callDateTo,
    setCallDateTo,

    loading,
    masterLoading,
    error,
    masterError,

    search,
    clearFilter,
    reload: loadRecords,
  };
}