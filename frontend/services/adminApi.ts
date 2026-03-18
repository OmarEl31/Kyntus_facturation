export type AdminUser = {
    id: number;
    email: string;
    role: "admin" | "agent";
    is_active: boolean;
    created_at: string;
};

export type CreateAdminUserPayload = {
    email: string;
    password: string;
    role: "admin" | "agent";
    is_active?: boolean;
};

export type UpdateUserRolePayload = {
    role: "admin" | "agent";
};

export type UpdateUserStatusPayload = {
    is_active: boolean;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8100";

function getAuthHeaders() {
    const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;

    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };
}

async function handleResponse(response: Response) {
    const data = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(data?.detail || `Erreur HTTP ${response.status}`);
    }

    return data;
}

export async function listUsers(): Promise<AdminUser[]> {
    const response = await fetch(`${API_BASE}/api/admin/users`, {
        method: "GET",
        headers: getAuthHeaders(),
    });

    return handleResponse(response);
}

export async function createUserByAdmin(
    payload: CreateAdminUserPayload
): Promise<AdminUser> {
    const response = await fetch(`${API_BASE}/api/admin/users`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
    });

    return handleResponse(response);
}

export async function updateUserRole(
    userId: number,
    payload: UpdateUserRolePayload
): Promise<AdminUser> {
    const response = await fetch(`${API_BASE}/api/admin/users/${userId}/role`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
    });

    return handleResponse(response);
}

export async function updateUserStatus(
    userId: number,
    payload: UpdateUserStatusPayload
): Promise<AdminUser> {
    const response = await fetch(`${API_BASE}/api/admin/users/${userId}/status`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
    });

    return handleResponse(response);
}