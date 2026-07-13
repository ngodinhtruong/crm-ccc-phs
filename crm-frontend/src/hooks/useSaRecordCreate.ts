"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { accountService } from "@/services/account.service";

import { authService } from "@/services/auth.service";
import { saleAdminService } from "@/services/sale-admin.service";
import {
    SaCallResult,
    SaIcpGroup,
    SaInterestLevel,
    SaRecordCreateFormState,
    SaRecordCreatePayload,
} from "@/types/sale-admin.type";

function getToday() {
    return new Date().toISOString().slice(0, 10);
}

function formatApiErrorData(data: unknown): string {
    if (!data) {
        return "";
    }

    if (typeof data === "string") {
        return data;
    }

    if (Array.isArray(data)) {
        return data.map(String).join(" ");
    }

    if (typeof data === "object") {
        const obj = data as Record<string, unknown>;

        const fieldLabels: Record<string, string> = {
            account_no: "Số tài khoản",
            call_date: "Ngày gọi",
            follow_no: "Lần follow",
            call_result: "Kết quả cuộc gọi",
            interest_level: "Mức quan tâm",
            icp_group: "Nhóm ICP",
            transaction_value_snapshot: "Tổng giá trị giao dịch",
            transaction_fee_snapshot: "Phí giao dịch",
            non_field_errors: "Lỗi",
            detail: "Lỗi",
        };

        const messages: string[] = [];

        Object.entries(obj).forEach(([key, value]) => {
            const label = fieldLabels[key] || key;

            if (Array.isArray(value)) {
                messages.push(`${label}: ${value.map(String).join(" ")}`);
                return;
            }

            if (typeof value === "string") {
                messages.push(`${label}: ${value}`);
                return;
            }

            if (value && typeof value === "object") {
                messages.push(`${label}: ${JSON.stringify(value)}`);
            }
        });

        return messages.join(" ");
    }

    return String(data);
}

function getErrorMessage(err: unknown, fallback: string) {
    const error = err as {
        response?: {
            status?: number;
            data?: unknown;
        };
        message?: string;
    };

    const status = error?.response?.status || "unknown";
    const apiMessage = formatApiErrorData(error?.response?.data);

    if (apiMessage) {
        return `${fallback}. ${apiMessage}`;
    }

    return `${fallback}. Status: ${status} - ${error?.message || "Không rõ lỗi"}`;
}

const initialForm: SaRecordCreateFormState = {
    accountNo: "",
    customerNameSnapshot: "",
    branchNameSnapshot: "",
    picNameSnapshot: "",
    accountStatus: "",
    vipClassification: "",

    callDate: getToday(),
    followNo: "1",

    callResult: "",
    interestLevel: "",
    icpGroup: "",

    introducedProduct: false,
    reactivation: false,
    supportInfo: false,
    referredRm: false,

    handoverToBroker: false,
    brokerHandoverNote: "",

    transactionValueSnapshot: "0",
    transactionFeeSnapshot: "0",

    note: "",
};


function getSaPicName(me: any) {
    return (
        me.employee_name ||
        me.employee?.full_name ||
        [me.last_name, me.first_name].filter(Boolean).join(" ") ||
        me.username ||
        ""
    );
}

function getSaBranchName(me: any) {
    return (
        me.branch_name ||
        me.employee?.branch_name ||
        me.employee?.branch?.branch_name ||
        ""
    );
}

export function useSaRecordCreate() {
    const router = useRouter();

    const [form, setForm] = useState<SaRecordCreateFormState>(initialForm);

    const [callResults, setCallResults] = useState<SaCallResult[]>([]);
    const [interestLevels, setInterestLevels] = useState<SaInterestLevel[]>([]);
    const [icpGroups, setIcpGroups] = useState<SaIcpGroup[]>([]);

    const [loadingMaster, setLoadingMaster] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [error, setError] = useState("");
    const [masterError, setMasterError] = useState("");


    const loadSaProfile = async () => {
        try {
            const me = await accountService.getMe();

            const picName = getSaPicName(me);
            const branchName = getSaBranchName(me);

            setForm((prev) => ({
                ...prev,
                picNameSnapshot: picName,
                branchNameSnapshot: branchName,
            }));

            if (!picName || !branchName) {
                setError(
                    "Tài khoản SA chưa được liên kết hồ sơ nhân viên hoặc chi nhánh. Vui lòng kiểm tra User Management."
                );
            }
        } catch {
            setError("Không tải được hồ sơ người dùng SA.");
        }
    };
    const setField = <K extends keyof SaRecordCreateFormState>(
        key: K,
        value: SaRecordCreateFormState[K]
    ) => {
        setForm((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const loadMasterData = async () => {
        try {
            setLoadingMaster(true);
            setMasterError("");

            const [callResultData, interestLevelData, icpGroupData] =
                await Promise.all([
                    saleAdminService.getCallResults(),
                    saleAdminService.getInterestLevels(),
                    saleAdminService.getIcpGroups(),
                ]);

            setCallResults(callResultData);
            setInterestLevels(interestLevelData);
            setIcpGroups(icpGroupData);
        } catch (err) {
            setMasterError(
                getErrorMessage(err, "Không tải được master data SA Record")
            );
        } finally {
            setLoadingMaster(false);
        }
    };

    const buildPayload = (): SaRecordCreatePayload => {
        return {
            account_no: form.accountNo.trim(),

            customer_name_snapshot: form.customerNameSnapshot.trim(),
            branch_name_snapshot: form.branchNameSnapshot.trim(),
            pic_name_snapshot: form.picNameSnapshot.trim(),
            account_status: form.accountStatus.trim(),
            vip_classification: form.vipClassification.trim(),

            call_date: form.callDate,
            follow_no: Number(form.followNo || 1),

            call_result: Number(form.callResult),
            interest_level: form.interestLevel ? Number(form.interestLevel) : null,
            icp_group: form.icpGroup ? Number(form.icpGroup) : null,

            introduced_product: form.introducedProduct,
            reactivation: form.reactivation,
            support_info: form.supportInfo,
            referred_rm: form.referredRm,

            handover_to_broker: form.handoverToBroker,
            broker_handover_note: form.brokerHandoverNote.trim(),

            transaction_value_snapshot: form.transactionValueSnapshot || "0",
            transaction_fee_snapshot: form.transactionFeeSnapshot || "0",

            note: form.note.trim(),

            source_system: "CRM_MINI",
            data_status: "VALID",
        };
    };

    const validate = () => {
        if (!form.accountNo.trim()) {
            return "Vui lòng nhập số tài khoản lưu ký.";
        }

        if (!form.callDate) {
            return "Vui lòng chọn ngày gọi.";
        }

        if (!form.callResult) {
            return "Vui lòng chọn kết quả cuộc gọi.";
        }

        if (Number(form.followNo || 0) < 1) {
            return "Lần follow phải lớn hơn hoặc bằng 1.";
        }

        if (
            form.transactionValueSnapshot &&
            Number(form.transactionValueSnapshot) < 0
        ) {
            return "Tổng giá trị giao dịch không được âm.";
        }

        if (form.transactionFeeSnapshot && Number(form.transactionFeeSnapshot) < 0) {
            return "Phí giao dịch không được âm.";
        }

        return "";
    };

    const submit = async () => {
        const message = validate();

        if (message) {
            setError(message);
            return;
        }

        if (!form.picNameSnapshot.trim() || !form.branchNameSnapshot.trim()) {
            setError(
                "Không thể tạo SA Record vì tài khoản SA chưa có hồ sơ nhân viên hoặc chi nhánh."
            );
            return;
        }

        try {
            setSubmitting(true);
            setError("");

            await saleAdminService.createSaRecord(buildPayload());

            router.push("/sale-admin/records");
        } catch (err) {
            setError(getErrorMessage(err, "Không tạo được SA Record"));
        } finally {
            setSubmitting(false);
        }
    };

    const cancel = () => {
        router.push("/sale-admin/records");
    };

    useEffect(() => {
        if (!authService.isAuthenticated()) {
            router.push("/login");
            return;
        }

        void loadMasterData();
        void loadSaProfile();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router]);

    return {
        form,
        setField,

        callResults,
        interestLevels,
        icpGroups,

        loadingMaster,
        submitting,

        error,
        masterError,

        submit,
        cancel,
    };
}