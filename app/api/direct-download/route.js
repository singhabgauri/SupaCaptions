import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 10; // This endpoint should be fast

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    
    if (!path) {
      return NextResponse.json({ error: 'File path is required' }, { status: 400 });
    }
    
    // Get the public URL - this is very fast
    const { data: { publicUrl } } = supabase.storage
      .from('videos')
      .getPublicUrl(path);
    
    // Redirect to the public URL
    return NextResponse.redirect(publicUrl);
  } catch (error) {
    console.error('Direct download error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}