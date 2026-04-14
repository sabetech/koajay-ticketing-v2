import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Ticket, DollarSign, Loader2, Wallet, Search } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
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

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];
const YEARS = Array.from({ length: 7 }, (_, i) => 2024 + i);

export default function PostpaidPage() {
    // Current date helpers
    const now = new Date();
    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Filter state
    const [fromMonth, setFromMonth] = useState<string>(now.getMonth().toString());
    const [fromYear, setFromYear] = useState<string>(now.getFullYear().toString());
    const [toMonth, setToMonth] = useState<string>(nextMonthDate.getMonth().toString());
    const [toYear, setToYear] = useState<string>(nextMonthDate.getFullYear().toString());
    
    const [selectedClient, setSelectedClient] = useState<string>("all");
    const [appliedClient, setAppliedClient] = useState<string>("all");
    const [postpaidRates, setPostpaidRates] = useState<Rate[]>([]);
    const [tickets, setTickets] = useState<any[]>([]);
    const [summary, setSummary] = useState<PostpaidSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [isMakingPayment, setIsMakingPayment] = useState(false);

    // New Payment Modal State
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [modalFromMonth, setModalFromMonth] = useState<string>(now.getMonth().toString());
    const [modalFromYear, setModalFromYear] = useState<string>(now.getFullYear().toString());
    const [modalToMonth, setModalToMonth] = useState<string>(nextMonthDate.getMonth().toString());
    const [modalToYear, setModalToYear] = useState<string>(nextMonthDate.getFullYear().toString());
    
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
            const fromDateObj = new Date(parseInt(fromYear), parseInt(fromMonth), 1);
            const toDateObj = new Date(parseInt(toYear), parseInt(toMonth), 1);
            
            const from = `${format(fromDateObj, "yyyy-MM-dd")} 00:00:00`;
            const to = `${format(toDateObj, "yyyy-MM-dd")} 00:00:00`;

            const params: { from: string; to: string; rate_title?: string } = { from, to };
            if (selectedClient !== "all") {
                params.rate_title = selectedClient;
            }

            const data = await postpaidService.getTickets(params);
            setTickets(data);
            setAppliedClient(selectedClient);
        } catch (error) {
            console.error("Failed to fetch postpaid tickets:", error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch initial tickets on mount
    useEffect(() => {
        fetchTickets();
    }, []);

    useEffect(() => {
        const calculatedSummary = postpaidService.calculateSummary(tickets, appliedClient);
        setSummary(calculatedSummary);
    }, [tickets, appliedClient]);

    useEffect(() => {
        const calculatedModalSummary = postpaidService.calculateSummary(tickets, modalClientId);
        setModalSummary(calculatedModalSummary);
    }, [tickets, modalClientId]);

    const handleOpenPaymentModal = () => {
        setModalFromMonth(fromMonth);
        setModalFromYear(fromYear);
        setModalToMonth(toMonth);
        setModalToYear(toYear);
        setModalClientId(appliedClient);
        setPaymentDiscount("0");
        setPaymentWHT("0");
        setPaymentAmountPaid("0");
        setIsPaymentModalOpen(true);
    };

    const handleConfirmPayment = async () => {
        if (!modalSummary || modalClientId === "all") {
            toast.error("Please select a specific client to make a payment.");
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
            toast.error("Amount paid must be at least the final amount to be paid.");
            return;
        }

        setIsMakingPayment(true);
        try {
            const fromDateObj = new Date(parseInt(modalFromYear), parseInt(modalFromMonth), 1);
            const toDateObj = new Date(parseInt(modalToYear), parseInt(modalToMonth), 1);
            
            const from = `${format(fromDateObj, "yyyy-MM-dd")} 00:00:00`;
            const to = `${format(toDateObj, "yyyy-MM-dd")} 00:00:00`;

            await postpaidService.makePayment({
                client_id: modalClientId,
                amount: finalAmount, 
                dateRange: {
                    from,
                    to,
                },
                discount: discountPercent,
                tax: whtPercent
            });

            toast.success("Payment processed successfully!");
            setIsPaymentModalOpen(false);
            fetchTickets(); 
        } catch (error) {
            console.error("Payment failed:", error);
            toast.error("Failed to process payment. Please try again.");
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

                <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-4 bg-muted/30 p-2 px-3 rounded-lg border border-dashed">
                        {/* From Sector */}
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

                        {/* To Sector */}
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

                    <Select value={selectedClient} onValueChange={setSelectedClient}>
                        <SelectTrigger className="w-[200px] h-10">
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

                    <Button 
                        onClick={fetchTickets} 
                        disabled={loading}
                        className="h-10 px-6 gap-2"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        Apply Filters
                    </Button>
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

            <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
                <DialogContent className="sm:max-w-[550px]">
                    <DialogHeader>
                        <DialogTitle>Make Credit Payment</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                        <div className="space-y-3">
                            <Label className="text-sm font-semibold">Billing Period Range</Label>
                            <div className="grid grid-cols-2 gap-4 bg-muted/30 p-3 rounded-lg border border-dashed">
                                <div className="space-y-2">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">From</span>
                                    <div className="flex gap-2">
                                        <Select value={modalFromMonth} onValueChange={setModalFromMonth}>
                                            <SelectTrigger className="w-full h-9 text-xs">
                                                <SelectValue placeholder="Month" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {MONTHS.map((month, index) => (
                                                    <SelectItem key={`modal-from-${month}`} value={index.toString()}>
                                                        {month}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        <Select value={modalFromYear} onValueChange={setModalFromYear}>
                                            <SelectTrigger className="w-full h-9 text-xs">
                                                <SelectValue placeholder="Year" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {YEARS.map(year => (
                                                    <SelectItem key={`modal-from-${year}`} value={year.toString()}>
                                                        {year}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">To (Boundary)</span>
                                    <div className="flex gap-2">
                                        <Select value={modalToMonth} onValueChange={setModalToMonth}>
                                            <SelectTrigger className="w-full h-9 text-xs">
                                                <SelectValue placeholder="Month" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {MONTHS.map((month, index) => (
                                                    <SelectItem key={`modal-to-${month}`} value={index.toString()}>
                                                        {month}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        <Select value={modalToYear} onValueChange={setModalToYear}>
                                            <SelectTrigger className="w-full h-9 text-xs">
                                                <SelectValue placeholder="Year" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {YEARS.map(year => (
                                                    <SelectItem key={`modal-to-${year}`} value={year.toString()}>
                                                        {year}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Client</Label>
                            <Select value={modalClientId} onValueChange={setModalClientId}>
                                <SelectTrigger className="w-full">
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

                        <div className="p-4 bg-muted/40 rounded-xl space-y-3 border shadow-sm">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground font-medium">Selected Period Pending:</span>
                                <span className="font-bold text-base">GH₵{modalSummary?.pending_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? "0.00"}</span>
                            </div>
                            
                            <div className="h-[1px] bg-border my-1" />

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <Label htmlFor="discount" className="text-[10px] uppercase font-bold text-muted-foreground">Discount (%)</Label>
                                    <Input
                                        id="discount"
                                        type="number"
                                        className="h-9 font-semibold"
                                        value={paymentDiscount}
                                        onChange={(e) => setPaymentDiscount(e.target.value)}
                                    />
                                    <span className="text-[11px] text-amber-600 font-medium block text-right mt-1">
                                        - GH₵{((parseFloat(paymentDiscount) || 0) / 100 * (modalSummary?.pending_amount ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="wht" className="text-[10px] uppercase font-bold text-muted-foreground">Withholding Tax (%)</Label>
                                    <Input
                                        id="wht"
                                        type="number"
                                        className="h-9 font-semibold"
                                        value={paymentWHT}
                                        onChange={(e) => setPaymentWHT(e.target.value)}
                                    />
                                    <span className="text-[11px] text-amber-600 font-medium block text-right mt-1">
                                        - GH₵{((parseFloat(paymentWHT) || 0) / 100 * (modalSummary?.pending_amount ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/10">
                                <Label className="text-sm font-bold">Final Amount to be Paid</Label>
                                <Badge variant="secondary" className="text-base font-black bg-primary/10 text-primary px-4 py-1.5">
                                    GH₵{(
                                        (modalSummary?.pending_amount ?? 0) - 
                                        ((parseFloat(paymentDiscount) || 0) / 100 * (modalSummary?.pending_amount ?? 0)) - 
                                        ((parseFloat(paymentWHT) || 0) / 100 * (modalSummary?.pending_amount ?? 0))
                                    ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </Badge>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="amountPaid" className="text-xs font-bold text-muted-foreground uppercase">Actual Amount Paid (GH₵)</Label>
                                <Input
                                    id="amountPaid"
                                    type="number"
                                    placeholder="Enter GH₵ amount"
                                    value={paymentAmountPaid}
                                    onChange={(e) => setPaymentAmountPaid(e.target.value)}
                                    className={cn(
                                        "h-12 text-2xl font-black text-center tracking-tight",
                                        (parseFloat(paymentAmountPaid) || 0) >= (
                                            (modalSummary?.pending_amount ?? 0) - 
                                            ((parseFloat(paymentDiscount) || 0) / 100 * (modalSummary?.pending_amount ?? 0)) - 
                                            ((parseFloat(paymentWHT) || 0) / 100 * (modalSummary?.pending_amount ?? 0))
                                        )
                                            ? "border-emerald-500 ring-emerald-500 bg-emerald-50/30"
                                            : "border-amber-500 bg-amber-50/30"
                                    )}
                                />
                                {(parseFloat(paymentAmountPaid) || 0) < (
                                    (modalSummary?.pending_amount ?? 0) - 
                                    ((parseFloat(paymentDiscount) || 0) / 100 * (modalSummary?.pending_amount ?? 0)) - 
                                    ((parseFloat(paymentWHT) || 0) / 100 * (modalSummary?.pending_amount ?? 0))
                                ) && (
                                    <p className="text-[11px] text-amber-700 font-bold bg-amber-100 p-2 rounded-md border border-amber-200">* Payment must cover the final calculated amount</p>
                                )}
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setIsPaymentModalOpen(false)}>Cancel</Button>
                        <Button
                            className="bg-primary hover:bg-primary/90 min-w-[140px]"
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
                            Process Payment
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
                                        .filter(ticket => appliedClient === "all" || ticket.rate_id.toString() === appliedClient.toString())
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
