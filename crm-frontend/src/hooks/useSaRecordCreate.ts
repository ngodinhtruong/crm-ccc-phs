import { masterDataApi } from "@/apis/master-data.api";
import { getErrorMessage } from "@/utils/error.util";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { authService } from "@/services/auth.service";
import { saleAdminService } from "@/services/sale-admin.service";
import { useDebounce } from "@/hooks/useDebounce";
import {
  SaCallResult,
  SaCustomerAccountSuggestion,
  SaIcpGroup,
  SaInterestLevel,
  SaRecordCreateFormState,
  SaSelectOption,
} from "@/types/sale-admin.type";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
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

  callDate: todayIso(),
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

function toId(value?: string) {
  return value ? Number(value) : null;
}

function normalizeAccountNoInput(value: string) {
  return String(value || "")
    .replace(/\s+/g, "")
    .toUpperCase();
}

function getSuggestionVipClassification(account: SaCustomerAccountSuggestion) {
  return (
    account.vip_classification ||
    account.vip_classification_label ||
    account.membership_tier_name ||
    ""
  );
}

function addSelectOptionIfMissing(
  options: SaSelectOption[],
  value?: string | null,
  label?: string | null
) {
  const cleanValue = String(value || "").trim();

  if (!cleanValue) return options;

  if (options.some((option) => option.value === cleanValue)) {
    return options;
  }

  return [
    ...options,
    {
      value: cleanValue,
      label: String(label || cleanValue).trim() || cleanValue,
    },
  ];
}

export function useSaRecordCreate() {
  const router = useRouter();
  const accountSearchSeqRef = useRef(0);

  const [form, setForm] = useState<SaRecordCreateFormState>(initialForm);
  const [accountQuery, setAccountQuery] = useState("");

  const [callResults, setCallResults] = useState<SaCallResult[]>([]);
  const [interestLevels, setInterestLevels] = useState<SaInterestLevel[]>([]);
  const [icpGroups, setIcpGroups] = useState<SaIcpGroup[]>([]);
  const [accountStatusOptions, setAccountStatusOptions] = useState<SaSelectOption[]>([]);
  const [vipClassificationOptions, setVipClassificationOptions] = useState<SaSelectOption[]>([]);

  const [accountSuggestions, setAccountSuggestions] = useState<SaCustomerAccountSuggestion[]>([]);
  const [accountSuggestionLoading, setAccountSuggestionLoading] = useState(false);
  const [accountSuggestionError, setAccountSuggestionError] = useState("");
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);

  const [loadingMaster, setLoadingMaster] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [masterError, setMasterError] = useState("");

  const debouncedAccountQuery = useDebounce(accountQuery, 180);

  const setField = <K extends keyof SaRecordCreateFormState>(
    key: K,
    value: SaRecordCreateFormState[K]
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleAccountNoChange = (rawValue: string) => {
    const nextValue = normalizeAccountNoInput(rawValue);

    setAccountQuery(nextValue);
    setAccountDropdownOpen(nextValue.length > 0);
    setAccountSuggestionError("");

    setForm((prev) => ({
      ...prev,
      accountNo: nextValue,
      customerNameSnapshot: "",
      branchNameSnapshot: "",
      accountStatus: "",
      vipClassification: "",
      customerAccount: "",
      customer: "",
      company: "",
      branch: "",
      accountSelected: false,
    }));

    if (!nextValue) {
      setAccountSuggestions([]);
      setAccountSuggestionLoading(false);
    }
  };

  const selectCustomerAccountSuggestion = (account: SaCustomerAccountSuggestion) => {
    const selectedAccountNo = normalizeAccountNoInput(account.account_number || "");
    const accountStatus = account.account_status || "";
    const vipClassification = getSuggestionVipClassification(account);

    setAccountQuery(selectedAccountNo);

    setAccountStatusOptions((prev) =>
      addSelectOptionIfMissing(prev, accountStatus)
    );
    setVipClassificationOptions((prev) =>
      addSelectOptionIfMissing(
        prev,
        vipClassification,
        account.vip_classification_label || vipClassification
      )
    );

    setForm((prev) => ({
      ...prev,
      accountNo: selectedAccountNo,
      customerNameSnapshot: account.customer_name || "",
      branchNameSnapshot: account.branch_name || "",
      accountStatus,
      vipClassification,
      customerAccount: String(account.id),
      customer: account.customer ? String(account.customer) : "",
      company: account.company ? String(account.company) : "",
      branch: account.branch ? String(account.branch) : "",
      accountSelected: true,
    }));

    setAccountDropdownOpen(false);
    setAccountSuggestions([]);
    setAccountSuggestionError("");
    setAccountSuggestionLoading(false);
  };

  const [employeeOptions, setEmployeeOptions] = useState<SaSelectOption[]>([]);

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
        employeeData,
      ] = await Promise.all([
        saleAdminService.getCallResults(),
        saleAdminService.getInterestLevels(),
        saleAdminService.getIcpGroups(),
        saleAdminService.getAccountStatusOptions(),
        saleAdminService.getVipClassificationOptions(),
        masterDataApi.getEmployees().catch(() => []),
      ]);

      setCallResults(callResultData);
      setInterestLevels(interestLevelData);
      setIcpGroups(icpGroupData);
      setAccountStatusOptions(accountStatusData);
      setVipClassificationOptions(vipClassificationData);

      const empOpts: SaSelectOption[] = (employeeData || []).map((emp: any) => ({
        value: String(emp.id),
        label: `${emp.full_name || emp.employee_code}${emp.branch_name ? ` (${emp.branch_name})` : ""}`,
      }));
      setEmployeeOptions(empOpts);
    } catch (err) {
      setMasterError(getErrorMessage(err, "Không tải được dữ liệu SA Record"));
    } finally {
      setLoadingMaster(false);
    }
  };

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/login");
      return;
    }

    void loadMasterData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    const keyword = normalizeAccountNoInput(debouncedAccountQuery || "");

    if (!keyword) {
      setAccountSuggestions([]);
      setAccountSuggestionError("");
      setAccountSuggestionLoading(false);
      return;
    }

    if (form.accountSelected && keyword === form.accountNo) {
      return;
    }

    const requestSeq = accountSearchSeqRef.current + 1;
    accountSearchSeqRef.current = requestSeq;

    const searchAccounts = async () => {
      try {
        setAccountSuggestionLoading(true);
        setAccountSuggestionError("");

        const results = await saleAdminService.searchCustomerAccounts(keyword);

        if (accountSearchSeqRef.current !== requestSeq) return;

        setAccountSuggestions(results);
        setAccountDropdownOpen(true);
      } catch (err) {
        if (accountSearchSeqRef.current !== requestSeq) return;
        setAccountSuggestions([]);
        setAccountSuggestionError(getErrorMessage(err, "Không tìm được số tài khoản"));
      } finally {
        if (accountSearchSeqRef.current === requestSeq) {
          setAccountSuggestionLoading(false);
        }
      }
    };

    void searchAccounts();
  }, [debouncedAccountQuery, form.accountNo, form.accountSelected]);

  const validateForm = useMemo(() => {
    return () => {
      if (!form.accountNo.trim()) {
        return "Số tài khoản không được để trống.";
      }

      if (!form.accountSelected || !form.customerAccount) {
        return "Vui lòng chọn số tài khoản có trong hệ thống từ danh sách gợi ý.";
      }

      if (!form.callDate) {
        return "Ngày gọi không được để trống.";
      }

      if (!form.followNo || Number(form.followNo) < 1) {
        return "Lần follow phải lớn hơn hoặc bằng 1.";
      }

      if (!form.callResult) {
        return "Kết quả cuộc gọi không được để trống.";
      }

      if (form.handoverToBroker && !form.brokerEmployee && !form.brokerUser) {
        return "Vui lòng chọn nhân viên môi giới khi bàn giao.";
      }

      return "";
    };
  }, [form]);

  const submit = async () => {
    try {
      setSubmitting(true);
      setError("");

      const validateMessage = validateForm();

      if (validateMessage) {
        setError(validateMessage);
        return;
      }

      await saleAdminService.createSaRecord({
        account_no: normalizeAccountNoInput(form.accountNo),
        customer_name_snapshot: form.customerNameSnapshot.trim(),
        branch_name_snapshot: form.branchNameSnapshot.trim(),
        pic_name_snapshot: form.picNameSnapshot.trim(),
        account_status: form.accountStatus.trim(),
        vip_classification: form.vipClassification.trim(),

        customer_account: toId(form.customerAccount),
        customer: toId(form.customer),
        company: toId(form.company),
        branch: toId(form.branch),

        call_date: form.callDate,
        follow_no: Number(form.followNo || 1),
        call_result: Number(form.callResult),
        interest_level: toId(form.interestLevel),
        icp_group: toId(form.icpGroup),

        reactivation: form.reactivation,
        introduced_product: form.introducedProduct,
        support_info: form.supportInfo,
        referred_rm: form.handoverToBroker,

        handover_to_broker: form.handoverToBroker,
        broker_employee: form.handoverToBroker ? toId(form.brokerEmployee) : null,
        broker_user: form.handoverToBroker ? toId(form.brokerUser) : null,
        broker_handover_note: form.handoverToBroker ? form.brokerHandoverNote.trim() : "",

        transaction_value_snapshot: form.transactionValueSnapshot || "0",
        transaction_fee_snapshot: form.transactionFeeSnapshot || "0",

        note: form.note.trim(),
        source_system: "CRM_MINI",
        data_status: "VALID",
      });

      router.push("/sale-admin/records");
    } catch (err) {
      setError(getErrorMessage(err, "Lưu SA Record thất bại"));
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = () => {
    router.push("/sale-admin/records");
  };

  return {
    form,
    setField,

    callResults,
    interestLevels,
    icpGroups,
    accountStatusOptions,
    vipClassificationOptions,
    employeeOptions,

    accountSuggestions,
    accountSuggestionLoading,
    accountSuggestionError,
    accountDropdownOpen,
    setAccountDropdownOpen,
    handleAccountNoChange,
    selectCustomerAccountSuggestion,

    loadingMaster,
    submitting,

    error,
    masterError,

    submit,
    cancel,
  };
}

export type UseSaRecordCreateReturn = ReturnType<typeof useSaRecordCreate>;
