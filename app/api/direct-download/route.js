import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    
    if (!url) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    }
    
    console.log('Proxying download for:', url);
    
    // Fetch the video
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    
    // Get filename from URL
    const filename = url.split('/').pop() || 'download.mp4';
    
    // Return the file with download headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
        'Content-Length': buffer.byteLength.toString()
      },
    });
  } catch (error) {
    console.error('Download proxy error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}