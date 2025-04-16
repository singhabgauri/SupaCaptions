import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Define free tier limits
const FREE_TIER_LIMIT = 5; // 5 videos per account

export async function GET(request) {
  try {
    // Extract user ID from the authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = authHeader.split('Bearer ')[1];
    
    if (!userId) {
      return NextResponse.json({ error: 'Invalid authorization' }, { status: 401 });
    }
    
    // Get completed jobs count for the user
    const { data: jobsData, error: jobsError } = await supabase
      .from('processing_jobs')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'completed');
    
    if (jobsError) {
      console.error('Error fetching user jobs:', jobsError);
      return NextResponse.json({ error: 'Error fetching usage data' }, { status: 500 });
    }
    
    const usedCount = jobsData?.length || 0;
    
    // Check if the user is on a paid plan
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_paid_user')
      .eq('id', userId)
      .single();
    
    if (userError && userError.code !== 'PGRST116') { // Not single row error
      console.error('Error fetching user data:', userError);
      // Continue with default values
    }
    
    const isPaidUser = userData?.is_paid_user || false;
    
    // Return usage information
    return NextResponse.json({
      usedCount,
      freeLimit: FREE_TIER_LIMIT,
      remaining: Math.max(0, FREE_TIER_LIMIT - usedCount),
      isPaidUser,
      percentUsed: Math.min(100, (usedCount / FREE_TIER_LIMIT) * 100)
    });
    
  } catch (error) {
    console.error('Error in usage endpoint:', error);
    return NextResponse.json({ error: 'Failed to get usage information' }, { status: 500 });
  }
}