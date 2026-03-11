import { useEffect, useState } from "react";
import { ratesService } from "@/services/rates";
import type { Rate } from "@/services/rates";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Ticket, Edit, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const RATE_TYPE_COLORS: Record<string, string> = {
    fixed: "bg-blue-500/10 text-blue-600 border-blue-200",
    flexible: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
    postpaid: "bg-amber-500/10 text-amber-600 border-amber-200",
};

export default function Rates() {
    const [stationId, setStationId] = useState<string>("1");
    const [rates, setRates] = useState<Rate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRates = async (id: string) => {
        try {
            setLoading(true);
            setError(null);
            const data = await ratesService.getRates(Number(id));
            setRates(data);
        } catch (err) {
            console.error("Failed to fetch rates:", err);
            setError("Failed to load rates. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRates(stationId);
    }, [stationId]);

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-semibold md:text-2xl">Rates and Categories</h1>
                    <p className="text-sm text-muted-foreground">Manage vehicle categories and their associated rates.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Station:</span>
                        <Select value={stationId} onValueChange={setStationId}>
                            <SelectTrigger className="w-[250px]">
                                <SelectValue placeholder="Select Station" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">Achimota Transport Terminal</SelectItem>
                                <SelectItem value="2">Circle Interchange Bus Terminal</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button>Add New Rate</Button>
                </div>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Vehicle Category</TableHead>
                            <TableHead>Icon</TableHead>
                            <TableHead>Rate (Amount)</TableHead>
                            <TableHead>Station</TableHead>
                            <TableHead>Postpaid Status</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Loading rates...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : error ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-destructive font-medium">
                                    {error}
                                </TableCell>
                            </TableRow>
                        ) : rates.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    No rates found for this station.
                                </TableCell>
                            </TableRow>
                        ) : (
                            rates.map((rate) => (
                                <TableRow key={rate.id}>
                                    <TableCell className="font-medium">{rate.title}</TableCell>
                                    <TableCell>
                                        {rate.icon ? (
                                            <img
                                                src={rate.icon}
                                                alt={rate.title}
                                                className="h-8 w-8 rounded object-cover"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = "none";
                                                }}
                                            />
                                        ) : (
                                            <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                                                <Ticket className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-foreground">
                                                GHS {parseFloat(rate.amount).toFixed(2)}
                                            </span>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "text-[10px] uppercase font-bold",
                                                    RATE_TYPE_COLORS[rate.rate_type] || "bg-gray-100"
                                                )}
                                            >
                                                {rate.rate_type}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell>{rate.station?.name || "—"}</TableCell>
                                    <TableCell>
                                        <Badge variant={rate.is_postpaid === "1" ? "secondary" : "outline"} className="font-medium">
                                            {rate.is_postpaid === "1" ? "Postpaid" : "Pay as you go"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive"
                                                onClick={() => {
                                                    if (window.confirm("Are you sure you want to delete this rate?")) {
                                                        // Handle delete (would normally call a service)
                                                        setRates((prev) => prev.filter((r) => r.id !== rate.id));
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
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
