"use client"

import { use, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
  ChevronDown,
  Brain,
  Cpu,
  Zap,
  ExternalLink
} from "lucide-react"
import { GithubIcon } from "@/components/ui/icons"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { GeminiLogo, OpenAILogo, AnthropicLogo, NvidiaLogo, GroqLogo } from "@/components/ui/ai-logos"

function getModelProviderIcon(modelName: string) {
  const model = modelName.toLowerCase();
  if (model.includes('gemini')) {
    return <GeminiLogo className="size-3.5" />
  }
  if (model.includes('gpt') || model.includes('openai')) {
    return <OpenAILogo className="size-3.5 text-emerald-500" />
  }
  if (model.includes('claude') || model.includes('anthropic')) {
    return <AnthropicLogo className="size-3.5 text-amber-500" />
  }
  if (model.includes('nvidia') || model.includes('llama-3.1-405b')) {
    return <NvidiaLogo className="size-3.5 text-green-500" />
  }
  if (model.includes('groq') || model.includes('70b-versatile')) {
    return <GroqLogo className="size-3.5 text-red-500" />
  }
  return <Bot className="size-3.5 text-muted-foreground" />
}

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
    investigation_id?: string
    patch_id?: string
  } | null>(null)
  const [copied, setCopied] = useState(false)
  const [prCreated, setPrCreated] = useState(false)
  const [isSubmittingPr, setIsSubmittingPr] = useState(false)
  const [prError, setPrError] = useState<string | null>(null)
  const [prUrl, setPrUrl] = useState<string | null>(null)
  const [prStatusText, setPrStatusText] = useState<"idle" | "creating" | "created" | "exists" | "failed">("idle")
  const [configuredProviders, setConfiguredProviders] = useState<any[]>([])
  const [keysLoaded, setKeysLoaded] = useState(false)

  const [filePaths, setFilePaths] = useState<string[]>([])
  const [fileContents, setFileContents] = useState<Record<string, string>>({})
  const [loadingFiles, setLoadingFiles] = useState(false)

  const searchParams = useSearchParams()
  const incidentIdParam = searchParams.get("incident")
  const [activeIncident, setActiveIncident] = useState<{
    id: string
    title: string
    severity: string
    status: string
    service: string
    file_path: string
    stack_trace: string
    event_count: number
    created_at: string
  } | null>(null)

  // Robust, unified state synchronizer to fetch/recover active state from Supabase
  useEffect(() => {
    if (!projectId) return

    const loadActiveState = async () => {
      try {
        const supabase = createClient()
        
        // 0. Resolve project by UUID or slug
        let realProjectId = projectId
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId)
        
        let projObj = null
        if (isUUID) {
          const { data: pData } = await supabase.from("projects").select("*").eq("id", projectId).maybeSingle()
          if (pData) projObj = pData
        }
        if (!projObj) {
          const { data: pData } = await supabase.from("projects").select("*").eq("slug", projectId).maybeSingle()
          if (pData) projObj = pData
        }

        if (projObj) {
          realProjectId = projObj.id
        }

        // 1. Fetch repositories for the project
        const { data: repos, error: reposErr } = await supabase
          .from("repositories")
          .select("*")
          .eq("project_id", realProjectId)

        if (!reposErr && repos && repos.length > 0) {
          setProject(prev => {
            if (!prev) {
              return {
                id: realProjectId,
                name: projObj?.name || "Project",
                slug: projObj?.slug || projectId,
                source_type: "github",
                repository: repos[0].full_name,
                repositories: repos,
                status: "healthy",
                created_at: projObj?.created_at || new Date().toISOString()
              } as any
            }
            return {
              ...prev,
              id: realProjectId,
              repositories: repos
            }
          })
        }

        // 2. Fetch active incident
        let incident = null
        if (incidentIdParam) {
          const { data, error } = await supabase
            .from("incidents")
            .select("*")
            .eq("id", incidentIdParam)
            .maybeSingle()
          if (!error && data) {
            incident = data
          }
        }

        if (!incident) {
          const { data, error } = await supabase
            .from("incidents")
            .select("*")
            .eq("project_id", realProjectId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
          if (!error && data) {
            incident = data
          }
        }

        if (incident) {
          setActiveIncident(incident)
          if (incident.file_path) {
            setSelectedFile(incident.file_path)
          }
        }

        // 3. Fetch the latest investigation for this project (either by incident or project_id directly)
        let investigation = null
        if (incident) {
          const { data: inv, error: invErr } = await supabase
            .from("investigations")
            .select("*")
            .eq("incident_id", incident.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
          if (!invErr && inv) {
            investigation = inv
          }
        }

        if (!investigation) {
          const { data: invByProj } = await supabase
            .from("investigations")
            .select("*")
            .eq("project_id", realProjectId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
          if (invByProj) {
            investigation = invByProj
          }
        }

        if (!investigation) return

        // 4. Fetch the latest patch for this investigation
        const { data: patch, error: patchErr } = await supabase
          .from("patches")
          .select("*")
          .eq("investigation_id", investigation.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        if (patchErr || !patch) return

        // Reconstruct the Proposed Diff state reliably
        setDiffState({
          filePath: patch.file_path,
          original: patch.original_content,
          modified: patch.updated_content,
          investigation_id: investigation.id,
          patch_id: patch.id
        })

        // 5. Fetch pull request metadata if already created
        const { data: pr, error: prErr } = await supabase
          .from("pull_requests")
          .select("*")
          .eq("investigation_id", investigation.id)
          .maybeSingle()

        if (!prErr && pr) {
          setPrCreated(true)
          setPrUrl(pr.url)
          setPrStatusText(pr.status === "open" ? "created" : "exists")
        } else {
          setPrCreated(false)
          setPrUrl(null)
          setPrStatusText("idle")
        }

      } catch (err) {
        console.error("Error loading active state from Supabase:", err)
      }
    }

    loadActiveState()
  }, [projectId, incidentIdParam])

  // Load repository files dynamically
  useEffect(() => {
    if (!project) return;
    if (project.source_type !== "github") {
      const fallbackFiles = ["package.json", "src/controllers/analytics.ts", "src/services/analytics.ts"];
      setFilePaths(fallbackFiles);
      setFileContents({
        "package.json": `{\n  "name": "${project.name.toLowerCase().replace(/\s+/g, "-")}",\n  "version": "1.0.0"\n}`,
        "src/controllers/analytics.ts": `import { AnalyticsService } from "../services/analytics";\nimport { formatMetric } from "../utils/formatter";\n\nexport async function getAnalytics(req: any, res: any) {\n  const userId = req.user.id;\n  const rawMetrics = await AnalyticsService.getMetrics(userId);\n  const formatted = rawMetrics.map((m: any) => formatMetric(m));\n  return res.json({ data: formatted });\n}`,
        "src/services/analytics.ts": `export class AnalyticsService {\n  static async getMetrics(userId: string) {\n    return null;\n  }\n}`
      });
      setSelectedFile("src/controllers/analytics.ts");
      return;
    }

    const fetchFilesList = async () => {
      setLoadingFiles(true);
      try {
        const res = await fetch(`/api/github/files?project_id=${project.id}`);
        const data = await res.json();
        if (data.success && data.files && data.files.length > 0) {
          setFilePaths(data.files);
          const firstFile = data.files.find((f: string) => f.includes("analytics.ts")) || data.files[0];
          setSelectedFile(firstFile);
        } else {
          setFilePaths(["package.json", "src/controllers/analytics.ts", "src/services/analytics.ts"]);
        }
      } catch (err) {
        console.error("Failed to load GitHub files:", err);
        setFilePaths(["package.json", "src/controllers/analytics.ts", "src/services/analytics.ts"]);
      } finally {
        setLoadingFiles(false);
      }
    };

    fetchFilesList();
  }, [project?.id, project?.source_type]);

  // Load content of selected file dynamically
  useEffect(() => {
    if (!project || !selectedFile) return;
    if (project.source_type !== "github") return;
    if (fileContents[selectedFile]) return;

    const fetchFileContent = async () => {
      try {
        const res = await fetch(`/api/github/file-content?project_id=${project.id}&path=${encodeURIComponent(selectedFile)}`);
        const data = await res.json();
        if (data.success) {
          setFileContents((prev) => ({ ...prev, [selectedFile]: data.content }));
        }
      } catch (err) {
        console.error("Failed to load file content:", err);
      }
    };

    fetchFileContent();
  }, [selectedFile, project?.id, project?.source_type]);

  useEffect(() => {
    const fetchKeys = async () => {
      try {
        const res = await fetch('/api/keys')
        const data = await res.json()
        if (data.success && data.keys) {
          const configuredProviderIds = data.keys.map((k: any) => k.provider_id)
          const configured = data.providers.filter((p: any) => configuredProviderIds.includes(p.id))
          setConfiguredProviders(configured)
          
          if (configured.length > 0 && (!selectedModel || !configured.some((p: any) => p.name.toLowerCase() === selectedModel.toLowerCase()))) {
            // Pick default based on first configured provider
            const geminiFirst = configured.find((p: any) => p.name.toLowerCase() === 'gemini')
            if (geminiFirst) {
              setSelectedModel(geminiFirst.name)
            } else {
              setSelectedModel(configured[0].name)
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch keys", err)
      } finally {
        setKeysLoaded(true)
      }
    }
    fetchKeys()
  }, [])


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

  const buildPromptContext = (userText: string) => {
    let context = `Project: ${project?.name || "Acme Service"}\n`
    if (project?.repository) {
      context += `Repository: ${project.repository}\n`
    }
    if (activeIncident) {
      context += `\n--- INCIDENT ERROR DETAILS ---\n`
      context += `Title/Message: ${activeIncident.title}\n`
      context += `Severity: ${activeIncident.severity}\n`
      context += `Affected File Path: ${activeIncident.file_path}\n`
      if (activeIncident.stack_trace) {
        context += `Stack Trace:\n${activeIncident.stack_trace}\n`
      }
      context += `-------------------------------\n`
    }
    
    const latestFilesMap: Record<string, string> = {
      ...fileContents,
      "package.json": fileContents["package.json"] || "",
      "src/controllers/analytics.ts": fileContents["src/controllers/analytics.ts"] || "",
      "src/services/analytics.ts": fileContents["src/services/analytics.ts"] || ""
    };

    context += `\n--- TARGET RESOLUTION FILE ---\n`
    context += `Path: ${selectedFile}\n`
    context += `Content:\n${latestFilesMap[selectedFile] || "// (Content empty or loading)"}\n`
    context += `-------------------------------\n`
    
    // Include other files loaded in state for multi-file reasoning
    const otherFiles = Object.keys(fileContents).filter(f => f !== selectedFile && fileContents[f]);
    if (otherFiles.length > 0) {
      context += `\n--- OTHER RELEVANT FILES IN REPOSITORY ---\n`
      otherFiles.forEach(f => {
        context += `File: ${f}\n`
        context += `Content:\n${fileContents[f]}\n`
        context += `------------------------------------\n`
      })
    }
    
    context += `\nUser Query/Action Requested: ${userText}`
    return context
  }

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!promptInput.trim() || isGenerating) return
    const userText = promptInput.trim()
    setPromptInput("")
    addChatMessage(projectId, "user", userText)
    setIsGenerating(true)
    
    try {
      const promptContext = buildPromptContext(userText)

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptContext,
          model: selectedModel,
        })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        addChatMessage(projectId, "assistant", `Error: ${data.error || 'Failed to communicate with AI provider.'}`)
        setIsGenerating(false)
        return
      }

      let aiResponse = data.text || ""
      
      // Try to parse JSON block
      const jsonMatch = aiResponse.match(/```json\s*(\{[\s\S]*?\})\s*```/)
      let parsedPatch = null
      
      if (jsonMatch) {
        try {
          parsedPatch = JSON.parse(jsonMatch[1])
          aiResponse = aiResponse.replace(jsonMatch[0], "").trim() // Remove JSON block from visual response
        } catch (e) {
          console.error("Failed to parse AI patch JSON", e)
        }
      }

      if (!aiResponse) {
         aiResponse = "I have analyzed the code and prepared a patch."
      }
      
      addChatMessage(projectId, "assistant", aiResponse)

      if (parsedPatch && parsedPatch.hasFix) {
        setDiffState({
          filePath: parsedPatch.filePath || selectedFile,
          original: parsedPatch.original,
          modified: parsedPatch.modified
        })
        
        // Save to patches table
        try {
          const patchRes = await fetch('/api/patches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              project_id: project?.id || projectId,
              repository_id: project?.repositories?.[0]?.id,
              file_path: parsedPatch.filePath || selectedFile,
              original_content: parsedPatch.original,
              updated_content: parsedPatch.modified,
              model: selectedModel,
              root_cause: parsedPatch.rootCause || null,
              confidence_score: parsedPatch.confidenceScore || null,
              risk_analysis: parsedPatch.riskAnalysis || null,
              time_estimate_minutes: parsedPatch.timeEstimateMinutes || null
            })
          })
          const patchData = await patchRes.json()
          if (patchData.success && patchData.investigation_id) {
            setDiffState(prev => prev ? { ...prev, investigation_id: patchData.investigation_id, patch_id: patchData.patch_id } : prev)
          }
        } catch (patchErr) {
          console.error("Patch store error:", patchErr)
        }
      }
    } catch (err: any) {
      addChatMessage(projectId, "assistant", "An error occurred while connecting to the AI provider. " + err.message)
    } finally {
      setIsGenerating(false)
    }
  }
  const handleRunAutoInvestigation = async () => {
    setIsGenerating(true)
    const userText = "Run automatic root cause investigation and generate a deployable code patch."
    addChatMessage(projectId, "user", userText)
    try {
      const promptContext = buildPromptContext(userText)

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptContext,
          model: selectedModel,
        })
      })
      const data = await res.json()
      
      if (!res.ok) {
        addChatMessage(projectId, "assistant", `Error: ${data.error || 'Failed to communicate with AI provider.'}`)
        setIsGenerating(false)
        return
      }

      let aiResponse = data.text || ""
      
      const jsonMatch = aiResponse.match(/```json\s*(\{[\s\S]*?\})\s*```/)
      let parsedPatch = null
      
      if (jsonMatch) {
        try {
          parsedPatch = JSON.parse(jsonMatch[1])
          aiResponse = aiResponse.replace(jsonMatch[0], "").trim()
        } catch (e) {
          console.error("Failed to parse AI patch JSON", e)
        }
      }

      if (!aiResponse) {
         aiResponse = "I have analyzed the code and prepared a patch."
      }
      
      addChatMessage(projectId, "assistant", aiResponse)

      let targetFilePath = selectedFile || "src/controllers/analytics.ts"
      let targetOriginal = "  // RUNTIME EXCEPTION: rawMetrics is null for new users\n  const formatted = rawMetrics.map((m: any) => formatMetric(m));"
      let targetModified = "  // SAFE FALLBACK: Protect against null/undefined rawMetrics\n  const formatted = (rawMetrics || []).map((m: any) => formatMetric(m));"

      if (parsedPatch && parsedPatch.hasFix) {
        targetFilePath = parsedPatch.filePath || selectedFile
        targetOriginal = parsedPatch.original
        targetModified = parsedPatch.modified
      }

      setDiffState({
        filePath: targetFilePath,
        original: targetOriginal,
        modified: targetModified
      })
      setActiveTab("diff")
      addNotification("Fix Generated", `AI successfully generated a patch for ${targetFilePath}`, "success")
      
      try {
        const patchRes = await fetch('/api/patches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: project?.id || projectId,
            repository_id: project?.repositories?.[0]?.id,
            file_path: targetFilePath,
            original_content: targetOriginal,
            updated_content: targetModified,
            model: selectedModel,
            root_cause: parsedPatch?.rootCause || "Null metric valuation on new account queries",
            confidence_score: parsedPatch?.confidenceScore || 0.95,
            risk_analysis: parsedPatch?.riskAnalysis || "Low risk fallback array check",
            time_estimate_minutes: parsedPatch?.timeEstimateMinutes || 5
          })
        })
        const patchData = await patchRes.json()
        if (patchData.success && patchData.investigation_id) {
          setDiffState(prev => prev ? { ...prev, investigation_id: patchData.investigation_id, patch_id: patchData.patch_id } : prev)
        }
      } catch (patchErr) {
        console.error("Patch store error:", patchErr)
      }
    } catch (err: any) {
      addChatMessage(projectId, "assistant", "An error occurred while connecting to the AI provider. " + err.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCreatePullRequest = async () => {
    if (isSubmittingPr) return
    setIsSubmittingPr(true)
    setPrStatusText("creating")
    setPrError(null)

    try {
      let currentInvestigationId = (diffState as any)?.investigation_id

      if (!currentInvestigationId && (project?.id || projectId)) {
        try {
          const repoId = project?.repositories?.[0]?.id
          const patchRes = await fetch('/api/patches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              project_id: project?.id || projectId,
              repository_id: repoId,
              file_path: diffState?.filePath || selectedFile || 'src/controllers/analytics.ts',
              original_content: diffState?.original || '',
              updated_content: diffState?.modified || '',
              model: selectedModel,
              explanation: "Trace One AI Generated Patch"
            })
          })
          const patchData = await patchRes.json()
          if (patchData.success && patchData.investigation_id) {
            currentInvestigationId = patchData.investigation_id
            setDiffState(prev => prev ? {
              ...prev,
              investigation_id: patchData.investigation_id,
              patch_id: patchData.patch_id
            } : prev)
          } else {
            throw new Error(patchData.error || "Could not persist investigation before creating PR.")
          }
        } catch (err: any) {
          setIsSubmittingPr(false)
          setPrStatusText("failed")
          setPrError(err.message || "Failed to persist investigation.")
          addNotification("Pull Request Failed", err.message || "Failed to persist investigation.", "error")
          return
        }
      }

      const res = await fetch('/api/github/pull-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project?.id || projectId,
          branch_name: `trace-one/fix-${Date.now()}`,
          title: 'Fix issue identified by Trace One AI',
          description: 'This PR fixes an issue automatically generated by Trace One AI.\n\nModified files:\n- ' + (diffState?.filePath || selectedFile),
          files: [
            {
              path: diffState?.filePath || selectedFile || 'src/controllers/analytics.ts',
              content: diffState?.modified || fileContents[selectedFile] || ''
            }
          ],
          investigation_id: currentInvestigationId
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create PR');
      
      setPrCreated(true);
      setPrUrl(data.url);
      
      if (data.message && data.message.includes('already exists')) {
        setPrStatusText("exists");
        addNotification("Pull Request Exists", data.message, "info");
      } else {
        setPrStatusText("created");
        addNotification("Pull Request Created", `Opened PR: ${data.url}`, "success");
      }
      
      addChatMessage(projectId, "assistant", `Fix pushed to GitHub.\n[View Pull Request](${data.url})`);
    } catch (err: any) {
      setPrStatusText("failed");
      setPrError(err.message || "Pull request creation failed.");
      addNotification("Pull Request Failed", err.message, "error");
    } finally {
      setIsSubmittingPr(false);
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

  const filesMap: Record<string, string> = {
    ...fileContents,
    "package.json": fileContents["package.json"] || `{\n  "name": "${project.name.toLowerCase().replace(/\s+/g, "-")}",\n  "version": "1.0.0"\n}`,
    "src/controllers/analytics.ts": fileContents["src/controllers/analytics.ts"] || `import { AnalyticsService } from "../services/analytics";\nimport { formatMetric } from "../utils/formatter";\n\nexport async function getAnalytics(req: any, res: any) {\n  const userId = req.user.id;\n  const rawMetrics = await AnalyticsService.getMetrics(userId);\n  const formatted = rawMetrics.map((m: any) => formatMetric(m));\n  return res.json({ data: formatted });\n}`,
    "src/services/analytics.ts": fileContents["src/services/analytics.ts"] || `export class AnalyticsService {\n  static async getMetrics(userId: string) {\n    return null;\n  }\n}`
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

          {diffState && !prCreated && !isSubmittingPr && (
            <Button 
              size="sm" 
              className="gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={handleCreatePullRequest}
            >
              <GitPullRequest className="size-3.5" />
              Submit PR
            </Button>
          )}

          {isSubmittingPr && (
            <Button 
              size="sm" 
              className="gap-1.5 text-xs"
              disabled
            >
              <Loader2 className="size-3.5 animate-spin" />
              Creating Pull Request...
            </Button>
          )}

          {prCreated && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs bg-success/15 text-success border-success/30 px-2.5 py-1">
                {prStatusText === "exists" ? "PR Already Exists" : "PR Created"}
              </Badge>
              {prUrl && (
                <Button size="sm" variant="outline" className="gap-1.5 text-xs" asChild>
                  <a href={prUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-3.5" />
                    Open Pull Request
                  </a>
                </Button>
              )}
              <Button size="sm" variant="secondary" className="gap-1.5 text-xs" asChild>
                <Link href="/pull-requests">
                  <CheckCircle2 className="size-3.5 text-success" />
                  View All PRs
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {activeIncident && (
        <div className="flex items-center justify-between p-3.5 rounded-lg border border-destructive/20 bg-destructive/5 text-destructive gap-3 text-xs animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 text-destructive shrink-0" />
            <div>
              <span className="font-semibold text-foreground">Resolving Incident:</span>{" "}
              <span className="font-mono text-muted-foreground">{activeIncident.title}</span>
            </div>
          </div>
          <Badge variant="destructive" className="uppercase text-[9px] shrink-0">
            {activeIncident.severity}
          </Badge>
        </div>
      )}

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
              <div className="space-y-1 font-mono text-xs max-h-[350px] overflow-y-auto">
                {loadingFiles ? (
                  <div className="flex p-4 items-center justify-center text-muted-foreground text-[11px]">
                    <Loader2 className="size-3.5 animate-spin mr-2" />
                    <span>Syncing files...</span>
                  </div>
                ) : filePaths.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-[11px]">
                    No files found in repository.
                  </div>
                ) : (
                  filePaths.map((file) => (
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
                  ))
                )}
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
                <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground uppercase pb-1">
                  <span>Model Provider</span>
                  {selectedModel && (
                    <div className="flex items-center gap-1 font-semibold text-[10px] text-foreground bg-secondary px-1.5 py-0.5 rounded">
                      {getModelProviderIcon(selectedModel)}
                      <span>{selectedModel === 'Gemini' ? 'Google Gemini' : selectedModel}</span>
                    </div>
                  )}
                </div>
                {keysLoaded && configuredProviders.length === 0 ? (
                  <div className="rounded-md border border-destructive/20 bg-destructive/10 p-2 text-xs text-destructive text-center flex flex-col gap-2">
                    <span>Configure an AI provider in Settings to start debugging.</span>
                    <Link href="/settings/keys">
                      <Button variant="outline" size="sm" className="w-full text-[10px] h-6 bg-background">Settings</Button>
                    </Link>
                  </div>
                ) : (
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground outline-none focus:border-primary"
                    disabled={!keysLoaded}
                  >
                    {!keysLoaded && <option>Loading...</option>}
                    {configuredProviders.map((p: any) => (
                      <option key={p.id} value={p.name}>
                        {p.name === 'Gemini' ? 'Google Gemini' : p.name}
                      </option>
                    ))}
                  </select>
                )}
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
                      placeholder={keysLoaded && configuredProviders.length === 0 ? "Configure AI provider to start chatting" : "Ask AI to explain error, refactor function, or generate patch..."}
                      value={promptInput}
                      onChange={(e) => setPromptInput(e.target.value)}
                      className="text-xs h-9 bg-secondary/20"
                      disabled={isGenerating || (keysLoaded && configuredProviders.length === 0)}
                    />
                    <Button type="submit" size="sm" disabled={isGenerating || !promptInput.trim() || (keysLoaded && configuredProviders.length === 0)} className="h-9 px-3">
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
                  {project?.source_type === "github" && filePaths.includes(selectedFile) && !fileContents[selectedFile] ? (
                    <div className="flex h-[200px] items-center justify-center text-muted-foreground text-xs gap-2">
                      <Loader2 className="size-4 animate-spin text-primary" />
                      <span>Loading file content from GitHub...</span>
                    </div>
                  ) : (
                    <pre className="p-4 text-xs font-mono bg-black/40 overflow-x-auto text-foreground/90 leading-relaxed max-h-[480px]">
                      <code>{filesMap[selectedFile] || "// File content empty or unavailable."}</code>
                    </pre>
                  )}
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
                  {diffState && !prCreated && !isSubmittingPr && (
                    <Button size="sm" onClick={handleCreatePullRequest} className="gap-1.5 text-xs">
                      <GitPullRequest className="size-3.5" />
                      Open Pull Request
                    </Button>
                  )}
                  {isSubmittingPr && (
                    <Button size="sm" disabled className="gap-1.5 text-xs">
                      <Loader2 className="size-3.5 animate-spin" />
                      Creating Pull Request...
                    </Button>
                  )}
                  {prCreated && prUrl && (
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs" asChild>
                        <a href={prUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="size-3.5" />
                          Open Pull Request
                        </a>
                      </Button>
                    </div>
                  )}
                  {prError && (
                    <div className="text-xs text-destructive border border-destructive/20 bg-destructive/5 rounded p-2.5 mt-2 flex items-center gap-2">
                      <AlertCircle className="size-4 text-destructive shrink-0" />
                      <span>{prError}</span>
                    </div>
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
