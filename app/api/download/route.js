import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const filename = searchParams.get('filename');
    
    if (!userId || !filename) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }
    
    const filePath = `${userId}/${filename}`;
    console.log("API download requested for:", filePath);
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Download the file from storage
    const { data, error } = await supabase
      .storage
      .from('videos')
      .download(filePath);
      
    if (error) {
      console.error("Storage download error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Return the file as a downloadable attachment
    return new NextResponse(data, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'max-age=3600'
      }
    });
  } catch (error) {
    console.error("Download API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}