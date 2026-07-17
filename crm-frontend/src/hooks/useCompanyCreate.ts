"use client";
import { getErrorMessage } from "@/utils/error.util";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { authService } from "@/services/auth.service";
import { companyService } from "@/services/company.service";
import {
  CompanyCreateFormState,
  SelectOption,
} from "@/types/company.type";
import {
  getEmployeeLabel,
} from "@/utils/company-option.util";

const initialForm: CompanyCreateFormState = {
  companyName: "",
  phone: "",
  email: "",
  website: "",
  fax: "",

  accountNumber: "",
  openedAt: "",
  taxCode: "",
  source: "",

  address: "",
  country: "",
  province: "",
  district: "",

  description: "",

  assignedEmployee: "",
  employeeSearch: "",

  rating: "",
  membershipTier: "",
};

export function useCompanyCreate() {
  const router = useRouter();

  const [sources, setSources] = useState<SelectOption[]>([]);
  const [ratings, setRatings] = useState<SelectOption[]>([]);
  const [membershipTiers, setMembershipTiers] = useState<SelectOption[]>([]);
  const [employees, setEmployees] = useState<SelectOption[]>([]);

  const [form, setForm] = useState<CompanyCreateFormState>(initialForm);

  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);

  const [loadingDropdowns, setLoadingDropdowns] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const setField = <K extends keyof CompanyCreateFormState>(
    key: K,
    value: CompanyCreateFormState[K]
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const filteredEmployees = useMemo(() => {
    const keyword = form.employeeSearch.trim().toLowerCase();

    if (!keyword) {
      return employees.slice(0, 20);
    }

    return employees
      .filter((item) => {
        const label = getEmployeeLabel(item).toLowerCase();
        const code = String(item["employee_code"] || "").toLowerCase();
        const branch = String(item["branch_name"] || "").toLowerCase();
        const department = String(item["department"] || "").toLowerCase();

        return (
          label.includes(keyword) ||
          code.includes(keyword) ||
          branch.includes(keyword) ||
          department.includes(keyword)
        );
      })
      .slice(0, 20);
  }, [form.employeeSearch, employees]);

  const loadDropdowns = async () => {
    try {
      setLoadingDropdowns(true);
      setError("");

      const [sourceData, ratingData, tierData, employeeData] =
        await Promise.all([
          companyService.getSources(),
          companyService.getRatings(),
          companyService.getMembershipTiers(),
          companyService.getEmployees(),
        ]);

      setSources(sourceData);
      setRatings(ratingData);
      setMembershipTiers(tierData);
      setEmployees(employeeData);
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được dropdown"));
    } finally {
      setLoadingDropdowns(false);
    }
  };

  const validateForm = () => {
    if (!form.companyName.trim()) {
      return "Tên công ty không được để trống.";
    }

    if (!form.assignedEmployee) {
      return "Vui lòng chọn nhân viên phụ trách.";
    }

    if (form.accountNumber.trim()) {
      if (!/^[A-Za-z0-9]{10}$/.test(form.accountNumber.trim())) {
        return "Số tài khoản phải gồm đúng 10 ký tự, chỉ bao gồm chữ và số.";
      }
    }

    return "";
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      const message = validateForm();

      if (message) {
        setError(message);
        return;
      }

      const createdCompany = await companyService.createCompany({
        company_name: form.companyName.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        website: form.website.trim() || undefined,
        fax: form.fax.trim() || undefined,

        account_number: form.accountNumber.trim() || undefined,
        opened_at: form.openedAt || undefined,
        tax_code: form.taxCode.trim() || undefined,

        source: form.source ? Number(form.source) : null,
        rating: form.rating ? Number(form.rating) : null,
        membership_tier: form.membershipTier
          ? Number(form.membershipTier)
          : null,
        assigned_employee: form.assignedEmployee
          ? Number(form.assignedEmployee)
          : null,

        address: form.address.trim() || undefined,
        country: form.country.trim() || undefined,
        province: form.province.trim() || undefined,
        district: form.district.trim() || undefined,

        description: form.description.trim() || undefined,
        status: "ACTIVE",
      });

      router.push(`/companies/${createdCompany.id}`);
    } catch (err) {
      setError(getErrorMessage(err, "Lưu công ty thất bại"));
    } finally {
      setSaving(false);
    }
  };

  const selectEmployee = (employee: SelectOption) => {
    setField("assignedEmployee", String(employee.id));
    setField("employeeSearch", getEmployeeLabel(employee));
    setEmployeeDropdownOpen(false);
  };

  const clearEmployee = () => {
    setField("assignedEmployee", "");
    setField("employeeSearch", "");
    setEmployeeDropdownOpen(true);
  };

  const cancel = () => {
    router.push("/companies");
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

    sources,
    ratings,
    membershipTiers,

    filteredEmployees,
    employeeDropdownOpen,
    setEmployeeDropdownOpen,
    selectEmployee,
    clearEmployee,

    loadingDropdowns,
    saving,
    error,

    submit,
    cancel,
  };
}

export type UseCompanyCreateReturn = ReturnType<typeof useCompanyCreate>;