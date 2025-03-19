import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60; // Set max duration to 60 seconds

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function GET(request) {
  try {
    // Extract path from URL and validate
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    
    if (!path) {
      return NextResponse.json({ error: 'File path is required' }, { status: 400 });
    }
    
    console.log('Downloading file from path:', path);
    
    // Instead of downloading the whole file, get a signed URL
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('videos')
      .createSignedUrl(path, 3600); // 1 hour expiry
    
    if (signedUrlError || !signedUrlData || !signedUrlData.signedURL) {
      console.error('Signed URL error:', signedUrlError);
      
      // Fall back to public URL
      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(path);
      
      // Redirect to the public URL instead
      return NextResponse.redirect(publicUrl);
    }
    
    // If we have a signed URL, redirect to it
    const filename = path.split('/').pop() || 'download.mp4';
    const signedUrl = signedUrlData.signedURL;
    
    // Redirect to the signed URL which will stream the file directly
    return NextResponse.redirect(signedUrl);
  } catch (error) {
    console.error('Download API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}