import { useEffect, useState } from "react";
import { format, startOfDay, endOfDay, setHours, setMinutes, setSeconds } from "date-fns";
import type { DateRange } from "react-day-picker";
import { stationService } from "@/services/station";
import type { Station } from "@/services/station";
import { taskforceService } from "@/services/taskforce";
import type { TaskforceData, TaskforceTicket } from "@/services/taskforce";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarIcon, Ticket, DollarSign, Loader2, FileDown } from "lucide-react";
import taskforceLogo from "@/assets/taskforce-logo.jpeg";
import { cn } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

function formatDateParam(d: Date): string {
    return format(d, "yyyy-MM-dd HH:mm:ss");
}

function applyTime(date: Date, time: string): Date {
    const [h, m] = time.split(":").map(Number);
    return setSeconds(setMinutes(setHours(date, h || 0), m || 0), 0);
}

export default function TaskForce() {
    const [stationId, setStationId] = useState<string>("");
    const [stations, setStations] = useState<Station[]>([]);
    const [stationsLoading, setStationsLoading] = useState(true);

    const [date, setDate] = useState<DateRange>({
        from: startOfDay(new Date()),
        to: endOfDay(new Date()),
    });
    const [fromTime, setFromTime] = useState("00:00");
    const [toTime, setToTime] = useState("23:59");

    const [data, setData] = useState<(TaskforceData & { tickets: TaskforceTicket[] }) | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStations = async () => {
            try {
                setStationsLoading(true);
                const result = await stationService.getStations();
                setStations(result);
                if (result.length > 0 && !stationId) {
                    setStationId(result[0].id.toString());
                }
            } catch (err) {
                console.error("Failed to fetch stations:", err);
            } finally {
                setStationsLoading(false);
            }
        };
        fetchStations();
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                if (!date.from || !date.to) return;
                const fromDate = applyTime(date.from, fromTime);
                const toDate = applyTime(date.to, toTime);
                const from = formatDateParam(fromDate);
                const to = formatDateParam(toDate);
                const result = await taskforceService.getData(from, to, stationId || undefined);
                setData(result);
            } catch (err) {
                console.error("Failed to fetch taskforce data:", err);
                setError("Failed to load task force data. Please try again.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [date, fromTime, toTime, stationId]);

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-lg font-semibold md:text-2xl">Task Force</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Monitor and manage task force operations
                    </p>
                </div>
                <img
                    src={taskforceLogo}
                    alt="Task Force Logo"
                    className="object-contain"
                    width={209}
                    height={186}
                />
            </div>

            <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Station:</span>
                    <Select
                        value={stationId}
                        onValueChange={setStationId}
                        disabled={stationsLoading}
                    >
                        <SelectTrigger className="w-[250px]">
                            <SelectValue
                                placeholder={
                                    stationsLoading ? "Loading stations..." : "Select Station"
                                }
                            />
                        </SelectTrigger>
                        <SelectContent>
                            {stations.map((station) => (
                                <SelectItem
                                    key={station.id}
                                    value={station.id.toString()}
                                >
                                    {station.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

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
                                <span>Pick a date & time range</span>
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
                            captionLayout="dropdown"
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
                <div className="grid grid-cols-2 gap-4">
                    {[1, 2].map((i) => (
                        <Card key={i} className="bg-primary/5 border-primary/20">
                            <CardContent className="flex items-center justify-between py-6">
                                <div className="flex items-center gap-2">
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : data ? (
                <>
                    <div className="grid grid-cols-2 gap-4">
                        <Card className="bg-primary/5 border-primary/20">
                            <CardContent className="flex items-center justify-between py-4">
                                <div className="flex items-center gap-2">
                                    <Ticket className="h-5 w-5 text-primary" />
                                    <span className="font-medium">Taskforce Tickets</span>
                                </div>
                                <span className="text-2xl font-bold">{data.ticket_count}</span>
                            </CardContent>
                        </Card>
                        <Card className="bg-primary/5 border-primary/20">
                            <CardContent className="flex items-center justify-between py-4">
                                <div className="flex items-center gap-2">
                                    <DollarSign className="h-5 w-5 text-primary" />
                                    <span className="font-medium">Taskforce Total Amount</span>
                                </div>
                                <span className="text-2xl font-bold">
                                    GHS {Number(data.total_amount).toFixed(2)}
                                </span>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-semibold">Tickets</h2>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                const fromStr = formatDateParam(applyTime(date.from!, fromTime));
                                const toStr = formatDateParam(applyTime(date.to!, toTime));
                                window.open(
                                    `https://ticketing.koajay.com/download-taskforce-report?from=${encodeURIComponent(fromStr)}&to=${encodeURIComponent(toStr)}`,
                                    "_blank"
                                );
                            }}
                        >
                            <FileDown className="mr-2 h-4 w-4" />
                            Export PDF
                        </Button>
                    </div>

                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="sticky top-0 bg-background z-10">
                                    <TableRow>
                                        <TableHead>Ticket ID</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Car Number</TableHead>
                                        <TableHead>Rate</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Agent</TableHead>
                                        <TableHead>Phone</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.tickets.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                                No tickets found
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        data.tickets.map((ticket) => (
                                            <TableRow key={ticket.id}>
                                                <TableCell className="font-mono text-xs">{ticket.id}</TableCell>
                                                <TableCell>{format(new Date(ticket.issued_date_time), "MMM dd, yyyy HH:mm")}</TableCell>
                                                <TableCell className="font-mono">{ticket.car_number}</TableCell>
                                                <TableCell>{ticket.rate_title}</TableCell>
                                                <TableCell className="font-semibold">GHS {Number(ticket.amount).toFixed(2)}</TableCell>
                                                <TableCell>
                                                    {ticket.fname} {ticket.lname}
                                                </TableCell>
                                                <TableCell className="font-mono text-sm">{ticket.phone}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </>
            ) : null}
        </div>
    );
}
