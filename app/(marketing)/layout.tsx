import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 max-w-7xl items-center px-6">
          <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight">
            <img 
              src="https://od.lk/s/OTNfMzY2MDI0MjZfWVBJV0k/TRACE-ONE-logo.png" 
              alt="Trace One" 
              className="h-7 w-auto object-contain bg-transparent"
            />
            <span className="text-base font-black tracking-wider text-foreground">
              TRACE <span className="text-primary font-black">ONE</span>
            </span>
          </Link>
          <div className="flex flex-1 items-center justify-end gap-4">
            <nav className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
              <Link href="/#features" className="hover:text-foreground">Features</Link>
              <Link href="/#how-it-works" className="hover:text-foreground">How it Works</Link>
              <Link href="/#security" className="hover:text-foreground">Security</Link>
            </nav>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/login">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border py-6 md:py-0">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-6 md:h-16 md:flex-row max-w-7xl">
          <p className="text-sm leading-loose text-muted-foreground">
            Built for modern engineering teams.
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">GitHub</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
