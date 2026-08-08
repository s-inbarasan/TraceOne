"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useWorkspace, Project, Message } from "@/lib/context/WorkspaceContext"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Bot, 
  GitBranch, 
  FileCode, 
  Terminal, 
  AlertCircle, 
  CheckCircle2, 
  Play, 
  Send, 
  Loader2, 
  GitPullRequest, 
  ArrowLeft, 
  Sparkles, 
  RefreshCw,
  Copy,
  Check,
  Code2,
  Layers,
  ChevronRight,
  ChevronDown
} from "lucide-react"
import { GithubIcon } from "@/components/ui/icons"
import Link from "next/link"

export default function ProjectWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const projectId = resolvedParams.id
  const router = useRouter()

  const { 
    projects, 
    activeProject, 
    setActiveProject, 
    chatHistory, 
    addChatMessage, 
    addNotification,
    selectedModel,
    setSelectedModel
  } = useWorkspace()

  const [project, setProject] = useState<Project | null>(null)
  const [activeTab, setActiveTab] = useState<"chat" | "code" | "logs" | "diff">("chat")
  const [selectedFile, setSelectedFile] = useState<string>("src/controllers/analytics.ts")
  const [promptInput, setPromptInput] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [diffState, setDiffState] = useState<{
    filePath: string
    original: string
    modified: string
  } | null>(null)
  const [copied, setCopied] = useState(false)
  const [prCreated, setPrCreated] = useState(false)

  // Find project
  useEffect(() => {
    const found = projects.find(p => p.id === projectId)
    if (found) {
      setProject(found)
      setActiveProject(found)
    } else if (activeProject && activeProject.id === projectId) {
      setProject(activeProject)
    } else {
      // Default fallback project if opening by ID directly
      const fallback: Project = {
        id: projectId,
        name: "API Gateway Microservice",
        slug: "api-gateway",
        source_type: "github",
        repository: "acme-corp/api-gateway",
        status: "error",
        created_at: new Date().toISOString(),
        files: {
          "package.json": `{\n  "name": "api-gateway",\n  "version": "1.0.0",\n  "dependencies": {\n    "next": "^15.0.0",\n    "react": "^19.0.0"\n  }\n}`,
          "src/controllers/analytics.ts": `import { AnalyticsService } from "../services/analytics";\nimport { formatMetric } from "../utils/formatter";\n\nexport async function getAnalytics(req: any, res: any) {\n  const userId = req.user.id;\n  const rawMetrics = await AnalyticsService.getMetrics(userId);\n  \n  // RUNTIME EXCEPTION: rawMetrics is null for new users\n  const formatted = rawMetrics.map((m: any) => formatMetric(m));\n  \n  return res.json({ data: formatted });\n}`,
          "src/services/analytics.ts": `export class AnalyticsService {\n  static async getMetrics(userId: string) {\n    // Returns null if user has no metric history yet\n    return null;\n  }\n}`
        },
        logs: [
          { method: "GET", path: "/api/users/analytics", statusCode: 500, errorMessage: "TypeError: Cannot read properties of null (reading 'map')", timestamp: new Date().toISOString() }
        ]
      }
      setProject(fallback)
      setActiveProject(fallback)
    }
  }, [projectId, projects, activeProject, setActiveProject])

  const messages = chatHistory[projectId] || [
    {
      id: "init",
      role: "assistant",
      content: "Welcome to Trace One AI Workspace. I've analyzed your repository and runtime exception logs. \n\nI detected a **500 Internal Server Error** in `src/controllers/analytics.ts` caused by `rawMetrics` evaluating to `null` when new users query analytics.\n\nType below or click **Auto-Investigate & Fix** to generate a patch.",
      timestamp: new Date().toISOString()
    }
  ]

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!promptInput.trim() || isGenerating) return

    const userText = promptInput.trim()
    setPromptInput("")
    addChatMessage(projectId, "user", userText)
    setIsGenerating(true)

    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `User query about project ${project?.name} (${project?.repositories?.[0]?.full_name || project?.repository}):\n${userText}\n\nSelected file: ${selectedFile}\nSelected model: ${selectedModel}`,
          model: selectedModel,
        })
      })

      const data = await res.json()
      const aiResponse = data.text || "Analyzed codebase context. No further syntax issues detected."
      
      addChatMessage(projectId, "assistant", aiResponse)

      // If response mentions fix, set draft diff
      if (aiResponse.toLowerCase().includes("diff") || aiResponse.toLowerCase().includes("patch") || userText.toLowerCase().includes("fix")) {
        setDiffState({
          filePath: "src/controllers/analytics.ts",
          original: `  const rawMetrics = await AnalyticsService.getMetrics(userId);\n  const formatted = rawMetrics.map((m: any) => formatMetric(m));`,
          modified: `  const rawMetrics = await AnalyticsService.getMetrics(userId);\n  const formatted = (rawMetrics || []).map((m: any) => formatMetric(m));`
        })
      }
    } catch (err: any) {
      addChatMessage(projectId, "assistant", "Encountered an issue communicating with AI engine. Please verify GEMINI_API_KEY settings.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRunAutoInvestigation = async () => {
    setIsGenerating(true)
    addChatMessage(projectId, "user", "Run automatic root cause investigation and generate a deployable code patch.")

    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Analyze TypeError: Cannot read properties of null (reading 'map') in src/controllers/analytics.ts. Provide a fix with unified diff.",
          model: selectedModel,
        })
      })

      const data = await res.json()
      addChatMessage(projectId, "assistant", data.text)

      setDiffState({
        filePath: "src/controllers/analytics.ts",
        original: `export async function getAnalytics(req: any, res: any) {\n  const userId = req.user.id;\n  const rawMetrics = await AnalyticsService.getMetrics(userId);\n  \n  // RUNTIME EXCEPTION: rawMetrics is null for new users\n  const formatted = rawMetrics.map((m: any) => formatMetric(m));\n  \n  return res.json({ data: formatted });\n}`,
        modified: `export async function getAnalytics(req: any, res: any) {\n  const userId = req.user.id;\n  const rawMetrics = await AnalyticsService.getMetrics(userId);\n  \n  // SAFE FALLBACK: Protect against null/undefined rawMetrics\n  const formatted = (rawMetrics || []).map((m: any) => formatMetric(m));\n  \n  return res.json({ data: formatted });\n}`
      })

      setActiveTab("diff")
      addNotification("Fix Generated", "AI successfully generated a patch for src/controllers/analytics.ts", "success")
    } catch (err) {
      console.error(err)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCreatePullRequest = async () => {
    try {
      const res = await fetch('/api/github/pull-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project?.id,
          branch_name: `trace-one/fix-${Date.now()}`,
          title: 'Fix issue identified by Trace One AI',
          description: 'This PR fixes the issue found in the analytics controller.',
          files: [
            {
              path: selectedFile || 'src/controllers/analytics.ts',
              content: patchCode
            }
          ]
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create PR');

      setPrCreated(true);
      addNotification("Pull Request Created", `Opened PR: ${data.url}`, "success");
    } catch (err: any) {
      addNotification("Pull Request Failed", err.message, "error");
    }
  }

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!project) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const filesMap: Record<string, string> = project.files || {
    "src/controllers/analytics.ts": `import { AnalyticsService } from "../services/analytics";\nimport { formatMetric } from "../utils/formatter";\n\nexport async function getAnalytics(req: any, res: any) {\n  const userId = req.user.id;\n  const rawMetrics = await AnalyticsService.getMetrics(userId);\n  const formatted = rawMetrics.map((m: any) => formatMetric(m));\n  return res.json({ data: formatted });\n}`,
    "package.json": `{\n  "name": "${project.name.toLowerCase().replace(/\s+/g, "-")}",\n  "version": "1.0.0"\n}`
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Navigation & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href="/projects">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">{project.name}</h1>
              <Badge variant={project.status === "healthy" ? "success" : "warning"}>
                {project.status === "healthy" ? "Healthy" : "Active Exception"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <GitBranch className="size-3.5" />
              {project.repositories?.[0]?.full_name || project.repository || "Local Repository"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant="outline"
            className="gap-1.5 text-xs" 
            onClick={handleRunAutoInvestigation}
            disabled={isGenerating}
          >
            <Sparkles className="size-3.5 text-primary" />
            Auto-Investigate
          </Button>

          {diffState && !prCreated && (
            <Button 
              size="sm" 
              className="gap-1.5 text-xs"
              onClick={handleCreatePullRequest}
            >
              <GitPullRequest className="size-3.5" />
              Submit PR
            </Button>
          )}

          {prCreated && (
            <Button size="sm" variant="secondary" className="gap-1.5 text-xs" asChild>
              <Link href="/pull-requests">
                <CheckCircle2 className="size-3.5 text-success" />
                View PR #104
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Main Grid Workspace */}
      <div className="grid gap-6 lg:grid-cols-12 min-h-[600px]">
        
        {/* Left Explorer Sidebar */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="border-border bg-card">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="size-3.5 text-primary" /> Project Files
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="space-y-1 font-mono text-xs">
                {Object.keys(filesMap).map((file) => (
                  <button
                    key={file}
                    onClick={() => {
                      setSelectedFile(file)
                      setActiveTab("code")
                    }}
                    className={`flex w-full items-center gap-2 px-2.5 py-1.5 rounded-md text-left transition-colors ${
                      selectedFile === file
                        ? "bg-primary/15 text-primary font-semibold"
                        : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                    }`}
                  >
                    <FileCode className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{file}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Model Selector Card */}
          <Card className="border-border bg-card">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Bot className="size-3.5 text-primary" /> AI Intelligence Engine
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase">Model Provider</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground outline-none focus:border-primary"
                >
                  <option value="gemini-2.5-flash">Google Gemini 2.5 Flash (Fast)</option>
                  <option value="gemini-2.5-pro">Google Gemini 2.5 Pro (Deep Reasoner)</option>
                  <option value="gpt-4o">OpenAI GPT-4o (Configured Key)</option>
                  <option value="claude-3-5-sonnet">Anthropic Claude 3.5 Sonnet</option>
                </select>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Uses your configured API key or server-side Gemini environment token.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Workspace Main Panel */}
        <div className="lg:col-span-9 flex flex-col space-y-4">
          
          {/* Workspace Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <TabsList className="bg-secondary/40 p-1">
                <TabsTrigger value="chat" className="text-xs gap-1.5">
                  <Bot className="size-3.5" /> AI Copilot
                </TabsTrigger>
                <TabsTrigger value="code" className="text-xs gap-1.5">
                  <Code2 className="size-3.5" /> Code Inspector
                </TabsTrigger>
                <TabsTrigger value="logs" className="text-xs gap-1.5">
                  <Terminal className="size-3.5" /> Exception Logs
                </TabsTrigger>
                <TabsTrigger value="diff" className="text-xs gap-1.5 relative">
                  <GitPullRequest className="size-3.5" /> Proposed Diff
                  {diffState && <span className="size-2 rounded-full bg-primary animate-pulse ml-1" />}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* AI Chat Tab */}
            <TabsContent value="chat" className="mt-4 space-y-4">
              <Card className="border-border bg-card flex flex-col h-[500px]">
                <CardHeader className="p-4 border-b border-border/60 bg-secondary/10 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Sparkles className="size-4 text-primary" /> Trace One AI Copilot
                    </CardTitle>
                    <CardDescription className="text-[11px]">Ask questions, instruct code fixes, or debug exceptions.</CardDescription>
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase font-mono">
                    {selectedModel}
                  </Badge>
                </CardHeader>
                <CardContent className="p-4 flex-1 overflow-y-auto space-y-4 font-sans text-xs">
                  {messages.map((m, idx) => (
                    <div 
                      key={m.id || idx}
                      className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {m.role === "assistant" && (
                        <div className="size-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
                          <Bot className="size-4" />
                        </div>
                      )}
                      <div className={`max-w-[80%] rounded-xl p-3 text-xs leading-relaxed ${
                        m.role === "user" 
                          ? "bg-primary text-primary-foreground font-medium" 
                          : "bg-secondary/60 text-foreground border border-border/50 space-y-2 whitespace-pre-wrap"
                      }`}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                  {isGenerating && (
                    <div className="flex items-center gap-2 text-muted-foreground text-xs italic">
                      <Loader2 className="size-3.5 animate-spin text-primary" />
                      Trace One is analyzing codebase AST and stack trace context...
                    </div>
                  )}
                </CardContent>
                <div className="p-3 border-t border-border bg-background">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input 
                      placeholder="Ask AI to explain error, refactor function, or generate patch..."
                      value={promptInput}
                      onChange={(e) => setPromptInput(e.target.value)}
                      className="text-xs h-9 bg-secondary/20"
                    />
                    <Button type="submit" size="sm" disabled={isGenerating || !promptInput.trim()} className="h-9 px-3">
                      <Send className="size-3.5" />
                    </Button>
                  </form>
                </div>
              </Card>
            </TabsContent>

            {/* Code Inspector Tab */}
            <TabsContent value="code" className="mt-4">
              <Card className="border-border bg-card">
                <CardHeader className="p-4 border-b border-border/60 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCode className="size-4 text-primary" />
                    <span className="font-mono text-xs font-semibold text-foreground">{selectedFile}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-[11px] gap-1"
                    onClick={() => handleCopyCode(filesMap[selectedFile] || "")}
                  >
                    {copied ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
                    {copied ? "Copied" : "Copy Code"}
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <pre className="p-4 text-xs font-mono bg-black/40 overflow-x-auto text-foreground/90 leading-relaxed max-h-[480px]">
                    <code>{filesMap[selectedFile] || "// File content empty or unavailable."}</code>
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Logs Tab */}
            <TabsContent value="logs" className="mt-4">
              <Card className="border-border bg-card">
                <CardHeader className="p-4 border-b border-border/60">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Terminal className="size-4 text-warning" /> Ingested API Exception Traces
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3 font-mono text-xs">
                  {(project.logs || []).map((log, i) => (
                    <div key={i} className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold">{log.method} {log.path}</span>
                        <Badge variant="destructive" className="text-[9px]">{log.statusCode} ERROR</Badge>
                      </div>
                      <p className="text-foreground/90 font-mono text-[11px]">{log.errorMessage}</p>
                      <span className="text-[9px] text-muted-foreground block">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Proposed Diff Tab */}
            <TabsContent value="diff" className="mt-4">
              <Card className="border-border bg-card">
                <CardHeader className="p-4 border-b border-border/60 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <GitPullRequest className="size-4 text-success" /> Generated Patch & Code Diff
                    </CardTitle>
                    <CardDescription className="text-[11px]">
                      {diffState ? `Target File: ${diffState.filePath}` : "No active code patch generated yet."}
                    </CardDescription>
                  </div>
                  {diffState && !prCreated && (
                    <Button size="sm" onClick={handleCreatePullRequest} className="gap-1.5 text-xs">
                      <GitPullRequest className="size-3.5" />
                      Open Pull Request
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-4 font-mono text-xs">
                  {diffState ? (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-destructive uppercase">Original Code</span>
                        <pre className="p-3 rounded bg-destructive/10 text-destructive border border-destructive/20 overflow-x-auto">
                          <code>{diffState.original}</code>
                        </pre>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-success uppercase">Proposed AI Fix</span>
                        <pre className="p-3 rounded bg-success/10 text-success border border-success/20 overflow-x-auto">
                          <code>{diffState.modified}</code>
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-muted-foreground space-y-3">
                      <Bot className="size-8 mx-auto text-muted-foreground/60" />
                      <p>No active patch proposed. Run Auto-Investigate to generate a code fix.</p>
                      <Button size="sm" variant="outline" onClick={handleRunAutoInvestigation}>
                        Generate Fix Now
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

        </div>
      </div>
    </div>
  )
}
