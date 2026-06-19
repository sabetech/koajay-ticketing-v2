import api from "./api";

export interface Station {
    id: number;
    name: string;
    location: string;
}

export interface StationSummaryItem {
    station_id: string;
    name: string;
    rate_id: string;
    title: string;
    icon: string;
    rate_type: "fixed" | "flexible" | "postpaid" | string;
    is_postpaid: string;
    ticket_count: string;
    total_amount: string;
}

export interface StationSummaryResponse {
    success: boolean;
    data: StationSummaryItem[];
    message: string;
}

export interface StationsResponse {
    success: boolean;
    data: Station[];
    message: string;
}

export const stationService = {
    async getStations(): Promise<Station[]> {
        const response = await api.get<StationsResponse>("/stations");
        return response.data.data;
    },

    async getStationSummary(from: string, to: string): Promise<StationSummaryItem[]> {
        const response = await api.get<StationSummaryResponse>("/station/summary", {
            params: { from, to },
        });
        return response.data.data;
    },
};
