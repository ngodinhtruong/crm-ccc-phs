"use client";
import { getErrorMessage } from "@/utils/error.util";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { authService } from "@/services/auth.service";
import { saleAdminService } from "@/services/sale-admin.service";
import {
  SaCallResult,
  SaIcpGroup,
  SaInterestLevel,
  SaRecordCreateFormState,
  SaCustomerAccountSuggestion,
  SaRecordItem,
  SaRecordUpdatePayload,
  SaSelectOption,
} from "@/types/sale-admin.type";

function toDateInputValue(value?: string | null) {
  if (!value) return "";

  return value.slice(0, 10);
}

const initialForm: SaRecordCreateFormState = {
  accountNo: "",
  customerNameSnapshot: "",
  branchNameSnapshot: "",
  picNameSnapshot: "",
  accountStatus: "",
  vipClassification: "",

  customerAccount: "",
  customer: "",
  company: "",
  branch: "",
  accountSelected: false,

  callDate: "",
  followNo: "1",

  callResult: "",
  interestLevel: "",
  icpGroup: "",

  introducedProduct: false,
  reactivation: false,
  supportInfo: false,
  referredRm: false,

  handoverToBroker: false,
  brokerHandoverNote: "",

  transactionValueSnapshot: "0",
  transactionFeeSnapshot: "0",

  note: "",

};

function mapRecordToForm(item: SaRecordItem): SaRecordCreateFormState {
  return {
    accountNo: item.account_no || "",
    customerNameSnapshot:
      item.customer_name_snapshot || item.customer_name || "",
    branchNameSnapshot:
      item.branch_name_snapshot || item.branch_name || "",
    picNameSnapshot:
      item.pic_name_snapshot ||
      item.pic_user_name ||
      item.pic_employee_name ||
      "",
    accountStatus: item.account_status || "",
    vipClassification: item.vip_classification || "",

    customerAccount: item.customer_account ? String(item.customer_account) : "",
    customer: item.customer ? String(item.customer) : "",
    company: item.company ? String(item.company) : "",
    branch: item.branch ? String(item.branch) : "",
    accountSelected: Boolean(item.customer_account || item.account_no),

    callDate: toDateInputValue(item.call_date),
    followNo: String(item.follow_no || 1),

    callResult: item.call_result ? String(item.call_result) : "",
    interestLevel: item.interest_level ? String(item.interest_level) : "",
    icpGroup: item.icp_group ? String(item.icp_group) : "",

    introducedProduct: Boolean(item.introduced_product),
    reactivation: Boolean(item.reactivation),
    supportInfo: Boolean(item.support_info),
    referredRm: Boolean(item.referred_rm),

    handoverToBroker: Boolean(item.handover_to_broker),
    brokerHandoverNote: item.broker_handover_note || "",

    transactionValueSnapshot: item.transaction_value_snapshot || "0",
    transactionFeeSnapshot: item.transaction_fee_snapshot || "0",

    note: item.note || "",

  };
}

export function useSaRecordEdit(recordId: string) {
  const router = useRouter();

  const [record, setRecord] = useState<SaRecordItem | null>(null);
  const [form, setForm] = useState<SaRecordCreateFormState>(initialForm);

  const [callResults, setCallResults] = useState<SaCallResult[]>([]);
  const [interestLevels, setInterestLevels] = useState<SaInterestLevel[]>([]);
  const [icpGroups, setIcpGroups] = useState<SaIcpGroup[]>([]);
  const [accountStatusOptions, setAccountStatusOptions] = useState<SaSelectOption[]>([]);
  const [vipClassificationOptions, setVipClassificationOptions] = useState<SaSelectOption[]>([]);

  const [loadingRecord, setLoadingRecord] = useState(true);
  const [loadingMaster, setLoadingMaster] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [masterError, setMasterError] = useState("");

  const setField = <K extends keyof SaRecordCreateFormState>(
    key: K,
    value: SaRecordCreateFormState[K]
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const loadMasterData = async () => {
    try {
      setLoadingMaster(true);
      setMasterError("");

      const [
        callResultData,
        interestLevelData,
        icpGroupData,
        accountStatusData,
        vipClassificationData,
      ] = await Promise.all([
        saleAdminService.getCallResults(),
        saleAdminService.getInterestLevels(),
        saleAdminService.getIcpGroups(),
        saleAdminService.getAccountStatusOptions(),
        saleAdminService.getVipClassificationOptions(),
      ]);

      setCallResults(callResultData);
      setInterestLevels(interestLevelData);
      setIcpGroups(icpGroupData);
      setAccountStatusOptions(accountStatusData);
      setVipClassificationOptions(vipClassificationData);
    } catch (err) {
      setMasterError(
        getErrorMessage(err, "Không tải được master data SA Record")
      );
    } finally {
      setLoadingMaster(false);
    }
  };

  const loadRecord = async () => {
    if (!recordId) return;

    try {
      setLoadingRecord(true);
      setError("");

      const data = await saleAdminService.getSaRecord(recordId);

      setRecord(data);
      setForm(mapRecordToForm(data));
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được SA Record"));
    } finally {
      setLoadingRecord(false);
    }
  };

  const validate = () => {
    if (!form.accountNo.trim()) {
      return "Vui lòng nhập số tài khoản lưu ký.";
    }

    if (!form.callDate) {
      return "Vui lòng chọn ngày gọi.";
    }

    if (!form.callResult) {
      return "Vui lòng chọn kết quả cuộc gọi.";
    }

    if (Number(form.followNo || 0) < 1) {
      return "Lần follow phải lớn hơn hoặc bằng 1.";
    }

    if (
      form.transactionValueSnapshot &&
      Number(form.transactionValueSnapshot) < 0
    ) {
      return "Tổng giá trị giao dịch không được âm.";
    }

    if (
      form.transactionFeeSnapshot &&
      Number(form.transactionFeeSnapshot) < 0
    ) {
      return "Phí giao dịch không được âm.";
    }

    return "";
  };

  const buildPayload = (): SaRecordUpdatePayload => {
    return {
      account_no: form.accountNo.trim(),

      customer_name_snapshot: form.customerNameSnapshot.trim(),
      branch_name_snapshot: form.branchNameSnapshot.trim(),
      pic_name_snapshot: form.picNameSnapshot.trim(),
      account_status: form.accountStatus.trim(),
      vip_classification: form.vipClassification.trim(),

      call_date: form.callDate,
      follow_no: Number(form.followNo || 1),

      call_result: Number(form.callResult),
      interest_level: form.interestLevel ? Number(form.interestLevel) : null,
      icp_group: form.icpGroup ? Number(form.icpGroup) : null,

      introduced_product: form.introducedProduct,
      reactivation: form.reactivation,
      support_info: form.supportInfo,
      referred_rm: form.referredRm,

      handover_to_broker: form.handoverToBroker,
      broker_handover_note: form.brokerHandoverNote.trim(),

      transaction_value_snapshot: form.transactionValueSnapshot || "0",
      transaction_fee_snapshot: form.transactionFeeSnapshot || "0",

      note: form.note.trim(),

      source_system: record?.source_system || "CRM_MINI",
      data_status: record?.data_status || "VALID",

    };
  };

  const submit = async () => {
    const message = validate();

    if (message) {
      setError(message);
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      await saleAdminService.updateSaRecord(recordId, buildPayload());

      router.push(`/sale-admin/records/${recordId}`);
    } catch (err) {
      setError(getErrorMessage(err, "Không cập nhật được SA Record"));
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = () => {
    router.push(`/sale-admin/records/${recordId}`);
  };

  const handleAccountNoChange = (value: string) => {
    setField(
      "accountNo",
      String(value || "")
        .replace(/\s+/g, "")
        .toUpperCase()
    );
  };

  const selectCustomerAccountSuggestion = (_account: SaCustomerAccountSuggestion) => {
    // Edit mode không dùng autocomplete đổi tài khoản. Giữ hàm này để dùng chung form controller.
  };

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/login");
      return;
    }

    void loadMasterData();
    void loadRecord();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, recordId]);

  return {
    record,

    form,
    setField,

    callResults,
    interestLevels,
    icpGroups,
    accountStatusOptions,
    vipClassificationOptions,

    accountSuggestions: [],
    accountSuggestionLoading: false,
    accountSuggestionError: "",
    accountDropdownOpen: false,
    setAccountDropdownOpen: () => undefined,
    handleAccountNoChange,
    selectCustomerAccountSuggestion,

    loadingRecord,
    loadingMaster,
    submitting,

    error,
    masterError,

    submit,
    cancel,
  };
}