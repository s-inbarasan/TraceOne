"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  GitPullRequest,
  GitMerge,
  ExternalLink,
  Clock,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function PullRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [pullRequests, setPullRequests] = useState<any[]>([]);

  useEffect(() => {
    const fetchPRs = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("pull_requests")
          .select("*, repositories(full_name), investigations(incidents(id))")
          .order("created_at", { ascending: false });

        if (error) throw error;
        let formatted: any[] = [];
        if (data) {
          formatted = data.map(pr => ({
            ...pr,
            repository: pr.repositories?.full_name || 'Unknown Repository',
            incident_id: pr.investigations?.incidents?.id || pr.investigation_id,
            check_status: 'unknown'
          }));
          setPullRequests(formatted);
        }

        // Fetch dynamic CI/CD check and deployment status enrichment
        const checkRes = await fetch('/api/github/pull-request/checks');
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (checkData.success && checkData.prs) {
            const checksMap = new Map(checkData.prs.map((p: any) => [p.id, p]));
            setPullRequests(prev => prev.map(pr => {
              const livePR = checksMap.get(pr.id);
              if (livePR) {
                return {
                  ...pr,
                  status: livePR.status,
                  check_status: livePR.check_status
                };
              }
              return pr;
            }));
          }
        }
      } catch (err) {
        console.error("Error fetching pull requests:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPRs();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Pull Requests
          </h1>
          <p className="text-sm text-muted-foreground">
            Review and manage AI-generated patches.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {pullRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground mb-4">
                <GitPullRequest className="size-6" />
              </div>
              <h3 className="text-lg font-medium">No pull requests yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                When TraceMind generates a fix for an incident, the pull request
                will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {pullRequests.map((pr) => (
                <div
                  key={pr.id}
                  className="flex items-center justify-between p-4 hover:bg-secondary/20 transition-colors"
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      {pr.status === "open" ? (
                        <GitPullRequest className="size-4 text-success" />
                      ) : (
                        <GitMerge className="size-4 text-primary" />
                      )}
                      <span className="font-semibold text-foreground">
                        {pr.title}
                      </span>
                      <Badge
                        variant={
                          pr.status === "merged" 
                            ? "default" 
                            : pr.status === "failed" || pr.status === "requires_attention" 
                              ? "destructive" 
                              : "outline"
                        }
                      >
                        {pr.status}
                      </Badge>
                      
                      {pr.check_status === "success" && (
                        <Badge className="gap-1 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20 text-[10px] py-0 h-5">
                          <CheckCircle2 className="size-3" /> Checks Passed
                        </Badge>
                      )}
                      {pr.check_status === "failed" && (
                        <Badge variant="destructive" className="gap-1 bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20 text-[10px] py-0 h-5">
                          <AlertCircle className="size-3" /> Checks Failed
                        </Badge>
                      )}
                      {pr.check_status === "pending" && (
                        <Badge className="gap-1 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/20 text-[10px] py-0 h-5">
                          <Loader2 className="size-3 animate-spin" /> Checks Pending
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="font-mono text-xs">{pr.repository}</span>
                      <span>•</span>
                      <Link
                        href={`/incidents/${pr.incident_id}`}
                        className="text-primary hover:underline"
                      >
                        {pr.incident_id.split("-")[0] +
                          "-" +
                          pr.incident_id.slice(0, 4)}
                      </Link>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="hidden md:flex flex-col gap-1 text-muted-foreground text-xs">
                      <span className="flex items-center gap-1">
                        <AlertCircle className="size-3" /> Risk:{" "}
                        {pr.risk_level || "Unknown"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />{" "}
                        {new Date(pr.created_at).toLocaleString()}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      asChild
                    >
                      <a
                        href={pr.url || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View on GitHub <ExternalLink className="size-3" />
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
