"use client";
import { Activity } from "lucide-react"

export default function Loading() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-muted-foreground animate-pulse">
        <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Activity className="size-6" />
        </div>
        <p className="text-sm font-medium">Loading Trace One...</p>
      </div>
    </div>
  )
}
