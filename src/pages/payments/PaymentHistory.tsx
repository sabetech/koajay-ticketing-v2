import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Search, Loader2, DollarSign, CalendarCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { postpaidService } from "@/services/postpaid";
import { ratesService, type Rate } from "@/services/rates";

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];
const YEARS = Array.from({ length: 7 }, (_, i) => 2024 + i);

export default function PaymentHistory() {
    const now = new Date();
    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Initial unapplied UI state
    const [fromMonth, setFromMonth] = useState<string>(now.getMonth().toString());
    const [fromYear, setFromYear] = useState<string>(now.getFullYear().toString());
    const [toMonth, setToMonth] = useState<string>(nextMonthDate.getMonth().toString());
    const [toYear, setToYear] = useState<string>(nextMonthDate.getFullYear().toString());
    const [selectedClient, setSelectedClient] = useState<string>("all");

    // Applied filter state
    const [appliedClient, setAppliedClient] = useState<string>("all");

    const [postpaidRates, setPostpaidRates] = useState<Rate[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Initial setup
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

    // Format date string from DB to Readable string
    const formatDateTime = (dateStr?: string) => {
        if (!dateStr) return "—";
        try {
            return format(new Date(dateStr.replace(" ", "T")), "MMM dd, yyyy HH:mm");
        } catch {
            return dateStr;
        }
    };

    const fetchPaymentHistory = async () => {
        setLoading(true);
        try {
            const fromDateObj = new Date(parseInt(fromYear), parseInt(fromMonth), 1);
            const toDateObj = new Date(parseInt(toYear), parseInt(toMonth), 1);

            const from = `${format(fromDateObj, "yyyy-MM-dd")} 00:00:00`;
            const to = `${format(toDateObj, "yyyy-MM-dd")} 00:00:00`;

            const params: any = { from, to };
            if (selectedClient !== "all") {
                params.client_id = selectedClient;
            }

            const data = await postpaidService.getPaymentHistory(params);
            setPayments(data);
            setAppliedClient(selectedClient);
        } catch (error) {
            console.error("Failed to fetch payment history:", error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch initial on mount
    useEffect(() => {
        fetchPaymentHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Calculate sum dynamically
    const totalAmountPaid = payments
        .filter(p => appliedClient === "all" || p.client_id?.toString() === appliedClient.toString() || p.rate_id?.toString() === appliedClient.toString())
        .reduce((sum, p) => sum + (parseFloat(p.amount_paid) || 0), 0);

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-lg font-semibold md:text-2xl">Payment History</h1>
                    <p className="text-sm text-muted-foreground">Review previously processed payments by postpaid clients.</p>
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
                        onClick={fetchPaymentHistory}
                        disabled={loading}
                        className="h-10 px-6 gap-2"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        Apply Filters
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Amount Paid</CardTitle>
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        ) : (
                            <div className="text-2xl font-bold text-emerald-600">
                                GH₵{totalAmountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">For the selected date range</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                        <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        ) : (
                            <div className="text-2xl font-bold">
                                {payments.length.toLocaleString()}
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">Successful payments recorded</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="flex-1 overflow-hidden flex flex-col">
                <CardHeader>
                    <CardTitle className="text-lg">Payment Records</CardTitle>
                    <CardDescription>
                        Detailed breakdown of all payments processed.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden">
                    <div className="rounded-md border h-full overflow-y-auto max-h-[500px]">
                        <Table>
                            <TableHeader className="sticky top-0 bg-background z-10">
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Client Name</TableHead>
                                    <TableHead>Amount Paid</TableHead>
                                    <TableHead>Discount (%)</TableHead>
                                    <TableHead>WHT (%)</TableHead>
                                    <TableHead>Billing Period</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                                <span className="text-sm text-muted-foreground">Loading payment records...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : payments.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                            No payment records found for the selected criteria.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    payments
                                        .filter(p => appliedClient === "all" || p.client_id?.toString() === appliedClient.toString() || p.rate_id?.toString() === appliedClient.toString())
                                        .map((payment, idx) => (
                                            <TableRow key={payment.id || idx}>
                                                <TableCell className="font-medium">
                                                    {formatDateTime(payment.created_at || payment.date)}
                                                </TableCell>
                                                <TableCell>
                                                    {payment.customer?.title}
                                                </TableCell>
                                                <TableCell className="font-semibold text-emerald-600">
                                                    GH₵{parseFloat(payment.amount_paid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </TableCell>
                                                <TableCell>
                                                    {payment.discount ? `${parseFloat(payment.discount) * 100}%` : "—"}
                                                </TableCell>
                                                <TableCell>
                                                    {payment.witholding_tax ? `${parseFloat(payment.witholding_tax) * 100}%` : "—"}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-xs">
                                                    {payment.start_date_time && payment.end_date_time ? (
                                                        <span>
                                                            {format(new Date(payment.start_date_time.replace(" ", "T")), "MMM yyyy")} - {format(new Date(payment.end_date_time.replace(" ", "T")), "MMM yyyy")}
                                                        </span>
                                                    ) : "—"}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
