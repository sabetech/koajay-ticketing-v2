import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format, setHours, setMinutes, setSeconds, startOfDay, endOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";
import { agentService, getAgentImageUrl } from "@/services/agent";
import type { Agent, AgentDetailTicket } from "@/services/agent";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ArrowLeft, MapPin, Ticket, DollarSign, Edit2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RateGroup {
    rateType: string;
    items: {
        rateId: number;
        rateTitle: string;
        rateIcon: string;
        count: number;
        totalAmount: number;
    }[];
    totalTickets: number;
    totalAmount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RATE_TYPE_LABELS: Record<string, string> = {
    fixed: "Fixed Rate",
    flexible: "Flexible Rate",
    postpaid: "Postpaid",
};

const RATE_TYPE_COLORS: Record<string, string> = {
    fixed: "bg-blue-500/10 text-blue-600 border-blue-200",
    flexible: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
    postpaid: "bg-amber-500/10 text-amber-600 border-amber-200",
};

function groupTicketsByRateType(tickets: AgentDetailTicket[]): RateGroup[] {
    const map = new Map<string, Map<number, { rateTitle: string; rateIcon: string; count: number; totalAmount: number }>>();

    for (const ticket of tickets) {
        const rateType = ticket.rate?.rate_type ?? "unknown";
        const rateId = ticket.rate?.id;
        if (!rateId) continue;

        if (!map.has(rateType)) map.set(rateType, new Map());
        const rateMap = map.get(rateType)!;

        if (!rateMap.has(rateId)) {
            rateMap.set(rateId, {
                rateTitle: ticket.rate.title,
                rateIcon: ticket.rate.icon,
                count: 0,
                totalAmount: 0,
            });
        }
        const entry = rateMap.get(rateId)!;
        entry.count += 1;
        entry.totalAmount += parseFloat(ticket.amount) || 0;
    }

    const groups: RateGroup[] = [];
    for (const [rateType, rateMap] of map) {
        const items = Array.from(rateMap.entries()).map(([rateId, v]) => ({ rateId, ...v }));
        groups.push({
            rateType,
            items,
            totalTickets: items.reduce((s, i) => s + i.count, 0),
            totalAmount: items.reduce((s, i) => s + i.totalAmount, 0),
        });
    }

    // Sort by known types first
    const order = ["fixed", "flexible", "postpaid"];
    return groups.sort((a, b) => {
        const ai = order.indexOf(a.rateType);
        const bi = order.indexOf(b.rateType);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
}

function formatDateParam(d: Date): string {
    return format(d, "yyyy-MM-dd HH:mm:ss");
}

/** Apply a "HH:MM" time string onto a Date, returning a new Date */
function applyTime(date: Date, time: string): Date {
    const [h, m] = time.split(":").map(Number);
    return setSeconds(setMinutes(setHours(date, h || 0), m || 0), 0);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function AgentProfileCard({ agent }: { agent: Agent }) {
    const imageUrl = getAgentImageUrl(agent.photo);
    const fullName = `${agent.fname} ${agent.lname}`.trim();
    const initials = `${agent.fname?.[0] ?? ""}${agent.lname?.[0] ?? ""}`.toUpperCase();
    const stationName = agent.station_user?.station?.name ?? agent.stationInfo?.name ?? agent.station_name ?? "—";

    return (
        <Card className="w-full">
            <CardContent className="flex flex-col items-center gap-4 p-6">
                <Avatar className="h-28 w-28 ring-4 ring-primary/20">
                    <AvatarImage
                        src={imageUrl ?? undefined}
                        alt={fullName}
                        className="object-cover"
                    />
                    <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                        {initials}
                    </AvatarFallback>
                </Avatar>
                <div className="text-center space-y-1">
                    <h2 className="text-xl font-bold">{fullName}</h2>
                    <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {stationName}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}

function RateTypePanel({ group }: { group: RateGroup }) {
    const label = RATE_TYPE_LABELS[group.rateType] ?? group.rateType;
    const colorClass = RATE_TYPE_COLORS[group.rateType] ?? "bg-gray-100 text-gray-600 border-gray-200";

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base capitalize flex items-center gap-2">
                        <Badge variant="outline" className={cn("text-xs font-semibold", colorClass)}>
                            {label}
                        </Badge>
                    </CardTitle>
                    <div className="flex items-center gap-4 text-base text-muted-foreground">
                        <span className="flex items-center gap-1 font-medium">
                            <Ticket className="h-4 w-4" />
                            {group.totalTickets} tickets
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-foreground">
                            <DollarSign className="h-4 w-4" />
                            GHS {group.totalAmount.toFixed(2)}
                        </span>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="divide-y">
                    {group.items.map((item) => (
                        <div key={item.rateId} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                            <div className="flex items-center gap-3">
                                {item.rateIcon ? (
                                    <img
                                        src={item.rateIcon}
                                        alt={item.rateTitle}
                                        className="h-8 w-8 rounded object-cover"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                    />
                                ) : (
                                    <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                                        <Ticket className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                )}
                                <span className="text-sm font-medium">{item.rateTitle}</span>
                            </div>
                            <div className="flex items-center gap-6 text-sm">
                                <span className="text-muted-foreground">{item.count} tickets</span>
                                <span className="font-semibold w-24 text-right">
                                    GHS {item.totalAmount.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AgentDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [date, setDate] = useState<DateRange>({
        from: startOfDay(new Date()),
        to: endOfDay(new Date()),
    });
    const [fromTime, setFromTime] = useState("00:00");
    const [toTime, setToTime] = useState("23:59");

    const [agent, setAgent] = useState<Agent | null>(null);
    const [tickets, setTickets] = useState<AgentDetailTicket[]>([]);
    const [groups, setGroups] = useState<RateGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;

        const fetchDetail = async () => {
            try {
                setLoading(true);
                setError(null);
                const fromDate = applyTime(date.from!, fromTime);
                const toDate = applyTime(date.to ?? date.from!, toTime);
                const from = formatDateParam(fromDate);
                const to = formatDateParam(toDate);
                const data = await agentService.getAgentDetail(Number(id), from, to);
                setAgent(data.agent);
                setTickets(data.tickets);
                setGroups(groupTicketsByRateType(data.tickets));
            } catch (err) {
                console.error("Failed to fetch agent detail:", err);
                setError("Failed to load agent details. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchDetail();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, date, fromTime, toTime]);

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            {/* Page header */}
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => navigate("/agents")}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-lg font-semibold md:text-2xl">Agent Details</h1>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 items-start">
                {/* ── Left: Sticky profile card ── */}
                <div className="w-full lg:w-64 xl:w-72 lg:sticky lg:top-6 flex-shrink-0">
                    {loading && !agent ? (
                        <Card>
                            <CardContent className="flex flex-col items-center gap-4 p-6">
                                <Skeleton className="h-28 w-28 rounded-full" />
                                <div className="space-y-2 w-full flex flex-col items-center">
                                    <Skeleton className="h-5 w-36" />
                                    <Skeleton className="h-4 w-28" />
                                </div>
                            </CardContent>
                        </Card>
                    ) : agent ? (
                        <AgentProfileCard agent={agent} />
                    ) : null}
                </div>

                {/* ── Right: Date picker + panels ── */}
                <div className="flex-1 flex flex-col gap-4 min-w-0">
                    {/* Date + time range picker */}
                    <div className="flex items-center gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "w-full max-w-lg justify-start text-left font-normal",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                                    {date?.from ? (
                                        <>
                                            {format(date.from, "MMM dd, yyyy")} {fromTime}
                                            {" – "}
                                            {date.to ? format(date.to, "MMM dd, yyyy") : format(date.from, "MMM dd, yyyy")} {toTime}
                                        </>
                                    ) : (
                                        <span>Pick a date &amp; time range</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={date?.from}
                                    selected={date}
                                    onSelect={(range) => {
                                        if (range?.from) {
                                            setDate({
                                                from: range.from,
                                                to: range.to ?? range.from,
                                            });
                                        }
                                    }}
                                    numberOfMonths={2}
                                />
                                {/* Time inputs */}
                                <div className="border-t p-3 flex items-center gap-4 bg-muted/30">
                                    <div className="flex flex-col gap-1 flex-1">
                                        <label className="text-xs font-medium text-muted-foreground">From time</label>
                                        <input
                                            type="time"
                                            value={fromTime}
                                            onChange={(e) => setFromTime(e.target.value)}
                                            className="text-sm border rounded-md px-2 py-1.5 bg-background w-full"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1 flex-1">
                                        <label className="text-xs font-medium text-muted-foreground">To time</label>
                                        <input
                                            type="time"
                                            value={toTime}
                                            onChange={(e) => setToTime(e.target.value)}
                                            className="text-sm border rounded-md px-2 py-1.5 bg-background w-full"
                                        />
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                            {error}
                        </div>
                    )}

                    {/* Panels */}
                    {loading ? (
                        <div className="flex flex-col gap-4">
                            {[1, 2, 3].map((i) => (
                                <Card key={i}>
                                    <CardHeader>
                                        <Skeleton className="h-5 w-32" />
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {[1, 2].map((j) => (
                                            <div key={j} className="flex items-center justify-between">
                                                <Skeleton className="h-8 w-48" />
                                                <Skeleton className="h-4 w-24" />
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : groups.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                            <Ticket className="h-10 w-10 mb-3 opacity-30" />
                            <p className="text-sm">No tickets found for this period.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {groups.map((group) => (
                                <RateTypePanel key={group.rateType} group={group} />
                            ))}

                            {tickets.length > 0 && (
                                <Card className="mt-4">
                                    <CardHeader>
                                        <CardTitle className="text-lg">Tickets</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="max-h-[400px] overflow-y-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Ticket ID</TableHead>
                                                        <TableHead>Ticket Type</TableHead>
                                                        <TableHead>Car Number</TableHead>
                                                        <TableHead>Ticket Cost</TableHead>
                                                        <TableHead>Date Time</TableHead>
                                                        <TableHead className="text-right">Action</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {tickets.map((ticket) => (
                                                        <TableRow key={ticket.id}>
                                                            <TableCell className="font-medium">{ticket.title}</TableCell>
                                                            <TableCell>{ticket.rate?.title}</TableCell>
                                                            <TableCell>{ticket.car_number}</TableCell>
                                                            <TableCell>GHS {ticket.amount}</TableCell>
                                                            <TableCell>{format(new Date(ticket.issued_date_time), "MMM dd, yyyy HH:mm")}</TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                        <Edit2 className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-destructive"
                                                                        onClick={() => {
                                                                            if (window.confirm("Are you sure you want to delete this ticket?")) {
                                                                                setTickets(prev => prev.filter(t => t.id !== ticket.id));
                                                                            }
                                                                        }}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
