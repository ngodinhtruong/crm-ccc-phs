"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { accountService } from "@/services/account.service";
import { authService } from "@/services/auth.service";
import { masterDataService } from "@/services/master-data.service";
import { slaService } from "@/services/sla.service";
import { userService } from "@/services/user.service";
import { useUserAssignees } from "@/hooks/useUserAssignees";
import {
    SlaCreateFormState,
    SlaSelectOption,
    SlaTimeUnit,
} from "@/types/sla.type";
import { UserListItem } from "@/types/user.type";



const initialForm: SlaCreateFormState = {
    policyName: "",
    ticketCategory: "",
    targetTimeValue: "",
    targetTimeUnit: "MINUTE",
    processingUnit: "",
    assignedTo: "",
    assignedToLabel: "",
    description: "",
};

const assignees = useUserAssignees();

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

function getUserDisplayName(user: {
    username?: string;
    email?: string;
    employee_name?: string;
    first_name?: string;
    last_name?: string;
}) {
    return (
        user.employee_name ||
        `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
        user.username ||
        user.email ||
        "-"
    );
}

function convertToMinutes(value: string, unit: SlaTimeUnit) {
    const numberValue = Number(value);

    if (unit === "HOUR") {
        return numberValue * 60;
    }

    if (unit === "DAY") {
        return numberValue * 24 * 60;
    }

    return numberValue;
}

export function useSlaCreate() {
    const router = useRouter();

    const [form, setForm] = useState<SlaCreateFormState>(initialForm);

    const [ticketCategories, setTicketCategories] = useState<SlaSelectOption[]>([]);
    const [processingUnits, setProcessingUnits] = useState<SlaSelectOption[]>([]);
    const [users, setUsers] = useState<UserListItem[]>([]);

    const [loadingDropdowns, setLoadingDropdowns] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const setField = <K extends keyof SlaCreateFormState>(
        key: K,
        value: SlaCreateFormState[K]
    ) => {
        setForm((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const loadInitialData = async () => {
        try {
            setLoadingDropdowns(true);
            setError("");

            const [me, categoryData, processingUnitData, userData] =
                await Promise.all([
                    accountService.getMe(),
                    masterDataService.getTicketCategories(),
                    masterDataService.getProcessingUnits(),
                    userService.getUsers({
                        active: true,
                    }),
                ]);

            const userList = userData.results || [];

            const currentUserAsOption: UserListItem = {
                id: me.id,
                username: me.username,
                email: me.email,
                first_name: me.full_name || me.username,
                last_name: "",
                employee: me.employee?.id || null,
                employee_name: me.employee?.full_name || me.full_name || me.username,
                employee_code: me.employee?.employee_code || "",
                branch_name: me.employee?.branch?.branch_name || "",
                department: me.employee?.department || "",
                position: me.employee?.position || "",
                role_names: me.roles?.map((role) => role.role_name) || [],
                role_codes: me.roles?.map((role) => role.role_code) || [],
                status: "ACTIVE",
                is_active: true,
                is_staff: false,
                is_superuser: false,
            };

            const hasCurrentUser = userList.some((user) => user.id === me.id);
            const mergedUsers = hasCurrentUser
                ? userList
                : [currentUserAsOption, ...userList];

            setTicketCategories(categoryData || []);
            setProcessingUnits(processingUnitData || []);
            setUsers(mergedUsers);

            setForm((prev) => ({
                ...prev,
                assignedTo: String(me.id),
                assignedToLabel: getUserDisplayName(currentUserAsOption),
            }));
        } catch (err) {
            setError(getErrorMessage(err, "Không tải được dữ liệu SLA"));
        } finally {
            setLoadingDropdowns(false);
        }
    };
    useEffect(() => {
        if (!assignees.defaultAssignee) return;

        setForm((prev) => {
            if (prev.assignedTo) return prev;

            return {
                ...prev,
                assignedTo: assignees.defaultAssignee.id,
                assignedToLabel: assignees.defaultAssignee.label,
            };
        });
    }, [assignees.defaultAssignee]);

    const validateForm = () => {
        if (!form.policyName.trim()) {
            return "Tên SLA không được để trống.";
        }

        if (!form.ticketCategory) {
            return "Danh mục Ticket không được để trống.";
        }

        if (!form.targetTimeValue.trim()) {
            return "Thời gian xử lý tiêu chuẩn không được để trống.";
        }

        if (Number(form.targetTimeValue) <= 0) {
            return "Thời gian xử lý tiêu chuẩn phải lớn hơn 0.";
        }

        if (!form.processingUnit) {
            return "Phân công xử lý không được để trống.";
        }

        if (!form.assignedTo) {
            return "Giao cho không được để trống.";
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

            await slaService.createSlaPolicy({
                sla_name: form.policyName.trim(),
                support_category: Number(form.ticketCategory),
                processing_unit: Number(form.processingUnit),
                resolution_time_minutes: convertToMinutes(
                    form.targetTimeValue,
                    form.targetTimeUnit
                ),
                assigned_to_user: Number(form.assignedTo),
                description: form.description.trim() || undefined,
                status: "ACTIVE",
                is_active: true,
            });

            router.push("/sla");
        } catch (err) {
            setError(getErrorMessage(err, "Lưu SLA thất bại"));
        } finally {
            setSaving(false);
        }
    };

    const cancel = () => {
        router.push("/sla");
    };

    useEffect(() => {
        if (!authService.isAuthenticated()) {
            router.push("/login");
            return;
        }

        void loadInitialData();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router]);

    return {
        form,
        setField,

        ticketCategories,
        processingUnits,

        loadingDropdowns,
        saving,
        error,

        submit,
        cancel,

        users: assignees.users,
        assigneeLoading: assignees.loading,
        assigneeError: assignees.error,
    };
}

export type UseSlaCreateReturn = ReturnType<typeof useSlaCreate>;