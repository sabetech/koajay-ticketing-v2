import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    CalendarIcon,
    Search,
    RotateCcw,
    Edit2,
    Trash2,
    Loader2,
    Ticket as TicketIcon,
    CircleDollarSign,
    WalletCards,
    Ban,
    Users
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { ticketService } from "@/services/ticket";
import type { Ticket, TicketFilterParams, TicketAggregates } from "@/services/ticket";
import { Skeleton } from "@/components/ui/skeleton";

export default function Tickets() {
    const [dateRangeEnabled, setDateRangeEnabled] = useState(true);
    const [date, setDate] = useState<DateRange | undefined>({
        from: new Date(),
        to: new Date(),
    });

    const [filterCategory, setFilterCategory] = useState("carNumber");
    const [searchValue, setSearchValue] = useState("");

    // Suggestion state
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

    // Use refs for values that shouldn't trigger fetch Tickets to avoid exhaustive deps warning
    const filterCategoryRef = useRef(filterCategory);
    const searchValueRef = useRef(searchValue);

    useEffect(() => {
        filterCategoryRef.current = filterCategory;
        searchValueRef.current = searchValue;
    }, [filterCategory, searchValue]);

    const getApiFieldForCategory = (category: string) => {
        switch (category) {
            case "carNumber": return "Car Number";
            case "ticketId": return "Ticket ID";
            case "rate": return "Rate";
            case "agent": return "Agents";
            case "station": return "Station";
            case "rateCategory": return "Rate Category";
            default: return "";
        }
    };

    useEffect(() => {
        const fetchSuggestions = async () => {
            if (!searchValue || searchValue.length < 1) {
                setSuggestions([]);
                setIsSuggestionsOpen(false);
                return;
            }

            const field = getApiFieldForCategory(filterCategory);
            if (!field) return;

            setIsLoadingSuggestions(true);
            try {
                const results = await ticketService.getSuggestions(field, searchValue);
                setSuggestions(results);
                setIsSuggestionsOpen(results.length > 0);
            } catch (error) {
                console.error("Failed to fetch suggestions:", error);
                setSuggestions([]);
            } finally {
                setIsLoadingSuggestions(false);
            }
        };

        const debounceTimer = setTimeout(fetchSuggestions, 600);
        return () => clearTimeout(debounceTimer);
    }, [searchValue, filterCategory]);

    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [aggregates, setAggregates] = useState<TicketAggregates | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingAggregates, setLoadingAggregates] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const [selectedTickets, setSelectedTickets] = useState<Set<number>>(new Set());

    const getDateRangeString = useCallback(() => {
        if (!dateRangeEnabled || !date?.from) return undefined;
        const fromDate = format(date.from, "yyyy-MM-dd") + " 00:00:00";
        const toDate = format(date.to || date.from, "yyyy-MM-dd") + " 23:59:59";
        return `${fromDate},${toDate}`;
    }, [dateRangeEnabled, date]);

    const fetchAggregates = useCallback(async () => {
        try {
            setLoadingAggregates(true);
            const dateRange = getDateRangeString();
            const data = await ticketService.getAggregates(dateRange);
            setAggregates(data);
        } catch (error) {
            console.error("Error fetching aggregates:", error);
        } finally {
            setLoadingAggregates(false);
        }
    }, [getDateRangeString]);

    const fetchTickets = useCallback(async (pageNum: number, isInitial: boolean = false) => {
        try {
            if (isInitial) {
                setLoading(true);
                fetchAggregates();
            } else {
                setLoadingMore(true);
            }

            const params: TicketFilterParams = {
                page: pageNum,
            };

            const dateRange = getDateRangeString();
            if (dateRange) {
                params.dateRange = dateRange;
            }

            if (searchValueRef.current) {
                switch (filterCategoryRef.current) {
                    case "carNumber": params.car_number = searchValueRef.current; break;
                    case "ticketId": params.ticket_id = searchValueRef.current; break;
                    case "rate": params.rate = searchValueRef.current; break;
                    case "agent": params.agent = searchValueRef.current; break;
                    case "station": params.station = searchValueRef.current; break;
                    case "rateCategory": params.rate_category = searchValueRef.current; break;
                }
            }

            const response = await ticketService.getTickets(params);

            if (isInitial) {
                setTickets(response.data);
                setSelectedTickets(new Set());
            } else {
                setTickets(prev => [...prev, ...response.data]);
            }

            setHasMore(response.current_page < response.last_page);
            setPage(response.current_page);
        } catch (error) {
            console.error("Error fetching tickets:", error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [getDateRangeString, fetchAggregates]);

    useEffect(() => {
        fetchTickets(1, true);
    }, [fetchTickets]);

    // Removed window infinite scroll handler here, moved to the table container.

    const resetFilters = () => {
        setFilterCategory("carNumber");
        setSearchValue("");
        setDateRangeEnabled(false);
        setDate({ from: new Date(), to: new Date() });
    };

    const handleApplyFilters = () => {
        setPage(1);
        fetchTickets(1, true);
    };

    const toggleTicketSelection = (ticketId: number) => {
        const newSelection = new Set(selectedTickets);
        if (newSelection.has(ticketId)) {
            newSelection.delete(ticketId);
        } else {
            newSelection.add(ticketId);
        }
        setSelectedTickets(newSelection);
    };

    const toggleSelectAll = () => {
        if (selectedTickets.size === tickets.length && tickets.length > 0) {
            setSelectedTickets(new Set());
        } else {
            setSelectedTickets(new Set(tickets.map(t => t.id)));
        }
    };

    const isAllSelected = useMemo(() => {
        return tickets.length > 0 && selectedTickets.size === tickets.length;
    }, [tickets, selectedTickets]);

    const isSomeSelected = useMemo(() => {
        return selectedTickets.size > 0 && selectedTickets.size < tickets.length;
    }, [tickets, selectedTickets]);

    const getPlaceholder = () => {
        switch (filterCategory) {
            case "carNumber": return "Enter car number";
            case "ticketId": return "Enter ticket ID";
            case "rate": return "Enter rate";
            case "agent": return "Enter agent name";
            case "station": return "Enter station";
            case "rateCategory": return "Enter rate category";
            default: return "Search...";
        }
    };

    const formatDateTime = (dateStr: string) => {
        try {
            return format(parseISO(dateStr), "dd MMM yyyy h:mm a");
        } catch {
            return dateStr;
        }
    };

    const handleDeleteSelected = () => {
        if (window.confirm(`Are you sure you want to delete ${selectedTickets.size} selected ticket(s)?`)) {
            console.log("Deleting tickets:", Array.from(selectedTickets));
            setTickets(prev => prev.filter(t => !selectedTickets.has(t.id)));
            setSelectedTickets(new Set());
        }
    };

    const AggregateCard = ({ title, value, icon: Icon, loading }: { title: string, value: string | number, icon: React.ElementType, loading: boolean }) => (
        <Card className="overflow-hidden border-none shadow-sm bg-muted/30">
            <CardContent className="p-4 flex items-center gap-4">
                <div className="p-2 rounded-full bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    {loading ? (
                        <Skeleton className="h-7 w-20 mt-1" />
                    ) : (
                        <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
                    )}
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold md:text-2xl">Ticket Summary</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Filter Tickets</CardTitle>
                    <CardDescription>
                        Search and filter tickets by various criteria.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center space-x-4 pb-4 border-b">
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="date-range-toggle"
                                checked={dateRangeEnabled}
                                onCheckedChange={setDateRangeEnabled}
                            />
                            <Label htmlFor="date-range-toggle">Enable Date Range</Label>
                        </div>

                        {dateRangeEnabled && (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        id="date"
                                        variant={"outline"}
                                        className={cn(
                                            "w-[300px] justify-start text-left font-normal",
                                            !date && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date?.from ? (
                                            date.to ? (
                                                <>
                                                    {format(date.from, "LLL dd, y")} -{" "}
                                                    {format(date.to, "LLL dd, y")}
                                                </>
                                            ) : (
                                                format(date.from, "LLL dd, y")
                                            )
                                        ) : (
                                            <span>Pick a date range</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        initialFocus
                                        mode="range"
                                        defaultMonth={date?.from}
                                        selected={date}
                                        onSelect={setDate}
                                        numberOfMonths={2}
                                    />
                                </PopoverContent>
                            </Popover>
                        )}
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="grid w-full gap-2">
                            <Label htmlFor="filter-category">Filter By</Label>
                            <Select value={filterCategory} onValueChange={setFilterCategory}>
                                <SelectTrigger id="filter-category">
                                    <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="carNumber">Car number</SelectItem>
                                    <SelectItem value="ticketId">TicketID</SelectItem>
                                    <SelectItem value="rate">Rate</SelectItem>
                                    <SelectItem value="agent">Agent</SelectItem>
                                    <SelectItem value="station">Station</SelectItem>
                                    <SelectItem value="rateCategory">Rate Category</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid w-full gap-2 relative">
                            <Label htmlFor="search-value">Search</Label>
                            <Input
                                id="search-value"
                                placeholder={getPlaceholder()}
                                value={searchValue}
                                onChange={(e) => {
                                    setSearchValue(e.target.value);
                                }}
                                onFocus={() => {
                                    if (suggestions.length > 0 && searchValue.length > 0) {
                                        setIsSuggestionsOpen(true);
                                    }
                                }}
                                onBlur={() => {
                                    // Small delay so clicks on suggestions register first
                                    setTimeout(() => setIsSuggestionsOpen(false), 150);
                                }}
                                autoComplete="off"
                            />
                            {isSuggestionsOpen && (
                                <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-popover shadow-md">
                                    {isLoadingSuggestions && (
                                        <div className="p-4 text-sm text-center text-muted-foreground flex items-center justify-center">
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Loading suggestions...
                                        </div>
                                    )}
                                    {!isLoadingSuggestions && suggestions.length === 0 && searchValue && (
                                        <div className="p-4 text-sm text-center text-muted-foreground">No suggestions found.</div>
                                    )}
                                    {!isLoadingSuggestions && suggestions.length > 0 && (
                                        <ul className="max-h-60 overflow-auto py-1">
                                            {suggestions.map((suggestion, index) => (
                                                <li
                                                    key={index}
                                                    className="cursor-pointer px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                                                    onMouseDown={(e) => {
                                                        // Prevent blur before the click registers
                                                        e.preventDefault();
                                                        setSearchValue(suggestion);
                                                        setIsSuggestionsOpen(false);
                                                    }}
                                                >
                                                    {suggestion}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={resetFilters}>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Reset
                        </Button>
                        <Button onClick={handleApplyFilters}>
                            <Search className="mr-2 h-4 w-4" />
                            Apply Filters
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Ticket Aggregates</CardTitle>
                    <CardDescription>
                        Key performance metrics for the selected criteria.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <AggregateCard
                            title="Total Tickets"
                            value={aggregates?.ticket_count ?? 0}
                            icon={TicketIcon}
                            loading={loadingAggregates}
                        />
                        <AggregateCard
                            title="Ticket Revenue"
                            value={`GHS ${aggregates?.total_revenue ?? "0.00"}`}
                            icon={CircleDollarSign}
                            loading={loadingAggregates}
                        />
                        <AggregateCard
                            title="Ticket Unpaid Amount"
                            value={`GHS ${aggregates?.total_unpaid ?? "0.00"}`}
                            icon={WalletCards}
                            loading={loadingAggregates}
                        />
                        <AggregateCard
                            title="Unpaid Tickets"
                            value={aggregates?.total_unpaid_tickets ?? 0}
                            icon={Ban}
                            loading={loadingAggregates}
                        />
                        <AggregateCard
                            title="Total Agents"
                            value={aggregates?.total_agents ?? 0}
                            icon={Users}
                            loading={loadingAggregates}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>All Tickets</CardTitle>
                        <CardDescription>
                            Showing {tickets.length} tickets.
                        </CardDescription>
                    </div>
                    {selectedTickets.size > 0 && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDeleteSelected}
                            className="ml-auto"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Selected ({selectedTickets.size})
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    <div
                        className="max-h-[600px] overflow-auto rounded-md border"
                        onScroll={(e) => {
                            const target = e.currentTarget;
                            if (
                                target.scrollHeight - target.scrollTop <= target.clientHeight + 500 &&
                                !loading &&
                                !loadingMore &&
                                hasMore
                            ) {
                                fetchTickets(page + 1);
                            }
                        }}
                    >
                        <Table>
                            <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                                <TableRow>
                                    <TableHead className="w-[50px]">
                                        <Checkbox
                                            checked={isAllSelected || (isSomeSelected ? "indeterminate" : false)}
                                            onCheckedChange={toggleSelectAll}
                                            aria-label="Select all"
                                        />
                                    </TableHead>
                                    <TableHead>TicketID</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Car Number</TableHead>
                                    <TableHead>Station</TableHead>
                                    <TableHead>Rate</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Agent</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : !Array.isArray(tickets) || tickets.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                                            No tickets found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    tickets.map((ticket) => (
                                        <TableRow key={ticket.id} className={selectedTickets.has(ticket.id) ? "bg-muted/50" : ""}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedTickets.has(ticket.id)}
                                                    onCheckedChange={() => toggleTicketSelection(ticket.id)}
                                                    aria-label={`Select ticket ${ticket.id}`}
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium">{ticket.title}</TableCell>
                                            <TableCell>{formatDateTime(ticket.issued_date_time)}</TableCell>
                                            <TableCell>{ticket.car_number}</TableCell>
                                            <TableCell>{ticket.station?.name || ticket.station_name}</TableCell>
                                            <TableCell>{ticket.rate?.title || ticket.rate_title}</TableCell>
                                            <TableCell>{ticket.amount}</TableCell>
                                            <TableCell>{`${ticket.agent?.fname || ""} ${ticket.agent?.lname || ""}`.trim()}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end space-x-2">
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
                                                                const newSelection = new Set(selectedTickets);
                                                                newSelection.delete(ticket.id);
                                                                setSelectedTickets(newSelection);
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                                {loadingMore && (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-4">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
