"use client";
import { getErrorMessage } from "@/utils/error.util";

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

export function useCompanies() {
  const router = useRouter();

  const [companies, setCompanies] = useState<CompanyListItem[]>([]);
  const [count, setCount] = useState(0);

  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const fromRecord = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const toRecord = Math.min(page * PAGE_SIZE, count);

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
    customParams?: Partial<CompanyListParams>,
    pageValue = page
  ): CompanyListParams => ({
    ...debouncedTextFilters,

    page: String(pageValue),

    opened_at_from: openedAtFrom,
    opened_at_to: openedAtTo,

    source,
    rating,
    membership_tier: membershipTier,
    assigned_employee: assignedEmployee,
    status,

    ...customParams,
  });

  const loadCompanies = async (
    params?: CompanyListParams,
    pageValue = page
  ) => {
    try {
      setLoading(true);
      setError("");

      const data = await companyService.getCompanies(
        params || buildParams({}, pageValue)
      );

      setCompanies(data.results || []);
      setCount(data.count || 0);
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được danh sách công ty"));
    } finally {
      setLoading(false);
    }
  };

  const goToPage = (nextPage: number) => {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages);

    setPage(safePage);
    void loadCompanies(
      buildParams(
        {
          page: String(safePage),
        },
        safePage
      ),
      safePage
    );
  };

  const previousPage = () => {
    if (page <= 1) return;
    goToPage(page - 1);
  };

  const nextPage = () => {
    if (page >= totalPages) return;
    goToPage(page + 1);
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
    setPage(1);

    void loadCompanies(
      {
        page: "1",

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
      },
      1
    );
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

    setPage(1);

    void loadCompanies(
      {
        page: "1",

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
      },
      1
    );
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

    setPage(1);
    void loadCompanies(buildParams({ page: "1" }, 1), 1);

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

    page,
    pageSize: PAGE_SIZE,
    totalPages,
    fromRecord,
    toRecord,
    previousPage,
    nextPage,
    goToPage,

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