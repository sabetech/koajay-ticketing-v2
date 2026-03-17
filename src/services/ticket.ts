import api from "./api";

export interface Ticket {
    id: number;
    title: string;
    rate_title: string;
    car_number: string;
    station_name: string;
    issued_date_time: string;
    agent_name: string;
    amount: string;
    paid: string;
    device_id: string;
    created_at: string;
    updated_at: string;
    rate: {
        id: number;
        title: string;
        amount: string;
        icon: string;
    };
    agent: {
        id: number;
        fname: string;
        lname: string;
        username: string;
    };
    station: {
        id: number;
        name: string;
    };
}

export interface PaginatedResponse<T> {
    current_page: number;
    data: T[];
    first_page_url: string;
    from: number;
    last_page: number;
    last_page_url: string;
    links: { url: string | null; label: string; active: boolean }[];
    next_page_url: string | null;
    path: string;
    per_page: number;
    prev_page_url: string | null;
    to: number;
    total: number;
}

export interface TicketAggregates {
    ticket_count: number;
    total_revenue: number | string;
    total_unpaid: number | string;
    total_unpaid_tickets: number;
    total_agents: number;
}

export interface TicketFilterParams {
    page?: number;
    dateRange?: string;
    car_number?: string;
    ticket_id?: string;
    agent?: string;
    station?: string;
    rate?: string;
    rate_category?: string;
}

export interface TicketSuggestionResponse {
    success: boolean;
    data: string[];
    message: string;
}

export const ticketService = {
    getTickets: async (params: TicketFilterParams): Promise<PaginatedResponse<Ticket>> => {
        const response = await api.get<{ data: PaginatedResponse<Ticket> }>("/ticket", { params });
        return response.data.data;
    },

    getAggregates: async (dateRange?: string): Promise<TicketAggregates> => {
        const params = dateRange ? { dateRange } : {};
        const response = await api.get<{ data: TicketAggregates }>("/ticket/aggregates", { params });
        return response.data.data;
    },

    getSuggestions: async (field: string, value: string): Promise<string[]> => {
        const response = await api.get<TicketSuggestionResponse>("/ticket/indexes", {
            params: { field, value },
        });
        return response.data.data || [];
    },

    deleteTicket: async (ticketId: number): Promise<void> => {
        await api.delete(`/ticket/${ticketId}/delete`);
    },
};
