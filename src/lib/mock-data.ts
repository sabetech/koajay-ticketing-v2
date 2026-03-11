export type TicketStatus = "open" | "in-progress" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "critical";

export interface Ticket {
    id: string;
    title: string;
    status: TicketStatus;
    priority: TicketPriority;
    customerName: string;
    createdAt: string;
}

export const mockTickets: Ticket[] = [
    {
        id: "TICK-1234",
        title: "Login issue on iPad",
        status: "open",
        priority: "high",
        customerName: "Alice Smith",
        createdAt: "2023-10-25T10:00:00Z",
    },
    {
        id: "TICK-1235",
        title: "Payment gateway error",
        status: "in-progress",
        priority: "critical",
        customerName: "Bob Jones",
        createdAt: "2023-10-24T14:30:00Z",
    },
    {
        id: "TICK-1236",
        title: "Feature request: Dark mode",
        status: "open",
        priority: "low",
        customerName: "Charlie Brown",
        createdAt: "2023-10-26T09:15:00Z",
    },
    {
        id: "TICK-1237",
        title: "Password reset not working",
        status: "resolved",
        priority: "medium",
        customerName: "Diana Prince",
        createdAt: "2023-10-23T11:20:00Z",
    },
    {
        id: "TICK-1238",
        title: "Account locked out",
        status: "closed",
        priority: "high",
        customerName: "Evan Wright",
        createdAt: "2023-10-22T16:45:00Z",
    },
];
