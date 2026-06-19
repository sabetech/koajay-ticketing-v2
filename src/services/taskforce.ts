import api from "./api";

export interface TaskforceData {
    ticket_count: number;
    total_amount: string | number;
}

export interface TaskforceTicket {
    id: number;
    title: string;
    rate_title: string;
    car_number: string;
    issued_date_time: string;
    agent_name: string;
    amount: string;
    username: string;
    fname: string;
    lname: string;
    phone: string;
}

interface TaskforceResponse {
    success: boolean;
    data: TaskforceTicket[];
}

export const taskforceService = {
    async getData(from: string, to: string, stationId?: string): Promise<TaskforceData & { tickets: TaskforceTicket[] }> {
        const params: Record<string, string> = { from, to };
        if (stationId) {
            params.station = stationId;
        }
        const response = await api.get<TaskforceResponse>("/ticket/taskforce", { params });
        const tickets = response.data.data;
        const total = tickets.reduce((sum, t) => sum + Number(t.amount), 0);
        return {
            tickets,
            ticket_count: tickets.length,
            total_amount: total.toFixed(2),
        };
    },
};
