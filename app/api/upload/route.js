import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const GOOGLE_CLOUD_SERVICE_URL = process.env.GOOGLE_CLOUD_FFMPEG_SERVICE_URL;

console.log('Initializing with Cloud Run URL:', GOOGLE_CLOUD_SERVICE_URL);

export async function POST(request) {
  try {
    // Validate that Cloud Run URL is set
    if (!GOOGLE_CLOUD_SERVICE_URL) {
      throw new Error('GOOGLE_CLOUD_FFMPEG_SERVICE_URL environment variable is not set');
    }
    
    // Extract user ID from headers
    const userId = request.headers.get('x-user-id') || 'anonymous';
    console.log('Processing request for user:', userId);
    
    // Get form data
    const formData = await request.formData();
    const video = formData.get('video');
    
    if (!video) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
    }
    
    console.log('Video file received:', video.name, video.size);
    
    // Generate a unique filename
    const filename = `${Date.now()}-${video.name.replace(/\s+/g, '_')}`;
    const filePath = `${userId}/${filename}`;
    
    // Upload to Supabase storage
    console.log('Uploading to Supabase path:', filePath);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('videos')
      .upload(filePath, video);
      
    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return NextResponse.json({ error: `Upload error: ${uploadError.message}` }, { status: 500 });
    }
    
    console.log('Upload successful:', uploadData);
    
    // Get caption configuration from form data
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
    
    console.log('Caption config:', captionConfig);
    
    // Define the output path for the processed video
    const processedPath = `${userId}/processed-${filename}`;
    console.log('Defined output path:', processedPath); // Add this log
    
    // After uploading the file, try using the direct URL instead of a signed URL if signing fails
    try {
      // Try to get a signed URL first
      console.log('Creating signed URL for:', filePath);
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('videos')
        .createSignedUrl(filePath, 900); // 15 minutes expiry
      
      let videoUrl;
      
      if (signedUrlError || !signedUrlData || !signedUrlData.signedURL) {
        console.warn('Could not get signed URL, falling back to public URL:', signedUrlError);
        
        // Fallback to public URL
        const { data: { publicUrl } } = supabase.storage
          .from('videos')
          .getPublicUrl(filePath);
          
        console.log('Using public URL instead:', publicUrl);
        videoUrl = publicUrl;
        
        // Check if your bucket allows public access - if not, we might have issues
        console.log('⚠️ Warning: Using public URL. Make sure your Supabase bucket allows public access!');
      } else {
        videoUrl = signedUrlData.signedURL;
        console.log('Received signed URL:', videoUrl.substring(0, 50) + '...');
      }
      
      // Now use videoUrl in your payload
      const payload = {
        videoUrl: videoUrl,
        supabase: {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL,
          key: process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          bucket: 'videos',
          inputPath: filePath,
          outputPath: processedPath // Make sure this is not null
        },
        captions: captionConfig
      };
      
      console.log('Sending payload:', JSON.stringify(payload)); // Add this log
      
      // Call the Google Cloud Service for FFmpeg processing
      console.log('Sending request to Cloud Run service:', GOOGLE_CLOUD_SERVICE_URL);
      
      const gcResponse = await fetch(GOOGLE_CLOUD_SERVICE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      // Handle Google Cloud Service response
      if (!gcResponse.ok) {
        const gcErrorText = await gcResponse.text();
        let gcError;
        
        try {
          gcError = JSON.parse(gcErrorText);
          console.error('Google Cloud processing error:', gcError);
        } catch (e) {
          gcError = gcErrorText;
          console.error('Google Cloud processing error (text):', gcErrorText);
        }
        
        return NextResponse.json(
          { error: `Video processing failed: ${typeof gcError === 'object' ? JSON.stringify(gcError) : gcError}` }, 
          { status: 500 }
        );
      }
      
      const gcData = await gcResponse.json();
      console.log('Cloud Run response:', gcData);
      
      // Get the public URL for the processed video
      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(processedPath);
      
      console.log('Public URL:', publicUrl);
      
      // Create a signed URL for download with proper content disposition
      const { data: signedUrlDownloadData, error: signedUrlDownloadError } = await supabase.storage
        .from('videos')
        .createSignedUrl(processedPath, 3600, { 
          download: true,
          transform: {
            disposition: 'attachment' // This is crucial for downloads
          }
        });
      
      if (signedUrlDownloadError) {
        console.error('Error creating download URL:', signedUrlDownloadError);
        return NextResponse.json(
          { error: `Video processed but could not create download URL: ${signedUrlDownloadError.message}` },
          { status: 207 } // Partial success
        );
      }
      
      const downloadUrl = signedUrlDownloadData.signedURL;
      
      // Return the URLs for the frontend
      return NextResponse.json({
        videoUrl: publicUrl,
        downloadUrl: `/api/download?path=${processedPath}`, // Use the API endpoint for reliable downloads
        processingDetails: gcData?.processingDetails || { captionsApplied: true }
      });
      
    } catch (signedUrlException) {
      console.error('Critical error handling signed URL:', signedUrlException);
      return NextResponse.json({ error: `Failed to prepare video URL: ${signedUrlException.message}` }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Error processing video:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process video' },
      { status: 500 }
    );
  }
}