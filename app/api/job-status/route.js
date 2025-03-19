import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function GET(request) {
  try {
    // Extract job ID from URL and validate
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    
    if (!jobId) {
      return NextResponse.json({ error: 'Missing job ID' }, { status: 400 });
    }
    
    // Get job status from Supabase with error handling
    let { data: job, error } = await supabase
      .from('processing_jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    
    if (error) {
      // Handle different Supabase error types
      const errorMessage = error.message || 'Database error';
      const statusCode = error.code === 'PGRST116' ? 404 : 500;
      
      return NextResponse.json({ 
        error: `Failed to retrieve job status: ${errorMessage}` 
      }, { status: statusCode });
    }
    
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    
    // Build response based on job status
    let response = { status: job.status };
    
    if (job.status === 'completed') {
      // Get public URL for viewing
      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(job.output_path);
      
      response = {
        ...response,
        // URL for viewing in browser
        videoUrl: publicUrl,
        
        // URL for downloading - this goes through our API that forces download
        downloadUrl: `/api/direct-download?path=${encodeURIComponent(job.output_path)}`,
        
        // Raw path for any other operations
        downloadPath: job.output_path,
        processingDetails: job.processing_details || {}
      };
    } else if (job.status === 'failed') {
      // For failed jobs, include error message
      response.error = job.error_message || 'Unknown processing error';
    }
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Unexpected error in job status API:', error);
    
    // Return a stable error response
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}