import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Ticket, DollarSign, CreditCard, Users } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { dashboardService, type AgentStats, type AgentOnlineStatus } from "@/services/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { differenceInMinutes } from "date-fns";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

function formatDateTime(dateStr: string | null): string {
    if (!dateStr) return "-";
    const date = new Date(dateStr.replace(" ", "T"));
    return format(date, "dd MMM yyyy, hh:mm a");
}

export default function Dashboard() {
    const [date, setDate] = useState<Date>(new Date());
    const [open, setOpen] = useState(false);
    const [stats, setStats] = useState({
        ticketCount: 0,
        revenue: 0,
        unpaidAmount: 0,
        agentCount: 0,
    });
    const [loading, setLoading] = useState(true);
    const [agentStats, setAgentStats] = useState<AgentStats[]>([]);
    const [agentStatsLoading, setAgentStatsLoading] = useState(true);
    const [onlineStatuses, setOnlineStatuses] = useState<AgentOnlineStatus[]>([]);
    const [onlineStatusesLoading, setOnlineStatusesLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                const dateStr = format(date, "yyyy-MM-dd");
                const [ticketCount, revenue, unpaidAmount, agentCount] = await Promise.all([
                    dashboardService.getTicketCount(dateStr),
                    dashboardService.getRevenue(dateStr),
                    dashboardService.getUnpaidAmount(dateStr),
                    dashboardService.getAgentCount(dateStr),
                ]);
                setStats({ ticketCount, revenue, unpaidAmount, agentCount });
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [date]);

    useEffect(() => {
        const fetchAgentStats = async () => {
            setAgentStatsLoading(true);
            try {
                const dateStr = format(date, "yyyy-MM-dd");
                const data = await dashboardService.getAgentStats(dateStr);
                setAgentStats(data);
            } catch (error) {
                console.error("Error fetching agent stats:", error);
            } finally {
                setAgentStatsLoading(false);
            }
        };

        fetchAgentStats();
    }, [date]);

    useEffect(() => {
        const fetchOnlineStatuses = async () => {
            setOnlineStatusesLoading(true);
            try {
                const data = await dashboardService.getOnlineStatuses();
                setOnlineStatuses(data);
            } catch (error) {
                console.error("Error fetching online statuses:", error);
            } finally {
                setOnlineStatusesLoading(false);
            }
        };

        fetchOnlineStatuses();
        const interval = setInterval(fetchOnlineStatuses, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, []);

    const getStatusInfo = (latestOnlineAt: string) => {
        const lastOnline = new Date(latestOnlineAt.replace(" ", "T"));
        const now = new Date();
        const mins = differenceInMinutes(now, lastOnline);

        if (mins < 20) {
            return {
                style: "text-[#52c41a] bg-[#f6ffed] border-[#b7eb8f]",
                text: `Online Since ${mins} mins`
            };
        } else if (mins < 120) {
            return {
                style: "text-[#faad14] bg-[#fffbe6] border-[#ffe58f]",
                text: `Online Since ${mins} mins`
            };
        } else {
            return {
                style: "text-[#ff4d4f] bg-[#fff2f0] border-[#ffccc7]",
                text: `Online Since ${mins} mins`
            };
        }
    };

    return (
        <div className="flex flex-1 flex-col gap-4">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold md:text-2xl">Dashboard</h1>
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className={cn(
                                "w-[240px] justify-start text-left font-normal",
                                !date && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? format(date, "PPP") : <span>Pick a date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={(newDate) => {
                                if (newDate) {
                                    setDate(newDate);
                                    setOpen(false);
                                }
                            }}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tickets Issued</CardTitle>
                        <Ticket className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <Skeleton className="h-8 w-24" />
                        ) : (
                            <div className="text-2xl font-bold">
                                {(stats.ticketCount ?? 0).toLocaleString()}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <Skeleton className="h-8 w-32" />
                        ) : (
                            <div className="text-2xl font-bold">
                                {`GH₵${(stats.revenue ?? 0).toLocaleString()}`}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Unpaid</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <Skeleton className="h-8 w-32" />
                        ) : (
                            <div className="text-2xl font-bold">
                                {`GH₵${(stats.unpaidAmount ?? 0).toLocaleString()}`}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Number of Agents</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <Skeleton className="h-8 w-16" />
                        ) : (
                            <div className="text-2xl font-bold">
                                {(stats.agentCount ?? 0).toLocaleString()}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Agent Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Agent</TableHead>
                                    <TableHead className="text-right">Tickets Issued</TableHead>
                                    <TableHead className="text-right">Amount/Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {agentStatsLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center">
                                            <Skeleton className="h-8 w-full" />
                                        </TableCell>
                                    </TableRow>
                                ) : agentStats.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                                            No agent data available
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    agentStats.map((agent) => (
                                        <TableRow key={agent.agent_name}>
                                            <TableCell>
                                                <div className="font-medium">{agent.fname}</div>
                                                <div className="flex gap-1 mt-1">
                                                    <span className="text-xs px-1.5 py-0.5 rounded border-[#b7eb8f] border bg-[#f6ffed] text-[#52c41a]">
                                                        Login: {formatDateTime(agent.loggedin_at)}
                                                    </span>
                                                    {agent.loggedout_at && (
                                                        <span className="text-xs px-1.5 py-0.5 rounded border-[#ffccc7] border bg-[#fff2f0] text-[#ff4d4f]">
                                                            LoggedOut: {formatDateTime(agent.loggedout_at)}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">{agent.tickets_issued}</TableCell>
                                            <TableCell className="text-right">{`GH₵${(parseFloat(agent.total) ?? 0).toLocaleString()}`}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Agent Online Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Agent</TableHead>
                                    <TableHead className="text-right">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {onlineStatusesLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center">
                                            <Skeleton className="h-8 w-full" />
                                        </TableCell>
                                    </TableRow>
                                ) : onlineStatuses.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center text-muted-foreground">
                                            No online status data available
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    onlineStatuses
                                        .filter((item) => !item.loggedout_at)
                                        .map((item) => {
                                            const statusInfo = getStatusInfo(item.latest_online_at);
                                            return (
                                                <TableRow key={item.id}>
                                                    <TableCell>
                                                        <div className="font-medium">{`${item.agent.fname} ${item.agent.lname}`}</div>
                                                        <div className="mt-1">
                                                            <span className="text-xs px-1.5 py-0.5 rounded border-[#d9d9d9] border bg-[#fafafa] text-black">
                                                                Logged In at: {formatDateTime(item.loggedin_at)}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <span className={cn("text-xs px-1.5 py-0.5 rounded border", statusInfo.style)}>
                                                            {statusInfo.text}
                                                        </span>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
