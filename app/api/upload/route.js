import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service key for server operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY 
);

const GOOGLE_CLOUD_SERVICE_URL = process.env.GOOGLE_CLOUD_FFMPEG_SERVICE_URL;

export async function POST(request) {
  try {
    // 1. Initial validation and setup
    if (!GOOGLE_CLOUD_SERVICE_URL) {
      throw new Error('GOOGLE_CLOUD_FFMPEG_SERVICE_URL environment variable is not set');
    }
    
    const userId = request.headers.get('x-user-id') || 'anonymous';
    const formData = await request.formData();
    const video = formData.get('video');
    
    if (!video) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
    }
    
    // 2. Generate paths and upload original video
    const filename = `${Date.now()}-${video.name.replace(/\s+/g, '_')}`;
    const filePath = `${userId}/${filename}`;
    const processedPath = `${userId}/processed-${filename}`;
    
    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(filePath, video);
      
    if (uploadError) {
      return NextResponse.json({ error: `Upload error: ${uploadError.message}` }, { status: 500 });
    }
    
    // 3. Prepare caption configuration
    const captionConfig = {
      fontSize: formData.get('fontSize'),
      fontColor: formData.get('fontColor'),
      fontType: formData.get('fontType'),
      textCase: formData.get('textCase'),
      position: formData.get('position'),
      enableHighlight: formData.get('enableHighlight') === 'true',
      highlightColor: formData.get('highlightColor'),
      animation: formData.get('animation'),
      enableBorder: formData.get('enableBorder') === 'true',
      borderColor: formData.get('borderColor'),
      borderSize: formData.get('borderSize')
    };
    
    // 4. Get a URL for the uploaded video
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('videos')
      .createSignedUrl(filePath, 900);
    
    // Fall back to public URL if signed URL fails
    let videoUrl;
    if (signedUrlError || !signedUrlData?.signedURL) {
      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath);
      videoUrl = publicUrl;
    } else {
      videoUrl = signedUrlData.signedURL;
    }
    
    // 5. Send to Cloud Run for processing
    const payload = {
      videoUrl,
      supabase: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        key: process.env.SUPABASE_SERVICE_KEY,
        bucket: 'videos',
        inputPath: filePath,
        outputPath: processedPath
      },
      captions: captionConfig
    };
    
    const gcResponse = await fetch(GOOGLE_CLOUD_SERVICE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    // 6. Handle Cloud Run response
    if (!gcResponse.ok) {
      const errorText = await gcResponse.text();
      let errorMessage;
      
      try {
        errorMessage = JSON.parse(errorText);
        errorMessage = JSON.stringify(errorMessage);
      } catch {
        errorMessage = errorText;
      }
      
      return NextResponse.json(
        { error: `Video processing failed: ${errorMessage}` }, 
        { status: 500 }
      );
    }
    
    const gcData = await gcResponse.json();
    
    // 7. Get URLs for the processed video
    const { data: { publicUrl } } = supabase.storage
      .from('videos')
      .getPublicUrl(processedPath);
    
    // 8. Return final result
    return NextResponse.json({
      videoUrl: publicUrl,
      downloadUrl: `/api/download?path=${processedPath}`,
      processingDetails: gcData?.processingDetails || { captionsApplied: true }
    });
    
  } catch (error) {
    console.error('Error processing video:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process video' },
      { status: 500 }
    );
  }
}