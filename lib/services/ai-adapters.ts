import { GoogleGenAI } from "@google/genai";

export interface ModelMetadata {
  id: string;
  displayName: string;
  capabilities: string[];
}

export interface NormalizedResponse {
  text: string;
  model: string;
  provider: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

export interface AIProviderAdapter {
  providerName: string;
  discoverModels(apiKey: string): Promise<ModelMetadata[]>;
  selectBestModel(models: ModelMetadata[]): string;
  generateContent(apiKey: string, model: string, prompt: string, systemInstruction?: string): Promise<NormalizedResponse>;
}

// 1. Gemini Adapter
export const GeminiAdapter: AIProviderAdapter = {
  providerName: "Gemini",
  async discoverModels(apiKey: string): Promise<ModelMetadata[]> {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Gemini API validation failed with status ${res.status}`);
    }
    const data = await res.json();
    const models = data.models || [];
    
    // Filter for generation models
    const compatible = models.filter((m: any) => {
      const isGenerate = m.supportedGenerationMethods?.includes("generateContent");
      // filter out obsolete, tuning, or lightweight text embedding models
      const isObsolete = m.name?.includes("gemini-1.0") || 
                         m.name?.includes("gemini-1.5-flash-8b") || 
                         m.name?.includes("tuningJobs") ||
                         m.name?.includes("embedding");
      return isGenerate && !isObsolete;
    });

    if (compatible.length === 0) {
      return [
        { id: "models/gemini-2.5-pro", displayName: "Gemini 2.5 Pro", capabilities: ["chat", "code", "analysis"] },
        { id: "models/gemini-3.5-flash", displayName: "Gemini 3.5 Flash", capabilities: ["chat", "code", "analysis"] }
      ];
    }

    return compatible.map((m: any) => ({
      id: m.name,
      displayName: m.displayName || m.name.replace("models/", ""),
      capabilities: ["chat", "code", "analysis"]
    }));
  },

  selectBestModel(models: ModelMetadata[]): string {
    // 1. Prefer newest stable models (e.g. gemini-3.6, gemini-3.5, gemini-3.1, gemini-2.5)
    // Sort models so newer is preferred
    const sorted = [...models].sort((a, b) => {
      const aId = a.id.toLowerCase();
      const bId = b.id.toLowerCase();
      
      // Prioritize 3 series over 2.5 or 1.5
      const getScore = (id: string) => {
        if (id.includes("gemini-3.6")) return 36;
        if (id.includes("gemini-3.5")) return 35;
        if (id.includes("gemini-3.1")) return 31;
        if (id.includes("gemini-2.5")) return 25;
        if (id.includes("gemini-1.5")) return 15;
        return 10;
      };

      const scoreDiff = getScore(bId) - getScore(aId);
      if (scoreDiff !== 0) return scoreDiff;

      // Prioritize pro over flash within same version
      if (bId.includes("pro") && !aId.includes("pro")) return 1;
      if (aId.includes("pro") && !bId.includes("pro")) return -1;
      
      return 0;
    });

    return sorted[0]?.id || "models/gemini-2.5-pro";
  },

  async generateContent(apiKey: string, model: string, prompt: string, systemInstruction?: string): Promise<NormalizedResponse> {
    const aiClient = new GoogleGenAI({ apiKey });
    const cleanModel = model.startsWith("models/") ? model : `models/${model}`;
    
    const response = await aiClient.models.generateContent({
      model: cleanModel,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.2,
      }
    });

    return {
      text: response.text || "",
      model: cleanModel,
      provider: "Gemini",
      usage: response.usageMetadata ? {
        inputTokens: response.usageMetadata.promptTokenCount,
        outputTokens: response.usageMetadata.candidatesTokenCount,
        totalTokens: response.usageMetadata.totalTokenCount,
      } : undefined
    };
  }
};

// 2. OpenAI Adapter
export const OpenAIAdapter: AIProviderAdapter = {
  providerName: "OpenAI",
  async discoverModels(apiKey: string): Promise<ModelMetadata[]> {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: {
        "Authorization": `Bearer ${apiKey}`
      }
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || `OpenAI API validation failed with status ${res.status}`);
    }
    const data = await res.json();
    const models = data.data || [];
    
    // Filter for standard GPT generation models
    const compatible = models.filter((m: any) => {
      const id = m.id.toLowerCase();
      return (id.startsWith("gpt-4") || id.startsWith("gpt-3.5") || id.startsWith("o1-") || id.startsWith("o3-")) && 
             !id.includes("vision") && !id.includes("instruct") && !id.includes("realtime") && !id.includes("audio");
    });

    if (compatible.length === 0) {
      return [
        { id: "gpt-4o", displayName: "GPT-4o", capabilities: ["chat", "code", "analysis"] },
        { id: "gpt-4o-mini", displayName: "GPT-4o Mini", capabilities: ["chat", "code", "analysis"] }
      ];
    }

    return compatible.map((m: any) => ({
      id: m.id,
      displayName: m.id,
      capabilities: ["chat", "code", "analysis"]
    }));
  },

  selectBestModel(models: ModelMetadata[]): string {
    const ids = models.map(m => m.id);
    if (ids.includes("gpt-4o")) return "gpt-4o";
    if (ids.includes("gpt-4o-mini")) return "gpt-4o-mini";
    if (ids.includes("gpt-4-turbo")) return "gpt-4-turbo";
    
    // Try to find any gpt-4 model
    const gpt4 = ids.find(id => id.includes("gpt-4"));
    if (gpt4) return gpt4;

    return ids[0] || "gpt-4o-mini";
  },

  async generateContent(apiKey: string, model: string, prompt: string, systemInstruction?: string): Promise<NormalizedResponse> {
    const messages = [];
    if (systemInstruction) {
      messages.push({ role: "system", content: systemInstruction });
    }
    messages.push({ role: "user", content: prompt });

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.2
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || `OpenAI API error: ${res.statusText}`);
    }

    return {
      text: data.choices[0]?.message?.content || "",
      model: model,
      provider: "OpenAI",
      usage: data.usage ? {
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined
    };
  }
};

// 3. Anthropic Adapter
export const AnthropicAdapter: AIProviderAdapter = {
  providerName: "Anthropic",
  async discoverModels(apiKey: string): Promise<ModelMetadata[]> {
    // Anthropic v1/models requires headers
    try {
      const res = await fetch("https://api.anthropic.com/v1/models", {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        }
      });
      if (res.status === 401 || res.status === 403) {
        throw new Error("Invalid Anthropic API Key");
      }
      if (res.ok) {
        const data = await res.json();
        if (data.data && Array.isArray(data.data)) {
          return data.data.map((m: any) => ({
            id: m.id,
            displayName: m.display_name || m.id,
            capabilities: ["chat", "code", "analysis"]
          }));
        }
      }
    } catch (e: any) {
      if (e.message?.includes("Invalid Anthropic API Key")) {
        throw e;
      }
    }

    // fallback check with dummy request if list fails but key is valid
    const validateRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1,
        messages: [{ role: "user", content: "ping" }]
      })
    });

    if (validateRes.status === 401 || validateRes.status === 403) {
      throw new Error("Invalid Anthropic API Key");
    }

    return [
      { id: "claude-3-5-sonnet-20241022", displayName: "Claude 3.5 Sonnet", capabilities: ["chat", "code", "analysis"] },
      { id: "claude-3-5-haiku-20241022", displayName: "Claude 3.5 Haiku", capabilities: ["chat", "code", "analysis"] },
      { id: "claude-3-opus-20240229", displayName: "Claude 3 Opus", capabilities: ["chat", "code", "analysis"] }
    ];
  },

  selectBestModel(models: ModelMetadata[]): string {
    const ids = models.map(m => m.id);
    const preferred = [
      "claude-3-5-sonnet-latest",
      "claude-3-5-sonnet-20241022",
      "claude-3-5-sonnet-20240620",
      "claude-3-5-haiku-latest",
      "claude-3-5-haiku-20241022",
      "claude-3-opus-latest",
      "claude-3-opus-20240229"
    ];

    for (const pref of preferred) {
      if (ids.includes(pref)) return pref;
    }

    // Try a fuzzy match
    const sonnet = ids.find(id => id.includes("sonnet"));
    if (sonnet) return sonnet;

    return ids[0] || "claude-3-5-sonnet-20241022";
  },

  async generateContent(apiKey: string, model: string, prompt: string, systemInstruction?: string): Promise<NormalizedResponse> {
    const body: any = {
      model: model,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2
    };
    if (systemInstruction) {
      body.system = systemInstruction;
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || `Anthropic API error: ${res.statusText}`);
    }

    return {
      text: data.content[0]?.text || "",
      model: model,
      provider: "Anthropic",
      usage: data.usage ? {
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      } : undefined
    };
  }
};

// 4. NVIDIA Adapter
export const NVIDIAAdapter: AIProviderAdapter = {
  providerName: "NVIDIA",
  async discoverModels(apiKey: string): Promise<ModelMetadata[]> {
    const res = await fetch("https://integrate.api.nvidia.com/v1/models", {
      headers: {
        "Authorization": `Bearer ${apiKey}`
      }
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || `NVIDIA API validation failed with status ${res.status}`);
    }
    const data = await res.json();
    const models = data.data || [];
    
    const compatible = models.filter((m: any) => {
      const id = m.id.toLowerCase();
      // NVIDIA has many models, let's filter for text generation models
      return id.includes("llama-3") || id.includes("mistral") || id.includes("mixtral") || id.includes("gemma");
    });

    if (compatible.length === 0) {
      return [
        { id: "meta/llama-3.1-405b-instruct", displayName: "Llama 3.1 405B", capabilities: ["chat", "code", "analysis"] },
        { id: "meta/llama-3.1-70b-instruct", displayName: "Llama 3.1 70B", capabilities: ["chat", "code", "analysis"] }
      ];
    }

    return compatible.map((m: any) => ({
      id: m.id,
      displayName: m.id,
      capabilities: ["chat", "code", "analysis"]
    }));
  },

  selectBestModel(models: ModelMetadata[]): string {
    const ids = models.map(m => m.id);
    const preferred = [
      "meta/llama-3.3-70b-instruct",
      "meta/llama-3.1-405b-instruct",
      "meta/llama-3.1-70b-instruct",
      "nvidia/llama-3.1-nemotron-70b-instruct"
    ];

    for (const pref of preferred) {
      if (ids.includes(pref)) return pref;
    }

    // Try a fuzzy match
    const llama405 = ids.find(id => id.includes("llama-3.1-405b"));
    if (llama405) return llama405;

    const llama70 = ids.find(id => id.includes("70b"));
    if (llama70) return llama70;

    return ids[0] || "meta/llama-3.1-405b-instruct";
  },

  async generateContent(apiKey: string, model: string, prompt: string, systemInstruction?: string): Promise<NormalizedResponse> {
    const messages = [];
    if (systemInstruction) {
      messages.push({ role: "system", content: systemInstruction });
    }
    messages.push({ role: "user", content: prompt });

    const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.2
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || `NVIDIA API error: ${res.statusText}`);
    }

    return {
      text: data.choices[0]?.message?.content || "",
      model: model,
      provider: "NVIDIA",
      usage: data.usage ? {
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined
    };
  }
};

// 5. Groq Adapter
export const GroqAdapter: AIProviderAdapter = {
  providerName: "Groq",
  async discoverModels(apiKey: string): Promise<ModelMetadata[]> {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: {
        "Authorization": `Bearer ${apiKey}`
      }
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Groq API validation failed with status ${res.status}`);
    }
    const data = await res.json();
    const models = data.data || [];
    
    // Filter out audio or layout models
    const compatible = models.filter((m: any) => {
      const id = m.id.toLowerCase();
      return id.includes("llama") || id.includes("mixtral") || id.includes("gemma");
    });

    if (compatible.length === 0) {
      return [
        { id: "llama-3.3-70b-specdec", displayName: "Llama 3.3 70B SpecDec", capabilities: ["chat", "code", "analysis"] },
        { id: "llama-3.1-70b-versatile", displayName: "Llama 3.1 70B", capabilities: ["chat", "code", "analysis"] }
      ];
    }

    return compatible.map((m: any) => ({
      id: m.id,
      displayName: m.id,
      capabilities: ["chat", "code", "analysis"]
    }));
  },

  selectBestModel(models: ModelMetadata[]): string {
    const ids = models.map(m => m.id);
    const preferred = [
      "llama-3.3-70b-specdec",
      "llama-3.3-70b-versatile",
      "llama-3.1-70b-versatile",
      "llama3-70b-8192"
    ];

    for (const pref of preferred) {
      if (ids.includes(pref)) return pref;
    }

    // Try a fuzzy match
    const llama70 = ids.find(id => id.includes("70b"));
    if (llama70) return llama70;

    return ids[0] || "llama-3.3-70b-specdec";
  },

  async generateContent(apiKey: string, model: string, prompt: string, systemInstruction?: string): Promise<NormalizedResponse> {
    const messages = [];
    if (systemInstruction) {
      messages.push({ role: "system", content: systemInstruction });
    }
    messages.push({ role: "user", content: prompt });

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.2
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || `Groq API error: ${res.statusText}`);
    }

    return {
      text: data.choices[0]?.message?.content || "",
      model: model,
      provider: "Groq",
      usage: data.usage ? {
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined
    };
  }
};

// 6. xAI Adapter
export const xAIAdapter: AIProviderAdapter = {
  providerName: "xAI",
  async discoverModels(apiKey: string): Promise<ModelMetadata[]> {
    const res = await fetch("https://api.x.ai/v1/models", {
      headers: {
        "Authorization": `Bearer ${apiKey}`
      }
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || `xAI API validation failed with status ${res.status}`);
    }
    const data = await res.json();
    const models = data.data || [];
    
    const compatible = models.filter((m: any) => {
      const id = m.id.toLowerCase();
      return id.includes("grok") && !id.includes("vision");
    });

    if (compatible.length === 0) {
      return [
        { id: "grok-2-latest", displayName: "Grok 2", capabilities: ["chat", "code", "analysis"] },
        { id: "grok-beta", displayName: "Grok Beta", capabilities: ["chat", "code", "analysis"] }
      ];
    }

    return compatible.map((m: any) => ({
      id: m.id,
      displayName: m.id,
      capabilities: ["chat", "code", "analysis"]
    }));
  },

  selectBestModel(models: ModelMetadata[]): string {
    const ids = models.map(m => m.id);
    const preferred = [
      "grok-2-latest",
      "grok-2",
      "grok-beta"
    ];

    for (const pref of preferred) {
      if (ids.includes(pref)) return pref;
    }

    return ids[0] || "grok-2-latest";
  },

  async generateContent(apiKey: string, model: string, prompt: string, systemInstruction?: string): Promise<NormalizedResponse> {
    const messages = [];
    if (systemInstruction) {
      messages.push({ role: "system", content: systemInstruction });
    }
    messages.push({ role: "user", content: prompt });

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.2
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || `xAI API error: ${res.statusText}`);
    }

    return {
      text: data.choices[0]?.message?.content || "",
      model: model,
      provider: "xAI",
      usage: data.usage ? {
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined
    };
  }
};

// --- ADAPTER REGISTRY ---
const adapters: Record<string, AIProviderAdapter> = {
  gemini: GeminiAdapter,
  openai: OpenAIAdapter,
  anthropic: AnthropicAdapter,
  nvidia: NVIDIAAdapter,
  groq: GroqAdapter,
  xai: xAIAdapter,
  grok: xAIAdapter
};

export function getAdapter(provider: string): AIProviderAdapter | null {
  const clean = provider.trim().toLowerCase();
  return adapters[clean] || null;
}

// --- SHORT-LIVED SERVER SIDE MODEL CACHE ---
interface CacheEntry {
  models: ModelMetadata[];
  timestamp: number;
}

const modelCache = new Map<string, CacheEntry>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache TTL

export function getCachedModels(provider: string, keyHash: string): ModelMetadata[] | null {
  const cacheKey = `${provider.toLowerCase()}:${keyHash}`;
  const entry = modelCache.get(cacheKey);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.models;
  }
  return null;
}

export function setCachedModels(provider: string, keyHash: string, models: ModelMetadata[]): void {
  const cacheKey = `${provider.toLowerCase()}:${keyHash}`;
  modelCache.set(cacheKey, {
    models,
    timestamp: Date.now()
  });
}

export function invalidateModelCache(provider: string, keyHash: string): void {
  const cacheKey = `${provider.toLowerCase()}:${keyHash}`;
  modelCache.delete(cacheKey);
}
