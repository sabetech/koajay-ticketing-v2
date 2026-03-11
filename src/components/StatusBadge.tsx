import { Badge } from "@/components/ui/badge";
import type { TicketStatus } from "@/lib/mock-data";

interface StatusBadgeProps {
    status: TicketStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
    let variant: "default" | "secondary" | "destructive" | "outline" = "default";

    switch (status) {
        case "open":
            variant = "default";
            break;
        case "in-progress":
            variant = "secondary";
            break;
        case "resolved":
            variant = "outline";
            break;
        case "closed":
            variant = "outline"; // Or distinct style
            break;
    }

    return <Badge variant={variant}>{status}</Badge>;
}
