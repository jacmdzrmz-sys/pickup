import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { finishSignIn } from '../finish';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const supabase = createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(`${origin}/auth/login?error=link`);
  } else {
    // Email links that carry a token hash instead of a code
    const tokenHash = searchParams.get('token_hash');
    const type = searchParams.get('type');
    if (!tokenHash || !type) return NextResponse.redirect(`${origin}/auth/login?error=link`);
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as 'magiclink' | 'signup' | 'email',
    });
    if (error) return NextResponse.redirect(`${origin}/auth/login?error=link`);
  }

  const dest = await finishSignIn(supabase, searchParams.get('next'), searchParams.get('ack') === '1');
  return NextResponse.redirect(`${origin}${dest}`);
}
