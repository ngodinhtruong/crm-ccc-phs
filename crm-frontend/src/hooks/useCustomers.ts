"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useDebounce } from "@/hooks/useDebounce";
import { authService } from "@/services/auth.service";
import { customerService } from "@/services/customer.service";
import { masterDataService } from "@/services/master-data.service";
import {
  BranchOption,
  CustomerListItem,
  CustomerListParams,
  CustomerRatingOption,
  CustomerSourceOption,
  CustomerTypeOption,
  MembershipTierOption,
} from "@/types/customer.type";

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

export function useCustomers() {
  const router = useRouter();

  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [count, setCount] = useState(0);

  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [customerTypes, setCustomerTypes] = useState<CustomerTypeOption[]>([]);
  const [sources, setSources] = useState<CustomerSourceOption[]>([]);
  const [ratings, setRatings] = useState<CustomerRatingOption[]>([]);
  const [membershipTiers, setMembershipTiers] = useState<
    MembershipTierOption[]
  >([]);

  const [openedAccountFrom, setOpenedAccountFrom] = useState("");
  const [openedAccountTo, setOpenedAccountTo] = useState("");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");

  const [membershipTier, setMembershipTier] = useState("");
  const [assignedEmployeeName, setAssignedEmployeeName] = useState("");
  const [source, setSource] = useState("");

  const [dateOfBirthFrom, setDateOfBirthFrom] = useState("");
  const [dateOfBirthTo, setDateOfBirthTo] = useState("");

  const [description, setDescription] = useState("");

  const [status, setStatus] = useState("");
  const [branch, setBranch] = useState("");
  const [customerType, setCustomerType] = useState("");
  const [rating, setRating] = useState("");

  const [loading, setLoading] = useState(true);
  const [masterLoading, setMasterLoading] = useState(true);
  const [error, setError] = useState("");
  const [masterError, setMasterError] = useState("");

  const fromRecord = count === 0 ? 0 : 1;
  const toRecord = Math.min(20, count);

  const textFilters = useMemo<CustomerListParams>(
    () => ({
      full_name: fullName,
      phone,
      account_number: accountNumber,
      company_name: companyName,
      email,
      assigned_employee_name: assignedEmployeeName,
      description,
    }),
    [
      fullName,
      phone,
      accountNumber,
      companyName,
      email,
      assignedEmployeeName,
      description,
    ]
  );

  const debouncedTextFilters = useDebounce(textFilters, 500);

  const buildParams = (
    customParams?: Partial<CustomerListParams>
  ): CustomerListParams => ({
    ...debouncedTextFilters,

    opened_account_from: openedAccountFrom,
    opened_account_to: openedAccountTo,

    membership_tier: membershipTier,
    source,
    status,
    branch,
    customer_type: customerType,
    rating,

    date_of_birth_from: dateOfBirthFrom,
    date_of_birth_to: dateOfBirthTo,

    ...customParams,
  });

  const loadCustomers = async (params?: CustomerListParams) => {
    try {
      setLoading(true);
      setError("");

      const data = await customerService.getCustomers(params || buildParams());

      setCustomers(data.results || []);
      setCount(data.count || 0);
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được danh sách khách hàng"));
    } finally {
      setLoading(false);
    }
  };

  const loadMasterData = async () => {
    try {
      setMasterLoading(true);
      setMasterError("");

      const [
        branchData,
        customerTypeData,
        sourceData,
        ratingData,
        membershipTierData,
      ] = await Promise.all([
        masterDataService.getBranches(),
        customerService.getCustomerTypes(),
        customerService.getSources(),
        customerService.getRatings(),
        customerService.getMembershipTiers(),
      ]);

      setBranches(branchData);
      setCustomerTypes(customerTypeData);
      setSources(sourceData);
      setRatings(ratingData);
      setMembershipTiers(membershipTierData);
    } catch (err) {
      setMasterError(
        getErrorMessage(err, "Không tải được dữ liệu lọc khách hàng")
      );
    } finally {
      setMasterLoading(false);
    }
  };

  const search = () => {
    void loadCustomers({
      opened_account_from: openedAccountFrom,
      opened_account_to: openedAccountTo,

      full_name: fullName,
      phone,
      account_number: accountNumber,
      company_name: companyName,
      email,

      membership_tier: membershipTier,
      assigned_employee_name: assignedEmployeeName,
      source,

      date_of_birth_from: dateOfBirthFrom,
      date_of_birth_to: dateOfBirthTo,

      description,
      status,
      branch,
      customer_type: customerType,
      rating,
    });
  };

  const clearFilter = () => {
    setOpenedAccountFrom("");
    setOpenedAccountTo("");

    setFullName("");
    setPhone("");
    setAccountNumber("");
    setCompanyName("");
    setEmail("");

    setMembershipTier("");
    setAssignedEmployeeName("");
    setSource("");

    setDateOfBirthFrom("");
    setDateOfBirthTo("");

    setDescription("");

    setStatus("");
    setBranch("");
    setCustomerType("");
    setRating("");

    void loadCustomers({
      opened_account_from: "",
      opened_account_to: "",

      full_name: "",
      phone: "",
      account_number: "",
      company_name: "",
      email: "",

      membership_tier: "",
      assigned_employee_name: "",
      source: "",

      date_of_birth_from: "",
      date_of_birth_to: "",

      description: "",
      status: "",
      branch: "",
      customer_type: "",
      rating: "",
    });
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

    void loadCustomers();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedTextFilters,

    openedAccountFrom,
    openedAccountTo,

    membershipTier,
    source,
    status,
    branch,
    customerType,
    rating,

    dateOfBirthFrom,
    dateOfBirthTo,
  ]);

  return {
    customers,
    count,
    fromRecord,
    toRecord,

    branches,
    customerTypes,
    sources,
    ratings,
    membershipTiers,

    openedAccountFrom,
    setOpenedAccountFrom,

    openedAccountTo,
    setOpenedAccountTo,

    fullName,
    setFullName,

    phone,
    setPhone,

    accountNumber,
    setAccountNumber,

    companyName,
    setCompanyName,

    email,
    setEmail,

    membershipTier,
    setMembershipTier,

    assignedEmployeeName,
    setAssignedEmployeeName,

    source,
    setSource,

    dateOfBirthFrom,
    setDateOfBirthFrom,

    dateOfBirthTo,
    setDateOfBirthTo,

    description,
    setDescription,

    status,
    setStatus,

    branch,
    setBranch,

    customerType,
    setCustomerType,

    rating,
    setRating,

    loading,
    masterLoading,
    error,
    masterError,

    search,
    clearFilter,
    reload: loadCustomers,
  };
}