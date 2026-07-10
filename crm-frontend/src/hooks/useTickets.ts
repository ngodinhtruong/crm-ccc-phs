"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useDebounce } from "@/hooks/useDebounce";
import { authService } from "@/services/auth.service";
import { ticketService } from "@/services/ticket.service";
import {
  TicketClassificationOption,
  TicketListItem,
  TicketListParams,
  TicketStatusOption,
  TicketSupportCategoryOption,
} from "@/types/ticket.type";

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

export function useTickets() {
  const router = useRouter();

  const [items, setItems] = useState<TicketListItem[]>([]);
  const [count, setCount] = useState(0);

  const [supportCategories, setSupportCategories] = useState<
    TicketSupportCategoryOption[]
  >([]);
  const [classifications, setClassifications] = useState<
    TicketClassificationOption[]
  >([]);
  const [statuses, setStatuses] = useState<TicketStatusOption[]>([]);

  const [ticketCode, setTicketCode] = useState("");
  const [classificationMethod, setClassificationMethod] = useState("");

  const [supportCategory, setSupportCategory] = useState("");
  const [classification, setClassification] = useState("");
  const [currentStatus, setCurrentStatus] = useState("");

  const [companyName, setCompanyName] = useState("");
  const [customerName, setCustomerName] = useState("");

  const [ownerUserName, setOwnerUserName] = useState("");
  const [requestContent, setRequestContent] = useState("");

  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");

  const [loading, setLoading] = useState(true);
  const [masterLoading, setMasterLoading] = useState(true);

  const [error, setError] = useState("");
  const [masterError, setMasterError] = useState("");

  const textFilters = useMemo<TicketListParams>(
    () => ({
      ticket_code: ticketCode,
      company_name: companyName,
      customer_name: customerName,
      owner_user_name: ownerUserName,
      request_content: requestContent,
    }),
    [ticketCode, companyName, customerName, ownerUserName, requestContent]
  );

  const debouncedTextFilters = useDebounce(textFilters, 500);

  const filteredClassifications = useMemo(() => {
    if (!supportCategory) return classifications;

    return classifications.filter(
      (item) => String(item.support_category || "") === supportCategory
    );
  }, [classifications, supportCategory]);

  const buildParams = (
    customParams?: Partial<TicketListParams>
  ): TicketListParams => ({
    ...debouncedTextFilters,
    classification_method: classificationMethod,
    support_category: supportCategory,
    classification,
    current_status: currentStatus,
    created_from: createdFrom,
    created_to: createdTo,
    ...customParams,
  });

  const loadMasterData = async () => {
    try {
      setMasterLoading(true);
      setMasterError("");

      const [categoryData, classificationData, statusData] = await Promise.all([
        ticketService.getSupportCategories(),
        ticketService.getClassifications(),
        ticketService.getStatuses(),
      ]);

      setSupportCategories(categoryData);
      setClassifications(classificationData);
      setStatuses(statusData);
    } catch (err) {
      setMasterError(getErrorMessage(err, "Không tải được master data Ticket"));
    } finally {
      setMasterLoading(false);
    }
  };

  const loadTickets = async (params?: TicketListParams) => {
    try {
      setLoading(true);
      setError("");

      const data = await ticketService.getTickets(params || buildParams());

      setItems(data.results || []);
      setCount(data.count || 0);
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được danh sách ticket"));
    } finally {
      setLoading(false);
    }
  };

  const search = () => {
    void loadTickets({
      ticket_code: ticketCode,
      classification_method: classificationMethod,
      support_category: supportCategory,
      classification,
      current_status: currentStatus,
      company_name: companyName,
      customer_name: customerName,
      owner_user_name: ownerUserName,
      request_content: requestContent,
      created_from: createdFrom,
      created_to: createdTo,
    });
  };

  const clearFilter = () => {
    setTicketCode("");
    setClassificationMethod("");
    setSupportCategory("");
    setClassification("");
    setCurrentStatus("");
    setCompanyName("");
    setCustomerName("");
    setOwnerUserName("");
    setRequestContent("");
    setCreatedFrom("");
    setCreatedTo("");

    void loadTickets({
      ticket_code: "",
      classification_method: "",
      support_category: "",
      classification: "",
      current_status: "",
      company_name: "",
      customer_name: "",
      owner_user_name: "",
      request_content: "",
      created_from: "",
      created_to: "",
    });
  };

  const goCreate = () => {
    router.push("/tickets/create");
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

    void loadTickets();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedTextFilters,
    classificationMethod,
    supportCategory,
    classification,
    currentStatus,
    createdFrom,
    createdTo,
  ]);

  useEffect(() => {
    if (!supportCategory) {
      return;
    }

    const selectedClassificationStillValid = classifications.some(
      (item) =>
        String(item.id) === classification &&
        String(item.support_category || "") === supportCategory
    );

    if (!selectedClassificationStillValid) {
      setClassification("");
    }
  }, [supportCategory, classification, classifications]);

  return {
    items,
    count,

    fromRecord: items.length === 0 ? 0 : 1,
    toRecord: items.length,

    supportCategories,
    classifications,
    filteredClassifications,
    statuses,

    ticketCode,
    setTicketCode,

    classificationMethod,
    setClassificationMethod,

    supportCategory,
    setSupportCategory,

    classification,
    setClassification,

    currentStatus,
    setCurrentStatus,

    companyName,
    setCompanyName,

    customerName,
    setCustomerName,

    ownerUserName,
    setOwnerUserName,

    requestContent,
    setRequestContent,

    createdFrom,
    setCreatedFrom,

    createdTo,
    setCreatedTo,

    loading,
    masterLoading,
    error,
    masterError,

    search,
    clearFilter,
    goCreate,
    reload: loadTickets,
  };
}