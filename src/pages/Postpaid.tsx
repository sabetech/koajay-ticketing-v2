import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Ticket, DollarSign, CalendarIcon, Loader2, Wallet } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ratesService, type Rate } from "@/services/rates";
import { postpaidService, type PostpaidSummary } from "@/services/postpaid";
import type { DateRange } from "react-day-picker";

export default function PostpaidPage() {
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfDay(new Date()),
        to: endOfDay(new Date()),
    });
    const [startTime, setStartTime] = useState("00:00:00");
    const [endTime, setEndTime] = useState("23:59:59");
    const [selectedClient, setSelectedClient] = useState<string>("all");
    const [postpaidRates, setPostpaidRates] = useState<Rate[]>([]);
    const [tickets, setTickets] = useState<any[]>([]);
    const [summary, setSummary] = useState<PostpaidSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [isMakingPayment, setIsMakingPayment] = useState(false);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const rates = await ratesService.getRates();
                setPostpaidRates(rates.filter(r => r.is_postpaid === "1"));
            } catch (error) {
                console.error("Failed to load rates:", error);
            }
        };
        loadInitialData();
    }, []);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const fromDate = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : format(startOfDay(new Date()), "yyyy-MM-dd");
            const toDate = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : format(endOfDay(new Date()), "yyyy-MM-dd");
            
            const from = `${fromDate} ${startTime}`;
            const to = `${toDate} ${endTime}`;
            
            const data = await postpaidService.getTickets({ from, to });
            setTickets(data);
        } catch (error) {
            console.error("Failed to fetch postpaid tickets:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, [dateRange, startTime, endTime]);

    useEffect(() => {
        const calculatedSummary = postpaidService.calculateSummary(tickets, selectedClient);
        setSummary(calculatedSummary);
    }, [tickets, selectedClient]);

    const handleMakePayment = async () => {
        if (!summary || selectedClient === "all") {
            alert("Please select a specific client to make a payment.");
            return;
        }
        
        setIsMakingPayment(true);
        try {
            const fromDate = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : format(startOfDay(new Date()), "yyyy-MM-dd");
            const toDate = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : format(endOfDay(new Date()), "yyyy-MM-dd");
            
            const from = `${fromDate} ${startTime}`;
            const to = `${toDate} ${endTime}`;

            await postpaidService.makePayment({
                rate_id: selectedClient,
                amount: summary.pending_amount,
                from,
                to
            });
            
            alert("Payment processed successfully!");
            fetchTickets(); // Refresh data
        } catch (error) {
            console.error("Payment failed:", error);
            alert("Failed to process payment. Please try again.");
        } finally {
            setIsMakingPayment(false);
        }
    };

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-lg font-semibold md:text-2xl">Postpaid (On Credit)</h1>
                    <p className="text-sm text-muted-foreground">Manage and track credit payments for corporate clients.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "w-[260px] justify-start text-left font-normal",
                                    !dateRange && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (
                                    dateRange.to ? (
                                        <>
                                            {format(dateRange.from, "LLL dd, y")} -{" "}
                                            {format(dateRange.to, "LLL dd, y")}
                                        </>
                                    ) : (
                                        format(dateRange.from, "LLL dd, y")
                                    )
                                ) : (
                                    <span>Pick a date range</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange?.from}
                                selected={dateRange}
                                onSelect={setDateRange}
                                numberOfMonths={2}
                            />
                        </PopoverContent>
                    </Popover>

                    <div className="flex items-center gap-2 bg-muted/50 p-1 px-3 rounded-md border">
                        <div className="grid gap-1">
                            <Label htmlFor="startTime" className="text-[10px] uppercase font-bold text-muted-foreground">Start Time</Label>
                            <Input
                                id="startTime"
                                type="time"
                                step="1"
                                className="h-8 w-[100px] border-none bg-transparent p-0 focus-visible:ring-0 shadow-none"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                            />
                        </div>
                        <div className="h-8 w-[1px] bg-border mx-1" />
                        <div className="grid gap-1">
                            <Label htmlFor="endTime" className="text-[10px] uppercase font-bold text-muted-foreground">End Time</Label>
                            <Input
                                id="endTime"
                                type="time"
                                step="1"
                                className="h-8 w-[100px] border-none bg-transparent p-0 focus-visible:ring-0 shadow-none"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                            />
                        </div>
                    </div>

                    <Select value={selectedClient} onValueChange={setSelectedClient}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Filter by Client" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Clients</SelectItem>
                            {postpaidRates.map(rate => (
                                <SelectItem key={rate.id} value={rate.id.toString()}>
                                    {rate.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Amount Paid</CardTitle>
                        <DollarSign className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        ) : (
                            <div className="text-2xl font-bold text-emerald-600">
                                GH₵{summary?.amount_paid?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? "0.00"}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Paid Tickets</CardTitle>
                        <Ticket className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        ) : (
                            <div className="text-2xl font-bold">
                                {summary?.paid_tickets_count?.toLocaleString() ?? "0"}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
                        <CreditCard className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {loading ? (
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold text-amber-600">
                                    GH₵{summary?.pending_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? "0.00"}
                                </div>
                                <Button 
                                    className="w-full mt-2" 
                                    size="sm"
                                    onClick={handleMakePayment}
                                    disabled={isMakingPayment || !summary?.pending_amount || selectedClient === "all"}
                                >
                                    {isMakingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                                    Make Payment
                                </Button>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Tickets</CardTitle>
                        <Ticket className="h-4 w-4 text-amber-500 opacity-50" />
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        ) : (
                            <div className="text-2xl font-bold text-amber-700">
                                {summary?.pending_tickets_count?.toLocaleString() ?? "0"}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
