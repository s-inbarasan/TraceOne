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
  RefreshCw,
  Lock,
  Globe,
  GitCommit,
  ExternalLink,
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
import { GithubIcon } from "@/components/ui/icons";

interface ProjectIncident {
  count: number;
}

interface RepositoryRecord {
  id: string;
  github_id: number;
  full_name: string;
  default_branch: string;
  latest_commit_sha?: string;
  latest_commit_message?: string;
  last_synced_at?: string;
  html_url?: string;
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
  repositories?: RepositoryRecord[];
}

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  language: string | null;
  default_branch: string;
  updated_at: string;
}

function ProjectsContent() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [syncingProjectId, setSyncingProjectId] = useState<string | null>(null);

  // New Project Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [reposLoading, setReposLoading] = useState(false);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [projectNameInput, setProjectNameInput] = useState("");
  const [creating, setCreating] = useState(false);
  
  // GitHub status / error states
  const [githubErrorCode, setGithubErrorCode] = useState<string | null>(null);
  const [githubErrorMessage, setGithubErrorMessage] = useState<string | null>(null);
  const [githubUser, setGithubUser] = useState<any | null>(null);

  const { addNotification } = useWorkspace();
  const router = useRouter();
  const searchParams = useSearchParams();

  const fetchProjects = async () => {
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("projects")
        .select("*, repositories(*), incidents(count)")
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
    if (isDialogOpen) {
      loadRepos();
    }
  }, [isDialogOpen]);

  const loadRepos = async () => {
    setReposLoading(true);
    setGithubErrorCode(null);
    setGithubErrorMessage(null);

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setGithubErrorCode("NOT_CONNECTED");
        setGithubErrorMessage("You must be logged in to fetch your GitHub repositories.");
        setReposLoading(false);
        return;
      }

      const res = await fetch("/api/github/repos", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await res.json();

      if (!res.ok || !data.connected) {
        setGithubErrorCode(data.code || "NOT_CONNECTED");
        setGithubErrorMessage(data.error || "GitHub account not connected or access expired.");
        setRepos([]);
      } else {
        setRepos(data.repos || []);
        if (data.github_user) setGithubUser(data.github_user);
      }
    } catch (err: any) {
      console.error("Failed to load repos:", err);
      setGithubErrorCode("GITHUB_API_ERROR");
      setGithubErrorMessage(err.message || "Failed to load GitHub repositories.");
    } finally {
      setReposLoading(false);
    }
  };

  const handleConnectGitHub = async () => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/projects?new=true`,
          scopes: "repo read:user user:email",
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error("Error connecting GitHub:", err);
      addNotification("Connection Failed", err.message || "Unable to trigger GitHub OAuth flow.", "error");
    }
  };

  const handleSelectRepo = (repo: GitHubRepo) => {
    setSelectedRepo(repo);
    setProjectNameInput(repo.name);
  };

  const handleCreateProject = async () => {
    if (!selectedRepo) return;
    setCreating(true);

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("You must be logged in to create a project.");
      }

      const nameToUse = projectNameInput.trim() || selectedRepo.name;

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: nameToUse,
          repository: selectedRepo.full_name,
          description: selectedRepo.description || "",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create project");
      }

      addNotification(
        "Project Created",
        `Successfully linked repository ${selectedRepo.full_name}`,
        "success"
      );

      setIsDialogOpen(false);
      setSelectedRepo(null);
      setProjectNameInput("");
      fetchProjects();
    } catch (err: any) {
      console.error("Error creating project:", err);
      addNotification("Project Creation Failed", err.message, "error");
    } finally {
      setCreating(false);
    }
  };

  const handleSyncProject = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setSyncingProjectId(project.id);

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) return;

      const res = await fetch("/api/github/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          project_id: project.id,
          repository_full_name: project.repository,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");

      addNotification(
        "Repository Synced",
        `Updated ${project.name} with latest GitHub commit details.`,
        "success"
      );
      fetchProjects();
    } catch (err: any) {
      console.error("Sync error:", err);
      addNotification("Sync Failed", err.message, "error");
    } finally {
      setSyncingProjectId(null);
    }
  };

  const filteredRepos = repos.filter(
    (repo) =>
      repo.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.name.toLowerCase().includes(searchQuery.toLowerCase())
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
            Manage your monitored applications and connected GitHub repositories.
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
            Add a project and connect its GitHub repository to enable real-time
            exception monitoring and AI-powered pull request patches.
          </p>
          <Button className="mt-6 gap-2" onClick={() => setIsDialogOpen(true)}>
            <Plus className="size-4" />
            Add Project
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const repoData = project.repositories?.[0];
            const isSyncingThis = syncingProjectId === project.id;

            return (
              <Card
                key={project.id}
                className="hover:border-primary/40 transition-colors cursor-pointer relative group"
                onClick={() => router.push(`/projects/${project.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <CardTitle className="text-base truncate">{project.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1.5 text-xs">
                        <GitBranch className="size-3.5 shrink-0 text-primary" />
                        <span className="truncate">{project.repository}</span>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge
                        variant={project.status === "healthy" ? "success" : "warning"}
                        className="text-[10px] uppercase h-5 px-1.5"
                      >
                        {project.status || "healthy"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 opacity-70 group-hover:opacity-100 hover:bg-secondary"
                        onClick={(e) => handleSyncProject(e, project)}
                        disabled={isSyncingThis}
                        title="Sync with GitHub"
                      >
                        <RefreshCw className={`size-3.5 ${isSyncingThis ? "animate-spin text-primary" : ""}`} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  {repoData ? (
                    <div className="rounded-md bg-secondary/30 p-2.5 space-y-1.5 border border-border/40">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1 font-mono">
                          <GitBranch className="size-3 text-muted-foreground" />
                          {repoData.default_branch || "main"}
                        </span>
                        {repoData.latest_commit_sha ? (
                          <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                            <GitCommit className="size-3 text-primary" />
                            {repoData.latest_commit_sha.substring(0, 7)}
                          </span>
                        ) : null}
                      </div>
                      {repoData.latest_commit_message ? (
                        <p className="text-[11px] text-foreground/90 line-clamp-1 italic font-mono">
                          "{repoData.latest_commit_message}"
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
                    <div className="flex items-center gap-1.5 font-medium">
                      {(project.incidents?.[0]?.count ?? 0) > 0 ? (
                        <span className="flex items-center gap-1 text-warning">
                          <AlertCircle className="size-3.5" />
                          {project.incidents?.[0]?.count} Open Incidents
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-success">
                          <Activity className="size-3.5" />
                          All Systems Normal
                        </span>
                      )}
                    </div>
                    <span>{new Date(project.created_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* New Project Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle>Import GitHub Repository</DialogTitle>
            <DialogDescription>
              Select an authorized repository from your connected GitHub account to create a Trace One project.
            </DialogDescription>
          </DialogHeader>

          {githubErrorCode ? (
            <div className="py-6 text-center space-y-4">
              <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mx-auto">
                <AlertCircle className="size-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-semibold text-foreground">
                  {githubErrorCode === "NOT_CONNECTED"
                    ? "GitHub Account Not Connected"
                    : githubErrorCode === "EXPIRED_TOKEN"
                    ? "GitHub Authorization Expired"
                    : "GitHub Connection Error"}
                </h4>
                <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                  {githubErrorMessage}
                </p>
              </div>

              <div className="pt-2 flex justify-center gap-3">
                <Button onClick={handleConnectGitHub} className="gap-2">
                  <GithubIcon className="size-4" />
                  {githubErrorCode === "EXPIRED_TOKEN" ? "Reconnect GitHub" : "Connect GitHub"}
                </Button>
                <Button variant="outline" onClick={loadRepos} disabled={reposLoading} className="gap-1.5">
                  {reposLoading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                  Retry
                </Button>
              </div>
            </div>
          ) : reposLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="size-7 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Retrieving your authorized GitHub repositories...
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {githubUser ? (
                <div className="flex items-center justify-between px-3 py-2 rounded-md bg-secondary/40 border border-border/50 text-xs">
                  <div className="flex items-center gap-2">
                    <img
                      src={githubUser.avatar_url}
                      alt={githubUser.login}
                      className="size-5 rounded-full border border-border"
                      referrerPolicy="no-referrer"
                    />
                    <span className="font-semibold text-foreground">
                      @{githubUser.login}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      ({repos.length} repositories)
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] text-muted-foreground hover:text-foreground"
                    onClick={loadRepos}
                  >
                    <RefreshCw className="size-3 mr-1" /> Refresh
                  </Button>
                </div>
              ) : null}

              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search repositories..."
                  className="pl-9 text-xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="h-[240px] overflow-y-auto rounded-md border border-border bg-card">
                {filteredRepos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-xs text-muted-foreground p-4 text-center">
                    <p>No repositories found matching "{searchQuery}"</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Ensure your GitHub user has access to the target repository.
                    </p>
                  </div>
                ) : (
                  <div className="p-1 space-y-1">
                    {filteredRepos.map((repo) => {
                      const isSelected = selectedRepo?.id === repo.id;
                      const alreadyLinkedProject = projects.find(
                        (p) => p.repository.toLowerCase() === repo.full_name.toLowerCase()
                      );

                      return (
                        <button
                          key={repo.id}
                          type="button"
                          onClick={() => {
                            if (!alreadyLinkedProject) handleSelectRepo(repo);
                          }}
                          disabled={!!alreadyLinkedProject}
                          className={`flex w-full items-start justify-between px-3 py-2.5 text-xs rounded-md transition-colors text-left ${
                            alreadyLinkedProject
                              ? "opacity-50 cursor-not-allowed bg-secondary/20"
                              : isSelected
                              ? "bg-primary/10 border border-primary/40 text-foreground font-medium"
                              : "hover:bg-secondary/60 text-foreground"
                          }`}
                        >
                          <div className="flex items-start gap-2.5 min-w-0 pr-2">
                            <GitBranch className="size-4 shrink-0 text-primary mt-0.5" />
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold truncate">{repo.full_name}</span>
                                {repo.private ? (
                                  <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded bg-secondary text-muted-foreground font-mono">
                                    <Lock className="size-2.5" /> Private
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded bg-secondary/50 text-muted-foreground font-mono">
                                    <Globe className="size-2.5" /> Public
                                  </span>
                                )}
                                {repo.language ? (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-primary/10 text-primary font-mono">
                                    {repo.language}
                                  </span>
                                ) : null}
                              </div>
                              {alreadyLinkedProject ? (
                                <p className="text-[10px] text-warning font-medium">
                                  Already linked to project "{alreadyLinkedProject.name}"
                                </p>
                              ) : repo.description ? (
                                <p className="text-[10px] text-muted-foreground line-clamp-1">
                                  {repo.description}
                                </p>
                              ) : null}
                            </div>
                          </div>
                          {isSelected ? (
                            <Check className="size-4 text-primary shrink-0 mt-0.5" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedRepo ? (
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Project Display Name
                  </label>
                  <Input
                    value={projectNameInput}
                    onChange={(e) => setProjectNameInput(e.target.value)}
                    placeholder="Enter project name"
                    className="text-xs h-9"
                  />
                </div>
              ) : null}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={!selectedRepo || creating || !!githubErrorCode}
              className="min-w-[130px]"
            >
              {creating ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : null}
              {creating ? "Importing..." : "Create Project"}
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
