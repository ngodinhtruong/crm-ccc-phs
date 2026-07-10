export type CurrentUser = {
    id: number;
    username: string;
    email: string;
    full_name: string;

    employee: null | {
        id: number;
        employee_code: string;
        full_name: string;
        department: string | null;
        position: string | null;
        branch: null | {
            id: number;
            branch_code: string;
            branch_name: string;
        };
    };

    roles: {
        id: number;
        role_code: string;
        role_name: string;
        scope_type: string;
        group_code?: "GLOBAL" | "CCC" | "SALE_ADMIN" | string;
    }[];
    accessible_groups?: ("CCC" | "SALE_ADMIN" | string)[];
    default_group?: "CCC" | "SALE_ADMIN" | string | null;
    is_global_admin?: boolean;

    permissions: {
        id: number;
        permission_code: string;
        permission_name: string;
        module_code: string;
        action_code: string;
    }[];
};