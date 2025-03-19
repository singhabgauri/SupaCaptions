import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 30; // Increase timeout for larger files

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
    
    console.log('Starting direct download for:', path);
    
    // Actually download the file directly instead of redirecting
    const { data, error } = await supabase.storage
      .from('videos')
      .download(path);
    
    if (error) {
      console.error('Error downloading file:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Extract filename from path
    const filename = path.split('/').pop() || 'supacaption-video.mp4';
    
    // Return the actual file with attachment disposition
    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store'
      },
    });
  } catch (error) {
    console.error('Direct download error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}