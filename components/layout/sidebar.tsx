"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { 
  Activity, 
  Settings, 
  GitPullRequest, 
  LayoutDashboard,
  Box,
  Key,
  ChevronLeft,
  ChevronRight,
  Search,
  History,
  Bot,
  Plus,
  GitBranch,
  LogOut,
  AlertCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { GithubIcon } from "@/components/ui/icons"
import { useWorkspace } from "@/lib/context/WorkspaceContext"
import { motion, AnimatePresence } from "motion/react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const { 
    profile, 
    projects, 
    activeProject, 
    setActiveProject, 
    sidebarCollapsed, 
    setSidebarCollapsed,
    addNotification
  } = useWorkspace()

  const supabase = createClient()

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      addNotification("Logged Out", "You have successfully signed out of Trace One.", "info")
      router.push("/login")
      router.refresh()
    } catch (err) {
      console.error("Logout error:", err)
    }
  }

  const mainNavigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Projects", href: "/projects", icon: Box },
    { name: "Pull Requests", href: "/pull-requests", icon: GitPullRequest },
  ]

  const configNavigation = [
    { name: "API Keys", href: "/settings/keys", icon: Key },
    { name: "Settings", href: "/settings", icon: Settings },
  ]

  return (
    <motion.div 
      animate={{ width: sidebarCollapsed ? 64 : 260 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="flex h-full flex-col border-r border-border bg-card/95 text-card-foreground select-none relative"
    >
      {/* Brand Header */}
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden py-1">
          <img 
            src="https://od.lk/s/OTNfMzY2MDI0MjZfWVBJV0k/TRACE-ONE-logo.png" 
            alt="Trace One" 
            className={cn("h-7 w-auto object-contain bg-transparent transition-all", sidebarCollapsed ? "max-w-[36px]" : "max-w-[36px]")}
          />
          {!sidebarCollapsed && (
            <span className="text-sm font-black tracking-wider text-foreground whitespace-nowrap">
              TRACE <span className="text-primary font-black">ONE</span>
            </span>
          )}
        </Link>
        
        {!sidebarCollapsed && (
          <button 
            onClick={() => setSidebarCollapsed(true)}
            className="flex size-6 items-center justify-center rounded-md border border-border hover:bg-secondary text-muted-foreground transition-colors"
          >
            <ChevronLeft className="size-3.5" />
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 space-y-6">
        
        {/* New Project Quick Link */}
        <div className="px-3">
          <Link 
            href="/projects?new=true"
            className={cn(
              "flex items-center gap-2.5 rounded-lg border border-dashed border-border/60 hover:border-primary/40 hover:bg-secondary/40 text-xs font-medium text-muted-foreground hover:text-foreground transition-all cursor-pointer",
              sidebarCollapsed ? "justify-center p-2" : "px-3 py-2"
            )}
          >
            <Plus className="size-4 shrink-0 text-primary" />
            {!sidebarCollapsed && <span>New Project</span>}
          </Link>
        </div>

        {/* Navigation Section */}
        <div className="px-3 space-y-1">
          {mainNavigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors relative group",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                )}
              >
                <item.icon className={cn("size-4.5 shrink-0", isActive ? "text-primary" : "")} />
                {!sidebarCollapsed ? (
                  <span>{item.name}</span>
                ) : (
                  <div className="absolute left-16 bg-popover text-popover-foreground text-xs font-semibold rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md pointer-events-none z-50">
                    {item.name}
                  </div>
                )}
              </Link>
            )
          })}
        </div>

        {/* Projects / Workspaces Section */}
        {projects.length > 0 && (
          <div className="space-y-1">
            {!sidebarCollapsed ? (
              <div className="flex items-center justify-between px-6 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Active Projects</span>
              </div>
            ) : (
              <div className="h-px bg-border my-2 mx-3" />
            )}
            
            <div className="px-3 space-y-1">
              {projects.map((proj) => {
                const isActive = activeProject?.id === proj.id
                return (
                  <button
                    key={proj.id}
                    onClick={() => {
                      setActiveProject(proj)
                      router.push(`/projects/${proj.id}`)
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-left transition-colors relative group",
                      isActive 
                        ? "bg-secondary text-foreground border-l-2 border-primary rounded-l-none" 
                        : "text-muted-foreground hover:bg-secondary/30 hover:text-foreground"
                    )}
                  >
                    {(proj.repositories && proj.repositories.length > 0) || proj.slug?.startsWith("github-") || proj.source_type === "github" ? (
                      <GithubIcon className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
                    ) : (
                      <Box className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
                    )}
                    {!sidebarCollapsed ? (
                      <span className="truncate text-xs font-medium">{proj.name}</span>
                    ) : (
                      <div className="absolute left-16 bg-popover text-popover-foreground text-xs font-semibold rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md pointer-events-none z-50">
                        {proj.name}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Configuration Section */}
        <div className="space-y-1">
          {!sidebarCollapsed ? (
            <div className="px-6 mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Configuration</div>
          ) : (
            <div className="h-px bg-border my-2 mx-3" />
          )}
          <div className="px-3 space-y-1">
            {configNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors relative group",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  )}
                >
                  <item.icon className={cn("size-4.5 shrink-0", isActive ? "text-primary" : "")} />
                  {!sidebarCollapsed ? (
                    <span>{item.name}</span>
                  ) : (
                    <div className="absolute left-16 bg-popover text-popover-foreground text-xs font-semibold rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md pointer-events-none z-50">
                      {item.name}
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* Footer / Profile Card */}
      <div className="mt-auto border-t border-border p-3 space-y-2 bg-secondary/20">
        <div className={cn("flex items-center gap-3", sidebarCollapsed ? "justify-center" : "")}>
          {profile?.avatar_url ? (
            <img 
              src={profile.avatar_url} 
              alt={profile.full_name} 
              className="size-8.5 rounded-full ring-2 ring-border/50 shrink-0 object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="size-8.5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0 ring-2 ring-border/50">
              {profile?.full_name?.substring(0, 2).toUpperCase() || "JD"}
            </div>
          )}
          
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-semibold text-foreground truncate leading-tight">{profile?.full_name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{profile?.email}</p>
            </div>
          )}
        </div>

        {!sidebarCollapsed ? (
          <button 
            onClick={() => setShowLogoutConfirm(true)}
            className="flex w-full items-center gap-2 rounded-md hover:bg-destructive/15 text-xs text-muted-foreground hover:text-destructive py-1.5 px-2 transition-colors cursor-pointer"
          >
            <LogOut className="size-3.5" />
            <span>Sign Out</span>
          </button>
        ) : (
          <button 
            onClick={() => setSidebarCollapsed(false)}
            className="flex w-full justify-center text-muted-foreground hover:text-foreground py-1.5 cursor-pointer"
          >
            <ChevronRight className="size-4" />
          </button>
        )}
      </div>

      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="size-5 text-destructive" />
              Sign Out Confirmation
            </DialogTitle>
            <DialogDescription className="pt-2 text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to sign out of Trace One? You will need to sign in again to access your active projects and exception workspaces.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="outline" size="sm" onClick={() => setShowLogoutConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleLogout}>
              Sign Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
