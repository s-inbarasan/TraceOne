import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prompt, model, systemInstruction, provider } = await req.json();

    let requestedProvider = provider;
    if (!requestedProvider) {
      const lowerModel = (model || "").toLowerCase();
      if (lowerModel.includes('gemini')) {
        requestedProvider = 'Gemini';
      } else if (lowerModel.includes('claude')) {
        requestedProvider = 'Anthropic';
      } else if (lowerModel.includes('nvidia') || lowerModel.includes('405b')) {
        requestedProvider = 'Nvidia';
      } else if (lowerModel.includes('groq') || lowerModel.includes('70b')) {
        requestedProvider = 'Groq';
      } else {
        requestedProvider = 'OpenAI';
      }
    }

    const { data: providerRow } = await supabase
      .from('providers')
      .select('id, name')
      .ilike('name', requestedProvider)
      .maybeSingle();

    if (!providerRow) {
      return NextResponse.json({ error: `Provider ${requestedProvider} not supported or not found.` }, { status: 400 });
    }

    const { data: keyRow } = await supabase
      .from('api_keys')
      .select('encrypted_key')
      .eq('user_id', user.id)
      .eq('provider_id', providerRow.id)
      .maybeSingle();

    if (!keyRow || !keyRow.encrypted_key) {
      return NextResponse.json({ error: `You have not configured an API key for ${providerRow.name}. Please configure it in Settings.` }, { status: 403 });
    }

    const apiKey = keyRow.encrypted_key;

    let responseText = "";

    const sysInstruct = systemInstruction || `You are Trace One's AI agent, an elite full-stack engineer. 
If the user asks you to fix an issue, you must include a code block labeled \`\`\`json containing this structure:
{
  "hasFix": true,
  "filePath": "path/to/file.ts",
  "original": "original snippet to replace",
  "modified": "new snippet"
}
Otherwise, just answer their question normally.`;

    if (providerRow.name.toLowerCase() === 'gemini') {
      const aiClient = new GoogleGenAI({ apiKey });
      const selectedModel = model || "gemini-2.5-flash";
      const response = await aiClient.models.generateContent({
        model: selectedModel,
        contents: prompt,
        config: {
          systemInstruction: sysInstruct,
          temperature: 0.2,
        }
      });
      responseText = response.text || "";
    } else if (providerRow.name.toLowerCase() === 'openai') {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: model || "gpt-4o-mini",
            messages: [{ role: "system", content: sysInstruct }, { role: "user", content: prompt }],
            temperature: 0.2
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "OpenAI API error");
      responseText = data.choices[0].message.content;
    } else if (providerRow.name.toLowerCase() === 'anthropic') {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: model || "claude-3-5-sonnet-20240620",
            max_tokens: 1024,
            system: sysInstruct,
            messages: [{ role: "user", content: prompt }]
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Anthropic API error");
      responseText = data.content[0].text;
    } else if (providerRow.name.toLowerCase() === 'groq') {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: model || "llama-3.1-70b-versatile",
            messages: [{ role: "system", content: sysInstruct }, { role: "user", content: prompt }],
            temperature: 0.2
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Groq API error");
      responseText = data.choices[0].message.content;
    } else if (providerRow.name.toLowerCase() === 'nvidia') {
      const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: model || "meta/llama-3.1-405b-instruct",
            messages: [{ role: "system", content: sysInstruct }, { role: "user", content: prompt }],
            temperature: 0.2
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "NVIDIA API error");
      responseText = data.choices[0].message.content;
    } else {
      return NextResponse.json({ error: `Provider ${providerRow.name} SDK is not fully implemented in this sandbox.` }, { status: 501 });
    }

    return NextResponse.json({ success: true, text: responseText });

  } catch (error: any) {
    console.error("AI API error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
