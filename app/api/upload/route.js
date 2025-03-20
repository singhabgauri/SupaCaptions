import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service key for server operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY 
);

const GOOGLE_CLOUD_SERVICE_URL = process.env.GOOGLE_CLOUD_FFMPEG_SERVICE_URL;

export const maxDuration = 60; // Increase timeout for the endpoint

export async function POST(request) {
  try {
    console.log('Starting upload process...');
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
    
    // Create a unique job ID for tracking
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    console.log(`Generated job ID: ${jobId}`);
    
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
    
    // Store job metadata in Supabase
    const { error: metadataError } = await supabase
      .from('processing_jobs')
      .insert([
        { 
          id: jobId,
          user_id: userId,
          status: 'uploading',
          input_path: filePath,
          output_path: processedPath,
          caption_config: captionConfig
        }
      ]);
      
    if (metadataError) {
      console.error('Failed to create job record:', metadataError);
      // Continue anyway, not critical
    }
    
    // Upload the video
    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(filePath, video);
      
    if (uploadError) {
      // Update job status
      await supabase
        .from('processing_jobs')
        .update({ status: 'failed', error_message: uploadError.message })
        .eq('id', jobId);
        
      return NextResponse.json({ error: `Upload error: ${uploadError.message}` }, { status: 500 });
    }
    
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
      let errorMessage = errorText;
      
      console.error(`Cloud Run error response (${gcResponse.status}):`, errorText);
      
      // Try to parse as JSON only if it looks like JSON
      if (errorText.trim().startsWith('{') || errorText.trim().startsWith('[')) {
        try {
          const errorObj = JSON.parse(errorText);
          errorMessage = errorObj.error || errorObj.details || JSON.stringify(errorObj);
        } catch (jsonError) {
          console.error('Error parsing Cloud Run error response as JSON:', jsonError);
          // Keep the original text as errorMessage
        }
      }
      
      // Update job status
      await supabase
        .from('processing_jobs')
        .update({ status: 'failed', error_message: errorMessage })
        .eq('id', jobId);
      
      return NextResponse.json(
        { error: `Video processing failed: ${errorMessage}` }, 
        { status: 500 }
      );
    }
    
    // For parsing success responses too
    let gcData = {};
    try {
      const responseText = await gcResponse.text();
      
      if (responseText.trim()) {
        try {
          gcData = JSON.parse(responseText);
        } catch (jsonError) {
          console.error('Error parsing Cloud Run success response as JSON:', jsonError);
          console.log('Raw response:', responseText);
        }
      }
    } catch (readError) {
      console.error('Error reading Cloud Run response:', readError);
    }
    
    // 7. Get URLs for the processed video
    const { data: { publicUrl } } = supabase.storage
      .from('videos')
      .getPublicUrl(processedPath);
    
    // Update job status
    await supabase
      .from('processing_jobs')
      .update({ status: 'completed' })
      .eq('id', jobId);
    
    // 8. Return final result
    console.log(`Returning response with job ID: ${jobId}`);
    return NextResponse.json({
      jobId, // Add this to match what the frontend expects
      status: 'completed',
      videoUrl: publicUrl, // For viewing
      downloadUrl: `/api/direct-download?path=${encodeURIComponent(processedPath)}`, // For downloading
      downloadPath: processedPath,
      processingDetails: gcData?.processingDetails || {}
    });
    
  } catch (error) {
    console.error('Error processing video:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process video' },
      { status: 500 }
    );
  }
}