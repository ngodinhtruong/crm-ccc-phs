"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";

import { UserListItem } from "@/types/user.type";
import { getAssigneeLabel } from "@/hooks/useUserAssignees";

function getUserDisplayName(user: UserListItem) {
    return (
        user.employee_name ||
        `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
        user.username ||
        user.email ||
        "-"
    );
}

function getUserMeta(user: UserListItem) {
    return [
        user.email,
        user.username,
        user.employee_code,
        user.branch_name,
        user.department,
    ]
        .filter(Boolean)
        .join(" · ");
}

export function UserAssigneeCombobox({
    users,
    value,
    label,
    placeholder = "Nhập email người được giao...",
    onChange,
}: {
    users: UserListItem[];
    value: string;
    label: string;
    placeholder?: string;
    onChange: (userId: string, label: string) => void;
}) {
    const wrapperRef = useRef<HTMLDivElement | null>(null);

    const [keyword, setKeyword] = useState(label || "");
    const [open, setOpen] = useState(false);

    useEffect(() => {
        setKeyword(label || "");
    }, [label]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                wrapperRef.current &&
                !wrapperRef.current.contains(event.target as Node)
            ) {
                setOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const filteredUsers = useMemo(() => {
        const searchText = keyword.trim().toLowerCase();

        if (!searchText) {
            return users.slice(0, 20);
        }

        return users
            .filter((user) => {
                const email = String(user.email || "").toLowerCase();
                const username = String(user.username || "").toLowerCase();
                const employeeName = String(user.employee_name || "").toLowerCase();
                const fullName = `${user.first_name || ""} ${user.last_name || ""}`
                    .trim()
                    .toLowerCase();

                return (
                    email.includes(searchText) ||
                    username.includes(searchText) ||
                    employeeName.includes(searchText) ||
                    fullName.includes(searchText)
                );
            })
            .slice(0, 20);
    }, [keyword, users]);

    const selectedUser = users.find((user) => String(user.id) === value);

    const selectUser = (user: UserListItem) => {
        const nextLabel = getAssigneeLabel(user);

        setKeyword(nextLabel);
        onChange(String(user.id), nextLabel);
        setOpen(false);
    };

    const clearValue = () => {
        setKeyword("");
        onChange("", "");
        setOpen(true);
    };

    return (
        <div ref={wrapperRef} className="relative z-[100]">
            <div className="flex h-9 items-center rounded border border-slate-300 bg-white focus-within:border-sky-400">
                <input
                    value={keyword}
                    onChange={(event) => {
                        setKeyword(event.target.value);
                        setOpen(true);

                        if (value) {
                            onChange("", "");
                        }
                    }}
                    onFocus={() => setOpen(true)}
                    placeholder={placeholder}
                    className="h-full flex-1 rounded-l px-3 text-xs outline-none"
                />

                {keyword && (
                    <button
                        type="button"
                        onClick={clearValue}
                        className="flex h-full w-8 items-center justify-center text-slate-400 hover:text-red-500"
                        title="Xóa"
                    >
                        <X size={14} />
                    </button>
                )}

                <button
                    type="button"
                    onClick={() => setOpen((prev) => !prev)}
                    className="flex h-full w-8 items-center justify-center border-l text-slate-500 hover:bg-slate-50"
                    title="Mở danh sách"
                >
                    <ChevronDown size={15} />
                </button>
            </div>

            {selectedUser && (
                <p className="mt-1 text-[11px] text-slate-500">
                    Đang chọn:{" "}
                    <span className="font-semibold text-slate-700">
                        {getUserDisplayName(selectedUser)}
                    </span>
                </p>
            )}

            {open && (
                <div className="absolute left-0 right-0 top-10 z-[9999] max-h-64 overflow-auto rounded border border-slate-200 bg-white shadow-lg">
                    {filteredUsers.length === 0 && (
                        <div className="px-3 py-3 text-xs text-slate-500">
                            Không tìm thấy người dùng phù hợp.
                        </div>
                    )}

                    {filteredUsers.map((user) => {
                        const displayName = getUserDisplayName(user);
                        const active = String(user.id) === value;

                        return (
                            <button
                                key={user.id}
                                type="button"
                                onClick={() => selectUser(user)}
                                className={`block w-full border-b border-slate-100 px-3 py-2 text-left text-xs hover:bg-sky-50 ${active ? "bg-sky-50" : "bg-white"
                                    }`}
                            >
                                <div className="font-semibold text-slate-800">
                                    {displayName}
                                </div>

                                <div className="mt-0.5 truncate text-[11px] text-slate-500">
                                    {getUserMeta(user)}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}