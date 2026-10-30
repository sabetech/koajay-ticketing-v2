import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ratesService, getRateIconUrl } from "@/services/rates";
import type { Rate } from "@/services/rates";
import { stationService, type Station } from "@/services/station";
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Ticket, Edit, Trash2, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import AddRateDialog from "@/components/AddRateDialog";

const RATE_TYPE_COLORS: Record<string, string> = {
    fixed: "bg-blue-500/10 text-blue-600 border-blue-200",
    flexible: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
    postpaid: "bg-amber-500/10 text-amber-600 border-amber-200",
};

export default function Rates() {
    const [stationId, setStationId] = useState<string>("1");
    const [rates, setRates] = useState<Rate[]>([]);
    const [stations, setStations] = useState<Station[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAddRateModalOpen, setIsAddRateModalOpen] = useState(false);
    const [rateToDelete, setRateToDelete] = useState<Rate | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

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

    const handleDeleteRate = async () => {
        if (!rateToDelete) return;
        setIsDeleting(true);
        try {
            await ratesService.deleteRate(rateToDelete.id);
            toast.success(`Rate "${rateToDelete.title}" deleted.`);
            setRates((prev) => prev.filter((r) => r.id !== rateToDelete.id));
            setRateToDelete(null);
        } catch (err) {
            console.error("Failed to delete rate:", err);
            toast.error("Failed to delete rate. Please try again.");
        } finally {
            setIsDeleting(false);
        }
    };

    useEffect(() => {
        fetchRates(stationId);
    }, [stationId]);

    useEffect(() => {
        stationService.getStations()
            .then(setStations)
            .catch((err) => console.error("Failed to fetch stations:", err));
    }, []);

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
                                {stations.map((station) => (
                                    <SelectItem key={station.id} value={String(station.id)}>
                                        {station.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={() => setIsAddRateModalOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add New Rate
                    </Button>
                </div>
            </div>

            <AddRateDialog
                open={isAddRateModalOpen}
                onOpenChange={setIsAddRateModalOpen}
                stations={stations}
                defaultStationId={stationId}
                onSuccess={() => fetchRates(stationId)}
            />

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
                                        {getRateIconUrl(rate.icon) ? (
                                            <img
                                                src={getRateIconUrl(rate.icon) ?? undefined}
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
                                                onClick={() => setRateToDelete(rate)}
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

            <AlertDialog
                open={!!rateToDelete}
                onOpenChange={(open) => {
                    if (!open && !isDeleting) setRateToDelete(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will delete the rate
                            <span className="font-bold text-foreground mx-1">{rateToDelete?.title}</span>
                            from this station.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleDeleteRate();
                            }}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Delete Rate
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
