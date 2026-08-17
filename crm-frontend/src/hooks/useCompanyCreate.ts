"use client";
import { getErrorMessage } from "@/utils/error.util";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { authService } from "@/services/auth.service";
import { companyService } from "@/services/company.service";
import { customerApi } from "@/apis/customer.api";
import { CustomerListItem } from "@/types/customer.type";
import {
  CompanyCreateFormState,
  SelectOption,
} from "@/types/company.type";
import {
  getEmployeeLabel,
} from "@/utils/company-option.util";

const initialForm: CompanyCreateFormState = {
  companyName: "",
  primaryContact: "",
  contactSearch: "",
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
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);

  const [form, setForm] = useState<CompanyCreateFormState>(initialForm);

  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
  const [contactDropdownOpen, setContactDropdownOpen] = useState(false);

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

  const filteredContacts = useMemo(() => {
    const keyword = form.contactSearch.trim().toLowerCase();

    if (!keyword) {
      return customers.slice(0, 20);
    }

    return customers
      .filter((item) => {
        const name = (item.full_name || "").toLowerCase();
        const phone = (item.phone || "").toLowerCase();
        const code = (item.customer_code || "").toLowerCase();
        const email = (item.email || "").toLowerCase();
        const acc = (item.account_number || "").toLowerCase();

        return (
          name.includes(keyword) ||
          phone.includes(keyword) ||
          code.includes(keyword) ||
          email.includes(keyword) ||
          acc.includes(keyword)
        );
      })
      .slice(0, 20);
  }, [form.contactSearch, customers]);

  const loadDropdowns = async () => {
    try {
      setLoadingDropdowns(true);
      setError("");

      const [sourceData, ratingData, tierData, employeeData, customerData] =
        await Promise.all([
          companyService.getSources(),
          companyService.getRatings(),
          companyService.getMembershipTiers(),
          companyService.getEmployees(),
          customerApi.getCustomers({ page_size: "100" }).catch(() => ({ results: [] })),
        ]);

      setSources(sourceData);
      setRatings(ratingData);
      setMembershipTiers(tierData);
      setEmployees(employeeData);
      setCustomers(customerData.results || []);
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được dropdown"));
    } finally {
      setLoadingDropdowns(false);
    }
  };

  const selectContact = async (contact: CustomerListItem) => {
    setField("primaryContact", String(contact.id));
    setField(
      "contactSearch",
      `${contact.full_name}${contact.phone ? ` - ${contact.phone}` : ""}`
    );
    setContactDropdownOpen(false);

    let fullCustomer = contact;
    try {
      fullCustomer = await customerApi.getCustomerById(contact.id);
    } catch {
      // Fall back to list item
    }

    if (fullCustomer.phone) setField("phone", fullCustomer.phone);
    if (fullCustomer.email) setField("email", fullCustomer.email);
    if (fullCustomer.address) setField("address", fullCustomer.address);
    if (fullCustomer.country) setField("country", fullCustomer.country);
    if (fullCustomer.province) setField("province", fullCustomer.province);
    if (fullCustomer.district) setField("district", fullCustomer.district);

    if (fullCustomer.membership_tier) {
      setField("membershipTier", String(fullCustomer.membership_tier));
    }
    if (fullCustomer.rating) {
      setField("rating", String(fullCustomer.rating));
    }
    if (fullCustomer.source) {
      setField("source", String(fullCustomer.source));
    }

    if (fullCustomer.assigned_employee_name || (fullCustomer as any).assigned_employee) {
      const empId = (fullCustomer as any).assigned_employee;
      const empName = fullCustomer.assigned_employee_name || "";

      const matchedEmp = employees.find(
        (e) =>
          (empId && e.id === Number(empId)) ||
          (empName &&
            (getEmployeeLabel(e).toLowerCase().includes(empName.toLowerCase()) ||
              String(e["full_name"] || "").toLowerCase() === empName.toLowerCase()))
      );

      if (matchedEmp) {
        setField("assignedEmployee", String(matchedEmp.id));
        setField("employeeSearch", getEmployeeLabel(matchedEmp));
      }
    }
  };

  const clearContact = () => {
    setField("primaryContact", "");
    setField("contactSearch", "");
    setContactDropdownOpen(true);
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

        primary_contact: form.primaryContact ? Number(form.primaryContact) : null,
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

      router.push("/companies");
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

    filteredContacts,
    contactDropdownOpen,
    setContactDropdownOpen,
    selectContact,
    clearContact,

    loadingDropdowns,
    saving,
    error,

    submit,
    cancel,
  };
}

export type UseCompanyCreateReturn = ReturnType<typeof useCompanyCreate>;