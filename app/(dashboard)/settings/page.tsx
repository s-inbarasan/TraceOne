"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { GitBranch, Loader2, CheckCircle2, User as UserIcon, Bell, Sparkles, Moon, Sun, Smartphone } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useWorkspace } from "@/lib/context/WorkspaceContext"
import { cn } from "@/lib/utils"

export default function SettingsPage() {
  const { profile, setProfile, addNotification } = useWorkspace()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [avatar, setAvatar] = useState("")
  const [theme, setTheme] = useState("dark")
  const [notifIncident, setNotifIncident] = useState(true)
  const [notifPR, setNotifPR] = useState(true)
  const [notifWeekly, setNotifWeekly] = useState(false)

  useEffect(() => {
    if (profile) {
      setName(profile.full_name)
      setAvatar(profile.avatar_url)
    }
  }, [profile])

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Simulate API call delay
      await new Promise(r => setTimeout(r, 1000))
      
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        // Update user metadata in Supabase
        const { error } = await supabase.auth.updateUser({
          data: { 
            full_name: name,
            avatar_url: avatar
          }
        })
        if (error) throw error
      }

      // Update local profile context
      if (profile) {
        setProfile({
          ...profile,
          full_name: name,
          avatar_url: avatar
        })
      }

      addNotification(
        "Settings Saved",
        "Your profile settings have been successfully updated.",
        "success"
      )
    } catch (err: any) {
      console.error("Error saving profile settings:", err)
      addNotification("Save Failed", err.message || "Failed to update profile settings.", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleGitHubConnect = async () => {
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: 'repo read:user user:email'
        }
      })
      if (error) throw error
    } catch (err: any) {
      console.error("Error connecting GitHub:", err)
      addNotification("Connection Failed", "Unable to establish GitHub link.", "error")
    }
  }

  const handleGitHubDisconnect = async () => {
    setLoading(true)
    try {
      await new Promise(r => setTimeout(r, 800))
      if (profile) {
        setProfile({
          ...profile,
          provider: "email"
        })
      }
      addNotification("GitHub Disconnected", "Your GitHub account link has been safely removed.", "info")
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const isGitHubConnected = profile?.provider === "github"

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account profile, theme preferences, and integrations.</p>
      </div>

      <div className="grid gap-6">
        
        {/* Profile Card */}
        <form onSubmit={handleSaveChanges}>
          <Card className="border-border/60 bg-card">
            <CardHeader>
              <div className="flex items-center gap-2">
                <UserIcon className="size-5 text-primary" />
                <CardTitle className="text-base">Profile Settings</CardTitle>
              </div>
              <CardDescription>Update your personal display name and avatar image.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-col sm:flex-row items-center gap-5 pb-2">
                <div className="relative group cursor-pointer">
                  {avatar ? (
                    <img 
                      src={avatar} 
                      alt="Avatar Preview" 
                      className="size-20 rounded-full border-2 border-border shadow-md object-cover transition-transform group-hover:scale-102"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="size-20 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xl">
                      {name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] font-semibold text-white">Change</span>
                  </div>
                </div>
                
                <div className="flex-1 w-full space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avatar URL</label>
                    <Input 
                      value={avatar} 
                      onChange={(e) => setAvatar(e.target.value)}
                      placeholder="https://example.com/avatar.jpg" 
                      className="text-xs h-9" 
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Provide any direct image URL or use our default DiceBear initials.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Full Display Name</label>
                  <Input 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name" 
                    required
                    className="text-xs h-9" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Primary Email Address</label>
                  <Input 
                    value={profile?.email || ""} 
                    disabled
                    className="text-xs h-9 bg-secondary/30 text-muted-foreground border-border/50" 
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t border-border/40 py-3 bg-secondary/10 flex justify-end">
              <Button type="submit" disabled={loading} size="sm" className="h-8 text-xs min-w-[120px]">
                {loading ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin mr-2" /> Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </CardFooter>
          </Card>
        </form>

        {/* GitHub Integration */}
        <Card className="border-border/60 bg-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <GitBranch className="size-5 text-primary" />
              <CardTitle className="text-base">GitHub Connection</CardTitle>
            </div>
            <CardDescription>Connect your GitHub account to enable automatic repository discovery and patch pull requests.</CardDescription>
          </CardHeader>
          <CardContent>
            {isGitHubConnected ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-xl border border-border bg-secondary/10 p-4 gap-4">
                <div className="flex items-center gap-3.5">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="GitHub Avatar" className="size-11 rounded-full border border-border" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="flex size-11 items-center justify-center rounded-full bg-secondary">
                      <GitBranch className="size-5" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-foreground">Connected as @{profile?.username || "github_user"}</p>
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-success/15 text-success">Verified</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Authorized for public and private repository syncing.</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="h-8 text-xs border-destructive/20 hover:bg-destructive/10 hover:text-destructive cursor-pointer" onClick={handleGitHubDisconnect} disabled={loading}>
                  Disconnect GitHub
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-start gap-4">
                <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                  By linking your GitHub account, Trace One automatically syncs repository file structures, parses imports, reads build configuration manifests, and submits non-destructive, isolated pull request suggestions.
                </p>
                <Button onClick={handleGitHubConnect} className="gap-2 h-8.5 text-xs">
                  <GitBranch className="size-4" />
                  Connect GitHub Account
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Appearance Preference */}
        <Card className="border-border/60 bg-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              <CardTitle className="text-base">Theme & Appearance</CardTitle>
            </div>
            <CardDescription>Select your preferred styling theme workspace interface.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <button 
              onClick={() => setTheme("light")}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border p-4 text-center cursor-pointer hover:bg-secondary/25 transition-all",
                theme === "light" ? "border-primary bg-primary/5 text-primary" : "border-border/60 text-muted-foreground"
              )}
            >
              <Sun className="size-5" />
              <span className="text-xs font-semibold">Light Theme</span>
            </button>
            <button 
              onClick={() => setTheme("dark")}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border p-4 text-center cursor-pointer hover:bg-secondary/25 transition-all",
                theme === "dark" ? "border-primary bg-primary/5 text-primary" : "border-border/60 text-muted-foreground"
              )}
            >
              <Moon className="size-5" />
              <span className="text-xs font-semibold">Dark Theme (Default)</span>
            </button>
            <button 
              onClick={() => setTheme("system")}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border p-4 text-center cursor-pointer hover:bg-secondary/25 transition-all",
                theme === "system" ? "border-primary bg-primary/5 text-primary" : "border-border/60 text-muted-foreground"
              )}
            >
              <Smartphone className="size-5" />
              <span className="text-xs font-semibold">Follow System</span>
            </button>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card className="border-border/60 bg-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="size-5 text-primary" />
              <CardTitle className="text-base">Alerts & Notifications</CardTitle>
            </div>
            <CardDescription>Manage how and when you want to receive alerts about your projects.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-1 border-b border-border/40">
              <div>
                <p className="text-xs font-semibold text-foreground">Critical Incident Alerts</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Notify instantly when a live backend API error occurs.</p>
              </div>
              <input 
                type="checkbox" 
                checked={notifIncident} 
                onChange={(e) => setNotifIncident(e.target.checked)}
                className="size-4.5 accent-primary rounded cursor-pointer" 
              />
            </div>

            <div className="flex items-center justify-between py-1 border-b border-border/40">
              <div>
                <p className="text-xs font-semibold text-foreground">AI Patch Pull Requests</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Get notified immediately once a pull request draft has been compiled.</p>
              </div>
              <input 
                type="checkbox" 
                checked={notifPR} 
                onChange={(e) => setNotifPR(e.target.checked)}
                className="size-4.5 accent-primary rounded cursor-pointer" 
              />
            </div>

            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-xs font-semibold text-foreground">Weekly Digest Summary</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Receive a lightweight weekly metrics and error trends report.</p>
              </div>
              <input 
                type="checkbox" 
                checked={notifWeekly} 
                onChange={(e) => setNotifWeekly(e.target.checked)}
                className="size-4.5 accent-primary rounded cursor-pointer" 
              />
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
