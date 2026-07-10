"use client";

import { useEffect, useMemo, useState } from "react";

import { useDebounce } from "@/hooks/useDebounce";
import { saleAdminService } from "@/services/sale-admin.service";
import {
  SaCallResult,
  SaIcpGroup,
  SaInterestLevel,
  SaRecordItem,
  SaRecordListParams,
} from "@/types/sale-admin.type";

function getErrorMessage(err: unknown, fallback: string) {
  const error = err as {
    response?: {
      status?: number;
      data?: unknown;
    };
    message?: string;
  };

  const status = error?.response?.status || "unknown";
  const detail = error?.response?.data
    ? JSON.stringify(error.response.data)
    : error?.message;

  return `${fallback}. Status: ${status} - ${detail}`;
}

export function useSaRecords() {
  const [items, setItems] = useState<SaRecordItem[]>([]);
  const [count, setCount] = useState(0);
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const fromRecord = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const toRecord = Math.min(page * PAGE_SIZE, count);

  const [callResults, setCallResults] = useState<SaCallResult[]>([]);
  const [icpGroups, setIcpGroups] = useState<SaIcpGroup[]>([]);
  const [interestLevels, setInterestLevels] = useState<SaInterestLevel[]>([]);

  const [recordCode, setRecordCode] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [accountStatus, setAccountStatus] = useState("");
  const [vipClassification, setVipClassification] = useState("");
  const [pic, setPic] = useState("");
  const [followNo, setFollowNo] = useState("");

  const [callResult, setCallResult] = useState("");
  const [interestLevel, setInterestLevel] = useState("");
  const [icpGroup, setIcpGroup] = useState("");

  const [introducedProduct, setIntroducedProduct] = useState("");
  const [reactivation, setReactivation] = useState("");
  const [supportInfo, setSupportInfo] = useState("");
  const [handoverToBroker, setHandoverToBroker] = useState("");

  const [transactionValueMin, setTransactionValueMin] = useState("");
  const [transactionValueMax, setTransactionValueMax] = useState("");
  const [transactionFeeMin, setTransactionFeeMin] = useState("");
  const [transactionFeeMax, setTransactionFeeMax] = useState("");

  const [note, setNote] = useState("");

  const [callDateFrom, setCallDateFrom] = useState("");
  const [callDateTo, setCallDateTo] = useState("");

  const [loading, setLoading] = useState(true);
  const [masterLoading, setMasterLoading] = useState(true);
  const [error, setError] = useState("");
  const [masterError, setMasterError] = useState("");

  const textFilters = useMemo<SaRecordListParams>(
    () => ({
      record_code: recordCode,
      account_no: accountNo,
      customer_name: customerName,
      branch_name: branchName,
      account_status: accountStatus,
      vip_classification: vipClassification,
      pic,
      follow_no: followNo,
      transaction_value_min: transactionValueMin,
      transaction_value_max: transactionValueMax,
      transaction_fee_min: transactionFeeMin,
      transaction_fee_max: transactionFeeMax,
      note,
    }),
    [
      recordCode,
      accountNo,
      customerName,
      branchName,
      accountStatus,
      vipClassification,
      pic,
      followNo,
      transactionValueMin,
      transactionValueMax,
      transactionFeeMin,
      transactionFeeMax,
      note,
    ]
  );

  const debouncedTextFilters = useDebounce(textFilters, 500);

  const buildParams = (
    customParams?: Partial<SaRecordListParams>,
    pageValue = page
  ): SaRecordListParams => ({
    ...debouncedTextFilters,

    page: String(pageValue),

    call_result: callResult,
    interest_level: interestLevel,
    icp_group: icpGroup,

    introduced_product: introducedProduct,
    reactivation,
    support_info: supportInfo,
    handover_to_broker: handoverToBroker,

    call_date_from: callDateFrom,
    call_date_to: callDateTo,

    ...customParams,
  });

  const loadMasterData = async () => {
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
  };

  const loadRecords = async (
    params?: SaRecordListParams,
    pageValue = page
  ) => {
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
  };

  const goToPage = (nextPage: number) => {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages);

    setPage(safePage);
    void loadRecords(buildParams({ page: String(safePage) }, safePage), safePage);
  };

  const previousPage = () => {
    if (page <= 1) return;
    goToPage(page - 1);
  };

  const nextPage = () => {
    if (page >= totalPages) return;
    goToPage(page + 1);
  };

  const search = () => {
    setPage(1);

    void loadRecords(
      {
        page: "1",

        record_code: recordCode,
        account_no: accountNo,
        customer_name: customerName,
        branch_name: branchName,
        account_status: accountStatus,
        vip_classification: vipClassification,
        pic,
        follow_no: followNo,

        call_result: callResult,
        interest_level: interestLevel,
        icp_group: icpGroup,

        introduced_product: introducedProduct,
        reactivation,
        support_info: supportInfo,
        handover_to_broker: handoverToBroker,

        transaction_value_min: transactionValueMin,
        transaction_value_max: transactionValueMax,
        transaction_fee_min: transactionFeeMin,
        transaction_fee_max: transactionFeeMax,

        note,

        call_date_from: callDateFrom,
        call_date_to: callDateTo,
      },
      1
    );
  };

  const clearFilter = () => {
    setRecordCode("");
    setAccountNo("");
    setCustomerName("");
    setBranchName("");
    setAccountStatus("");
    setVipClassification("");
    setPic("");
    setFollowNo("");

    setCallResult("");
    setInterestLevel("");
    setIcpGroup("");

    setIntroducedProduct("");
    setReactivation("");
    setSupportInfo("");
    setHandoverToBroker("");

    setTransactionValueMin("");
    setTransactionValueMax("");
    setTransactionFeeMin("");
    setTransactionFeeMax("");

    setNote("");

    setCallDateFrom("");
    setCallDateTo("");

    setPage(1);
    
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
  };

  
  

  useEffect(() => {
    void loadMasterData();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadRecords(buildParams({ page: "1" }, 1), 1);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedTextFilters,
    callResult,
    interestLevel,
    icpGroup,
    introducedProduct,
    reactivation,
    supportInfo,
    handoverToBroker,
    callDateFrom,
    callDateTo,
  ]);

  return {
    items,
    count,

    page,
    pageSize: PAGE_SIZE,
    totalPages,
    fromRecord,
    toRecord,
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