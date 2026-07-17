"use client";
import { getErrorMessage } from "@/utils/error.util";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { authService } from "@/services/auth.service";
import { companyService } from "@/services/company.service";
import { customerService } from "@/services/customer.service";
import { masterDataService } from "@/services/master-data.service";
import { slaService } from "@/services/sla.service";
import { ticketService } from "@/services/ticket.service";
import { useUserAssignees } from "@/hooks/useUserAssignees";
import {
  MasterOption,
  TicketCreateFormState,
  TicketContactType,
  TicketErrorGroupOption,
  TicketErrorTypeOption,
} from "@/types/ticket.type";
import { CompanyListItem } from "@/types/company.type";
import { CustomerListItem } from "@/types/customer.type";
import { SlaPolicyItem } from "@/types/sla.type";
import {
  getAccountNumber,
  getContactTypeByAccount,
} from "@/utils/ticket-option.util";

const initialForm: TicketCreateFormState = {
  supportCategory: "",
  classification: "",
  status: "",
  priority: "",
  source: "",

  assignedUnit: "",
  handlingBranch: "",
  ownerUser: "",
  ownerUserLabel: "",

  company: "",
  companyLabel: "",

  customer: "",
  customerLabel: "",

  contactType: "NO_ACCOUNT",
  account: "",
  accountNumber: "",
  mobile: "",
  email: "",

  slaPolicy: "",

  errorGroup: "",
  errorType: "",
  relatedSystem: "",
  externalStatus: "",
  errorNote: "",

  requestContent: "",
  handlingSolution: "",
  finalResponse: "",
};

function getCompanyLabel(company: CompanyListItem) {
  return company.company_name || `Công ty ${company.id}`;
}

function getCustomerLabel(customer: CustomerListItem) {
  return customer.full_name || `KH ${customer.id}`;
}

export function useTicketCreate() {
  const router = useRouter();
  const assignees = useUserAssignees();

  const [form, setForm] = useState<TicketCreateFormState>(initialForm);

  const [supportCategories, setSupportCategories] = useState<MasterOption[]>([]);
  const [classifications, setClassifications] = useState<MasterOption[]>([]);
  const [statuses, setStatuses] = useState<MasterOption[]>([]);
  const [priorities, setPriorities] = useState<MasterOption[]>([]);
  const [sources, setSources] = useState<MasterOption[]>([]);
  const [processingUnits, setProcessingUnits] = useState<MasterOption[]>([]);
  const [branches, setBranches] = useState<MasterOption[]>([]);
  const [slaPolicies, setSlaPolicies] = useState<SlaPolicyItem[]>([]);

  const [errorGroups, setErrorGroups] = useState<TicketErrorGroupOption[]>([]);
  const [errorTypes, setErrorTypes] = useState<TicketErrorTypeOption[]>([]);

  const [companies, setCompanies] = useState<CompanyListItem[]>([]);
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);

  const [loadingDropdowns, setLoadingDropdowns] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const setField = useCallback(
    <K extends keyof TicketCreateFormState>(
      key: K,
      value: TicketCreateFormState[K]
    ) => {
      setForm((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    []
  );

  const filteredClassifications = useMemo(() => {
    if (!form.supportCategory) return classifications;

    return classifications.filter(
      (item) => String(item["support_category"]) === form.supportCategory
    );
  }, [classifications, form.supportCategory]);

  const filteredSlaPolicies = useMemo(() => {
    if (!form.supportCategory) return slaPolicies;

    return slaPolicies.filter(
      (item) => String(item.support_category || "") === form.supportCategory
    );
  }, [slaPolicies, form.supportCategory]);

  const filteredErrorTypes = useMemo(() => {
    if (!form.errorGroup) return errorTypes;

    return errorTypes.filter(
      (item) => String(item.group || "") === form.errorGroup
    );
  }, [errorTypes, form.errorGroup]);

  const loadInitialData = useCallback(async () => {
    try {
      setLoadingDropdowns(true);
      setError("");

      const [
        categoryData,
        classificationData,
        statusData,
        priorityData,
        sourceData,
        processingUnitData,
        branchData,
        slaData,
        companyData,
        customerData,
        errorGroupData,
        errorTypeData,
      ] = await Promise.all([
        masterDataService.getTicketCategories(),
        masterDataService.getTicketClassifications(),
        masterDataService.getTicketStatuses(),
        masterDataService.getTicketPriorities(),
        masterDataService.getTicketSources(),
        masterDataService.getProcessingUnits(),
        masterDataService.getBranches(),
        slaService.getSlaPolicies({
          status: "ACTIVE",
        }),
        companyService.getCompanies({}),
        customerService.getCustomers({}),
        ticketService.getErrorGroups(),
        ticketService.getErrorTypes(),
      ]);

      setSupportCategories((categoryData || []) as MasterOption[]);
      setClassifications((classificationData || []) as MasterOption[]);
      setStatuses((statusData || []) as MasterOption[]);
      setPriorities((priorityData || []) as MasterOption[]);
      setSources((sourceData || []) as MasterOption[]);
      setProcessingUnits((processingUnitData || []) as MasterOption[]);
      setBranches((branchData || []) as MasterOption[]);
      setSlaPolicies(slaData.results || []);
      setCompanies(companyData.results || []);
      setCustomers(customerData.results || []);
      setErrorGroups(errorGroupData || []);
      setErrorTypes(errorTypeData || []);
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được dữ liệu tạo ticket"));
    } finally {
      setLoadingDropdowns(false);
    }
  }, []);

  const applyDefaultAssignee = useCallback(() => {
    const defaultAssignee = assignees.defaultAssignee;
    if (!defaultAssignee) return;

    setForm((prev) => {
      if (prev.ownerUser) return prev;

      return {
        ...prev,
        ownerUser: defaultAssignee.id,
        ownerUserLabel: defaultAssignee.label,
      };
    });
  }, [assignees.defaultAssignee]);

  const changeSupportCategory = useCallback(
    (value: string) => {
      setForm((prev) => {
        const selectedSla = slaPolicies.find(
          (sla) => String(sla.id) === prev.slaPolicy
        );

        const keepSla =
          selectedSla && String(selectedSla.support_category || "") === value;

        return {
          ...prev,
          supportCategory: value,
          classification: "",
          slaPolicy: keepSla ? prev.slaPolicy : "",
        };
      });
    },
    [slaPolicies]
  );

  const changeSlaPolicy = useCallback(
    (value: string) => {
      const selectedSla = slaPolicies.find((sla) => String(sla.id) === value);

      setForm((prev) => ({
        ...prev,
        slaPolicy: value,
        supportCategory: selectedSla?.support_category
          ? String(selectedSla.support_category)
          : prev.supportCategory,
        assignedUnit: selectedSla?.processing_unit
          ? String(selectedSla.processing_unit)
          : prev.assignedUnit,
      }));
    },
    [slaPolicies]
  );

  const changeErrorGroup = useCallback((value: string) => {
    setForm((prev) => ({
      ...prev,
      errorGroup: value,
      errorType: "",
    }));
  }, []);

  const changeErrorType = useCallback(
    (value: string) => {
      const selectedType = errorTypes.find((item) => String(item.id) === value);

      setForm((prev) => ({
        ...prev,
        errorGroup: selectedType?.group ? String(selectedType.group) : prev.errorGroup,
        errorType: value,
      }));
    },
    [errorTypes]
  );

  const applyContactInfo = useCallback(
    async ({
      company,
      customer,
    }: {
      company?: CompanyListItem | null;
      customer?: CustomerListItem | null;
    }) => {
      let accountNumber = company?.account_number || customer?.account_number || "";

      let accountId = "";

      try {
        if (company?.id || customer?.id) {
          const accounts = await ticketService.getCustomerAccounts({
            company: company?.id ? String(company.id) : undefined,
            customer: customer?.id ? String(customer.id) : undefined,
          });

          const firstAccount = accounts[0];

          if (firstAccount) {
            accountId = String(firstAccount.id);
            accountNumber = getAccountNumber(firstAccount) || accountNumber;
          }
        }
      } catch {
        accountId = "";
      }

      setForm((prev) => ({
        ...prev,
        account: accountId,
        accountNumber,
        contactType: getContactTypeByAccount(accountNumber) as TicketContactType,
        mobile: customer?.phone || prev.mobile,
        email: company?.email || customer?.email || prev.email,
      }));
    },
    []
  );

  const changeCompany = useCallback(
    async (companyId: string) => {
      const company = companies.find((item) => String(item.id) === companyId);

      setForm((prev) => ({
        ...prev,
        company: companyId,
        companyLabel: company ? getCompanyLabel(company) : "",
      }));

      await applyContactInfo({
        company,
        customer: customers.find((item) => String(item.id) === form.customer),
      });
    },
    [companies, customers, form.customer, applyContactInfo]
  );

  const changeCustomer = useCallback(
    async (customerId: string) => {
      const customer = customers.find((item) => String(item.id) === customerId);
      const company = companies.find((item) => String(item.id) === form.company);

      setForm((prev) => ({
        ...prev,
        customer: customerId,
        customerLabel: customer ? getCustomerLabel(customer) : "",
      }));

      await applyContactInfo({
        company,
        customer,
      });
    },
    [companies, customers, form.company, applyContactInfo]
  );

  const changeRawAccountNumber = useCallback((value: string) => {
    setForm((prev) => ({
      ...prev,
      account: "",
      accountNumber: value,
      contactType: getContactTypeByAccount("") as TicketContactType,
    }));
  }, []);

  const hasErrorInfo = Boolean(
    form.errorGroup ||
      form.errorType ||
      form.relatedSystem.trim() ||
      form.errorNote.trim()
  );

  const validateForm = useCallback(() => {
    if (!form.supportCategory) return "Danh mục hỗ trợ không được để trống.";
    if (!form.classification) return "Phân loại không được để trống.";
    if (!form.status) return "Tình trạng không được để trống.";
    if (!form.priority) return "Mức độ ưu tiên không được để trống.";
    if (!form.source) return "Nguồn ticket không được để trống.";
    if (!form.handlingBranch) return "Chi nhánh xử lý không được để trống.";
    if (!form.ownerUser) return "Giao cho không được để trống.";
    if (!form.requestContent.trim()) return "Nội dung yêu cầu không được để trống.";

    if (hasErrorInfo) {
      if (!form.errorGroup) return "Nhóm lỗi không được để trống khi nhập thông tin lỗi.";
      if (!form.errorType) return "Loại lỗi không được để trống khi nhập thông tin lỗi.";
    }

    return "";
  }, [form, hasErrorInfo]);

  const submit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      try {
        setSaving(true);
        setError("");

        const message = validateForm();

        if (message) {
          setError(message);
          return;
        }

        await ticketService.createTicket({
          support_category: Number(form.supportCategory),
          classification: Number(form.classification),
          current_status: Number(form.status),
          priority: Number(form.priority),
          source: Number(form.source),

          assigned_unit: form.assignedUnit ? Number(form.assignedUnit) : null,
          handling_branch: Number(form.handlingBranch),
          owner_user: form.ownerUser ? Number(form.ownerUser) : null,

          company: form.company ? Number(form.company) : null,
          customer: form.customer ? Number(form.customer) : null,
          customer_account: form.account ? Number(form.account) : null,
          raw_account_number: form.account ? undefined : form.accountNumber.trim() || undefined,
          classification_method: "MANUAL",
          sla_policy: form.slaPolicy ? Number(form.slaPolicy) : null,

          error_group: form.errorGroup ? Number(form.errorGroup) : null,
          error_type: form.errorType ? Number(form.errorType) : null,
          related_system: form.relatedSystem.trim() || undefined,
          external_status: form.externalStatus.trim() || undefined,
          error_note: form.errorNote.trim() || undefined,

          request_content: form.requestContent.trim() || undefined,
          handling_solution: form.handlingSolution.trim() || undefined,
          final_response: form.finalResponse.trim() || undefined,
        });

        router.push("/tickets");
      } catch (err) {
        setError(getErrorMessage(err, "Lưu ticket thất bại"));
      } finally {
        setSaving(false);
      }
    },
    [form, validateForm, router]
  );

  const cancel = useCallback(() => {
    router.push("/tickets");
  }, [router]);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/login");
      return;
    }

    void loadInitialData();
  }, [router, loadInitialData]);

  useEffect(() => {
    applyDefaultAssignee();
  }, [assignees.defaultAssignee, applyDefaultAssignee]);

  return {
    form,
    setField,

    supportCategories,
    classifications,
    filteredClassifications,
    statuses,
    priorities,
    sources,
    processingUnits,
    branches,
    slaPolicies,
    filteredSlaPolicies,

    errorGroups,
    errorTypes,
    filteredErrorTypes,

    companies,
    customers,

    assigneeUsers: assignees.users,

    loadingDropdowns: loadingDropdowns || assignees.loading,
    saving,
    error: error || assignees.error,

    changeSupportCategory,
    changeSlaPolicy,
    changeErrorGroup,
    changeErrorType,
    changeCompany,
    changeCustomer,
    changeRawAccountNumber,

    submit,
    cancel,
  };
}

export type UseTicketCreateReturn = ReturnType<typeof useTicketCreate>;
