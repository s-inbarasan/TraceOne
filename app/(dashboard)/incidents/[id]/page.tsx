"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, ArrowLeft, Bot, GitBranch, GitPullRequest, Sparkles, Terminal } from "lucide-react"
import { useWorkspace } from "@/lib/context/WorkspaceContext"

export default function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const incidentId = resolvedParams.id
  const router = useRouter()
  const { addNotification } = useWorkspace()

  const [loading, setLoading] = useState(true)
  const [incident, setIncident] = useState<{
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

  useEffect(() => {
    // Attempt fetching or set fallback mock
    async function loadIncident() {
      try {
        const res = await fetch(`/api/incidents/${incidentId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.data) {
            setIncident(data.data)
            setLoading(false)
            return
          }
        }
      } catch (err) {
        // Fallback
      }

      setIncident({
        id: incidentId,
        title: "TypeError: Cannot read properties of null (reading 'map')",
        severity: "critical",
        status: "open",
        service: "api-gateway",
        file_path: "src/controllers/analytics.ts",
        stack_trace: `TypeError: Cannot read properties of null (reading 'map')\n    at getAnalytics (src/controllers/analytics.ts:8:29)\n    at processTicksAndRejections (node:internal/process/task_queues:95:5)`,
        event_count: 142,
        created_at: new Date().toISOString()
      })
      setLoading(false)
    }

    loadIncident()
  }, [incidentId])

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">Incident {incidentId}</h1>
              <Badge variant="destructive" className="uppercase text-[10px]">
                {incident?.severity || "Critical"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Service: <span className="text-foreground font-mono">{incident?.service || "api-gateway"}</span>
            </p>
          </div>
        </div>

        <Button 
          size="sm" 
          className="gap-2 text-xs"
          onClick={() => {
            addNotification("Navigating to Workspace", "Opening AI workspace for root cause resolution.", "info")
            router.push(`/projects/p-1?incident=${incidentId}`)
          }}
        >
          <Sparkles className="size-3.5" />
          Resolve in AI Workspace
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertCircle className="size-4 text-destructive" /> Exception Metadata
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Error Message</span>
              <p className="font-semibold text-foreground mt-0.5">{incident?.title}</p>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Affected File Path</span>
              <code className="text-primary font-mono text-[11px] block mt-0.5">{incident?.file_path}</code>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Event Count</span>
              <p className="text-foreground font-mono">{incident?.event_count} occurrences</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Terminal className="size-4 text-warning" /> Exception Stack Trace
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="p-3 rounded-md bg-black/50 text-foreground font-mono text-xs overflow-x-auto leading-relaxed">
              <code>{incident?.stack_trace}</code>
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
