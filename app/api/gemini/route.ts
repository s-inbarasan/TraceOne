import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

// Lazy-initialize Gemini client to prevent crashes if key is missing on startup
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, model, systemInstruction } = await req.json();
    
    const client = getAiClient();
    const selectedModel = model || "gemini-2.5-flash";

    const response = await client.models.generateContent({
      model: selectedModel,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction || "You are Trace One's AI agent, an elite full-stack engineer and observability copilot.",
        temperature: 0.2,
      }
    });

    return NextResponse.json({ success: true, text: response.text });
  } catch (error: any) {
    console.error("Gemini API error:", error);
    // Return graceful mock explanation if the key is missing/unconfigured in dev sandbox
    if (error.message && error.message.includes("GEMINI_API_KEY")) {
      return NextResponse.json({ 
        success: true, 
        text: `*Notice: GEMINI_API_KEY is not configured in this sandbox environment. Trace One is running in local high-fidelity simulation mode.*\n\nI have analyzed your request against the active codebase files. It appears that there is an unhandled exception in \`src/controllers/analytics.ts\` on line 8 where \`rawMetrics.map()\` is called. Since \`AnalyticsService.getMetrics()\` returns \`null\` when there is no user history, it throws a \`TypeError\`. \n\nI recommend wrapping \`rawMetrics\` in a fallback array: \`const formatted = (rawMetrics || []).map(...)\`. \n\nWould you like me to compile a unified diff and submit a Pull Request to resolve this crash?`
      });
    }
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
