import { Button } from "@/components/ui/button";
import { ArrowRight, Bot, GitMerge, Search, Server, Activity, Terminal, Code2 } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ProviderLogosAnimation } from "@/components/ui/provider-animation";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-24 pb-16 md:pt-32 md:pb-24 lg:pt-40 lg:pb-32">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background"></div>
          <div className="container px-4 md:px-6 max-w-5xl mx-auto space-y-12 text-center">
            <div className="space-y-6">
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
                Resolve API failures <br className="hidden sm:inline" />
                <span className="text-primary">at the speed of AI.</span>
              </h1>
              <p className="mx-auto max-w-[700px] text-lg text-muted-foreground sm:text-xl leading-relaxed">
                Trace One provides a unified workflow: Ingest API Logs, detect Incidents, run AI Root Cause Analysis, generate Patches, and automatically submit GitHub Pull Requests.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button size="lg" className="gap-2 h-12 px-8" asChild>
                <Link href="/login">
                  Start Investigating <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
          
          <ProviderLogosAnimation />
        </section>

        {/* Workflow Pipeline Section */}
        <section className="py-16 md:py-24 border-t border-border/40 bg-secondary/20">
          <div className="container px-4 md:px-6 max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">The complete incident resolution pipeline</h2>
              <p className="mt-4 text-muted-foreground md:text-lg max-w-2xl mx-auto">
                Stop jumping between your observability dashboard, your code editor, and your git client. Trace One connects the entire workflow in one seamless workspace.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card className="bg-background border-border/50">
                <CardContent className="p-6 space-y-4">
                  <div className="size-10 rounded bg-secondary flex items-center justify-center text-foreground">
                    <Activity className="size-5" />
                  </div>
                  <h3 className="font-semibold text-lg">1. API Log Ingestion</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Stream your backend error logs directly into the platform. We automatically aggregate and categorize related exceptions into manageable Incidents.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-background border-border/50">
                <CardContent className="p-6 space-y-4">
                  <div className="size-10 rounded bg-primary/10 flex items-center justify-center text-primary">
                    <Search className="size-5" />
                  </div>
                  <h3 className="font-semibold text-lg">2. AI Root Cause Analysis</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Connect your GitHub repository. The engine securely fetches the relevant source code files and analyzes the stack trace to determine exactly what broke.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-background border-border/50">
                <CardContent className="p-6 space-y-4">
                  <div className="size-10 rounded bg-success/10 flex items-center justify-center text-success">
                    <GitMerge className="size-5" />
                  </div>
                  <h3 className="font-semibold text-lg">3. Automated PR Generation</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Review a generated git patch right in the browser. With one click, submit a deploy-ready Pull Request back to your repository containing the fix.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Product UI Previews */}
        <section className="py-16 md:py-32">
          <div className="container px-4 md:px-6 max-w-6xl mx-auto">
            <div className="grid gap-16 lg:grid-cols-2 lg:gap-24 items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                  <Server className="mr-2 size-4" /> Interactive Workspace
                </div>
                <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Everything you need to fix production.</h2>
                <p className="text-muted-foreground md:text-lg leading-relaxed">
                  Inside the dashboard, you can browse active incidents, review full request headers and payload context, and launch investigations directly against your connected GitHub projects.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-sm font-medium">
                    <div className="size-6 rounded-full bg-secondary flex items-center justify-center"><Code2 className="size-3.5 text-muted-foreground" /></div>
                    Integrated code viewing & syntax highlighting
                  </li>
                  <li className="flex items-center gap-3 text-sm font-medium">
                    <div className="size-6 rounded-full bg-secondary flex items-center justify-center"><Bot className="size-3.5 text-muted-foreground" /></div>
                    Project-level AI chat for architecture context
                  </li>
                  <li className="flex items-center gap-3 text-sm font-medium">
                    <div className="size-6 rounded-full bg-secondary flex items-center justify-center"><Terminal className="size-3.5 text-muted-foreground" /></div>
                    Unified diffs and patch management
                  </li>
                </ul>
              </div>

              {/* Decorative Mock UI */}
              <div className="relative mx-auto w-full max-w-[500px] lg:max-w-none">
                <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-primary/30 to-background blur-xl"></div>
                <div className="relative rounded-xl border border-border/60 bg-card overflow-hidden shadow-2xl">
                  <div className="flex items-center gap-2 border-b border-border/40 bg-secondary/30 px-4 py-3">
                    <div className="flex gap-1.5">
                      <div className="size-2.5 rounded-full bg-destructive/80"></div>
                      <div className="size-2.5 rounded-full bg-warning/80"></div>
                      <div className="size-2.5 rounded-full bg-success/80"></div>
                    </div>
                    <div className="ml-4 text-xs font-medium text-muted-foreground">Trace One / Investigation Panel</div>
                  </div>
                  <div className="p-4 space-y-4 font-mono text-sm">
                    <div className="flex items-center justify-between border-b border-border/40 pb-3">
                      <span className="text-foreground font-semibold">INC-492: TypeError in checkout handler</span>
                      <span className="rounded bg-destructive/10 px-2 py-1 text-[10px] uppercase text-destructive font-bold">Open</span>
                    </div>
                    <div className="space-y-3">
                      <div className="text-primary opacity-80">{'<'} Analyzing stack trace via Anthropic Claude 3.5...</div>
                      <div className="text-muted-foreground">Fetched app/api/checkout/route.ts from GitHub</div>
                      <div className="rounded border border-success/20 bg-success/5 p-3 text-success">
                        Fix Generated: Handled undefined metadata field when processing legacy webhook payloads.
                      </div>
                    </div>
                    <div className="pt-2 flex justify-end">
                      <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
                        <GitMerge className="size-4" /> Submit Pull Request
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>


    </div>
  );
}
