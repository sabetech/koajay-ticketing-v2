import api from "./api";

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

export const stationService = {
    async getStationSummary(from: string, to: string): Promise<StationSummaryItem[]> {
        const response = await api.get<StationSummaryResponse>("/station/summary", {
            params: { from, to },
        });
        return response.data.data;
    },
};
