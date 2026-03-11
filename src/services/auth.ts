import api from "./api";

export interface LoginCredentials {
    email: string;
    password?: string;
}

export interface User {
    id: string;
    name?: string;
    fname?: string;
    lname?: string;
    email: string;
    role: string;
}

export interface AuthResponse {
    token: string;
    user: User;
}

export const authService = {
    login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
        // Adjust the endpoint as needed based on actual API documentation
        const response = await api.post<AuthResponse>("/login", credentials);
        return response.data;
    },

    logout: async () => {
        try {
            await api.post("/logout");
        } catch {
            // Proceed with local cleanup even if server call fails
        } finally {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.href = "/login";
        }
    },

    getCurrentUser: (): User | null => {
        const userStr = localStorage.getItem("user");
        if (userStr) {
            return JSON.parse(userStr);
        }
        return null;
    },

    isAuthenticated: (): boolean => {
        const token = localStorage.getItem("token");
        const user = authService.getCurrentUser();
        return !!(token && user);
    }
};
