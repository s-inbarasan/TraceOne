import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background text-foreground">
      <h1 className="text-4xl font-bold tracking-tight">404 - Page Not Found</h1>
      <p className="text-muted-foreground">
        The page you are looking for does not exist or has been moved.
      </p>
      <Button asChild className="mt-2">
        <Link href="/dashboard">Return to Dashboard</Link>
      </Button>
    </div>
  );
}
