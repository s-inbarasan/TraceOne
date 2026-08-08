"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { GitBranch, Key, Activity, CheckCircle2, ArrowRight } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [projectName, setProjectName] = useState("")
  const [repoName, setRepoName] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleNext = () => setStep(prev => prev + 1)
  const handlePrev = () => setStep(prev => prev - 1)

  const handleFinish = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      // Insert initial project
      if (projectName && repoName) {
        await supabase.from("projects").insert({
          name: projectName,
          repository: repoName,
          status: "healthy"
        })
      }
      
      router.push("/dashboard")
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center gap-2 mb-4">
            {[1, 2, 3].map((i) => (
              <div 
                key={i} 
                className={`h-2 w-12 rounded-full transition-colors ${step >= i ? 'bg-primary' : 'bg-secondary'}`}
              />
            ))}
          </div>
          <CardTitle className="text-2xl">
            {step === 1 && "Welcome to TraceMind"}
            {step === 2 && "Connect GitHub"}
            {step === 3 && "Configure AI"}
          </CardTitle>
          <CardDescription>
            {step === 1 && "Let's set up your first project."}
            {step === 2 && "Authorize GitHub to allow TraceMind to open pull requests."}
            {step === 3 && "Add your preferred LLM provider API key to enable patching."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Project Name</label>
                <Input 
                  placeholder="e.g. Acme API Gateway" 
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">GitHub Repository</label>
                <Input 
                  placeholder="acme-corp/api-gateway" 
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col items-center justify-center py-8 space-y-6 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-secondary">
                <GitBranch className="size-8" />
              </div>
              <p className="text-sm text-muted-foreground">
                TraceMind needs access to your repositories to analyze code and generate automated fixes for errors.
              </p>
              <Button variant="outline" className="gap-2 w-full max-w-xs">
                <GitBranch className="size-4" />
                Connect GitHub
              </Button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-card p-4 flex gap-4">
                <div className="mt-1 bg-secondary rounded-md p-2">
                  <Key className="size-5" />
                </div>
                <div>
                  <h4 className="font-medium text-sm">Add an LLM API Key</h4>
                  <p className="text-xs text-muted-foreground mt-1 mb-3">
                    TraceMind uses AI to investigate errors and write code. You can configure this now or later in Settings.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="/settings/keys" target="_blank" rel="noreferrer">
                      Open API Keys <ArrowRight className="size-3 ml-2" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between border-t border-border pt-6">
          <Button variant="ghost" onClick={handlePrev} disabled={step === 1}>
            Back
          </Button>
          {step < 3 ? (
            <Button onClick={handleNext} disabled={step === 1 && (!projectName || !repoName)}>
              Continue
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={loading}>
              Complete Setup
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
