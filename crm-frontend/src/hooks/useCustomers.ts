"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { authService } from "@/services/auth.service";
import { customerService } from "@/services/customer.service";
import { masterDataService } from "@/services/master-data.service";
import {
  BranchOption,
  CustomerListItem,
  CustomerListParams,
} from "@/types/customer.type";

function getErrorMessage(err: unknown, fallback: string) {
  const error = err as {
    response?: {
      status?: number;
      data?: unknown;
    };
    message?: string;
  };

  const status = error?.response?.status;
  const detail = error?.response?.data
    ? JSON.stringify(error.response.data)
    : error?.message;

  return `${fallback}. Status: ${status} - ${detail}`;
}

export function useCustomers() {
  const router = useRouter();

  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [count, setCount] = useState(0);

  const [q, setQ] = useState("");
  const [branch, setBranch] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [error, setError] = useState("");

  const fromRecord = count === 0 ? 0 : 1;
  const toRecord = Math.min(20, count);

  const buildParams = (): CustomerListParams => ({
    q,
    branch,
    phone,
    status,
  });

  const loadCustomers = async (params: CustomerListParams = buildParams()) => {
    try {
      setLoading(true);
      setError("");

      const data = await customerService.getCustomers(params);

      setCustomers(data.results || []);
      setCount(data.count || 0);
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được danh sách khách hàng"));
    } finally {
      setLoading(false);
    }
  };

  const loadBranches = async () => {
    try {
      setLoadingBranches(true);

      const data = await masterDataService.getBranches();

      setBranches(data);
    } catch {
      setBranches([]);
    } finally {
      setLoadingBranches(false);
    }
  };

  const search = () => {
    void loadCustomers();
  };

  const clearFilter = () => {
    setQ("");
    setBranch("");
    setPhone("");
    setStatus("");

    void loadCustomers({
      q: "",
      branch: "",
      phone: "",
      status: "",
    });
  };

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/login");
      return;
    }

    void loadBranches();
    void loadCustomers({
      q: "",
      branch: "",
      phone: "",
      status: "",
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  return {
    customers,
    branches,
    count,
    fromRecord,
    toRecord,

    q,
    setQ,
    branch,
    setBranch,
    phone,
    setPhone,
    status,
    setStatus,

    loading,
    loadingBranches,
    error,

    search,
    clearFilter,
    reload: loadCustomers,
  };
}