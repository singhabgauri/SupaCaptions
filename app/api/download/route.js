import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function GET(request) {
  try {
    // Get the path from the query parameters
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    
    if (!path) {
      return NextResponse.json({ error: 'No file path provided' }, { status: 400 });
    }
    
    // Download the file directly
    const { data, error } = await supabase.storage
      .from('videos')
      .download(path);
    
    if (error) {
      return NextResponse.json({ error: 'Failed to download file' }, { status: 500 });
    }
    
    // Extract filename from path
    const filename = path.split('/').pop() || 'download.mp4';
    
    // Return the file with proper headers for download
    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}