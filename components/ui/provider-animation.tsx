"use client";

import React, { useState } from "react";
import { GeminiLogo, OpenAILogo, AnthropicLogo, GrokLogo, NvidiaLogo } from "./ai-logos";

export function ProviderLogosAnimation() {
  const [isHovered, setIsHovered] = useState(false);

  const providers = [
    { name: "Google Gemini", Icon: GeminiLogo },
    { name: "OpenAI", Icon: OpenAILogo },
    { name: "Anthropic Claude", Icon: AnthropicLogo },
    { name: "xAI Grok", Icon: GrokLogo },
    { name: "NVIDIA NIM", Icon: NvidiaLogo },
  ];

  const repeatedProviders = [...providers, ...providers, ...providers, ...providers];

  return (
    <div className="w-full overflow-hidden border-y border-border/40 bg-secondary/10 py-10 relative mt-16 group select-none">
      {/* Fade edges */}
      <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      
      <div 
        className="flex items-center w-max"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={() => setIsHovered(true)}
        onTouchEnd={() => setIsHovered(false)}
      >
        <div 
          className="flex items-center gap-16 px-6 animate-marquee"
          style={{ animationPlayState: isHovered ? 'paused' : 'running' }}
        >
          {repeatedProviders.map((p, idx) => (
            <div 
              key={idx} 
              className="flex items-center gap-3.5 px-5 py-3 rounded-xl bg-card/70 border border-border/50 shadow-sm opacity-80 hover:opacity-100 hover:border-primary/50 transition-all duration-300"
            >
              <div className="size-8 flex items-center justify-center text-foreground">
                <p.Icon className="size-7 object-contain" />
              </div>
              <span className="text-sm font-semibold tracking-wide text-foreground whitespace-nowrap">{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
