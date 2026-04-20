import api from "./api";

export interface PostpaidTicket {
    id: number | string;
    amount: string | number;
    paid: number | string | boolean;
    rate_id: number | string;
    [key: string]: any;
}

export interface PostpaidSummary {
    amount_paid: number;
    paid_tickets_count: number;
    pending_amount: number;
    pending_tickets_count: number;
}

export const postpaidService = {
    getTickets: async (params: { from: string; to: string; rate_title?: string }): Promise<PostpaidTicket[]> => {
        const response = await api.get<{ data: PostpaidTicket[] }>("/ticket/third-party-tickets", { params });
        return response.data.data || [];
    },

    calculateSummary: (tickets: PostpaidTicket[], selectedRateId?: string): PostpaidSummary => {
        let amount_paid = 0;
        let paid_tickets_count = 0;
        let pending_amount = 0;
        let pending_tickets_count = 0;

        tickets.forEach(ticket => {
            // Local filter by rate_id if selected
            if (selectedRateId && selectedRateId !== "all" && ticket.rate_id.toString() !== selectedRateId.toString()) {
                return;
            }

            const amount = parseFloat(ticket.amount as string) || 0;
            const isPaid = ticket.paid === 1 || ticket.paid === "1" || ticket.paid === true || ticket.paid === "true";

            if (isPaid) {
                amount_paid += amount;
                paid_tickets_count++;
            } else {
                pending_amount += amount;
                pending_tickets_count++;
            }
        });
        
        return {
            amount_paid,
            paid_tickets_count,
            pending_amount,
            pending_tickets_count,
        };
    },

    makePayment: async (data: { 
        client_id: string; 
        amount: number; 
        dateRange: {
            from: string;
            to: string;
        };
        discount?: number;
        tax?: number;
    }): Promise<void> => {
        await api.post("/rates/makepayment", data);
    },

    getPaymentHistory: async (params: { from: string; to: string; client_id?: string }): Promise<any[]> => {
        const response = await api.get<{ data: any[] }>("/rates/paymentHistory", { params });
        // The endpoint may wrap the array in response.data or response.data.data
        return response.data?.data || response.data || [];
    }
};
