import api from "./api";

export interface User {
    id: number;
    name: string;
    email: string;
    photo: string | null;
    deleted_at: string | null;
    roles: {
        id: number;
        name: string;
    }[];
    [key: string]: any;
}

export const userService = {
    getUsers: async (): Promise<User[]> => {
        const response = await api.get<{ data: User[] }>("/users/all");
        return response.data.data || [];
    },

    createUser: async (formData: FormData): Promise<void> => {
        // Do NOT set Content-Type manually: the api interceptor deletes it for
        // FormData so the browser adds the correct multipart boundary.
        await api.post("/users/create", formData);
    },

    deleteUser: async (id: number): Promise<void> => {
        await api.delete(`/users/${id}/delete`);
    },

    updateUser: async (id: number, formData: FormData): Promise<void> => {
        // multipart/form-data with PUT is not natively supported in some PHP environments
        // so we use POST with _method = PUT
        formData.append("_method", "PUT");
        await api.post(`/users/${id}/edit`, formData);
    },

    restoreUser: async (id: number): Promise<void> => {
        await api.post(`/users/${id}/restore`);
    },
};
