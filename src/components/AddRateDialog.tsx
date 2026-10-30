import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { RATE_ICON_OPTIONS } from "@/lib/rateIcons";
import { ratesService } from "@/services/rates";
import type { Station } from "@/services/station";

interface AddRateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    stations: Station[];
    defaultStationId: string;
    onSuccess?: () => void;
}

function getErrorMessage(error: unknown): string {
    if (typeof error === "object" && error !== null && "response" in error) {
        const axiosError = error as {
            response?: { status?: number; data?: { message?: string; data?: Record<string, string[]> } };
        };
        const data = axiosError.response?.data;
        if (data?.data && typeof data.data === "object") {
            const details = Object.values(data.data)
                .flat()
                .join(" ");
            if (details) return `${data?.message || "Validation failed."} ${details}`;
        }
        if (data?.message) return data.message;
    }
    if (error instanceof Error) return error.message;
    return "Failed to create rate. Please try again.";
}

export default function AddRateDialog({
    open,
    onOpenChange,
    stations,
    defaultStationId,
    onSuccess,
}: AddRateDialogProps) {
    const [title, setTitle] = useState("");
    const [amount, setAmount] = useState("");
    const [rateType, setRateType] = useState("");
    const [isPostpaid, setIsPostpaid] = useState("");
    const [stationId, setStationId] = useState("");
    const [iconUrl, setIconUrl] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setError(null);
        setTitle("");
        setAmount("");
        setRateType("");
        setIsPostpaid("");
        setStationId(defaultStationId);
        setIconUrl(null);
    }, [open, defaultStationId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!iconUrl) {
            setError("Please select an icon.");
            return;
        }
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await fetch(iconUrl);
            if (!res.ok) throw new Error("Failed to download the selected icon.");
            const blob = await res.blob();
            const iconFile = new File([blob], `icon-${Date.now()}.svg`, {
                type: "image/svg+xml",
            });

            const data = new FormData();
            data.append("title", title.trim());
            data.append("amount", amount);
            data.append("rate_type", rateType);
            data.append("is_postpaid", isPostpaid);
            data.append("station", stationId);
            data.append("icon", iconFile);

            await ratesService.createRate(data);

            toast.success(`Rate "${title.trim()}" created successfully.`);
            onOpenChange(false);
            onSuccess?.();
        } catch (err) {
            console.error("Failed to create rate:", err);
            setError(getErrorMessage(err));
        } finally {
            setIsSubmitting(false);
        }
    };

    const isReady =
        title.trim() !== "" &&
        amount !== "" &&
        rateType !== "" &&
        isPostpaid !== "" &&
        stationId !== "" &&
        iconUrl !== null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Add New Rate</DialogTitle>
                        <DialogDescription>
                            Create a vehicle category and its rate for a station.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {error && (
                            <div className="bg-destructive/10 text-destructive text-xs p-3 rounded-md border border-destructive/20">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="title">Vehicle Category</Label>
                            <Input
                                id="title"
                                required
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Starcity Bus"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="amount">Rate (Amount)</Label>
                            <Input
                                id="amount"
                                type="number"
                                required
                                min="0"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="e.g. 5.00"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Fixed/Flexible?</Label>
                            <Select value={rateType} onValueChange={setRateType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select rate type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="fixed">Fixed</SelectItem>
                                    <SelectItem value="flexible">Flexible</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Postpaid?</Label>
                            <Select value={isPostpaid} onValueChange={setIsPostpaid}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select payment type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="false">Pay as you go</SelectItem>
                                    <SelectItem value="true">Postpaid</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Station</Label>
                            <Select value={stationId} onValueChange={setStationId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select station" />
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

                        <div className="space-y-2">
                            <Label>Icon</Label>
                            <div className="max-h-[180px] overflow-y-auto rounded-md border p-2">
                                <div className="grid grid-cols-7 gap-2">
                                    {RATE_ICON_OPTIONS.map((option) => (
                                        <button
                                            key={option.url}
                                            type="button"
                                            title={option.name}
                                            aria-label={option.name}
                                            aria-pressed={iconUrl === option.url}
                                            onClick={() => setIconUrl(option.url)}
                                            className={cn(
                                                "flex h-10 w-10 items-center justify-center rounded-md border transition-colors",
                                                iconUrl === option.url
                                                    ? "border-primary bg-primary/10 ring-2 ring-primary"
                                                    : "border-muted bg-background hover:bg-muted"
                                            )}
                                        >
                                            <img
                                                src={option.url}
                                                alt=""
                                                className="h-6 w-6 object-contain"
                                                onError={(e) => {
                                                    (e.currentTarget as HTMLImageElement).style.display = "none";
                                                }}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {iconUrl === null && (
                                <p className="text-xs text-muted-foreground">Select an icon (required).</p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting || !isReady}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Create Rate
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
