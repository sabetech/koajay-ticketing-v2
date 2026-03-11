import { Badge } from "@/components/ui/badge";
import type { TicketPriority } from "@/lib/mock-data";

interface PriorityBadgeProps {
    priority: TicketPriority;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
    let colorClass = "bg-gray-500 hover:bg-gray-600";

    switch (priority) {
        case "low":
            colorClass = "bg-blue-500 hover:bg-blue-600";
            break;
        case "medium":
            colorClass = "bg-yellow-500 hover:bg-yellow-600";
            break;
        case "high":
            colorClass = "bg-orange-500 hover:bg-orange-600";
            break;
        case "critical":
            colorClass = "bg-red-500 hover:bg-red-600";
            break;
    }

    return <Badge className={`${colorClass} text-white`}>{priority}</Badge>;
}
