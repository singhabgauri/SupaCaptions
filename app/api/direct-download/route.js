import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 10;

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
    
    // Get the signed URL with download disposition
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('videos')
      .createSignedUrl(path, 3600, {
        download: true,  // This sets Content-Disposition: attachment
      });
    
    if (signedUrlError || !signedUrlData?.signedURL) {
      // Fall back to public URL
      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(path);
        
      return NextResponse.redirect(publicUrl);
    }
    
    // Redirect to the signed URL with download disposition
    return NextResponse.redirect(signedUrlData.signedURL);
  } catch (error) {
    console.error('Direct download error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}