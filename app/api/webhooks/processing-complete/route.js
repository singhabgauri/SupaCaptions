import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY 
);

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    
    if (!jobId) {
      return NextResponse.json({ error: 'Missing job ID' }, { status: 400 });
    }
    
    const data = await request.json();
    const { success, error, processingDetails } = data;
    
    if (success) {
      await supabase
        .from('processing_jobs')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
          processing_details: processingDetails
        })
        .eq('id', jobId);
    } else {
      await supabase
        .from('processing_jobs')
        .update({ 
          status: 'failed',
          error_message: error || 'Unknown error',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in processing webhook:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}