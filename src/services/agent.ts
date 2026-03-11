import api from "./api";
import type { Rate } from "./rates";

export interface Agent {
    id: number;
    fname: string;
    lname: string;
    username: string;
    email: string;
    phone: string;
    photo: string | null;
    stationInfo: {
        id: number;
        name: string;
    } | null;
    station_user?: {
        station?: {
            name?: string;
        };
    } | null;
    station_name?: string;
}

export interface AgentListResponse {
    success: boolean;
    data: Agent[];
    message: string;
}

export interface AgentDetailTicket {
    id: number;
    title: string;
    amount: string;
    issued_date_time: string;
    car_number: string;
    rate: {
        id: number;
        title: string;
        icon: string;
        rate_type: "fixed" | "flexible" | "postpaid" | string;
    };
}

export interface AgentDetailResponse {
    success: boolean;
    data: {
        agent: Agent;
        tickets: AgentDetailTicket[];
    };
    message: string;
}

export interface RateWithPivot extends Rate {
    pivot?: {
        agent_id: number;
        rate_id: number;
    };
}

export interface AgentRatesResponse {
    status: string;
    message: string;
    data: RateWithPivot[];
}

const IMAGE_BASE_URL = "https://ticketing.koajay.com/storage/img/profiles/";

export const getAgentImageUrl = (profilePic: string | null): string | null => {
    if (!profilePic) return null;
    return `${IMAGE_BASE_URL}/${profilePic.substring(19)}`;
};

let cachedAgents: Agent[] | null = null;

export const agentService = {
    getAllAgents: async (): Promise<Agent[]> => {
        if (cachedAgents) return cachedAgents;
        const response = await api.get<AgentListResponse>("/agent/all");
        cachedAgents = response.data.data;
        return cachedAgents;
    },

    getAgentDetail: async (
        agentId: number,
        from: string,
        to: string
    ): Promise<AgentDetailResponse["data"]> => {
        const response = await api.get<AgentDetailResponse>(`/agent/${agentId}/detail`, {
            params: { from, to },
        });
        return response.data.data;
    },

    getAgentRates: async (agentId: number): Promise<RateWithPivot[]> => {
        const response = await api.get<AgentRatesResponse>(`/agent/${agentId}/rates`);
        return response.data.data;
    },

    toggleAgentRate: async (agentId: number, rateId: number): Promise<void> => {
        await api.post(`/agent/${agentId}/rates`, {
            agentId: agentId.toString(),
            rateId: rateId.toString(),
        });
    },
};
