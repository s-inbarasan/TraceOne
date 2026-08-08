"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Bell, Search, Check, Trash2, Shield, Info, AlertTriangle, X } from "lucide-react"
import { useWorkspace } from "@/lib/context/WorkspaceContext"
import { motion, AnimatePresence } from "motion/react"
import { cn } from "@/lib/utils"

export function Header() {
  const { 
    profile, 
    notifications, 
    unreadCount, 
    markAllRead, 
    clearAllNotifications, 
    markAsRead 
  } = useWorkspace()

  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const trayRef = useRef<HTMLDivElement>(null)

  // Close notifications tray when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (trayRef.current && !trayRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-6 z-40 relative">
      <div className="flex flex-1 items-center gap-4">
        <div className="flex max-w-md flex-1 items-center gap-2 rounded-lg border border-border bg-secondary/20 px-3 py-1.5 text-sm text-muted-foreground transition-all focus-within:border-primary/40 focus-within:bg-transparent focus-within:text-foreground">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects, incidents, or pull requests... (Press '/')" 
            className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground text-xs"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="hover:text-foreground">
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications Tray Container */}
        <div className="relative" ref={trayRef}>
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn(
              "text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-full relative",
              isOpen ? "bg-secondary/50 text-foreground" : ""
            )}
            onClick={() => setIsOpen(!isOpen)}
          >
            <Bell className="size-4.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex size-4.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground animate-pulse">
                {unreadCount}
              </span>
            )}
            <span className="sr-only">Notifications</span>
          </Button>

          {/* Animated Notification Center Tray */}
          <AnimatePresence>
            {isOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2.5 w-80 sm:w-96 rounded-xl border border-border bg-popover shadow-xl overflow-hidden z-50 text-left"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border bg-secondary/10 px-4 py-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{unreadCount} unread messages</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {unreadCount > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2 text-[10px] gap-1 hover:bg-secondary text-primary"
                        onClick={markAllRead}
                      >
                        <Check className="size-3" /> Mark all read
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 px-2 text-[10px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1"
                      onClick={clearAllNotifications}
                    >
                      <Trash2 className="size-3" /> Clear all
                    </Button>
                  </div>
                </div>

                {/* List */}
                <div className="max-h-[350px] overflow-y-auto divide-y divide-border/60">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                      <div className="flex size-10 items-center justify-center rounded-full bg-secondary/40 text-muted-foreground mb-3">
                        <Bell className="size-5" />
                      </div>
                      <p className="text-xs font-medium text-foreground">No notifications</p>
                      <p className="text-[10px] text-muted-foreground mt-1">You will receive updates here when AI operations complete.</p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        className={cn(
                          "p-4 hover:bg-secondary/30 transition-colors relative cursor-pointer flex gap-3",
                          !notif.read ? "bg-primary/5 border-l-2 border-primary" : ""
                        )}
                        onClick={() => markAsRead(notif.id)}
                      >
                        <div className="shrink-0 mt-0.5">
                          {notif.type === "success" && (
                            <div className="flex size-6 items-center justify-center rounded-full bg-success/15 text-success">
                              <Check className="size-3.5" />
                            </div>
                          )}
                          {notif.type === "info" && (
                            <div className="flex size-6 items-center justify-center rounded-full bg-info/15 text-info">
                              <Info className="size-3.5" />
                            </div>
                          )}
                          {notif.type === "warning" && (
                            <div className="flex size-6 items-center justify-center rounded-full bg-warning/15 text-warning">
                              <AlertTriangle className="size-3.5" />
                            </div>
                          )}
                          {notif.type === "error" && (
                            <div className="flex size-6 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                              <X className="size-3.5" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={cn("text-xs font-semibold leading-tight text-foreground truncate", !notif.read ? "font-bold" : "")}>
                              {notif.title}
                            </p>
                            <span className="text-[9px] text-muted-foreground shrink-0 mt-0.5">
                              {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                            {notif.message}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Badge display */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-border/80">
          {profile?.avatar_url ? (
            <img 
              src={profile.avatar_url} 
              alt={profile.full_name} 
              className="size-8 rounded-full ring-2 ring-border shrink-0 object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="size-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0 ring-2 ring-border">
              {profile?.full_name?.substring(0, 2).toUpperCase() || "JD"}
            </div>
          )}
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-foreground leading-tight">{profile?.full_name}</p>
            <p className="text-[9px] text-muted-foreground capitalize">{profile?.provider} Auth</p>
          </div>
        </div>
      </div>
    </header>
  )
}
