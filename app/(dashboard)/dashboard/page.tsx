"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Activity, 
  AlertCircle, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  GitPullRequest, 
  GitMerge, 
  Loader2, 
  Bot, 
  RefreshCw, 
  Plus, 
  Terminal,
  Cpu,
  Layers
} from "lucide-react"
import { Github } from "@/components/ui/icons"
import Link from "next/link"
import { useWorkspace } from "@/lib/context/WorkspaceContext"
import { useRouter } from "next/navigation"

export default function Dashboard() {
  const router = useRouter()
  const { 
    profile, 
    projects, 
    activeProject, 
    setActiveProject, 
    syncedRepos, 
    isSyncingRepos, 
    syncRepos, 
    apiKeys, 
    notifications,
    addNotification
  } = useWorkspace()

  const [greeting, setGreeting] = useState("Hello")

  useEffect(() => {
    const hr = new Date().getHours()
    if (hr < 12) setGreeting("Good morning")
    else if (hr < 18) setGreeting("Good afternoon")
    else setGreeting("Good evening")
  }, [])

  const handleOpenProject = (project: any) => {
    setActiveProject(project)
    router.push(`/projects/${project.id}`)
  }

  const handleRefreshSync = async () => {
    await syncRepos()
  }

  // Count active stats
  const totalProjects = projects.length
  const totalKeys = Object.keys(apiKeys).length
  const totalPRs = projects.filter(p => p.source_type === "github").length // Synced items
  const activeAlerts = projects.filter(p => p.status === "error").length

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Hero Welcome Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {greeting}, {profile?.full_name?.split(" ")[0] || "Developer"}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Observe, diagnose, and resolve your system&apos;s runtime exceptions with Gemini-powered reasoning.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefreshSync} 
            disabled={isSyncingRepos}
            className="h-8.5 text-xs gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`size-3.5 ${isSyncingRepos ? "animate-spin" : ""}`} />
            {isSyncingRepos ? "Syncing..." : "Sync GitHub"}
          </Button>
          <Button 
            size="sm" 
            asChild
            className="h-8.5 text-xs gap-1.5 cursor-pointer"
          >
            <Link href="/projects?new=true">
              <Plus className="size-4" />
              New Project
            </Link>
          </Button>
        </div>
      </div>

      {/* Numerical Metrics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/60 bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Workspace Projects</CardTitle>
            <Layers className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{totalProjects}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Connected build environments</p>
          </CardContent>
        </Card>
        
        <Card className="border-border/60 bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Alerts</CardTitle>
            <AlertCircle className="size-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-warning">{activeAlerts}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Incidents needing action</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Configured LLM Keys</CardTitle>
            <Cpu className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{totalKeys} <span className="text-xs text-muted-foreground">/ 5</span></div>
            <p className="text-[10px] text-muted-foreground mt-1">Providers ready for diagnosis</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Patches Submitted</CardTitle>
            <GitPullRequest className="size-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{totalPRs}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Isolated pull request suggestions</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        
        {/* Left Side Column: Projects & Sync */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Projects List Card */}
          <Card className="border-border/60 bg-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold text-foreground">Projects Cockpit</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Quick access to your active connected workspaces.</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground hover:text-foreground">
                  <Link href="/projects">Manage <ArrowRight className="size-3 ml-1" /></Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-border/50 rounded-xl">
                  <div className="flex size-11 items-center justify-center rounded-full bg-secondary text-muted-foreground mb-3">
                    <Layers className="size-5" />
                  </div>
                  <h3 className="text-xs font-semibold">No active projects</h3>
                  <p className="text-[10px] text-muted-foreground mt-1 max-w-xs leading-relaxed">
                    Establish your first workspace environment by linking a GitHub repository or dropping code assets in.
                  </p>
                  <Button variant="outline" size="sm" className="mt-4 h-8 text-xs cursor-pointer" asChild>
                    <Link href="/projects?new=true">Get Started</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.map((proj) => (
                    <div 
                      key={proj.id} 
                      className="flex items-center justify-between rounded-xl border border-border/60 bg-background hover:bg-secondary/20 p-4 transition-all group"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="size-9 rounded-lg bg-secondary/40 border border-border/40 flex items-center justify-center shrink-0">
                          {proj.source_type === "github" ? (
                            <Github className="size-4 text-muted-foreground" />
                          ) : (
                            <Terminal className="size-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">{proj.name}</p>
                          <p className="text-[9px] text-muted-foreground truncate font-mono mt-0.5">
                            {proj.source_type === "github" ? (proj.repositories?.[0]?.full_name || proj.repository) : "Uploaded Local Directory"}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant="outline"
                          className={`text-[9px] h-4.5 font-semibold px-2 border-none uppercase tracking-wider ${
                            proj.status === "healthy" 
                              ? "bg-success/15 text-success" 
                              : "bg-warning/15 text-warning"
                          }`}
                        >
                          {proj.status}
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="h-7 text-[10px] px-2.5 hover:bg-primary/10 hover:text-primary cursor-pointer font-bold"
                          onClick={() => handleOpenProject(proj)}
                        >
                          Workspace <ArrowRight className="size-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* GitHub Discovery Repos */}
          <Card className="border-border/60 bg-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold text-foreground">GitHub Repository Sync</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Available synchronized resources ready for project onboarding.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {syncedRepos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center bg-secondary/5 border border-border/40 rounded-xl">
                  <p className="text-[10px] text-muted-foreground max-w-sm leading-relaxed">
                    Authenticate your profile with GitHub or hit sync to browse and initialize your actual cloud repositories.
                  </p>
                  <Button 
                    onClick={handleRefreshSync} 
                    disabled={isSyncingRepos} 
                    variant="outline" 
                    size="sm" 
                    className="mt-3.5 h-8 text-xs cursor-pointer"
                  >
                    {isSyncingRepos ? "Syncing..." : "Sync Repositories"}
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 max-h-[300px] overflow-y-auto pr-1">
                  {syncedRepos.slice(0, 4).map((repo) => (
                    <div 
                      key={repo.id} 
                      className="p-3 border border-border/60 bg-background/50 rounded-lg hover:border-primary/40 transition-colors flex flex-col justify-between gap-2.5"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-foreground truncate">{repo.name}</p>
                          <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-secondary/80 text-muted-foreground shrink-0">
                            {repo.private ? "Private" : "Public"}
                          </span>
                        </div>
                        <p className="text-[9px] text-muted-foreground leading-normal mt-1 line-clamp-2 h-6">
                          {repo.description || "No repository description provided."}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-[9px] text-muted-foreground border-t border-border/30 pt-2 mt-1">
                        <span className="font-semibold">{repo.language || "TypeScript"}</span>
                        <span>{(repo.size / 1024).toFixed(1)} MB</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Right Side Column: AI System Insights & Status */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* AI Observability Agent Card */}
          <Card className="border-border/60 bg-card overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-primary to-info" />
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Bot className="size-5 text-primary" />
                <CardTitle className="text-sm font-semibold text-foreground">TraceMind AI Copilot</CardTitle>
              </div>
              <CardDescription className="text-xs mt-0.5">Understands codebase structure and compiles patches.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3.5 rounded-xl border border-border/60 bg-secondary/10">
                <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-success" /> Agent Engine Status: Online
                </p>
                <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                  Trace One AI is listening to API failures. As exceptions fire, the sandbox will isolate the crash logs and compile code suggestions automatically.
                </p>
              </div>
              
              <div className="space-y-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Active AI Model Providers</p>
                <div className="space-y-1.5">
                  {Object.keys(apiKeys).length === 0 ? (
                    <div className="p-3 text-center border border-dashed border-border/60 rounded-lg">
                      <p className="text-[10px] text-muted-foreground leading-normal">
                        No custom API keys connected. Running standard platform fallback model.
                      </p>
                      <Button variant="link" size="sm" asChild className="text-[10px] p-0 h-auto mt-1">
                        <Link href="/settings/keys">Configure custom models</Link>
                      </Button>
                    </div>
                  ) : (
                    Object.keys(apiKeys).map((provId) => (
                      <div key={provId} className="flex items-center justify-between text-xs py-1 border-b border-border/30">
                        <span className="font-semibold text-muted-foreground capitalize">{provId} API</span>
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-success/15 text-success">Active</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent AI Event Log Timeline */}
          <Card className="border-border/60 bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground">Recent Observability Logs</CardTitle>
              <CardDescription className="text-xs mt-0.5">Timeline of system operations and background AI actions.</CardDescription>
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <p className="text-[10px] text-muted-foreground text-center py-6">Timeline empty.</p>
              ) : (
                <div className="space-y-4 relative before:absolute before:inset-y-0 before:left-[11px] before:w-px before:bg-border/60 pl-1.5">
                  {notifications.slice(0, 3).map((notif) => (
                    <div key={notif.id} className="relative pl-6">
                      <div className="absolute left-0 top-1 size-5.5 -translate-x-1/2 rounded-full border-2 border-background bg-secondary flex items-center justify-center shrink-0">
                        <Clock className="size-2.5 text-muted-foreground" />
                      </div>
                      <div className="text-[11px]">
                        <p className="font-semibold text-foreground">{notif.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{notif.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  )
}
