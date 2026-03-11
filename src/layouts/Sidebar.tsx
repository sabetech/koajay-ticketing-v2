import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    LayoutDashboard,
    Ticket,
    Users,
    Briefcase,
    MapPin,
    Tag,
    Map,
    CreditCard,
    History,
    UserCog,
} from "lucide-react";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> { }

export function Sidebar({ className }: SidebarProps) {
    const location = useLocation();
    const pathname = location.pathname;

    const routes = [
        {
            href: "/",
            label: "Dashboard",
            icon: LayoutDashboard,
            active: pathname === "/",
        },
        {
            href: "/tickets",
            label: "Ticket Summary",
            icon: Ticket,
            active: pathname === "/tickets",
        },
        {
            href: "/agents",
            label: "Agent Summary",
            icon: Users,
            active: pathname === "/agents",
        },
        {
            href: "/task-force",
            label: "Task Force",
            icon: Briefcase,
            active: pathname === "/task-force",
        },
        {
            href: "/stations",
            label: "Station Summary",
            icon: MapPin,
            active: pathname === "/stations",
        },
        {
            href: "/rates",
            label: "Rates and Categories",
            icon: Tag,
            active: pathname === "/rates",
        },
        {
            href: "/agent-rates",
            label: "Agent-Rates Assignment",
            icon: Map,
            active: pathname === "/agent-rates",
        },
        {
            href: "/postpaid",
            label: "Postpaid (On Credit)",
            icon: CreditCard,
            active: pathname === "/postpaid",
        },
        {
            href: "/payments",
            label: "Payment History",
            icon: History,
            active: pathname === "/payments",
        },
        {
            href: "/users",
            label: "User Management",
            icon: UserCog,
            active: pathname === "/users",
        },
    ];

    return (
        <div className={cn("pb-12", className)}>
            <div className="space-y-4 py-4">
                <div className="px-3 py-2">
                    <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                        Admin Panel
                    </h2>
                    <div className="space-y-1">
                        {routes.map((route) => (
                            <Button
                                key={route.href}
                                variant={route.active ? "secondary" : "ghost"}
                                className="w-full justify-start"
                                asChild
                            >
                                <Link to={route.href}>
                                    <route.icon className="mr-2 h-4 w-4" />
                                    {route.label}
                                </Link>
                            </Button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
