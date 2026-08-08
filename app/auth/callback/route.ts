import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && session) {
      // Sync github connection if token exists
      if (session.provider_token && session.user.app_metadata.provider === 'github') {
        try {
          // Get GitHub provider ID
          const { data: providerData } = await supabase
            .from('providers')
            .select('id')
            .eq('name', 'GitHub')
            .single();
            
          if (providerData) {
            await supabase.from('api_keys').upsert({
              user_id: session.user.id,
              provider_id: providerData.id,
              encrypted_key: session.provider_token,
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id, provider_id' });
          }
        } catch (err) {
          console.error("Error saving github token:", err);
        }
      }

      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Could not authenticate user`)
}
