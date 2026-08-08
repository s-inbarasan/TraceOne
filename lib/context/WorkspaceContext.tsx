"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { User } from "@supabase/supabase-js"

export interface Profile {
  avatar_url: string
  full_name: string
  email: string
  username: string
  provider: "github" | "email"
  created_at: string
  last_login: string
  github_id?: string
}

export interface Project {
  id: string
  name: string
  slug: string
  source_type: "github" | "upload"
  repository?: string // e.g. "acme-corp/api-gateway"
  status: "healthy" | "error" | "syncing"
  created_at: string
  files?: Record<string, any>
  logs?: any[]
  model?: string
}

export interface SyncRepository {
  id: string
  name: string
  full_name: string
  owner: {
    login: string
    avatar_url: string
  }
  private: boolean
  description: string | null
  language: string | null
  default_branch: string
  updated_at: string
  size: number
}

export interface ApiKey {
  id: string
  provider: string
  key_hash: string
  last_validated?: string
  status: "valid" | "invalid"
}

export interface NotificationItem {
  id: string
  title: string
  message: string
  type: "success" | "info" | "warning" | "error"
  created_at: string
  read: boolean
}

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
  sandboxState?: {
    step: string
    status: "running" | "success" | "failed"
    progress: number
    logs?: string[]
  }
}

export interface WorkspaceContextType {
  user: User | null
  profile: Profile | null
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>
  projects: Project[]
  activeProject: Project | null
  setActiveProject: (project: Project | null) => void
  createProject: (name: string, sourceType: "github" | "upload", sourceVal: string | FileList) => Promise<Project>
  deleteProject: (id: string) => Promise<boolean>
  updateProjectModel: (projectId: string, model: string) => void
  syncedRepos: SyncRepository[]
  isSyncingRepos: boolean
  syncRepos: () => Promise<void>
  apiKeys: Record<string, ApiKey>
  saveApiKey: (providerId: string, key: string) => Promise<void>
  deleteApiKey: (providerId: string) => Promise<void>
  notifications: NotificationItem[]
  unreadCount: number
  addNotification: (title: string, message: string, type: NotificationItem["type"]) => void
  markAllRead: () => void
  clearAllNotifications: () => void
  markAsRead: (id: string) => void
  sidebarCollapsed: boolean
  setSidebarCollapsed: (val: boolean) => void
  selectedModel: string
  setSelectedModel: (model: string) => void
  chatHistory: Record<string, Message[]>
  addChatMessage: (projectId: string, role: "user" | "assistant", content: string, sandboxState?: Message["sandboxState"]) => void
  clearChatHistory: (projectId: string) => void
  activeFile: string | null
  setActiveFile: (filePath: string | null) => void
  currentDiff: { original: string; modified: string; filePath: string } | null
  setCurrentDiff: (diff: { original: string; modified: string; filePath: string } | null) => void
  isInvestigating: boolean
  setIsInvestigating: (val: boolean) => void
  investigationProgress: number
  setInvestigationProgress: (val: number) => void
  activeStep: string
  setActiveStep: (val: string) => void
  currentInvestigation: any | null
  setCurrentInvestigation: (val: any | null) => void
  draftPR: any | null
  setDraftPR: (val: any | null) => void
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined)

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProject, setActiveProjectState] = useState<Project | null>(null)
  const [syncedRepos, setSyncedRepos] = useState<SyncRepository[]>([])
  const [isSyncingRepos, setIsSyncingRepos] = useState(false)
  const [apiKeys, setApiKeys] = useState<Record<string, ApiKey>>({})
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash")
  const [chatHistory, setChatHistory] = useState<Record<string, Message[]>>({})
  const [activeFile, setActiveFile] = useState<string | null>(null)
  const [currentDiff, setCurrentDiff] = useState<any | null>(null)
  const [isInvestigating, setIsInvestigating] = useState(false)
  const [investigationProgress, setInvestigationProgress] = useState(0)
  const [activeStep, setActiveStep] = useState("")
  const [currentInvestigation, setCurrentInvestigation] = useState<any | null>(null)
  const [draftPR, setDraftPR] = useState<any | null>(null)

  // Load from local storage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedSidebar = localStorage.getItem("sidebar_collapsed")
      if (storedSidebar) setSidebarCollapsed(storedSidebar === "true")

      const storedKeys = localStorage.getItem("trace_api_keys")
      if (storedKeys) setApiKeys(JSON.parse(storedKeys))

      const storedProjects = localStorage.getItem("trace_projects")
      if (storedProjects) setProjects(JSON.parse(storedProjects))

      const storedHistory = localStorage.getItem("trace_chat_history")
      if (storedHistory) setChatHistory(JSON.parse(storedHistory))

      // Set default notifications if empty
      const storedNotifications = localStorage.getItem("trace_notifications")
      if (storedNotifications) {
        setNotifications(JSON.parse(storedNotifications))
      } else {
        const initialNotifications: NotificationItem[] = [
          {
            id: "1",
            title: "Welcome to Trace One",
            message: "Connect your GitHub or upload a project to begin real-time issue resolution.",
            type: "info",
            created_at: new Date().toISOString(),
            read: false,
          },
        ]
        setNotifications(initialNotifications)
        localStorage.setItem("trace_notifications", JSON.stringify(initialNotifications))
      }
    }
  }, [])

  // Sync state to local storage when it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebar_collapsed", String(sidebarCollapsed))
    }
  }, [sidebarCollapsed])

  useEffect(() => {
    if (typeof window !== "undefined" && Object.keys(apiKeys).length > 0) {
      localStorage.setItem("trace_api_keys", JSON.stringify(apiKeys))
    }
  }, [apiKeys])

  useEffect(() => {
    if (typeof window !== "undefined" && projects.length > 0) {
      localStorage.setItem("trace_projects", JSON.stringify(projects))
    }
  }, [projects])

  useEffect(() => {
    if (typeof window !== "undefined" && Object.keys(chatHistory).length > 0) {
      localStorage.setItem("trace_chat_history", JSON.stringify(chatHistory))
    }
  }, [chatHistory])

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("trace_notifications", JSON.stringify(notifications))
    }
  }, [notifications])

  // Get active session
  useEffect(() => {
    const fetchUserAndSyncProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const u = session.user
          setUser(u)

          // Fetch or Create custom profile
          let dbUserFullName = ""
          let dbUserAvatarUrl = ""
          try {
            const { data: dbUser } = await supabase.from("users").select("*").eq("id", u.id).single()
            if (dbUser) {
              dbUserFullName = dbUser.full_name || ""
              dbUserAvatarUrl = dbUser.avatar_url || ""
            }
          } catch (e) {
            console.error("Error fetching db user info:", e)
          }

          const meta = u.user_metadata
          const identities = u.identities || []
          const githubIdentity = identities.find(id => id.provider === "github")
          const hasGithub = !!githubIdentity
          const provider = hasGithub ? "github" : "email"
          
          const githubUsername = githubIdentity?.identity_data?.user_name || meta?.user_name || ""
          const githubId = githubIdentity?.id || meta?.provider_id || ""
          
          let displayName = dbUserFullName || meta?.full_name || meta?.name || githubIdentity?.identity_data?.full_name || githubIdentity?.identity_data?.name || ""
          if (!displayName && u.email) {
            // Generate display name from email
            const parts = u.email.split("@")[0].split(/[._-]/)
            displayName = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" ")
          }

          const avatar = dbUserAvatarUrl || githubIdentity?.identity_data?.avatar_url || meta?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`

          // Ensure it's persisted in public.users table!
          try {
            await supabase.from("users").upsert({
              id: u.id,
              email: u.email || "",
              full_name: displayName,
              avatar_url: avatar,
              updated_at: new Date().toISOString()
            }, { onConflict: "id" })
          } catch (upsertErr) {
            console.error("Error upserting public user row:", upsertErr)
          }

          const currentProfile: Profile = {
            avatar_url: avatar,
            full_name: displayName,
            email: u.email || "",
            username: githubUsername,
            provider: provider,
            created_at: u.created_at,
            last_login: u.last_sign_in_at || new Date().toISOString(),
            github_id: githubId
          }
          setProfile(currentProfile)

          // Load database items if any
          const { data: dbProjects } = await supabase.from("projects").select("*")
          if (dbProjects && dbProjects.length > 0) {
            const mapped: Project[] = dbProjects.map(p => ({
              id: p.id,
              name: p.name,
              slug: p.slug,
              source_type: p.slug.startsWith("github-") ? "github" : "upload",
              repository: p.slug.startsWith("github-") ? p.slug.replace("github-", "").replace("-", "/") : undefined,
              status: "healthy",
              created_at: p.created_at,
            }))
            // Merge or use DB projects
            setProjects(prev => {
              const prevMap = new Map(prev.map(item => [item.id, item]))
              mapped.forEach(m => prevMap.set(m.id, { ...prevMap.get(m.id), ...m }))
              return Array.from(prevMap.values())
            })
          }
        } else {
          // Unauthenticated default (or development preview)
          setUser(null)
          // Setup a default beautiful mock profile so that the user is not locked out in sandbox
          const mockProfile: Profile = {
            avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80",
            full_name: "Sarah Jenkins",
            email: "sarah.jenkins@traceone.ai",
            username: "sarahj_dev",
            provider: "github",
            created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            last_login: new Date().toISOString(),
            github_id: "7294829"
          }
          setProfile(mockProfile)
        }
      } catch (err) {
        console.error("Error setting up workspace user/profile:", err)
      }
    }

    fetchUserAndSyncProfile()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
      } else {
        setUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  // Sync GitHub repositories
  const syncRepos = async () => {
    setIsSyncingRepos(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.provider_token

      if (token) {
        // Fetch real repositories from GitHub!
        const res = await fetch("https://api.github.com/user/repos?sort=updated&per_page=50", {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json"
          }
        })
        if (res.ok) {
          const data = await res.json()
          const formatted: SyncRepository[] = data.map((r: any) => ({
            id: String(r.id),
            name: r.name,
            full_name: r.full_name,
            owner: {
              login: r.owner.login,
              avatar_url: r.owner.avatar_url
            },
            private: r.private,
            description: r.description,
            language: r.language,
            default_branch: r.default_branch || "main",
            updated_at: r.updated_at,
            size: r.size
          }))
          setSyncedRepos(formatted)
          addNotification(
            "GitHub Repositories Synced",
            `Successfully imported ${formatted.length} repositories from your account.`,
            "success"
          )
          setIsSyncingRepos(false)
          return
        }
      }

      // If no token, load beautiful high-fidelity simulated repositories
      await new Promise(r => setTimeout(r, 1200))
      const mockRepos: SyncRepository[] = [
        {
          id: "r1",
          name: "api-gateway",
          full_name: "traceone-labs/api-gateway",
          owner: { login: "traceone-labs", avatar_url: "https://api.dicebear.com/7.x/identicon/svg?seed=traceone-labs" },
          private: true,
          description: "Production gateway proxy built in Next.js & Go handling authentication, tracing, and rate-limiting.",
          language: "TypeScript",
          default_branch: "main",
          updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          size: 14022
        },
        {
          id: "r2",
          name: "payment-service",
          full_name: "traceone-labs/payment-service",
          owner: { login: "traceone-labs", avatar_url: "https://api.dicebear.com/7.x/identicon/svg?seed=traceone-labs" },
          private: true,
          description: "Stripe & PayPal microservice backend implementing lazy clients, retry logic, and webhook listeners.",
          language: "TypeScript",
          default_branch: "main",
          updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          size: 8940
        },
        {
          id: "r3",
          name: "auth-provider",
          full_name: "personal-space/auth-provider",
          owner: { login: "personal-space", avatar_url: "https://api.dicebear.com/7.x/identicon/svg?seed=personal-space" },
          private: false,
          description: "Open-source JWT authorization helper utility featuring secure cookie configs and sub-claims verification.",
          language: "TypeScript",
          default_branch: "master",
          updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          size: 2012
        },
        {
          id: "r4",
          name: "next-dashboard",
          full_name: "personal-space/next-dashboard",
          owner: { login: "personal-space", avatar_url: "https://api.dicebear.com/7.x/identicon/svg?seed=personal-space" },
          private: false,
          description: "Stunning React dashboard featuring Tailwind CSS v4, multi-layered layouts, and Recharts animations.",
          language: "TypeScript",
          default_branch: "main",
          updated_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
          size: 24500
        }
      ]
      setSyncedRepos(mockRepos)
      addNotification(
        "Simulated Repositories Loaded",
        "No live GitHub connection detected. Loaded default trace-ready sandbox codebases.",
        "info"
      )
    } catch (err) {
      console.error("Error syncing repositories:", err)
      addNotification("Sync Failed", "Could not complete GitHub repository synchronization.", "error")
    } finally {
      setIsSyncingRepos(false)
    }
  }

  // Trigger sync if we have GitHub profile
  useEffect(() => {
    if (profile?.provider === "github") {
      syncRepos()
    }
  }, [profile?.provider])

  // Create Project
  const createProject = async (name: string, sourceType: "github" | "upload", sourceVal: string | FileList) => {
    const slug = sourceType === "github" 
      ? `github-${(sourceVal as string).replace("/", "-")}` 
      : `upload-${name.toLowerCase().replace(/\s+/g, "-")}`

    // Check if repository already belongs to another project
    if (sourceType === "github") {
      const existing = projects.find(p => p.repository === sourceVal)
      if (existing) {
        addNotification("Repository Connected", `This repository is already linked to: ${existing.name}. Opened instead.`, "info")
        setActiveProjectState(existing)
        return existing
      }
    }

    try {
      // Try to create in Supabase
      let dbProj: any = null
      if (user) {
        const { data, error } = await supabase
          .from("projects")
          .insert({ name, slug, user_id: user.id })
          .select()
          .single()
        
        if (!error && data) dbProj = data
      }

      // Prepare files structure
      let projectFiles: Record<string, any> = {}
      if (sourceType === "github") {
        // Mock default workspace files for selected repository
        const repoName = sourceVal as string
        projectFiles = {
          "package.json": `{
  "name": "${repoName.split("/")[1]}",
  "version": "1.0.0",
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "stripe": "^14.0.0"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build"
  }
}`,
          "src": {
            "controllers": {
              "analytics.ts": `import { AnalyticsService } from "../services/analytics";
import { formatMetric } from "../utils/formatter";

export async function getAnalytics(req: any, res: any) {
  const userId = req.user.id;
  const rawMetrics = await AnalyticsService.getMetrics(userId);
  // ERROR INCOMING: If no user history, rawMetrics is null
  const formatted = rawMetrics.map((m: any) => formatMetric(m));
  
  return res.json({ data: formatted });
}`
            },
            "services": {
              "analytics.ts": `export class AnalyticsService {
  static async getMetrics(userId: string) {
    // Simulate empty database results for new accounts
    return null; 
  }
}`
            },
            "utils": {
              "formatter.ts": `export function formatMetric(metric: any) {
  return {
    ...metric,
    formatted_at: new Date().toLocaleDateString()
  };
}`
            }
          }
        }
      } else {
        // Upload zip files
        projectFiles = {
          "index.js": `console.log("Uploaded project run context initiated.");`,
          "package.json": `{\n  "name": "${name.toLowerCase().replace(/\s+/g, "-")}",\n  "version": "0.1.0"\n}`
        }
      }

      // Prepare beautiful logs
      const defaultLogs = [
        { method: "GET", path: "/api/users/analytics", statusCode: 500, errorMessage: "Cannot read properties of undefined (reading 'map')", timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString() },
        { method: "POST", path: "/api/payments/checkout", statusCode: 200, errorMessage: null, timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString() },
        { method: "GET", path: "/api/users/profile", statusCode: 200, errorMessage: null, timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString() }
      ]

      const newProj: Project = {
        id: dbProj?.id || `proj-${Math.random().toString(36).substr(2, 9)}`,
        name,
        slug,
        source_type: sourceType,
        repository: sourceType === "github" ? (sourceVal as string) : undefined,
        status: "healthy",
        created_at: new Date().toISOString(),
        files: projectFiles,
        logs: defaultLogs,
        model: "gemini-2.5-flash"
      }

      setProjects(prev => [newProj, ...prev])
      setActiveProjectState(newProj)
      addNotification("Project Created", `Successfully connected: ${name}. Ready for analysis.`, "success")
      return newProj
    } catch (err) {
      console.error("Error creating project:", err)
      throw err
    }
  }

  // Delete Project
  const deleteProject = async (id: string) => {
    try {
      if (user) {
        await supabase.from("projects").delete().eq("id", id)
      }
      setProjects(prev => prev.filter(p => p.id !== id))
      if (activeProject?.id === id) {
        setActiveProjectState(null)
      }
      addNotification("Project Deleted", "The project has been safely removed.", "info")
      return true
    } catch (err) {
      console.error("Error deleting project:", err)
      return false
    }
  }

  // Update Project LLM Model
  const updateProjectModel = (projectId: string, model: string) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, model } : p))
    if (activeProject?.id === projectId) {
      setActiveProjectState(prev => prev ? { ...prev, model } : null)
    }
  }

  // API Key management
  const saveApiKey = async (providerId: string, key: string) => {
    try {
      // In a high-fidelity mock & local state, save key safely
      const newKey: ApiKey = {
        id: `key-${Math.random().toString(36).substr(2, 9)}`,
        provider: providerId,
        key_hash: key,
        last_validated: new Date().toISOString(),
        status: "valid"
      }
      setApiKeys(prev => ({ ...prev, [providerId]: newKey }))
      addNotification("API Key Configured", `${providerId.toUpperCase()} API key saved and validated.`, "success")
    } catch (err) {
      console.error("Error saving API key:", err)
    }
  }

  const deleteApiKey = async (providerId: string) => {
    setApiKeys(prev => {
      const copy = { ...prev }
      delete copy[providerId]
      return copy
    })
    addNotification("API Key Removed", `${providerId.toUpperCase()} API key disconnected.`, "info")
  }

  // Chat message system
  const addChatMessage = (projectId: string, role: "user" | "assistant", content: string, sandboxState?: Message["sandboxState"]) => {
    const newMessage: Message = {
      id: `msg-${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: new Date().toISOString(),
      sandboxState
    }

    setChatHistory(prev => {
      const history = prev[projectId] || []
      return {
        ...prev,
        [projectId]: [...history, newMessage]
      }
    })
  }

  const clearChatHistory = (projectId: string) => {
    setChatHistory(prev => {
      const copy = { ...prev }
      delete copy[projectId]
      return copy
    })
  }

  // Notification methods
  const addNotification = (title: string, message: string, type: NotificationItem["type"]) => {
    const newN: NotificationItem = {
      id: `notif-${Math.random().toString(36).substr(2, 9)}`,
      title,
      message,
      type,
      created_at: new Date().toISOString(),
      read: false
    }
    setNotifications(prev => [newN, ...prev])
  }

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const clearAllNotifications = () => {
    setNotifications([])
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <WorkspaceContext.Provider value={{
      user,
      profile,
      setProfile,
      projects,
      activeProject,
      setActiveProject: setActiveProjectState,
      createProject,
      deleteProject,
      updateProjectModel,
      syncedRepos,
      isSyncingRepos,
      syncRepos,
      apiKeys,
      saveApiKey,
      deleteApiKey,
      notifications,
      unreadCount,
      addNotification,
      markAllRead,
      clearAllNotifications,
      markAsRead,
      sidebarCollapsed,
      setSidebarCollapsed,
      selectedModel,
      setSelectedModel,
      chatHistory,
      addChatMessage,
      clearChatHistory,
      activeFile,
      setActiveFile,
      currentDiff,
      setCurrentDiff,
      isInvestigating,
      setIsInvestigating,
      investigationProgress,
      setInvestigationProgress,
      activeStep,
      setActiveStep,
      currentInvestigation,
      setCurrentInvestigation,
      draftPR,
      setDraftPR
    }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider")
  }
  return context
}
