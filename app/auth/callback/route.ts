import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { saveStoredGitHubToken } from '@/lib/services/github';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/projects?new=true';

  if (code) {
    const supabase = await createClient();
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && session) {
      if (session.provider_token) {
        try {
          await saveStoredGitHubToken(session.user.id, session.provider_token, supabase, session.user.email);
        } catch (err) {
          console.error("Error saving GitHub token in auth callback:", err);
        }
      }

      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Could not authenticate user`);
}
