import { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import { stationService } from "@/services/station";
import type { StationSummaryItem } from "@/services/station";
import { postpaidService } from "@/services/postpaid";
import { ticketService } from "@/services/ticket";
import type { Ticket } from "@/services/ticket";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Search, Loader2, Ticket as TicketIcon, DollarSign, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];
const YEARS = Array.from({ length: 7 }, (_, i) => 2024 + i);

interface RateGroup {
    rateType: string;
    items: {
        rate_id: string;
        title: string;
        icon: string;
        ticketCount: number;
        totalAmount: number;
    }[];
    totalTickets: number;
    totalAmount: number;
}

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

function groupByStation(items: StationSummaryItem[]): Map<string, StationSummaryItem[]> {
    const map = new Map<string, StationSummaryItem[]>();
    for (const item of items) {
        const stationName = item.name;
        if (!map.has(stationName)) map.set(stationName, []);
        map.get(stationName)!.push(item);
    }
    return map;
}

function groupByRateType(items: StationSummaryItem[], paidAmountByRate?: Map<string, number>): RateGroup[] {
    const map = new Map<string, Map<string, { rate_id: string; title: string; icon: string; ticketCount: number; totalAmount: number }>>();

    for (const item of items) {
        const rateType = item.is_postpaid === "1" ? "postpaid" : (item.rate_type ?? "unknown");

        if (!map.has(rateType)) map.set(rateType, new Map());
        const rateMap = map.get(rateType)!;

        const key = `${item.rate_id}-${item.title}`;
        if (!rateMap.has(key)) {
            rateMap.set(key, {
                rate_id: item.rate_id,
                title: item.title,
                icon: item.icon,
                ticketCount: 0,
                totalAmount: 0,
            });
        }
        const entry = rateMap.get(key)!;
        entry.ticketCount += parseInt(item.ticket_count) || 0;
        // Postpaid amounts are resolved from paid tickets only (see paidAmountByRate
        // override below). Keep counting tickets, but don't sum the gross total here.
        if (rateType !== "postpaid") {
            entry.totalAmount += parseFloat(item.total_amount) || 0;
        }
    }

    const groups: RateGroup[] = [];
    for (const [rateType, rateMap] of map) {
        const itemsArr = Array.from(rateMap.entries()).map(([, v]) => v);
        if (rateType === "postpaid" && paidAmountByRate) {
            for (const item of itemsArr) {
                item.totalAmount = paidAmountByRate.get(item.rate_id.toString()) ?? 0;
            }
        }
        groups.push({
            rateType,
            items: itemsArr,
            totalTickets: itemsArr.reduce((s, i) => s + i.ticketCount, 0),
            totalAmount: itemsArr.reduce((s, i) => s + i.totalAmount, 0),
        });
    }

    const order = ["fixed", "flexible", "postpaid"];
    return groups.sort((a, b) => {
        const ai = order.indexOf(a.rateType);
        const bi = order.indexOf(b.rateType);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
}

/** Full-month range: from = 1st day 00:00:00, to = last day of To-month 23:59:59 */
function buildMonthRange(
    fromMonth: string,
    fromYear: string,
    toMonth: string,
    toYear: string
): { from: string; to: string } {
    const from = format(new Date(parseInt(fromYear), parseInt(fromMonth), 1), "yyyy-MM-dd");
    const to = format(new Date(parseInt(toYear), parseInt(toMonth) + 1, 0), "yyyy-MM-dd");
    return { from: `${from} 00:00:00`, to: `${to} 23:59:59` };
}

function currentMonthRange(): { from: string; to: string } {
    const now = new Date();
    const month = now.getMonth().toString();
    const year = now.getFullYear().toString();
    return buildMonthRange(month, year, month, year);
}

function RateAccordionRow({
    item,
    dateRange,
}: {
    item: { rate_id: string; title: string; icon: string; ticketCount: number; totalAmount: number };
    dateRange: string;
}) {
    const [open, setOpen] = useState(false);
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(false);

    const handleToggle = async () => {
        if (!open && tickets.length === 0) {
            setLoading(true);
            try {
                const result = await ticketService.getTicketsByRateRange(dateRange, item.rate_id);
                setTickets(result);
            } catch (err) {
                console.error("Failed to fetch tickets:", err);
            } finally {
                setLoading(false);
            }
        }
        setOpen(!open);
    };

    return (
        <div>
            <div
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0 cursor-pointer hover:bg-muted/50 px-2 -mx-2 rounded transition-colors"
                onClick={handleToggle}
            >
                <div className="flex items-center gap-3">
                    {item.icon ? (
                        <img
                            src={item.icon}
                            alt={item.title}
                            className="h-8 w-8 rounded object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                    ) : (
                        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                            <TicketIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                    )}
                    <span className="text-sm font-medium">{item.title}</span>
                </div>
                <div className="flex items-center gap-6 text-sm">
                    <span className="text-muted-foreground">{item.ticketCount} tickets</span>
                    <span className="font-semibold w-24 text-right">
                        GHS {item.totalAmount.toFixed(2)}
                    </span>
                    <ChevronDown
                        className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
                    />
                </div>
            </div>
            {open && (
                <div className="max-h-60 overflow-y-auto border-t pl-4">
                    {loading ? (
                        <div className="py-4 space-y-2">
                            <Skeleton className="h-6 w-full" />
                            <Skeleton className="h-6 w-full" />
                            <Skeleton className="h-6 w-full" />
                        </div>
                    ) : tickets.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-3">No tickets found</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-muted-foreground border-b">
                                    <th className="py-3 pr-2 font-medium">Ticket ID</th>
                                    <th className="py-3 pr-2 font-medium">Car Number</th>
                                    <th className="py-3 pr-2 font-medium">Agent</th>
                                    <th className="py-3 font-medium">Date/Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tickets.map((ticket) => (
                                    <tr key={ticket.id} className="border-b last:border-0 hover:bg-muted/30">
                                        <td className="py-3 pr-2 font-mono text-xs">{ticket.id}</td>
                                        <td className="py-3 pr-2">{ticket.car_number}</td>
                                        <td className="py-3 pr-2">{ticket.agent.fname} {ticket.agent.lname}</td>
                                        <td className="py-3">
                                            {format(new Date(ticket.issued_date_time), "MMM dd, yyyy HH:mm")}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
}

function RateTypePanel({ group, dateRange }: { group: RateGroup; dateRange: string }) {
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
                    <div className="flex items-center gap-4 text-muted-foreground">
                        <span className="flex items-center gap-1 text-lg font-bold text-primary">
                            <TicketIcon className="h-5 w-5" />
                            {group.totalTickets} tickets
                        </span>
                        <span className="flex items-center gap-1 text-lg font-bold text-primary">
                            <DollarSign className="h-5 w-5" />
                            GHS {group.totalAmount.toFixed(2)}
                        </span>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="divide-y">
                    {group.items.map((item, idx) => (
                        <RateAccordionRow key={idx} item={item} dateRange={dateRange} />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

export default function StationSummary() {
    const now = new Date();

    // Pending (unapplied) month/year selection
    const [fromMonth, setFromMonth] = useState<string>(now.getMonth().toString());
    const [fromYear, setFromYear] = useState<string>(now.getFullYear().toString());
    const [toMonth, setToMonth] = useState<string>(now.getMonth().toString());
    const [toYear, setToYear] = useState<string>(now.getFullYear().toString());

    const [data, setData] = useState<StationSummaryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedStation, setSelectedStation] = useState<string | null>(null);
    // Applied range — the fetch effect depends on these
    const [queryFrom, setQueryFrom] = useState<string>(() => currentMonthRange().from);
    const [queryTo, setQueryTo] = useState<string>(() => currentMonthRange().to);
    const [paidAmountByRate, setPaidAmountByRate] = useState<Map<string, number>>(new Map());

    const pendingRange = useMemo(
        () => buildMonthRange(fromMonth, fromYear, toMonth, toYear),
        [fromMonth, fromYear, toMonth, toYear]
    );
    const isRangeChanged = pendingRange.from !== queryFrom || pendingRange.to !== queryTo;

    const applyFilters = () => {
        setQueryFrom(pendingRange.from);
        setQueryTo(pendingRange.to);
    };

    const stations = useMemo(() => groupByStation(data), [data]);
    const stationNames = useMemo(() => Array.from(stations.keys()), [stations]);
    const dateRange = useMemo(() => {
        return queryFrom && queryTo ? `${queryFrom.replace(" ", "+")},${queryTo.replace(" ", "+")}` : "";
    }, [queryFrom, queryTo]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                const [result, postpaidTickets] = await Promise.all([
                    stationService.getStationSummary(queryFrom, queryTo),
                    postpaidService.getTickets({ from: queryFrom, to: queryTo }).catch((err) => {
                        console.error("Failed to fetch postpaid paid amounts:", err);
                        return [];
                    }),
                ]);
                const paidMap = new Map<string, number>();
                for (const ticket of postpaidTickets) {
                    const isPaid =
                        ticket.paid === 1 ||
                        ticket.paid === "1" ||
                        ticket.paid === true ||
                        ticket.paid === "true";
                    if (!isPaid) continue;
                    const key = ticket.rate_id?.toString() ?? "";
                    if (!key) continue;
                    paidMap.set(key, (paidMap.get(key) ?? 0) + (parseFloat(ticket.amount as string) || 0));
                }
                setPaidAmountByRate(paidMap);
                setData(result);
                if (result.length > 0 && !selectedStation) {
                    const names = Array.from(groupByStation(result).keys());
                    if (names.length > 0) {
                        setSelectedStation(names[0]);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch station summary:", err);
                setError("Failed to load station summary. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [queryFrom, queryTo]);

    useEffect(() => {
        if (stationNames.length > 0 && !stationNames.includes(selectedStation || "")) {
            setSelectedStation(stationNames[0]);
        }
    }, [stationNames, selectedStation]);

    const getStationGroups = (stationName: string): RateGroup[] => {
        const stationData = stations.get(stationName) || [];
        return groupByRateType(stationData, paidAmountByRate);
    };

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            <div>
                <h1 className="text-lg font-semibold md:text-2xl">Station Summary</h1>
                {!loading && !error && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {stationNames.length} station{stationNames.length !== 1 ? "s" : ""} found
                    </p>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-4 bg-muted/30 p-2 px-3 rounded-lg border border-dashed">
                    {/* From */}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">From:</span>
                        <Select value={fromMonth} onValueChange={setFromMonth}>
                            <SelectTrigger className="w-[125px] h-8 text-xs">
                                <SelectValue placeholder="Month" />
                            </SelectTrigger>
                            <SelectContent>
                                {MONTHS.map((month, index) => (
                                    <SelectItem key={`from-${month}`} value={index.toString()}>
                                        {month}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={fromYear} onValueChange={setFromYear}>
                            <SelectTrigger className="w-[85px] h-8 text-xs">
                                <SelectValue placeholder="Year" />
                            </SelectTrigger>
                            <SelectContent>
                                {YEARS.map(year => (
                                    <SelectItem key={`from-${year}`} value={year.toString()}>
                                        {year}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="w-[1px] h-4 bg-border" />

                    {/* To */}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">To:</span>
                        <Select value={toMonth} onValueChange={setToMonth}>
                            <SelectTrigger className="w-[125px] h-8 text-xs">
                                <SelectValue placeholder="Month" />
                            </SelectTrigger>
                            <SelectContent>
                                {MONTHS.map((month, index) => (
                                    <SelectItem key={`to-${month}`} value={index.toString()}>
                                        {month}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={toYear} onValueChange={setToYear}>
                            <SelectTrigger className="w-[85px] h-8 text-xs">
                                <SelectValue placeholder="Year" />
                            </SelectTrigger>
                            <SelectContent>
                                {YEARS.map(year => (
                                    <SelectItem key={`to-${year}`} value={year.toString()}>
                                        {year}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Button
                    onClick={applyFilters}
                    disabled={loading || !isRangeChanged}
                    className="h-10 px-6 gap-2"
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Apply Filters
                </Button>
            </div>

            {error && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                    {error}
                </div>
            )}

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
            ) : stationNames.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <p className="text-sm">No station data found for this period.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap gap-2">
                        {stationNames.map((name) => (
                            <Button
                                key={name}
                                variant={selectedStation === name ? "default" : "outline"}
                                onClick={() => setSelectedStation(name)}
                                className="capitalize"
                            >
                                {name}
                            </Button>
                        ))}
                    </div>
                    {selectedStation && (
                        <div className="flex flex-col gap-4">
                            {(() => {
                                const groups = getStationGroups(selectedStation);
                                const totalTickets = groups.reduce((sum, g) => sum + g.totalTickets, 0);
                                const totalAmount = groups.reduce((sum, g) => sum + g.totalAmount, 0);
                                return (
                                    <div className="grid grid-cols-2 gap-4">
                                        <Card className="bg-primary/5 border-primary/20">
                                            <CardContent className="flex items-center justify-between py-4">
                                                <div className="flex items-center gap-2">
                                                    <TicketIcon className="h-5 w-5 text-primary" />
                                                    <span className="font-medium">Total Tickets</span>
                                                </div>
                                                <span className="text-2xl font-bold">{totalTickets}</span>
                                            </CardContent>
                                        </Card>
                                        <Card className="bg-primary/5 border-primary/20">
                                            <CardContent className="flex items-center justify-between py-4">
                                                <div className="flex items-center gap-2">
                                                    <DollarSign className="h-5 w-5 text-primary" />
                                                    <span className="font-medium">Total Amount</span>
                                                </div>
                                                <span className="text-2xl font-bold">GHS {totalAmount.toFixed(2)}</span>
                                            </CardContent>
                                        </Card>
                                    </div>
                                );
                            })()}
                            {getStationGroups(selectedStation).map((group) => (
                                <RateTypePanel key={group.rateType} group={group} dateRange={dateRange} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
