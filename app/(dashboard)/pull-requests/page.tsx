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
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (data) setPullRequests(data);
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
                        variant={pr.status === "merged" ? "default" : "outline"}
                      >
                        {pr.status}
                      </Badge>
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
