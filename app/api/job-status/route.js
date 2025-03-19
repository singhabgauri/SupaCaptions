import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function GET(request) {
  try {
    // Extract job ID from URL
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    
    if (!jobId) {
      console.error('Missing job ID in status check request');
      return NextResponse.json({ error: 'Missing job ID' }, { status: 400 });
    }
    
    console.log(`Checking status for job: ${jobId}`);
    
    // Get job status from Supabase
    const { data: job, error } = await supabase
      .from('processing_jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    
    if (error) {
      console.error(`Error fetching job ${jobId}:`, error);
      return NextResponse.json({ error: 'Failed to retrieve job status' }, { status: 500 });
    }
    
    if (!job) {
      console.error(`Job not found: ${jobId}`);
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    
    // If job is completed, include video URLs
    if (job.status === 'completed') {
      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(job.output_path);
      
      return NextResponse.json({
        status: job.status,
        videoUrl: publicUrl,
        downloadUrl: `/api/download?path=${job.output_path}`,
        processingDetails: job.processing_details || {}
      });
    } else if (job.status === 'failed') {
      // If job failed, include error message
      return NextResponse.json({
        status: job.status,
        error: job.error_message || 'Unknown error'
      });
    }
    
    // For other statuses, return the status
    return NextResponse.json({
      status: job.status
    });
  } catch (error) {
    console.error('Error in job status API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}