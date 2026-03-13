import { useEffect, useState, useMemo } from "react";
import { format, setHours, setMinutes, setSeconds, startOfDay, endOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";
import { stationService } from "@/services/station";
import type { StationSummaryItem } from "@/services/station";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Ticket, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface RateGroup {
    rateType: string;
    items: {
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

function groupByRateType(items: StationSummaryItem[]): RateGroup[] {
    const map = new Map<string, Map<string, { title: string; icon: string; ticketCount: number; totalAmount: number }>>();

    for (const item of items) {
        const rateType = item.is_postpaid === "1" ? "postpaid" : (item.rate_type ?? "unknown");

        if (!map.has(rateType)) map.set(rateType, new Map());
        const rateMap = map.get(rateType)!;

        const key = `${item.rate_id}-${item.title}`;
        if (!rateMap.has(key)) {
            rateMap.set(key, {
                title: item.title,
                icon: item.icon,
                ticketCount: 0,
                totalAmount: 0,
            });
        }
        const entry = rateMap.get(key)!;
        entry.ticketCount += parseInt(item.ticket_count) || 0;
        entry.totalAmount += parseFloat(item.total_amount) || 0;
    }

    const groups: RateGroup[] = [];
    for (const [rateType, rateMap] of map) {
        const itemsArr = Array.from(rateMap.entries()).map(([, v]) => v);
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

function formatDateParam(d: Date): string {
    return format(d, "yyyy-MM-dd HH:mm:ss");
}

function applyTime(date: Date, time: string): Date {
    const [h, m] = time.split(":").map(Number);
    return setSeconds(setMinutes(setHours(date, h || 0), m || 0), 0);
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
                    <div className="flex items-center gap-4 text-muted-foreground">
                        <span className="flex items-center gap-1 text-lg font-bold text-primary">
                            <Ticket className="h-5 w-5" />
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
                        <div key={idx} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
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
                                        <Ticket className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                )}
                                <span className="text-sm font-medium">{item.title}</span>
                            </div>
                            <div className="flex items-center gap-6 text-sm">
                                <span className="text-muted-foreground">{item.ticketCount} tickets</span>
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

export default function StationSummary() {
    const [date, setDate] = useState<DateRange>({
        from: startOfDay(new Date()),
        to: endOfDay(new Date()),
    });
    const [fromTime, setFromTime] = useState("00:00");
    const [toTime, setToTime] = useState("23:59");

    const [data, setData] = useState<StationSummaryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedStation, setSelectedStation] = useState<string | null>(null);

    const stations = useMemo(() => groupByStation(data), [data]);
    const stationNames = useMemo(() => Array.from(stations.keys()), [stations]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                if (!date.from) return;
                const fromDate = applyTime(date.from, fromTime);
                const toDate = applyTime(date.to ?? date.from, toTime);
                const from = formatDateParam(fromDate);
                const to = formatDateParam(toDate);
                const result = await stationService.getStationSummary(from, to);
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
    }, [date, fromTime, toTime]);

    useEffect(() => {
        if (stationNames.length > 0 && !stationNames.includes(selectedStation || "")) {
            setSelectedStation(stationNames[0]);
        }
    }, [stationNames, selectedStation]);

    const getStationGroups = (stationName: string): RateGroup[] => {
        const stationData = stations.get(stationName) || [];
        return groupByRateType(stationData);
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
                                                    <Ticket className="h-5 w-5 text-primary" />
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
                                <RateTypePanel key={group.rateType} group={group} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
