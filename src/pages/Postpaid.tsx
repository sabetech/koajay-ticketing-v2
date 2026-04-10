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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ratesService, type Rate } from "@/services/rates";
import { postpaidService, type PostpaidSummary } from "@/services/postpaid";
import type { DateRange } from "react-day-picker";

export default function PostpaidPage() {
    // ... Existing state ...
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

    // New Payment Modal State
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [modalDateRange, setModalDateRange] = useState<DateRange | undefined>({
        from: startOfDay(new Date()),
        to: endOfDay(new Date()),
    });
    const [modalStartTime, setModalStartTime] = useState("00:00:00");
    const [modalEndTime, setModalEndTime] = useState("23:59:59");
    const [modalClientId, setModalClientId] = useState<string>("all");
    const [paymentDiscount, setPaymentDiscount] = useState<string>("0");
    const [paymentWHT, setPaymentWHT] = useState<string>("0");
    const [paymentAmountPaid, setPaymentAmountPaid] = useState<string>("0");
    const [modalSummary, setModalSummary] = useState<PostpaidSummary | null>(null);

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

    useEffect(() => {
        const calculatedModalSummary = postpaidService.calculateSummary(tickets, modalClientId);
        setModalSummary(calculatedModalSummary);
    }, [tickets, modalClientId]);

    const handleOpenPaymentModal = () => {
        setModalDateRange(dateRange);
        setModalStartTime(startTime);
        setModalEndTime(endTime);
        setModalClientId(selectedClient);
        setPaymentDiscount("0");
        setPaymentWHT("0");
        setPaymentAmountPaid("0");
        setIsPaymentModalOpen(true);
    };

    const handleConfirmPayment = async () => {
        if (!modalSummary || modalClientId === "all") {
            alert("Please select a specific client to make a payment.");
            return;
        }

        const pendingAmount = modalSummary.pending_amount;
        const discountPercent = parseFloat(paymentDiscount) || 0;
        const whtPercent = parseFloat(paymentWHT) || 0;
        
        const discountAmount = (discountPercent / 100) * pendingAmount;
        const whtAmount = (whtPercent / 100) * pendingAmount;
        const finalAmount = pendingAmount - discountAmount - whtAmount;
        
        const amountPaid = parseFloat(paymentAmountPaid) || 0;

        if (amountPaid < finalAmount) {
            alert("Amount paid must be at least the final amount to be paid.");
            return;
        }

        setIsMakingPayment(true);
        try {
            const fromDate = modalDateRange?.from ? format(modalDateRange.from, "yyyy-MM-dd") : format(startOfDay(new Date()), "yyyy-MM-dd");
            const toDate = modalDateRange?.to ? format(modalDateRange.to, "yyyy-MM-dd") : format(endOfDay(new Date()), "yyyy-MM-dd");

            const from = `${fromDate} ${modalStartTime}`;
            const to = `${toDate} ${modalEndTime}`;

            await postpaidService.makePayment({
                client_id: modalClientId,
                amount: finalAmount, // Sending the calculated final amount
                dateRange: {
                    from,
                    to,
                },
                discount: discountPercent,
                tax: whtPercent
            });

            alert("Payment processed successfully!");
            setIsPaymentModalOpen(false);
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
                                    onClick={handleOpenPaymentModal}
                                    disabled={!summary?.pending_amount || summary.pending_amount <= 0}
                                >
                                    <Wallet className="mr-2 h-4 w-4" />
                                    Make Payment
                                </Button>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Make Credit Payment</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Date Range</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "w-full justify-start text-left font-normal px-2 text-xs",
                                                    !modalDateRange && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-3 w-3" />
                                                {modalDateRange?.from ? (
                                                    modalDateRange.to ? (
                                                        <>
                                                            {format(modalDateRange.from, "MMM dd")} - {format(modalDateRange.to, "MMM dd")}
                                                        </>
                                                    ) : (
                                                        format(modalDateRange.from, "MMM dd")
                                                    )
                                                ) : (
                                                    <span>Pick dates</span>
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                initialFocus
                                                mode="range"
                                                defaultMonth={modalDateRange?.from}
                                                selected={modalDateRange}
                                                onSelect={setModalDateRange}
                                                numberOfMonths={1}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-2">
                                    <Label>Client</Label>
                                    <Select value={modalClientId} onValueChange={setModalClientId}>
                                        <SelectTrigger className="w-full text-xs">
                                            <SelectValue placeholder="Select Client" />
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


                            <div className="p-3 bg-muted/30 rounded-lg space-y-2 border border-dashed">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Original Pending:</span>
                                    <span className="font-medium">GH₵{modalSummary?.pending_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? "0.00"}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="discount" className="text-[10px] uppercase font-bold text-muted-foreground">Discount (%)</Label>
                                        <Input
                                            id="discount"
                                            type="number"
                                            className="h-8"
                                            value={paymentDiscount}
                                            onChange={(e) => setPaymentDiscount(e.target.value)}
                                        />
                                        <span className="text-[10px] text-muted-foreground block text-right mt-1">
                                            - GH₵{((parseFloat(paymentDiscount) || 0) / 100 * (modalSummary?.pending_amount ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="wht" className="text-[10px] uppercase font-bold text-muted-foreground">Withholding Tax (%)</Label>
                                        <Input
                                            id="wht"
                                            type="number"
                                            className="h-8"
                                            value={paymentWHT}
                                            onChange={(e) => setPaymentWHT(e.target.value)}
                                        />
                                        <span className="text-[10px] text-muted-foreground block text-right mt-1">
                                            - GH₵{((parseFloat(paymentWHT) || 0) / 100 * (modalSummary?.pending_amount ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 pt-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-semibold">Final Amount to be Paid</Label>
                                    <Badge variant="secondary" className="text-sm font-bold bg-primary/10 text-primary px-3 py-1">
                                        GH₵{(
                                            (modalSummary?.pending_amount ?? 0) - 
                                            ((parseFloat(paymentDiscount) || 0) / 100 * (modalSummary?.pending_amount ?? 0)) - 
                                            ((parseFloat(paymentWHT) || 0) / 100 * (modalSummary?.pending_amount ?? 0))
                                        ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </Badge>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="amountPaid" className="text-xs font-medium">Amount Paid (GH₵)</Label>
                                    <Input
                                        id="amountPaid"
                                        type="number"
                                        placeholder="Enter amount customer is paying"
                                        value={paymentAmountPaid}
                                        onChange={(e) => setPaymentAmountPaid(e.target.value)}
                                        className={cn(
                                            "h-10 text-lg font-bold",
                                            (parseFloat(paymentAmountPaid) || 0) >= (
                                                (modalSummary?.pending_amount ?? 0) - 
                                                ((parseFloat(paymentDiscount) || 0) / 100 * (modalSummary?.pending_amount ?? 0)) - 
                                                ((parseFloat(paymentWHT) || 0) / 100 * (modalSummary?.pending_amount ?? 0))
                                            )
                                                ? "border-emerald-500 ring-emerald-500"
                                                : "border-amber-500"
                                        )}
                                    />
                                    {(parseFloat(paymentAmountPaid) || 0) < (
                                        (modalSummary?.pending_amount ?? 0) - 
                                        ((parseFloat(paymentDiscount) || 0) / 100 * (modalSummary?.pending_amount ?? 0)) - 
                                        ((parseFloat(paymentWHT) || 0) / 100 * (modalSummary?.pending_amount ?? 0))
                                    ) && (
                                        <p className="text-[10px] text-amber-600 font-medium">* Amount paid must cover the final amount</p>
                                    )}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)}>Cancel</Button>
                            <Button
                                onClick={handleConfirmPayment}
                                disabled={
                                    isMakingPayment ||
                                    !modalSummary?.pending_amount ||
                                    modalClientId === "all" ||
                                    (parseFloat(paymentAmountPaid) || 0) < (
                                        (modalSummary?.pending_amount ?? 0) - 
                                        ((parseFloat(paymentDiscount) || 0) / 100 * (modalSummary?.pending_amount ?? 0)) - 
                                        ((parseFloat(paymentWHT) || 0) / 100 * (modalSummary?.pending_amount ?? 0))
                                    )
                                }
                            >
                                {isMakingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Save Payment
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

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

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Ticket Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border max-h-[500px] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Client</TableHead>
                                    <TableHead>Car Number</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead className="text-right">Payment Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                                <span>Loading tickets...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : tickets.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                            No tickets found for the selected criteria.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    tickets
                                        .filter(ticket => selectedClient === "all" || ticket.rate_id.toString() === selectedClient.toString())
                                        .map((ticket) => {
                                            const isPaid = ticket.paid === 1 || ticket.paid === "1" || ticket.paid === true || ticket.paid === "true";
                                            return (
                                                <TableRow key={ticket.id}>
                                                    <TableCell className="font-medium">
                                                        {ticket.issued_date_time ? format(new Date(ticket.issued_date_time.replace(" ", "T")), "MMM dd, yyyy HH:mm") : "-"}
                                                    </TableCell>
                                                    <TableCell>{ticket.rate_title || "—"}</TableCell>
                                                    <TableCell className="font-mono">{ticket.car_number}</TableCell>
                                                    <TableCell className="font-semibold">
                                                        GH₵{parseFloat(ticket.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant={isPaid ? "default" : "outline"} className={cn(
                                                            isPaid ? "bg-emerald-500 hover:bg-emerald-600 text-white border-none" : "text-amber-600 border-amber-200 bg-amber-50"
                                                        )}>
                                                            {isPaid ? "Paid" : "Pending"}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
