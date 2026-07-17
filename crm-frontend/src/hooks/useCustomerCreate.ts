"use client";
import { getErrorMessage } from "@/utils/error.util";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { authService } from "@/services/auth.service";
import { customerService } from "@/services/customer.service";
import { masterDataService } from "@/services/master-data.service";
import { useUserAssignees } from "@/hooks/useUserAssignees";
import {
  BranchOption,
  CustomerCreateFormState,
  SelectOption,
} from "@/types/customer.type";
import { getOptionName } from "@/utils/customer-option.util";

const initialForm: CustomerCreateFormState = {
  genderPrefix: "Chị",
  fullName: "",
  identityNumber: "",
  birthDate: "",
  gender: "",
  phone: "",
  email: "",

  customerType: "",
  accountNumber: "",
  branch: "",
  openedDate: "",
  referrer: "",
  company: "",

  address: "",
  province: "",
  country: "",
  district: "",

  description: "",

  assignedTo: "",
  assignedToLabel: "",

  source: "",
  rating: "",
  membershipTier: "",
};

export function useCustomerCreate() {
  const router = useRouter();

  const {
    users: assigneeUsers,
    loading: assigneeLoading,
    error: assigneeError,
  } = useUserAssignees();

  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [customerTypes, setCustomerTypes] = useState<SelectOption[]>([]);
  const [companies, setCompanies] = useState<SelectOption[]>([]);
  const [sources, setSources] = useState<SelectOption[]>([]);
  const [ratings, setRatings] = useState<SelectOption[]>([]);
  const [membershipTiers, setMembershipTiers] = useState<SelectOption[]>([]);

  const [form, setForm] = useState<CustomerCreateFormState>(initialForm);

  const [loadingDropdowns, setLoadingDropdowns] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const setField = <K extends keyof CustomerCreateFormState>(
    key: K,
    value: CustomerCreateFormState[K]
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const selectedCustomerTypeName = useMemo(() => {
    const selected = customerTypes.find(
      (item) => String(item.id) === form.customerType
    );

    if (!selected) return "";

    return getOptionName(selected, ["type_name", "customer_type_name", "name"]);
  }, [form.customerType, customerTypes]);

  const isContactPerson =
    selectedCustomerTypeName.toLowerCase().includes("người liên hệ") ||
    selectedCustomerTypeName.toLowerCase().includes("contact");

  const loadDropdowns = async () => {
    try {
      setLoadingDropdowns(true);
      setError("");

      const [
        branchData,
        typeData,
        companyData,
        sourceData,
        ratingData,
        tierData,
      ] = await Promise.all([
        masterDataService.getBranches(),
        customerService.getCustomerTypes(),
        customerService.getCompanies(),
        customerService.getSources(),
        customerService.getRatings(),
        customerService.getMembershipTiers(),
      ]);

      setBranches(branchData as BranchOption[]);
      setCustomerTypes(typeData);
      setCompanies(companyData);
      setSources(sourceData);
      setRatings(ratingData);
      setMembershipTiers(tierData);
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được dropdown"));
    } finally {
      setLoadingDropdowns(false);
    }
  };

  const validateForm = async () => {
    if (!form.fullName.trim()) {
      return "Họ và tên không được để trống.";
    }

    if (!form.phone.trim()) {
      return "Di động không được để trống.";
    }

    if (!form.assignedTo) {
      return "Vui lòng chọn nhân viên phụ trách ở trường Giao cho.";
    }

    if (form.accountNumber.trim()) {
      if (!/^[A-Za-z0-9]{10}$/.test(form.accountNumber.trim())) {
        return "Số tài khoản phải gồm đúng 10 ký tự, chỉ bao gồm chữ và số.";
      }

      const exists = await customerService.checkAccountNumberExists(
        form.accountNumber.trim()
      );

      if (exists) {
        if (isContactPerson) {
          return "Người liên hệ đã tồn tại theo Số tài khoản này.";
        }

        return "Số tài khoản này đã tồn tại.";
      }
    }

    return "";
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      const validateMessage = await validateForm();

      if (validateMessage) {
        setError(validateMessage);
        return;
      }

      const customer = await customerService.createCustomer({
        full_name: `${form.genderPrefix} ${form.fullName}`.trim(),
        salutation: form.genderPrefix || undefined,
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        identity_number: form.identityNumber.trim() || undefined,
        date_of_birth: form.birthDate || undefined,
        gender: form.gender || undefined,

        customer_type: form.customerType ? Number(form.customerType) : null,
        branch: form.branch ? Number(form.branch) : null,
        company: form.company ? Number(form.company) : null,
        source: form.source ? Number(form.source) : null,
        rating: form.rating ? Number(form.rating) : null,
        membership_tier: form.membershipTier
          ? Number(form.membershipTier)
          : null,

        assigned_employee: form.assignedTo ? Number(form.assignedTo) : null,

        // Lưu từng cấp địa chỉ vào đúng cột riêng, không gộp thành một chuỗi
        address: form.address.trim() || undefined,
        district: form.district.trim() || undefined,
        province: form.province.trim() || undefined,
        country: form.country.trim() || undefined,
        status: "ACTIVE",
      });

      if (form.accountNumber.trim()) {
        await customerService.createCustomerAccount({
          customer: customer.id,
          account_number: form.accountNumber.trim().toUpperCase(),
          account_status: "ACTIVE",
          source_system: "CRM_MINI",
          opened_at: form.openedDate || undefined,
        });
      }

      router.push("/customers");
    } catch (err) {
      setError(getErrorMessage(err, "Lưu khách hàng thất bại"));
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    router.push("/customers");
  };

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/login");
      return;
    }

    void loadDropdowns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  return {
    form,
    setField,

    branches,
    customerTypes,
    companies,
    sources,
    ratings,
    membershipTiers,

    assigneeUsers,
    assigneeLoading,
    assigneeError,

    loadingDropdowns,
    saving,
    error,

    submit,
    cancel,
  };
}

export type UseCustomerCreateReturn = ReturnType<typeof useCustomerCreate>;