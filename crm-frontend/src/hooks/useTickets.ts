"use client";
import { getErrorMessage } from "@/utils/error.util";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useDebounce } from "@/hooks/useDebounce";
import { authService } from "@/services/auth.service";
import { ticketService } from "@/services/ticket.service";
import {
    TicketClassificationOption,
    TicketErrorGroupOption,
    TicketErrorTypeOption,
    TicketListItem,
    TicketListParams,
    TicketPriorityOption,
    TicketSourceOption,
    TicketStatusOption,
    TicketSupportCategoryOption,
} from "@/types/ticket.type";

import { useTablePagination } from "@/hooks/useTablePagination";

export function useTickets() {
    const router = useRouter();

    const [items, setItems] = useState<TicketListItem[]>([]);
    const [count, setCount] = useState(0);

    const pagination = useTablePagination(count);

    const [supportCategories, setSupportCategories] = useState<
        TicketSupportCategoryOption[]
    >([]);
    const [classifications, setClassifications] = useState<
        TicketClassificationOption[]
    >([]);
    const [statuses, setStatuses] = useState<TicketStatusOption[]>([]);
    const [sources, setSources] = useState<TicketSourceOption[]>([]);
    const [priorities, setPriorities] = useState<TicketPriorityOption[]>([]);

    const [errorGroups, setErrorGroups] = useState<TicketErrorGroupOption[]>([]);
    const [errorTypes, setErrorTypes] = useState<TicketErrorTypeOption[]>([]);

    // Grouping all filter states into one object to optimize renders and make reset cleaner
    const [filters, setFilters] = useState(() => {
        let savedFrom = "";
        let savedTo = "";
        if (typeof window !== "undefined") {
            savedFrom = sessionStorage.getItem("ticket_list_createdFrom") || "";
            savedTo = sessionStorage.getItem("ticket_list_createdTo") || "";
        }
        return {
            ticketCode: "",
            classificationMethod: "",
            accountLinkStatus: "",
            accountNumber: "",
            supportCategory: "",
            classification: "",
            currentStatus: "",
            source: "",
            priority: "",
            isErrorTicket: "",
            errorGroup: "",
            errorType: "",
            relatedSystem: "",
            companyName: "",
            customerName: "",
            customerPhone: "",
            customerEmail: "",
            ownerUserName: "",
            requestContent: "",
            createdFrom: savedFrom,
            createdTo: savedTo,
        };
    });

    // Individual getters for backwards compatibility
    const ticketCode = filters.ticketCode;
    const classificationMethod = filters.classificationMethod;
    const accountLinkStatus = filters.accountLinkStatus;
    const accountNumber = filters.accountNumber;
    const supportCategory = filters.supportCategory;
    const classification = filters.classification;
    const currentStatus = filters.currentStatus;
    const source = filters.source;
    const priority = filters.priority;
    const isErrorTicket = filters.isErrorTicket;
    const errorGroup = filters.errorGroup;
    const errorType = filters.errorType;
    const relatedSystem = filters.relatedSystem;
    const companyName = filters.companyName;
    const customerName = filters.customerName;
    const customerPhone = filters.customerPhone;
    const customerEmail = filters.customerEmail;
    const ownerUserName = filters.ownerUserName;
    const requestContent = filters.requestContent;
    const createdFrom = filters.createdFrom;
    const createdTo = filters.createdTo;

    // Stable individual setters using useCallback for backwards compatibility
    const setTicketCode = useCallback((val: string) => {
        setFilters((prev) => ({ ...prev, ticketCode: val }));
    }, []);

    const setClassificationMethod = useCallback((val: string) => {
        setFilters((prev) => ({ ...prev, classificationMethod: val }));
    }, []);

    const setAccountLinkStatus = useCallback((val: string) => {
        setFilters((prev) => ({ ...prev, accountLinkStatus: val }));
    }, []);

    const setAccountNumber = useCallback((val: string) => {
        setFilters((prev) => ({ ...prev, accountNumber: val }));
    }, []);

    const setSupportCategory = useCallback((val: string) => {
        setFilters((prev) => ({ ...prev, supportCategory: val }));
    }, []);

    const setClassification = useCallback((val: string) => {
        setFilters((prev) => ({ ...prev, classification: val }));
    }, []);

    const setCurrentStatus = useCallback((val: string) => {
        setFilters((prev) => ({ ...prev, currentStatus: val }));
    }, []);

    const setSource = useCallback((val: string) => {
        setFilters((prev) => ({ ...prev, source: val }));
    }, []);

    const setPriority = useCallback((val: string) => {
        setFilters((prev) => ({ ...prev, priority: val }));
    }, []);

    const setIsErrorTicket = useCallback((val: string) => {
        setFilters((prev) => ({ ...prev, isErrorTicket: val }));
    }, []);

    const setErrorGroup = useCallback((val: string) => {
        setFilters((prev) => ({ ...prev, errorGroup: val }));
    }, []);

    const setErrorType = useCallback((val: string) => {
        setFilters((prev) => ({ ...prev, errorType: val }));
    }, []);

    const setRelatedSystem = useCallback((val: string) => {
        setFilters((prev) => ({ ...prev, relatedSystem: val }));
    }, []);

    const setCompanyName = useCallback((val: string) => {
        setFilters((prev) => ({ ...prev, companyName: val }));
    }, []);

    const setCustomerName = useCallback((val: string) => {
        setFilters((prev) => ({ ...prev, customerName: val }));
    }, []);

    const setCustomerPhone = useCallback((val: string) => {
        setFilters((prev) => ({ ...prev, customerPhone: val }));
    }, []);

    const setCustomerEmail = useCallback((val: string) => {
        setFilters((prev) => ({ ...prev, customerEmail: val }));
    }, []);

    const setOwnerUserName = useCallback((val: string) => {
        setFilters((prev) => ({ ...prev, ownerUserName: val }));
    }, []);

    const setRequestContent = useCallback((val: string) => {
        setFilters((prev) => ({ ...prev, requestContent: val }));
    }, []);

    const setCreatedFrom = useCallback((val: string) => {
        if (typeof window !== "undefined") sessionStorage.setItem("ticket_list_createdFrom", val);
        setFilters((prev) => ({ ...prev, createdFrom: val }));
    }, []);

    const setCreatedTo = useCallback((val: string) => {
        if (typeof window !== "undefined") sessionStorage.setItem("ticket_list_createdTo", val);
        setFilters((prev) => ({ ...prev, createdTo: val }));
    }, []);

    const [loading, setLoading] = useState(true);
    const [masterLoading, setMasterLoading] = useState(true);

    const [error, setError] = useState("");
    const [masterError, setMasterError] = useState("");

    const textFilters = useMemo<TicketListParams>(
        () => ({
            ticket_code: filters.ticketCode,
            customer_account_no: filters.accountNumber,
            company_name: filters.companyName,
            customer_name: filters.customerName,
            customer_phone: filters.customerPhone,
            customer_email: filters.customerEmail,
            owner_user_name: filters.ownerUserName,
            request_content: filters.requestContent,
            related_system: filters.relatedSystem,
        }),
        [
            filters.ticketCode,
            filters.accountNumber,
            filters.companyName,
            filters.customerName,
            filters.customerPhone,
            filters.customerEmail,
            filters.ownerUserName,
            filters.requestContent,
            filters.relatedSystem,
        ]
    );

    const debouncedTextFilters = useDebounce(textFilters, 500);

    const filteredClassifications = useMemo(() => {
        if (!filters.supportCategory) return classifications;

        return classifications.filter(
            (item) => String(item.support_category || "") === filters.supportCategory
        );
    }, [classifications, filters.supportCategory]);

    const filteredErrorTypes = useMemo(() => {
        if (!filters.errorGroup) return errorTypes;

        return errorTypes.filter(
            (item) => String(item.group || "") === filters.errorGroup
        );
    }, [errorTypes, filters.errorGroup]);

    const buildParams = useCallback(
        (customParams?: Partial<TicketListParams>, pageValue = 1): TicketListParams => ({
            ...debouncedTextFilters,

            page: String(pageValue),
            exclude_chatbot: "true",

            classification_method: filters.classificationMethod,
            account_link_status: filters.accountLinkStatus,
            support_category: filters.supportCategory,
            classification: filters.classification,
            current_status: filters.currentStatus,
            source: filters.source,
            priority: filters.priority,
            is_error_ticket: filters.isErrorTicket,
            error_group: filters.errorGroup,
            error_type: filters.errorType,
            created_from: filters.createdFrom,
            created_to: filters.createdTo,

            ...customParams,
        }),
        [debouncedTextFilters, filters]
    );

    const loadMasterData = useCallback(async () => {
        try {
            setMasterLoading(true);
            setMasterError("");

            const [
                categoryData,
                classificationData,
                statusData,
                sourceData,
                priorityData,
                errorGroupData,
                errorTypeData,
            ] = await Promise.all([
                ticketService.getSupportCategories(),
                ticketService.getClassifications(),
                ticketService.getStatuses(),
                ticketService.getSources(),
                ticketService.getPriorities(),
                ticketService.getErrorGroups(),
                ticketService.getErrorTypes(),
            ]);

            setSupportCategories(categoryData);
            setClassifications(classificationData);
            setStatuses(statusData);
            setSources(sourceData);
            setPriorities(priorityData);
            setErrorGroups(errorGroupData);
            setErrorTypes(errorTypeData);
        } catch (err) {
            setMasterError(getErrorMessage(err, "Không tải được master data Ticket"));
        } finally {
            setMasterLoading(false);
        }
    }, []);

    const loadTickets = useCallback(
        async (params?: TicketListParams, pageValue = 1) => {
            try {
                setLoading(true);
                setError("");

                const data = await ticketService.getTickets(
                    params || buildParams({}, pageValue)
                );

                setItems(data.results || []);
                setCount(data.count || 0);
            } catch (err) {
                setError(getErrorMessage(err, "Không tải được danh sách ticket"));
            } finally {
                setLoading(false);
            }
        },
        [buildParams]
    );

    const goToPage = useCallback(
        (nextPage: number) => {
            const safePage = Math.min(Math.max(nextPage, 1), pagination.totalPages);

            pagination.setPage(safePage);
            void loadTickets(buildParams({ page: String(safePage) }, safePage), safePage);
        },
        [pagination, loadTickets, buildParams]
    );

    const previousPage = useCallback(() => {
        if (pagination.page <= 1) return;
        goToPage(pagination.page - 1);
    }, [pagination.page, goToPage]);

    const nextPage = useCallback(() => {
        if (pagination.page >= pagination.totalPages) return;
        goToPage(pagination.page + 1);
    }, [pagination.page, pagination.totalPages, goToPage]);

    const search = useCallback(() => {
        pagination.resetPage();

        void loadTickets(
            {
                page: "1",
                exclude_chatbot: "true",
                ticket_code: filters.ticketCode,
                customer_account_no: filters.accountNumber,
                classification_method: filters.classificationMethod,
                account_link_status: filters.accountLinkStatus,
                support_category: filters.supportCategory,
                classification: filters.classification,
                current_status: filters.currentStatus,
                source: filters.source,
                priority: filters.priority,
                is_error_ticket: filters.isErrorTicket,
                error_group: filters.errorGroup,
                error_type: filters.errorType,
                related_system: filters.relatedSystem,
                company_name: filters.companyName,
                customer_name: filters.customerName,
                customer_phone: filters.customerPhone,
                customer_email: filters.customerEmail,
                owner_user_name: filters.ownerUserName,
                request_content: filters.requestContent,
                created_from: filters.createdFrom,
                created_to: filters.createdTo,
            },
            1
        );
    }, [pagination, loadTickets, filters]);

    const clearFilter = useCallback(() => {
        setFilters({
            ticketCode: "",
            classificationMethod: "",
            accountLinkStatus: "",
            accountNumber: "",
            supportCategory: "",
            classification: "",
            currentStatus: "",
            source: "",
            priority: "",
            isErrorTicket: "",
            errorGroup: "",
            errorType: "",
            relatedSystem: "",
            companyName: "",
            customerName: "",
            customerPhone: "",
            customerEmail: "",
            ownerUserName: "",
            requestContent: "",
            createdFrom: "",
            createdTo: "",
        });

        pagination.resetPage();

        void loadTickets({ page: "1", exclude_chatbot: "true" }, 1);
    }, [pagination, loadTickets]);

    const goCreate = useCallback(() => {
        router.push("/tickets/create");
    }, [router]);

    const goErrorCatalogs = useCallback(() => {
        router.push("/tickets/error-catalogs");
    }, [router]);

    useEffect(() => {
        if (!authService.isAuthenticated()) {
            router.push("/login");
            return;
        }

        void loadMasterData();
    }, [router, loadMasterData]);

    useEffect(() => {
        if (!authService.isAuthenticated()) {
            return;
        }

        pagination.resetPage();
        void loadTickets(buildParams({ page: "1" }, 1), 1);
    }, [
        debouncedTextFilters,
        filters.classificationMethod,
        filters.accountLinkStatus,
        filters.supportCategory,
        filters.classification,
        filters.currentStatus,
        filters.source,
        filters.priority,
        filters.isErrorTicket,
        filters.errorGroup,
        filters.errorType,
        filters.createdFrom,
        filters.createdTo,
        loadTickets,
        buildParams,
    ]);

    useEffect(() => {
        if (!filters.supportCategory) {
            return;
        }

        const selectedClassificationStillValid = classifications.some(
            (item) =>
                String(item.id) === filters.classification &&
                String(item.support_category || "") === filters.supportCategory
        );

        if (!selectedClassificationStillValid) {
            setFilters((prev) => ({ ...prev, classification: "" }));
        }
    }, [filters.supportCategory, filters.classification, classifications]);

    useEffect(() => {
        if (!filters.errorGroup) {
            return;
        }

        const selectedTypeStillValid = errorTypes.some(
            (item) =>
                String(item.id) === filters.errorType &&
                String(item.group || "") === filters.errorGroup
        );

        if (!selectedTypeStillValid) {
            setFilters((prev) => ({ ...prev, errorType: "" }));
        }
    }, [filters.errorGroup, filters.errorType, errorTypes]);

    return {
        items,
        count,

        page: pagination.page,
        pageSize: pagination.pageSize,
        totalPages: pagination.totalPages,
        fromRecord: pagination.fromRecord,
        toRecord: pagination.toRecord,
        previousPage,
        nextPage,
        goToPage,

        supportCategories,
        classifications,
        filteredClassifications,
        statuses,
        sources,
        priorities,
        errorGroups,
        errorTypes,
        filteredErrorTypes,

        ticketCode,
        setTicketCode,

        classificationMethod,
        setClassificationMethod,

        accountLinkStatus,
        setAccountLinkStatus,

        accountNumber,
        setAccountNumber,

        supportCategory,
        setSupportCategory,

        classification,
        setClassification,

        currentStatus,
        setCurrentStatus,

        source,
        setSource,

        priority,
        setPriority,

        isErrorTicket,
        setIsErrorTicket,

        errorGroup,
        setErrorGroup,

        errorType,
        setErrorType,

        relatedSystem,
        setRelatedSystem,

        companyName,
        setCompanyName,

        customerName,
        setCustomerName,

        customerPhone,
        setCustomerPhone,

        customerEmail,
        setCustomerEmail,

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
        goErrorCatalogs,
        reload: loadTickets,
    };
}
