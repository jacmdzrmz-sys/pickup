import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { finishSignIn } from '../finish';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const supabase = createClient();
  const dest = await finishSignIn(supabase, searchParams.get('next'), searchParams.get('ack') === '1');
  return NextResponse.redirect(`${origin}${dest}`);
}
