"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useDebounce } from "@/hooks/useDebounce";
import { authService } from "@/services/auth.service";
import { companyService } from "@/services/company.service";
import {
  CompanyEmployeeOption,
  CompanyListItem,
  CompanyListParams,
  CompanyMembershipTierOption,
  CompanyRatingOption,
  CompanySourceOption,
} from "@/types/company.type";

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

export function useCompanies() {
  const router = useRouter();

  const [companies, setCompanies] = useState<CompanyListItem[]>([]);
  const [count, setCount] = useState(0);

  const [sources, setSources] = useState<CompanySourceOption[]>([]);
  const [ratings, setRatings] = useState<CompanyRatingOption[]>([]);
  const [membershipTiers, setMembershipTiers] = useState<
    CompanyMembershipTierOption[]
  >([]);
  const [employees, setEmployees] = useState<CompanyEmployeeOption[]>([]);

  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  const [openedAtFrom, setOpenedAtFrom] = useState("");
  const [openedAtTo, setOpenedAtTo] = useState("");

  const [taxCode, setTaxCode] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [primaryContactName, setPrimaryContactName] = useState("");

  const [source, setSource] = useState("");
  const [rating, setRating] = useState("");
  const [membershipTier, setMembershipTier] = useState("");
  const [assignedEmployee, setAssignedEmployee] = useState("");

  const [status, setStatus] = useState("");
  const [address, setAddress] = useState("");

  const [loading, setLoading] = useState(true);
  const [masterLoading, setMasterLoading] = useState(true);

  const [error, setError] = useState("");
  const [masterError, setMasterError] = useState("");

  const fromRecord = count === 0 ? 0 : 1;
  const toRecord = Math.min(20, count);

  const textFilters = useMemo<CompanyListParams>(
    () => ({
      company_name: companyName,
      phone,
      account_number: accountNumber,
      tax_code: taxCode,
      email,
      website,
      primary_contact_name: primaryContactName,
      address,
    }),
    [
      companyName,
      phone,
      accountNumber,
      taxCode,
      email,
      website,
      primaryContactName,
      address,
    ]
  );

  const debouncedTextFilters = useDebounce(textFilters, 500);

  const buildParams = (
    customParams?: Partial<CompanyListParams>
  ): CompanyListParams => ({
    ...debouncedTextFilters,
    opened_at_from: openedAtFrom,
    opened_at_to: openedAtTo,
    source,
    rating,
    membership_tier: membershipTier,
    assigned_employee: assignedEmployee,
    status,
    ...customParams,
  });

  const loadCompanies = async (params?: CompanyListParams) => {
    try {
      setLoading(true);
      setError("");

      const data = await companyService.getCompanies(params || buildParams());

      setCompanies(data.results || []);
      setCount(data.count || 0);
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được danh sách công ty"));
    } finally {
      setLoading(false);
    }
  };

  const loadMasterData = async () => {
    try {
      setMasterLoading(true);
      setMasterError("");

      const [sourceData, ratingData, membershipTierData, employeeData] =
        await Promise.all([
          companyService.getSources(),
          companyService.getRatings(),
          companyService.getMembershipTiers(),
          companyService.getEmployees(),
        ]);

      setSources(sourceData);
      setRatings(ratingData);
      setMembershipTiers(membershipTierData);
      setEmployees(employeeData);
    } catch (err) {
      setMasterError(getErrorMessage(err, "Không tải được dữ liệu lọc công ty"));
    } finally {
      setMasterLoading(false);
    }
  };

  const search = () => {
    void loadCompanies({
      company_name: companyName,
      phone,
      account_number: accountNumber,
      opened_at_from: openedAtFrom,
      opened_at_to: openedAtTo,
      tax_code: taxCode,
      email,
      website,
      primary_contact_name: primaryContactName,
      source,
      rating,
      membership_tier: membershipTier,
      assigned_employee: assignedEmployee,
      status,
      address,
    });
  };

  const clearFilter = () => {
    setCompanyName("");
    setPhone("");
    setAccountNumber("");
    setOpenedAtFrom("");
    setOpenedAtTo("");
    setTaxCode("");
    setEmail("");
    setWebsite("");
    setPrimaryContactName("");
    setSource("");
    setRating("");
    setMembershipTier("");
    setAssignedEmployee("");
    setStatus("");
    setAddress("");

    void loadCompanies({
      company_name: "",
      phone: "",
      account_number: "",
      opened_at_from: "",
      opened_at_to: "",
      tax_code: "",
      email: "",
      website: "",
      primary_contact_name: "",
      source: "",
      rating: "",
      membership_tier: "",
      assigned_employee: "",
      status: "",
      address: "",
    });
  };

  const goToDetail = (id: number | string) => {
    router.push(`/companies/${id}`);
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
    if (!authService.isAuthenticated()) {
      return;
    }

    void loadCompanies();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedTextFilters,
    openedAtFrom,
    openedAtTo,
    source,
    rating,
    membershipTier,
    assignedEmployee,
    status,
  ]);

  return {
    companies,
    count,
    fromRecord,
    toRecord,

    sources,
    ratings,
    membershipTiers,
    employees,

    companyName,
    setCompanyName,

    phone,
    setPhone,

    accountNumber,
    setAccountNumber,

    openedAtFrom,
    setOpenedAtFrom,

    openedAtTo,
    setOpenedAtTo,

    taxCode,
    setTaxCode,

    email,
    setEmail,

    website,
    setWebsite,

    primaryContactName,
    setPrimaryContactName,

    source,
    setSource,

    rating,
    setRating,

    membershipTier,
    setMembershipTier,

    assignedEmployee,
    setAssignedEmployee,

    status,
    setStatus,

    address,
    setAddress,

    loading,
    masterLoading,
    error,
    masterError,

    search,
    clearFilter,
    goToDetail,
    reload: loadCompanies,
  };
}