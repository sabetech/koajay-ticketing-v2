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
import { Label } from "@/components/ui/label";
import { agentService, type Agent } from "@/services/agent";
import { stationService, type Station } from "@/services/station";

interface ReassignStationDialogProps {
    agent: Agent | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: (station: Station) => void;
}

function getErrorMessage(error: unknown): string {
    if (typeof error === "object" && error !== null && "response" in error) {
        const axiosError = error as {
            response?: { status?: number; data?: { message?: string; data?: Record<string, string[]> } };
        };
        const status = axiosError.response?.status;
        const data = axiosError.response?.data;
        if (status === 403) {
            return data?.message || "Only Admin or Supervisor can change an agent station.";
        }
        if (status === 404) {
            return data?.message || "Agent not found.";
        }
        if (data?.data && typeof data.data === "object") {
            const details = Object.values(data.data)
                .flat()
                .join(" ");
            if (details) return `${data?.message || "Validation failed."} ${details}`;
        }
        if (data?.message) return data.message;
    }
    if (error instanceof Error) return error.message;
    return "Failed to reassign station. Please try again.";
}

export default function ReassignStationDialog({
    agent,
    open,
    onOpenChange,
    onSuccess,
}: ReassignStationDialogProps) {
    const [stations, setStations] = useState<Station[]>([]);
    const [selectedId, setSelectedId] = useState<string>("");
    const [loadingStations, setLoadingStations] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const currentStationId = agent?.stationInfo?.id;
    const currentStationName =
        agent?.station_user?.station?.name ?? agent?.stationInfo?.name ?? agent?.station_name ?? "—";

    useEffect(() => {
        if (!open) return;
        setError(null);
        setSelectedId(currentStationId ? String(currentStationId) : "");
        if (stations.length > 0) return;
        const fetchStations = async () => {
            setLoadingStations(true);
            try {
                const data = await stationService.getStations();
                setStations(data);
            } catch (err) {
                console.error("Failed to fetch stations:", err);
                setError("Failed to load stations. Please try again.");
            } finally {
                setLoadingStations(false);
            }
        };
        fetchStations();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, agent?.id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!agent || !selectedId) return;
        if (currentStationId && Number(selectedId) === currentStationId) {
            setError("Agent is already assigned to this station.");
            return;
        }
        setIsSubmitting(true);
        setError(null);
        try {
            const station = await agentService.reassignStation(agent.id, Number(selectedId));
            toast.success(`Agent reassigned to ${station.name}.`);
            onSuccess?.(station);
            onOpenChange(false);
        } catch (err) {
            console.error("Failed to reassign station:", err);
            setError(getErrorMessage(err));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>
                            Reassign {agent ? `${agent.fname} ${agent.lname}`.trim() : "Agent"}
                        </DialogTitle>
                        <DialogDescription>
                            Current station: <span className="font-medium">{currentStationName}</span>.
                            Select a new station below.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {error && (
                            <div className="bg-destructive/10 text-destructive text-xs p-3 rounded-md border border-destructive/20">
                                {error}
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label>Station</Label>
                            <Select value={selectedId} onValueChange={setSelectedId} disabled={loadingStations}>
                                <SelectTrigger>
                                    <SelectValue
                                        placeholder={loadingStations ? "Loading stations..." : "Select station"}
                                    />
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
                        <Button type="submit" disabled={isSubmitting || !selectedId}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Reassign
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
