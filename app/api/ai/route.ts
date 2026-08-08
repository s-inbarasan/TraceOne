import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { 
  getAdapter, 
  getCachedModels, 
  setCachedModels, 
  invalidateModelCache 
} from "@/lib/services/ai-adapters";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prompt, model, systemInstruction, provider } = await req.json();

    // 1. Resolve requested provider
    let requestedProvider = provider;
    if (!requestedProvider) {
      const lowerModel = (model || "").toLowerCase();
      if (lowerModel.includes('gemini')) {
        requestedProvider = 'Gemini';
      } else if (lowerModel.includes('claude') || lowerModel.includes('anthropic')) {
        requestedProvider = 'Anthropic';
      } else if (lowerModel.includes('nvidia') || lowerModel.includes('405b')) {
        requestedProvider = 'NVIDIA';
      } else if (lowerModel.includes('groq') || lowerModel.includes('70b') || lowerModel.includes('llama-3.3')) {
        requestedProvider = 'Groq';
      } else if (lowerModel.includes('openai') || lowerModel.includes('gpt')) {
        requestedProvider = 'OpenAI';
      } else {
        requestedProvider = 'Gemini'; // Baseline fallback
      }
    }

    // 2. Fetch provider row from DB
    const { data: providerRow } = await supabase
      .from('providers')
      .select('id, name')
      .ilike('name', requestedProvider)
      .maybeSingle();

    if (!providerRow) {
      return NextResponse.json({ error: `Provider ${requestedProvider} not supported or not found.` }, { status: 400 });
    }

    // 3. Fetch user's API Key for this provider
    const { data: keyRow } = await supabase
      .from('api_keys')
      .select('encrypted_key')
      .eq('user_id', user.id)
      .eq('provider_id', providerRow.id)
      .maybeSingle();

    if (!keyRow || !keyRow.encrypted_key) {
      return NextResponse.json({ 
        error: `You have not configured an API key for ${providerRow.name}. Please configure it in Settings.` 
      }, { status: 403 });
    }

    const apiKey = keyRow.encrypted_key;
    const adapter = getAdapter(providerRow.name);

    if (!adapter) {
      return NextResponse.json({ 
        error: `Provider ${providerRow.name} adapter is not implemented.` 
      }, { status: 501 });
    }

    // 4. Retrieve models (checking cache first)
    let models = getCachedModels(providerRow.name, apiKey);
    if (!models) {
      try {
        models = await adapter.discoverModels(apiKey);
        setCachedModels(providerRow.name, apiKey, models);
      } catch (discoveryErr: any) {
        console.error(`Dynamic model discovery failed for ${providerRow.name}:`, discoveryErr);
        return NextResponse.json({ 
          error: `Failed to discover models for ${providerRow.name}: ${discoveryErr.message}` 
        }, { status: 502 });
      }
    }

    // 5. Resolve target model name to use
    let targetModel = model;
    
    // If targetModel is actually a provider name or matches our list, or is not specified: select best
    const isProviderName = ["gemini", "openai", "anthropic", "nvidia", "groq"].includes((targetModel || "").toLowerCase());
    if (!targetModel || isProviderName) {
      targetModel = adapter.selectBestModel(models);
    }

    const sysInstruct = systemInstruction || `You are Trace One's AI agent, an elite full-stack engineer. 
If the user asks you to fix an issue, you must include a code block labeled \`\`\`json containing this structure:
{
  "hasFix": true,
  "filePath": "path/to/file.ts",
  "original": "original snippet to replace in full or part",
  "modified": "new replacement snippet",
  "rootCause": "Detailed explanation of what caused the bug or incident",
  "confidenceScore": 90.0,
  "riskAnalysis": "Assessment of potential side-effects or risks of this change",
  "timeEstimateMinutes": 15
}
Ensure confidenceScore is a float/number (between 0 and 100), and timeEstimateMinutes is an integer.
Otherwise, just answer their question normally.`;

    // 6. Execute generateContent with Retry-Once on model not found/deprecation
    try {
      const response = await adapter.generateContent(apiKey, targetModel, prompt, sysInstruct);
      return NextResponse.json({ success: true, text: response.text, model: response.model, provider: response.provider });
    } catch (err: any) {
      const errMsg = (err.message || "").toLowerCase();
      const isDeprecationOrNotFoundError = 
        errMsg.includes("not found") || 
        errMsg.includes("not_found") || 
        errMsg.includes("no longer available") || 
        errMsg.includes("deprecated") || 
        errMsg.includes("not exist") || 
        errMsg.includes("404");

      if (isDeprecationOrNotFoundError) {
        console.warn(`Model ${targetModel} deprecated or not found. Retrying with model rediscovery...`);
        
        // Invalidate cache and rediscover
        invalidateModelCache(providerRow.name, apiKey);
        
        try {
          const freshModels = await adapter.discoverModels(apiKey);
          setCachedModels(providerRow.name, apiKey, freshModels);
          
          // Select a different compatible model
          const filteredModels = freshModels.filter(m => m.id !== targetModel);
          const retryModel = adapter.selectBestModel(filteredModels.length > 0 ? filteredModels : freshModels);
          
          console.log(`Retrying query with rediscovered model: ${retryModel}`);
          const retryResponse = await adapter.generateContent(apiKey, retryModel, prompt, sysInstruct);
          
          return NextResponse.json({ 
            success: true, 
            text: retryResponse.text, 
            model: retryResponse.model, 
            provider: retryResponse.provider,
            retried: true 
          });
        } catch (retryErr: any) {
          console.error(`Retry attempt failed:`, retryErr);
          return NextResponse.json({ 
            error: `Request failed after retry: ${retryErr.message || "Model not available"}` 
          }, { status: 500 });
        }
      }

      // If it's another kind of error (e.g. rate limit, auth, network), return it directly
      console.error(`AI API execution error:`, err);
      return NextResponse.json({ error: err.message || "Execution error" }, { status: 500 });
    }

  } catch (error: any) {
    console.error("AI API main handler error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
