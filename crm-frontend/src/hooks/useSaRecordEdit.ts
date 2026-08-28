"use client";
import { masterDataApi } from "@/apis/master-data.api";
import { getErrorMessage } from "@/utils/error.util";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { authService } from "@/services/auth.service";
import { saleAdminService } from "@/services/sale-admin.service";
import {
  SaCallResult,
  SaIcpGroup,
  SaIcpRule,
  SaInterestLevel,
  SaRecordCreateFormState,
  SaCustomerAccountSuggestion,
  SaRecordItem,
  SaRecordUpdatePayload,
  SaSelectOption,
} from "@/types/sale-admin.type";
import { evaluateIcpRule } from "@/utils/icp-rule.util";

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
  brokerEmployee: "",
  brokerUser: "",
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
    introducedProductId: item.introduced_product_obj || (item.introduced_product_obj_detail ? item.introduced_product_obj_detail.id : null),
    introducedProductName: item.introduced_product_name || (item.introduced_product_obj_detail ? item.introduced_product_obj_detail.name : ""),
    reactivation: Boolean(item.reactivation),
    supportInfo: Boolean(item.support_info),
    supportInfoCategoryId: item.support_info_category_obj || (item.support_info_category_obj_detail ? item.support_info_category_obj_detail.id : null),
    supportInfoCategoryName: item.support_info_category_name || (item.support_info_category_obj_detail ? item.support_info_category_obj_detail.name : ""),
    referredRm: Boolean(item.referred_rm),

    handoverToBroker: Boolean(item.handover_to_broker),
    brokerEmployee: item.broker_employee ? String(item.broker_employee) : "",
    brokerUser: item.broker_user ? String(item.broker_user) : "",
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
  const [icpRules, setIcpRules] = useState<SaIcpRule[]>([]);
  const [accountStatusOptions, setAccountStatusOptions] = useState<SaSelectOption[]>([]);
  const [vipClassificationOptions, setVipClassificationOptions] = useState<SaSelectOption[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<SaSelectOption[]>([]);
  const [isInitialRecordLoaded, setIsInitialRecordLoaded] = useState(false);

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
        icpRuleData,
        accountStatusData,
        vipClassificationData,
        employeeData,
      ] = await Promise.all([
        saleAdminService.getCallResults(),
        saleAdminService.getInterestLevels(),
        saleAdminService.getIcpGroups(),
        saleAdminService.getIcpRules().catch(() => []),
        saleAdminService.getAccountStatusOptions(),
        saleAdminService.getVipClassificationOptions(),
        masterDataApi.getEmployees().catch(() => []),
      ]);

      setCallResults(callResultData);
      setInterestLevels(interestLevelData);
      setIcpGroups(icpGroupData);
      setIcpRules(icpRuleData);
      setAccountStatusOptions(accountStatusData);
      setVipClassificationOptions(vipClassificationData);

      const empOpts: SaSelectOption[] = (employeeData || []).map((emp: any) => ({
        value: String(emp.id),
        label: `${emp.full_name || emp.employee_code}${emp.branch_name ? ` (${emp.branch_name})` : ""}`,
      }));
      setEmployeeOptions(empOpts);
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
      setIsInitialRecordLoaded(true);
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được SA Record"));
    } finally {
      setLoadingRecord(false);
    }
  };

  // Auto evaluate ICP Group based on callResult & interestLevel when user changes choices
  useEffect(() => {
    if (!isInitialRecordLoaded || !form.callResult) return;

    const matchIcpId = evaluateIcpRule(
      icpRules,
      form.callResult,
      form.interestLevel,
      callResults,
      interestLevels,
      icpGroups
    );

    if (matchIcpId) {
      setForm((prev) => {
        if (prev.icpGroup === String(matchIcpId)) return prev;
        return { ...prev, icpGroup: String(matchIcpId) };
      });
    }
  }, [form.callResult, form.interestLevel, icpRules, callResults, interestLevels, icpGroups, isInitialRecordLoaded]);

  const validate = () => {
    if (!form.callResult) {
      return "Vui lòng chọn kết quả cuộc gọi.";
    }

    if (!form.followNo || Number(form.followNo) < 1) {
      return "Lần follow phải lớn hơn hoặc bằng 1.";
    }

    if (form.handoverToBroker && !form.brokerEmployee && !form.brokerUser) {
      return "Vui lòng chọn nhân viên môi giới khi bàn giao.";
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
      introduced_product_obj: form.introducedProduct && form.introducedProductId ? Number(form.introducedProductId) : null,
      introduced_product_name: form.introducedProduct ? (form.introducedProductName || null) : null,
      reactivation: form.reactivation,
      support_info: form.supportInfo,
      support_info_category_obj: form.supportInfo && form.supportInfoCategoryId ? Number(form.supportInfoCategoryId) : null,
      support_info_category_name: form.supportInfo ? (form.supportInfoCategoryName || null) : null,
      referred_rm: form.referredRm,

      handover_to_broker: form.handoverToBroker,
      broker_employee: form.handoverToBroker ? (form.brokerEmployee ? Number(form.brokerEmployee) : null) : null,
      broker_user: form.handoverToBroker ? (form.brokerUser ? Number(form.brokerUser) : null) : null,
      broker_handover_note: form.handoverToBroker ? form.brokerHandoverNote.trim() : "",

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
    employeeOptions,

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