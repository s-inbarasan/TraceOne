"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function ScrollRestorationArea({ children, className }: { children: React.ReactNode, className?: string }) {
  const pathname = usePathname();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollPositions = useRef<Record<string, number>>({});

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Restore scroll position
    const savedPos = scrollPositions.current[pathname];
    if (savedPos !== undefined) {
      container.scrollTop = savedPos;
    } else {
      container.scrollTop = 0;
    }

    const handleScroll = () => {
      scrollPositions.current[pathname] = container.scrollTop;
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [pathname]);

  return (
    <div ref={scrollContainerRef} className={className}>
      {children}
    </div>
  );
}
