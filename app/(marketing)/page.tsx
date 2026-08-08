import { Button } from "@/components/ui/button";
import { ArrowRight, Bot, Code2, GitMerge, Search, Shield, Zap } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden pt-24 pb-16 md:pt-32 md:pb-24 lg:pt-40 lg:pb-32 text-center">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background"></div>
        <div className="container px-4 md:px-6 max-w-5xl mx-auto space-y-8">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Debug your backend <br className="hidden sm:inline" />
            <span className="text-primary">at the speed of AI.</span>
          </h1>
          <p className="mx-auto max-w-[700px] text-lg text-muted-foreground sm:text-xl">
            Trace One automatically investigates API failures, analyzes your GitHub repository, identifies root causes, and generates deploy-ready code patches.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" className="gap-2" asChild>
              <Link href="/login">
                Get Started <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section id="features" className="py-16 md:py-24 lg:py-32 bg-secondary/30">
        <div className="container px-4 md:px-6 max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">Stop digging through logs.</h2>
            <p className="mx-auto max-w-[700px] text-muted-foreground md:text-lg">
              Traditional observability tells you something broke. Trace One tells you why it broke and hands you the fix.
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <Card className="bg-background">
              <CardContent className="p-6 space-y-4">
                <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Search className="size-6" />
                </div>
                <h3 className="text-xl font-semibold">Automatic Investigation</h3>
                <p className="text-muted-foreground">
                  Instantly correlates stack traces with your source code. No more manual searching across repositories.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-background">
              <CardContent className="p-6 space-y-4">
                <div className="size-12 rounded-lg bg-success/10 flex items-center justify-center text-success">
                  <GitMerge className="size-6" />
                </div>
                <h3 className="text-xl font-semibold">Pull Request Automation</h3>
                <p className="text-muted-foreground">
                  Go from error alert to a deployable GitHub Pull Request in seconds, not hours.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-background">
              <CardContent className="p-6 space-y-4">
                <div className="size-12 rounded-lg bg-warning/10 flex items-center justify-center text-warning">
                  <Bot className="size-6" />
                </div>
                <h3 className="text-xl font-semibold">Bring Your Own AI</h3>
                <p className="text-muted-foreground">
                  Use your preferred LLM provider. Supports NVIDIA, OpenAI, Gemini, and Anthropic for root cause analysis.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section id="how-it-works" className="py-16 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6 max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-24">
            <div className="flex-1 space-y-6">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How it works</h2>
              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground font-semibold border border-border">1</div>
                    <div className="w-px h-full bg-border my-2"></div>
                  </div>
                  <div className="space-y-1 pb-4">
                    <h4 className="font-semibold text-lg">Send API Logs</h4>
                    <p className="text-muted-foreground">Ingest backend logs via our simple REST API. Trace One intelligently groups similar errors into Incidents.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground font-semibold border border-border">2</div>
                    <div className="w-px h-full bg-border my-2"></div>
                  </div>
                  <div className="space-y-1 pb-4">
                    <h4 className="font-semibold text-lg">AI Analyzes Context</h4>
                    <p className="text-muted-foreground">The engine securely retrieves the affected files from GitHub and identifies the root cause using your configured LLM.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">3</div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-lg">Review Pull Request</h4>
                    <p className="text-muted-foreground">A clean, deploy-ready patch is generated. Accept it to automatically open a PR in your repository.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-1 w-full max-w-[600px] lg:max-w-none">
              <div className="rounded-xl border border-border bg-card p-2 shadow-2xl relative">
                 {/* Decorative mock UI */}
                 <div className="rounded-lg border border-border bg-background p-4 space-y-4 font-mono text-sm">
                    <div className="flex items-center justify-between text-muted-foreground border-b border-border pb-2">
                       <span>INC-9480</span>
                       <span className="text-warning">High Risk</span>
                    </div>
                    <div className="space-y-2">
                      <div className="text-destructive">NullReferenceException in PaymentProcessor</div>
                      <div className="text-muted-foreground">Analysis Complete...</div>
                      <div className="text-success">Fix Generated: Added null check for Stripe object.</div>
                    </div>
                    <div className="pt-2 border-t border-border flex justify-end">
                       <Button size="sm" className="gap-2"><GitMerge className="size-4" /> Create PR</Button>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-16 md:py-24 lg:py-32 bg-secondary/30">
        <div className="container px-4 md:px-6 max-w-7xl mx-auto text-center space-y-12">
          <div className="space-y-4">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Enterprise-Grade Security</h2>
            <p className="mx-auto max-w-[700px] text-muted-foreground md:text-lg">
              Built with security by design. Your code, your keys, your control.
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 text-left">
            <div className="space-y-3">
              <Shield className="size-8 text-primary" />
              <h4 className="font-semibold text-lg">Encrypted API Keys</h4>
              <p className="text-sm text-muted-foreground">Your LLM keys are encrypted at rest and never exposed.</p>
            </div>
            <div className="space-y-3">
              <Code2 className="size-8 text-primary" />
              <h4 className="font-semibold text-lg">No Code Training</h4>
              <p className="text-sm text-muted-foreground">Your private source code is never used to train our models.</p>
            </div>
            <div className="space-y-3">
              <GitMerge className="size-8 text-primary" />
              <h4 className="font-semibold text-lg">Least Privilege</h4>
              <p className="text-sm text-muted-foreground">GitHub integration only requests the minimum scopes required.</p>
            </div>
            <div className="space-y-3">
              <Zap className="size-8 text-primary" />
              <h4 className="font-semibold text-lg">OAuth Access</h4>
              <p className="text-sm text-muted-foreground">Secure authentication via industry standard GitHub OAuth.</p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
