import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    
    // Try to download the file
    const { data, error } = await supabase.storage
      .from('videos')
      .download(path);
    
    if (error) {
      console.error('Supabase download error:', error);
      return NextResponse.json({ 
        error: 'Failed to download file',
        details: error.message 
      }, { status: 500 });
    }
    
    if (!data) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    
    // Extract filename from path
    const filename = path.split('/').pop() || 'download.mp4';
    
    // Return the file with proper headers
    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff'
      },
    });
  } catch (error) {
    console.error('Download API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}