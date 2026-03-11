import api from "./api";

export interface DashboardStats {
    ticketCount?: number;
    revenue?: number;
    unpaidAmount?: number;
    agentCount?: number;
}

export interface AgentStats {
    agent_name: string;
    fname: string;
    total: string;
    tickets_issued: string;
    loggedin_at: string;
    loggedout_at: string | null;
}

export interface AgentOnlineStatus {
    id: number;
    agent_id: string;
    latest_online_at: string;
    loggedin_at: string;
    loggedout_at: string | null;
    device_id: string;
    created_at: string;
    updated_at: string;
    agent: {
        id: number;
        username: string;
        fname: string;
        lname: string;
        phone: string;
        photo: string;
        email: string;
    };
}

export const dashboardService = {
    getTicketCount: async (date: string): Promise<number> => {
        const response = await api.get<{ data: number }>(`/ticket/count?date=${date}`);
        return response.data.data ?? 0;
    },

    getRevenue: async (date: string): Promise<number> => {
        const response = await api.get<{ data: number }>(`/ticket/revenue?date=${date}`);
        return response.data.data ?? 0;
    },

    getUnpaidAmount: async (date: string): Promise<number> => {
        const response = await api.get<{ data: number }>(`/ticket/unpaidAmount?date=${date}`);
        return response.data.data ?? 0;
    },

    getAgentCount: async (date: string): Promise<number> => {
        const response = await api.get<{ data: number }>(`/agent/count?date=${date}`);
        return response.data.data ?? 0;
    },

    getAgentStats: async (date: string): Promise<AgentStats[]> => {
        const response = await api.get<{ data: AgentStats[] }>(`/ticket/by-agents?date=${date}`);
        return response.data.data ?? [];
    },

    getOnlineStatuses: async (): Promise<AgentOnlineStatus[]> => {
        const response = await api.get<{ data: AgentOnlineStatus[] }>("/agent/onlinestatus");
        return response.data.data ?? [];
    },
};
