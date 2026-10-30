import api from "./api";

export interface Rate {
    id: number;
    title: string;
    amount: string;
    category: string;
    icon: string;
    rate_type: string;
    is_postpaid: string;
    station: {
        id: number;
        name: string;
        location: string;
    };
    created_at: string;
    updated_at: string;
}

export interface RatesResponse {
    status: string;
    message: string;
    data: Rate[];
}

const RATE_IMAGE_BASE_URL = "https://ticketing.koajay.com/storage/";

export const getRateIconUrl = (icon: string | null | undefined): string | null => {
    if (!icon) return null;
    if (/^https?:\/\//i.test(icon)) return icon;
    return `${RATE_IMAGE_BASE_URL}${icon.replace(/^\/+/, "").replace(/^public\//, "")}`;
};

export const ratesService = {
    getRates: async (stationId?: number): Promise<Rate[]> => {
        const response = await api.get<RatesResponse>("/rates", {
            params: {
                station: stationId,
            },
        });
        return response.data.data;
    },

    createRate: async (formData: FormData): Promise<Rate> => {
        const response = await api.post<{ status: string; message: string; data: Rate }>(
            "/rates/create",
            formData
        );
        return response.data.data;
    },

    deleteRate: async (id: number): Promise<void> => {
        await api.delete(`/rates/${id}`);
    },
};
