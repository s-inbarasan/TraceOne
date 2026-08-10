import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdapter } from "@/lib/services/ai-adapters";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let { data: providers, error: provErr } = await supabase.from('providers').select('*');
    if (provErr) throw provErr;

    // Self-healing: ensure 'Gemini', 'OpenAI', 'Anthropic', 'NVIDIA', 'Groq', 'xAI' exist in the DB
    const defaultProviders = ['Gemini', 'OpenAI', 'Anthropic', 'NVIDIA', 'Groq', 'xAI'];
    let needsRefetch = false;
    for (const pName of defaultProviders) {
      const exists = providers?.some(p => p.name.toLowerCase() === pName.toLowerCase());
      if (!exists) {
        await supabase.from('providers').insert({ name: pName });
        needsRefetch = true;
      }
    }
    if (needsRefetch) {
      const { data: refetched, error: refetchErr } = await supabase.from('providers').select('*');
      if (!refetchErr && refetched) {
        providers = refetched;
      }
    }

    const { data: keys, error: keysErr } = await supabase
      .from('api_keys')
      .select('id, provider_id, updated_at, encrypted_key')
      .eq('user_id', user.id);
    
    if (keysErr) throw keysErr;

    return NextResponse.json({
      success: true,
      providers,
      keys: keys.map(k => ({
         id: k.id,
         provider_id: k.provider_id,
         updated_at: k.updated_at,
         encrypted_key: k.encrypted_key ? "••••••••" + k.encrypted_key.slice(-4) : "",
         is_configured: true
      }))
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { provider_id, api_key } = await req.json();

    if (!provider_id || !api_key) {
      return NextResponse.json({ error: "Provider and API Key are required" }, { status: 400 });
    }

    if (api_key.startsWith("••••••••")) {
      return NextResponse.json({ success: true, message: "No change to key" });
    }

    // 1. Fetch provider name
    const { data: providerRow, error: provErr } = await supabase
      .from('providers')
      .select('name')
      .eq('id', provider_id)
      .single();

    if (provErr || !providerRow) {
      return NextResponse.json({ error: "Invalid provider selected" }, { status: 400 });
    }

    // 2. Validate Key by checking model discovery
    const adapter = getAdapter(providerRow.name);
    if (!adapter) {
      return NextResponse.json({ error: `Provider adapter for ${providerRow.name} is not implemented` }, { status: 400 });
    }

    try {
      await adapter.discoverModels(api_key);
    } catch (validationErr: any) {
      console.error(`Validation failed for ${providerRow.name}:`, validationErr);
      return NextResponse.json({ 
        success: false, 
        error: `Key validation failed for ${providerRow.name}: ${validationErr.message || "Invalid API key"}` 
      }, { status: 400 });
    }

    const { error } = await supabase.from('api_keys').upsert({
      user_id: user.id,
      provider_id,
      encrypted_key: api_key,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id, provider_id' });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const provider_id = searchParams.get('provider_id');
    
    if (!provider_id) return NextResponse.json({ error: "provider_id is required" }, { status: 400 });

    const { error } = await supabase.from('api_keys').delete().eq('user_id', user.id).eq('provider_id', provider_id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch(error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
