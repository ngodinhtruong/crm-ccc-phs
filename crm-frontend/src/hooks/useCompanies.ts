"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { authService } from "@/services/auth.service";
import { companyService } from "@/services/company.service";
import {
  CompanyListItem,
  CompanyListParams,
} from "@/types/company.type";

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

export function useCompanies() {
  const router = useRouter();

  const [companies, setCompanies] = useState<CompanyListItem[]>([]);
  const [count, setCount] = useState(0);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fromRecord = count === 0 ? 0 : 1;
  const toRecord = Math.min(20, count);

  const buildParams = (): CompanyListParams => ({
    q,
    status,
  });

  const loadCompanies = async (params: CompanyListParams = buildParams()) => {
    try {
      setLoading(true);
      setError("");

      const data = await companyService.getCompanies(params);

      setCompanies(data.results || []);
      setCount(data.count || 0);
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được danh sách công ty"));
    } finally {
      setLoading(false);
    }
  };

  const search = () => {
    void loadCompanies();
  };

  const clearFilter = () => {
    setQ("");
    setStatus("");

    void loadCompanies({
      q: "",
      status: "",
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

    void loadCompanies({
      q: "",
      status: "",
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  return {
    companies,
    count,
    fromRecord,
    toRecord,

    q,
    setQ,
    status,
    setStatus,

    loading,
    error,

    search,
    clearFilter,
    goToDetail,
    reload: loadCompanies,
  };
}