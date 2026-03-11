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

export const ratesService = {
    getRates: async (stationId?: number): Promise<Rate[]> => {
        const response = await api.get<RatesResponse>("/rates", {
            params: {
                station: stationId,
            },
        });
        return response.data.data;
    },
};
