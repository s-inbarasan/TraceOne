"use client";

import { Suspense, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  GitBranch,
  Activity,
  AlertCircle,
  Loader2,
  Search,
  Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useWorkspace } from "@/lib/context/WorkspaceContext";
import { useRouter, useSearchParams } from "next/navigation";

interface ProjectIncident {
  count: number;
}

interface Project {
  id: string;
  name: string;
  repository: string;
  source_type: string;
  status: string;
  description: string;
  created_at: string;
  incidents?: ProjectIncident[];
}

interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
}

function ProjectsContent() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);

  // New Project Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [reposLoading, setReposLoading] = useState(false);
  const [repos, setRepos] = useState<Repository[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [creating, setCreating] = useState(false);
  const [githubError, setGithubError] = useState<string | null>(null);

  const { addNotification, profile } = useWorkspace();
  const router = useRouter();
  const searchParams = useSearchParams();

  const fetchProjects = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("projects")
        .select("*, incidents(count)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setProjects(data);
    } catch (err) {
      console.error("Error fetching projects:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    if (searchParams.get("new") === "true") {
      setIsDialogOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (isDialogOpen && repos.length === 0 && !githubError) {
      loadRepos();
    }
  }, [isDialogOpen]);

  const loadRepos = async () => {
    setReposLoading(true);
    setGithubError(null);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch("/api/github/repos", {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch repositories");
      }

      const data = await res.json();
      setRepos(data.repos || []);
    } catch (err: any) {
      console.error("Failed to load repos:", err);
      setGithubError(err.message);
    } finally {
      setReposLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!selectedRepo) return;
    setCreating(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          name: selectedRepo.name,
          repository: selectedRepo.full_name,
          source_type: "github",
          status: "healthy",
          description: selectedRepo.description || "",
        })
        .select()
        .single();

      if (error) throw error;

      addNotification(
        "Project Created",
        `Successfully linked ${selectedRepo.name}`,
        "success",
      );
      setIsDialogOpen(false);
      setSelectedRepo(null);
      fetchProjects();
    } catch (err: any) {
      console.error("Error creating project:", err);
      addNotification("Error", err.message, "error");
    } finally {
      setCreating(false);
    }
  };

  const filteredRepos = repos.filter((repo) =>
    repo.full_name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

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
            Projects
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your monitored applications and repositories.
          </p>
        </div>
        <Button className="gap-2" onClick={() => setIsDialogOpen(true)}>
          <Plus className="size-4" />
          Add Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border rounded-lg bg-card shadow-sm">
          <div className="flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground mb-4">
            <GitBranch className="size-6" />
          </div>
          <h3 className="text-lg font-medium">No projects configured</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Add a project and connect its GitHub repository to enable automatic
            root cause analysis.
          </p>
          <Button className="mt-6 gap-2" onClick={() => setIsDialogOpen(true)}>
            <Plus className="size-4" />
            Add Project
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="hover:border-primary/40 transition-colors cursor-pointer"
              onClick={() => router.push(`/projects/${project.id}`)}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{project.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1.5 mt-1">
                      <GitBranch className="size-3" />
                      {project.repository}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={
                      project.status === "healthy" ? "success" : "warning"
                    }
                    className="text-[10px] uppercase h-5 px-1.5"
                  >
                    {project.status || "healthy"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                  <div className="flex items-center gap-1.5 font-medium">
                    {(project.incidents?.[0]?.count ?? 0) > 0 ? (
                      <span className="flex items-center gap-1 text-warning">
                        <AlertCircle className="size-3.5" />
                        {project.incidents?.[0]?.count} Open
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-success">
                        <Activity className="size-3.5" />
                        Healthy
                      </span>
                    )}
                  </div>
                  <span>
                    {new Date(project.created_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New Project Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Import GitHub Repository</DialogTitle>
            <DialogDescription>
              Select a repository to monitor and analyze. Trace One will
              automatically parse structure and track incidents.
            </DialogDescription>
          </DialogHeader>

          {githubError ? (
            <div className="py-6 text-center space-y-3">
              <div className="text-destructive text-sm font-medium flex items-center justify-center gap-2">
                <AlertCircle className="size-4" />
                {githubError}
              </div>
              <p className="text-xs text-muted-foreground">
                Please connect your GitHub account in Settings.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/settings")}
              >
                Go to Settings
              </Button>
            </div>
          ) : reposLoading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-4">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Loading your repositories...
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search repositories..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="h-[280px] overflow-y-auto rounded-md border border-border bg-card">
                {filteredRepos.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    No repositories found
                  </div>
                ) : (
                  <div className="p-1 space-y-0.5">
                    {filteredRepos.map((repo) => (
                      <button
                        key={repo.id}
                        onClick={() => setSelectedRepo(repo)}
                        className={`flex w-full items-center justify-between px-3 py-2 text-sm rounded-sm transition-colors ${
                          selectedRepo?.id === repo.id
                            ? "bg-primary text-primary-foreground font-medium"
                            : "hover:bg-secondary text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <GitBranch className="size-4 shrink-0 opacity-70" />
                          <span className="truncate">{repo.full_name}</span>
                        </div>
                        {selectedRepo?.id === repo.id && (
                          <Check className="size-4 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={!selectedRepo || creating || !!githubError}
              className="min-w-[120px]"
            >
              {creating ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : null}
              {creating ? "Importing..." : "Import Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ProjectsContent />
    </Suspense>
  );
}
