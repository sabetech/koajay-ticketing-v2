import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { agentService, getAgentImageUrl } from "@/services/agent";
import type { Agent } from "@/services/agent";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin } from "lucide-react";

function AgentCard({ agent }: { agent: Agent }) {
    const navigate = useNavigate();
    const imageUrl = getAgentImageUrl(agent.photo);
    const fullName = `${agent.fname} ${agent.lname}`.trim();
    const initials = `${agent.fname?.[0] ?? ""}${agent.lname?.[0] ?? ""}`.toUpperCase();
    const stationName = agent.station_user?.station?.name ?? agent.stationInfo?.name ?? "—";

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/agents/${agent.id}`)}
            onKeyDown={(e) => e.key === "Enter" && navigate(`/agents/${agent.id}`)}
            className="flex flex-col items-center gap-3 rounded-xl border bg-card p-5 text-center shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
        >
            <Avatar className="h-20 w-20 ring-2 ring-primary/20">
                <AvatarImage
                    src={imageUrl ?? undefined}
                    alt={fullName}
                    className="object-cover"
                    loading="lazy"
                />
                <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                    {initials}
                </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
                <p className="font-semibold text-sm leading-tight">{fullName}</p>
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    {stationName}
                </p>
            </div>
        </div>
    );
}

function AgentCardSkeleton() {
    return (
        <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-5 text-center shadow-sm">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="space-y-2 w-full flex flex-col items-center">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-36" />
            </div>
        </div>
    );
}

export default function AgentSummary() {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAgents = async () => {
            try {
                setLoading(true);
                const data = await agentService.getAllAgents();
                setAgents(data);
            } catch (err) {
                console.error("Failed to fetch agents:", err);
                setError("Failed to load agents. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchAgents();
    }, []);

    return (
        <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-semibold md:text-2xl">Agent Summary</h1>
                    {!loading && !error && (
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {agents.length} agent{agents.length !== 1 ? "s" : ""} found
                        </p>
                    )}
                </div>
            </div>

            {error && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {loading
                    ? Array.from({ length: 12 }).map((_, i) => <AgentCardSkeleton key={i} />)
                    : agents.map((agent) => <AgentCard key={agent.id} agent={agent} />)
                }
            </div>

            {!loading && agents.length === 0 && !error && (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <p className="text-sm">No agents found.</p>
                </div>
            )}
        </div>
    );
}
