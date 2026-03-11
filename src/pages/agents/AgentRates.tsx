import { useEffect, useState } from "react";
import { agentService, getAgentImageUrl } from "@/services/agent";
import type { Agent, RateWithPivot } from "@/services/agent";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { MapPin, CheckCircle2, Circle, Loader2, User } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AgentRates() {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
    const [rates, setRates] = useState<RateWithPivot[]>([]);
    const [loadingAgents, setLoadingAgents] = useState(true);
    const [loadingRates, setLoadingRates] = useState(false);
    const [togglingRateId, setTogglingRateId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Fetch all agents on mount
    useEffect(() => {
        const fetchAgents = async () => {
            try {
                setLoadingAgents(true);
                const data = await agentService.getAllAgents();
                setAgents(data);
            } catch (err) {
                console.error("Failed to fetch agents:", err);
                setError("Failed to load agents. Please try again.");
            } finally {
                setLoadingAgents(false);
            }
        };
        fetchAgents();
    }, []);

    const fetchRates = async () => {
        if (!selectedAgent) {
            setRates([]);
            return;
        }
        try {
            setLoadingRates(true);
            const data = await agentService.getAgentRates(selectedAgent.id);
            setRates(data);
        } catch (err) {
            console.error("Failed to fetch agent rates:", err);
        } finally {
            setLoadingRates(false);
        }
    };

    // Fetch rates when selected agent changes
    useEffect(() => {
        fetchRates();
    }, [selectedAgent]);

    const handleToggleRate = async (rateId: number) => {
        if (!selectedAgent || togglingRateId) return;

        try {
            setTogglingRateId(rateId);
            await agentService.toggleAgentRate(selectedAgent.id, rateId);
            // Re-fetch rates for the updated assignment
            await fetchRates();
        } catch (err) {
            console.error("Failed to toggle rate:", err);
            // Optionally show a toast or error message
        } finally {
            setTogglingRateId(null);
        }
    };

    return (
        <div className="flex h-[calc(100vh-80px)] overflow-hidden gap-6 p-4 lg:p-6">
            {/* Left Pane: Agents List */}
            <div className="w-80 flex flex-col gap-4 border-r pr-6 shrink-0">
                <div className="space-y-1">
                    <h2 className="text-xl font-bold tracking-tight">Agents</h2>
                    <p className="text-sm text-muted-foreground">Select an agent to manage rates.</p>
                </div>

                {error && (
                    <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
                        {error}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                    {loadingAgents ? (
                        Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 border rounded-lg animate-pulse">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-3 w-32" />
                                </div>
                            </div>
                        ))
                    ) : (
                        agents.map((agent) => {
                            const fullName = `${agent.fname} ${agent.lname}`;
                            const stationName = agent.stationInfo?.name ?? agent.station_user?.station?.name ?? "—";
                            const isActive = selectedAgent?.id === agent.id;
                            
                            return (
                                <button
                                    key={agent.id}
                                    onClick={() => setSelectedAgent(agent)}
                                    className={cn(
                                        "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                                        isActive ? "bg-primary/5 border-primary ring-1 ring-primary" : "hover:bg-muted"
                                    )}
                                >
                                    <Avatar className="h-10 w-10 shrink-0">
                                        <AvatarImage 
                                            src={getAgentImageUrl(agent.photo) ?? undefined} 
                                            loading="lazy"
                                            className="object-cover"
                                        />
                                        <AvatarFallback className="bg-primary/10 text-primary uppercase text-xs">
                                            {agent.fname[0]}{agent.lname[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold truncate">{fullName}</p>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                                            <MapPin className="h-3 w-3" />
                                            {stationName}
                                        </p>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Right Pane: Rates Assignment */}
            <div className="flex-1 flex flex-col gap-6 min-w-0 overflow-y-auto pr-2">
                {!selectedAgent ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                        <User className="h-12 w-12 opacity-20" />
                        <p>Select an agent from the list to view assigned rates.</p>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between gap-4">
                            <div className="space-y-1">
                                <h2 className="text-xl font-bold tracking-tight">
                                    Rates for {selectedAgent.fname} {selectedAgent.lname}
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Assigned rates are highlighted. Unassigned rates are grayed out.
                                </p>
                            </div>
                            {loadingRates && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
                        </div>

                        {loadingRates && rates.length === 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <Skeleton key={i} className="h-32 w-full rounded-xl" />
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
                                {rates.map((rate) => {
                                    const isAssigned = !!rate.pivot;
                                    const isToggling = togglingRateId === rate.id;
                                    
                                    return (
                                        <Card 
                                            key={rate.id} 
                                            onClick={() => handleToggleRate(rate.id)}
                                            className={cn(
                                                "relative overflow-hidden transition-all border-2 cursor-pointer select-none",
                                                isAssigned 
                                                    ? "border-emerald-500/50 bg-emerald-500/5 shadow-sm" 
                                                    : "border-muted opacity-60 grayscale-[0.5] hover:opacity-100 hover:grayscale-0",
                                                isToggling && "opacity-80 pointer-events-none"
                                            )}
                                        >
                                            <CardHeader className="p-4 pb-2">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-lg bg-background border">
                                                        {rate.icon ? (
                                                            <img 
                                                                src={rate.icon} 
                                                                alt={rate.title} 
                                                                className="h-7 w-7 object-contain"
                                                                onError={(e) => (e.currentTarget.style.display = 'none')}
                                                            />
                                                        ) : (
                                                            <Circle className="h-5 w-5 text-muted-foreground" />
                                                        )}
                                                    </div>
                                                    {isToggling ? (
                                                        <Loader2 className="h-6 w-6 animate-spin text-primary shrink-0" />
                                                    ) : isAssigned ? (
                                                        <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
                                                    ) : (
                                                        <Circle className="h-6 w-6 text-muted-foreground shrink-0" />
                                                    )}
                                                </div>
                                            </CardHeader>
                                            <CardContent className="p-4 pt-0">
                                                <div className="space-y-2">
                                                    <h3 className="font-bold text-sm leading-tight leading-4 h-8 overflow-hidden line-clamp-2">
                                                        {rate.title}
                                                    </h3>
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-lg font-black text-primary">
                                                            GHS {parseFloat(rate.amount).toFixed(2)}
                                                        </p>
                                                        <Badge variant="outline" className="text-[10px] uppercase font-bold py-0 h-5">
                                                            {rate.rate_type}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1 mt-1">
                                                        <MapPin className="h-2 w-2" />
                                                        {rate.station?.name || "Global"}
                                                    </p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                        
                        {!loadingRates && rates.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                                <p>No rates available for assignment.</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
