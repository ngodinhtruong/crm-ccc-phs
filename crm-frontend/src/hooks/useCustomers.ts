"use client";
import { getErrorMessage } from "@/utils/error.util";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { useTablePagination } from "@/hooks/useTablePagination";

export function useCustomers(options?: {
    /**
     * Hạng thành viên lọc sẵn ngay khi mở màn hình, đối chiếu theo tên hạng.
     *
     * Nhận tên chứ không nhận id vì id chỉ biết được sau khi tải xong master
     * data; nơi gọi không có cách nào truyền id vào lúc mount.
     */
    defaultMembershipTierName?: string;
}) {
    const router = useRouter();

    const defaultMembershipTierName = options?.defaultMembershipTierName;

    const [customers, setCustomers] = useState<CustomerListItem[]>([]);
    const [count, setCount] = useState(0);

    const pagination = useTablePagination(count);

    const [branches, setBranches] = useState<BranchOption[]>([]);
    const [customerTypes, setCustomerTypes] = useState<CustomerTypeOption[]>([]);
    const [sources, setSources] = useState<CustomerSourceOption[]>([]);
    const [ratings, setRatings] = useState<CustomerRatingOption[]>([]);
    const [membershipTiers, setMembershipTiers] = useState<
        MembershipTierOption[]
    >([]);

    // Grouping all filter states into one object to optimize renders and make reset cleaner
    const [filters, setFilters] = useState({
        openedAccountFrom: "",
        openedAccountTo: "",
        fullName: "",
        phone: "",
        accountNumber: "",
        companyName: "",
        email: "",
        membershipTier: "",
        assignedEmployeeName: "",
        source: "",
        dateOfBirthFrom: "",
        dateOfBirthTo: "",
        description: "",
        status: "",
        branch: "",
        customerType: "",
        rating: "",
    });

    // Individual getters for backwards compatibility
    const openedAccountFrom = filters.openedAccountFrom;
    const openedAccountTo = filters.openedAccountTo;
    const fullName = filters.fullName;
    const phone = filters.phone;
    const accountNumber = filters.accountNumber;
    const companyName = filters.companyName;
    const email = filters.email;
    const membershipTier = filters.membershipTier;
    const assignedEmployeeName = filters.assignedEmployeeName;
    const source = filters.source;
    const dateOfBirthFrom = filters.dateOfBirthFrom;
    const dateOfBirthTo = filters.dateOfBirthTo;
    const description = filters.description;
    const status = filters.status;
    const branch = filters.branch;
    const customerType = filters.customerType;
    const rating = filters.rating;

    // Stable individual setters using useCallback for backwards compatibility
    const setOpenedAccountFrom = useCallback((val: string) => {
        setFilters((prev) => ({ ...prev, openedAccountFrom: val }));
    }, []);

    const setOpenedAccountTo = useCallback((val: string) => {
        setFilters((prev) => ({ ...prev, openedAccountTo: val }));
    }, []);

    const setFullName = useCallback((val: string) => {
        setFilters((prev) => ({ ...prev, fullName: val }));
    }, []);

    const setPhone = useCallback((val: string) => {
        setFilters((prev) => ({ ...prev, phone: val }));
    }, []);

    const setAccountNumber = useCallback((val: string) => {
        setFilters((prev) => ({ ...prev, accountNumber: val }));
    }, []);

    const setCompanyName = useCallback((val: string) => {
        setFilters((prev) => ({ ...prev, companyName: val }));
    }, []);

    const setEmail = useCallback((val: string) => {
        setFilters((prev) => ({ ...prev, email: val }));
    }, []);

    const setMembershipTier = useCallback((val: string) => {
        setFilters((prev) => ({ ...prev, membershipTier: val }));
    }, []);

    const setAssignedEmployeeName = useCallback((val: string) => {
        setFilters((prev) => ({ ...prev, assignedEmployeeName: val }));
    }, []);

    const setSource = useCallback((val: string) => {
        setFilters((prev) => ({ ...prev, source: val }));
    }, []);

    const setDateOfBirthFrom = useCallback((val: string) => {
        setFilters((prev) => ({ ...prev, dateOfBirthFrom: val }));
    }, []);

    const setDateOfBirthTo = useCallback((val: string) => {
        setFilters((prev) => ({ ...prev, dateOfBirthTo: val }));
    }, []);

    const setDescription = useCallback((val: string) => {
        setFilters((prev) => ({ ...prev, description: val }));
    }, []);

    const setStatus = useCallback((val: string) => {
        setFilters((prev) => ({ ...prev, status: val }));
    }, []);

    const setBranch = useCallback((val: string) => {
        setFilters((prev) => ({ ...prev, branch: val }));
    }, []);

    const setCustomerType = useCallback((val: string) => {
        setFilters((prev) => ({ ...prev, customerType: val }));
    }, []);

    const setRating = useCallback((val: string) => {
        setFilters((prev) => ({ ...prev, rating: val }));
    }, []);

    const [loading, setLoading] = useState(true);
    const [masterLoading, setMasterLoading] = useState(true);
    const [error, setError] = useState("");
    const [masterError, setMasterError] = useState("");

    // Chưa áp xong hạng mặc định thì chưa tải danh sách. Tải trước rồi lọc sau
    // sẽ có hai request chạy song song, mà request cũ về muộn sẽ ghi đè kết
    // quả đã lọc — màn hình hiện đủ toàn bộ khách dù ô lọc đang chọn một hạng.
    const [defaultTierApplied, setDefaultTierApplied] = useState(
        !defaultMembershipTierName
    );

    const textFilters = useMemo<CustomerListParams>(
        () => ({
            full_name: filters.fullName,
            phone: filters.phone,
            account_number: filters.accountNumber,
            company_name: filters.companyName,
            email: filters.email,
            assigned_employee_name: filters.assignedEmployeeName,
            description: filters.description,
        }),
        [
            filters.fullName,
            filters.phone,
            filters.accountNumber,
            filters.companyName,
            filters.email,
            filters.assignedEmployeeName,
            filters.description,
        ]
    );

    const debouncedTextFilters = useDebounce(textFilters, 500);

    const buildParams = useCallback(
        (customParams?: Partial<CustomerListParams>, pageValue = 1): CustomerListParams => ({
            ...debouncedTextFilters,

            page: String(pageValue),

            opened_account_from: filters.openedAccountFrom,
            opened_account_to: filters.openedAccountTo,

            membership_tier: filters.membershipTier,
            source: filters.source,
            status: filters.status,
            branch: filters.branch,
            customer_type: filters.customerType,
            rating: filters.rating,

            date_of_birth_from: filters.dateOfBirthFrom,
            date_of_birth_to: filters.dateOfBirthTo,

            ...customParams,
        }),
        [debouncedTextFilters, filters]
    );

    const loadCustomers = useCallback(
        async (params?: CustomerListParams, pageValue = 1) => {
            try {
                setLoading(true);
                setError("");

                const data = await customerService.getCustomers(
                    params || buildParams({}, pageValue)
                );

                setCustomers(data.results || []);
                setCount(data.count || 0);
            } catch (err) {
                setError(getErrorMessage(err, "Không tải được danh sách khách hàng"));
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
            void loadCustomers(
                buildParams(
                    {
                        page: String(safePage),
                    },
                    safePage
                ),
                safePage
            );
        },
        [pagination, loadCustomers, buildParams]
    );

    const previousPage = useCallback(() => {
        if (pagination.page <= 1) return;
        goToPage(pagination.page - 1);
    }, [pagination.page, goToPage]);

    const nextPage = useCallback(() => {
        if (pagination.page >= pagination.totalPages) return;
        goToPage(pagination.page + 1);
    }, [pagination.page, pagination.totalPages, goToPage]);

    const loadMasterData = useCallback(async () => {
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

            setBranches(branchData as BranchOption[]);
            setCustomerTypes(customerTypeData);
            setSources(sourceData);
            setRatings(ratingData);
            setMembershipTiers(membershipTierData);

            if (defaultMembershipTierName) {
                const matched = membershipTierData.find(
                    (tier) => tier.tier_name === defaultMembershipTierName
                );

                if (matched) {
                    setFilters((prev) => ({
                        ...prev,
                        membershipTier: String(matched.id),
                    }));
                }

                // Mở khoá kể cả khi không tìm thấy hạng, nếu không màn hình
                // sẽ kẹt ở trạng thái đang tải mãi.
                setDefaultTierApplied(true);
            }
        } catch (err) {
            setMasterError(
                getErrorMessage(err, "Không tải được dữ liệu lọc khách hàng")
            );
        } finally {
            setMasterLoading(false);
        }
    }, [defaultMembershipTierName]);

    const search = useCallback(() => {
        pagination.resetPage();

        void loadCustomers(
            {
                page: "1",

                opened_account_from: filters.openedAccountFrom,
                opened_account_to: filters.openedAccountTo,

                full_name: filters.fullName,
                phone: filters.phone,
                account_number: filters.accountNumber,
                company_name: filters.companyName,
                email: filters.email,

                membership_tier: filters.membershipTier,
                assigned_employee_name: filters.assignedEmployeeName,
                source: filters.source,

                date_of_birth_from: filters.dateOfBirthFrom,
                date_of_birth_to: filters.dateOfBirthTo,

                description: filters.description,
                status: filters.status,
                branch: filters.branch,
                customer_type: filters.customerType,
                rating: filters.rating,
            },
            1
        );
    }, [pagination, loadCustomers, filters]);

    const clearFilter = useCallback(() => {
        setFilters({
            openedAccountFrom: "",
            openedAccountTo: "",
            fullName: "",
            phone: "",
            accountNumber: "",
            companyName: "",
            email: "",
            membershipTier: "",
            assignedEmployeeName: "",
            source: "",
            dateOfBirthFrom: "",
            dateOfBirthTo: "",
            description: "",
            status: "",
            branch: "",
            customerType: "",
            rating: "",
        });

        pagination.resetPage();

        void loadCustomers({ page: "1" }, 1);
    }, [pagination, loadCustomers]);

    useEffect(() => {
        if (!authService.isAuthenticated()) {
            router.push("/login");
            return;
        }

        void loadMasterData();
    }, [router, loadMasterData]);

    useEffect(() => {
        if (!authService.isAuthenticated() || !defaultTierApplied) {
            return;
        }

        pagination.resetPage();
        void loadCustomers(buildParams({ page: "1" }, 1), 1);
    }, [
        defaultTierApplied,
        debouncedTextFilters,
        filters.openedAccountFrom,
        filters.openedAccountTo,
        filters.membershipTier,
        filters.source,
        filters.status,
        filters.branch,
        filters.customerType,
        filters.rating,
        filters.dateOfBirthFrom,
        filters.dateOfBirthTo,
        loadCustomers,
        buildParams,
    ]);

    return {
        customers,
        count,

        page: pagination.page,
        pageSize: pagination.pageSize,
        totalPages: pagination.totalPages,
        fromRecord: pagination.fromRecord,
        toRecord: pagination.toRecord,
        previousPage,
        nextPage,
        goToPage,

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