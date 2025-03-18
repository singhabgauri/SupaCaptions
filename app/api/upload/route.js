import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Initialize Supabase client with error handling
export async function POST(req) {
  try {
    console.log("Upload request received");
    
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase credentials");
      return NextResponse.json(
        { error: "Server configuration error - missing credentials" },
        { status: 500 }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log("Supabase client initialized");

    // Get form data
    const formData = await req.formData();
    const file = formData.get("video");
    
    if (!file) {
      console.error("No file uploaded");
      return NextResponse.json(
        { error: "No video file uploaded" }, 
        { status: 400 }
      );
    }
    
    console.log(`File received: ${file.name}, size: ${file.size} bytes`);
    
    // Get user ID
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      console.error("No user ID provided");
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    
    // Store video settings
    const enableHighlight = formData.get("enableHighlight") === "true";
    const highlightColor = formData.get("highlightColor") || "#00FF00";
    const fontColor = formData.get("fontColor") || "#FFFFFF";
    const enableBorder = formData.get("enableBorder") === "true";
    const borderColor = formData.get("borderColor") || "#000000";
    const borderSize = parseInt(formData.get("borderSize") || "2", 10);
    const animation = formData.get("animation") || "";
    const textCase = formData.get("textCase") || "normal";
    const position = formData.get("position") || "bottom";
    const fontSize = formData.get("fontSize") || "24";
    const fontType = formData.get("fontType") || "Arial";
    
    console.log("Processing form data completed");
    
    // Generate unique filename
    const filename = `${uuidv4()}.mp4`;
    const filePath = `${userId}/${filename}`;
    
    console.log(`Uploading to path: ${filePath}`);
    
    // Upload video to Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    console.log(`File buffer created: ${fileBuffer.byteLength} bytes`);
    
    try {
      // Upload to Supabase Storage - this part works
      const { data, error } = await supabase
        .storage
        .from('videos')
        .upload(filePath, Buffer.from(fileBuffer), {
          contentType: 'video/mp4',
          cacheControl: '3600'
        });
        
      if (error) {
        console.error("Storage upload error:", error);
        throw error;
      }
      
      // Get public URL - this part also works
      const { data: publicUrlData } = supabase
        .storage
        .from('videos')
        .getPublicUrl(filePath);

      // Log the URL for debugging
      console.log("Generated public URL:", publicUrlData.publicUrl);

      // Fix - Use S3 endpoint format
      // Convert standard URL to S3 URL format
      let videoUrl = publicUrlData.publicUrl;

      // Check if URL doesn't already use S3 format
      if (!videoUrl.includes('/storage/v1/s3/')) {
        // Construct the URL with s3 path
        videoUrl = `${supabaseUrl}/storage/v1/s3/object/public/videos/${filePath}`;
        console.log("Fixed URL with S3 path:", videoUrl);
        // Store the corrected URL back
        publicUrlData.publicUrl = videoUrl;
      }

      console.log("Final URL to be used:", publicUrlData.publicUrl);
      console.log("Storage steps completed successfully");
      
      try {
        // Insert into videos table - this might be failing
        console.log("Inserting into videos table with user_id:", userId);
        const { data: videoData, error: videoError } = await supabase
          .from('videos')
          .insert({
            title: file.name,
            video_url: publicUrlData.publicUrl,
            user_id: userId,
            status: 'uploaded'
          })
          .select()
          .single();
          
        if (videoError) {
          console.error("Database error on video insert:", videoError);
          
          // Check if it's a constraint violation
          if (videoError.code === '23503' || videoError.code === '23505') {
            console.log("Constraint violation detected, using workaround...");
            
            // Try a simpler insert without returning data
            const { error: simpleInsertError } = await supabase
              .from('videos')
              .insert({
                title: file.name,
                video_url: publicUrlData.publicUrl,
                user_id: userId.toString(), // Convert to string explicitly
                status: 'uploaded'
              });
              
            if (simpleInsertError) {
              console.error("Simplified insert also failed:", simpleInsertError);
              throw simpleInsertError;
            }
            
            // Return partial success with just the URL
            return NextResponse.json({
              message: "Video uploaded but metadata could not be saved",
              videoUrl: publicUrlData.publicUrl,
              status: 'uploaded'
            }, { status: 207 });
          }
          
          throw videoError;
        }

        // If we got here, video insert succeeded
        console.log("Video inserted with ID:", videoData.id);
        
        // Now insert into captions table
        console.log("Inserting into captions table");
        const { error: captionError } = await supabase
          .from('captions')
          .insert({
            video_id: videoData.id,
            font_type: fontType,
            font_size: parseInt(fontSize),
            font_color: fontColor,
            text_case: textCase,
            position: position,
            enable_highlight: enableHighlight,
            highlight_color: highlightColor,
            animation: animation,
            enable_border: enableBorder,
            border_color: borderColor,
            border_size: borderSize
          });
          
        if (captionError) {
          console.error("Captions insert error:", captionError);
          
          // If captions insert fails, still return success with video info
          return NextResponse.json({
            message: "Video uploaded but caption preferences not saved",
            videoUrl: publicUrlData.publicUrl,
            videoId: videoData.id,
            error: captionError.message
          });
        }
        
        // Everything succeeded
        return NextResponse.json({
          message: "Video uploaded successfully",
          videoUrl: publicUrlData.publicUrl,
          videoId: videoData.id
        });
        
      } catch (dbError) {
        console.error("Database operation error:", dbError);
        
        // Still return a partial success since the video was uploaded
        return NextResponse.json({
          message: "Video uploaded to storage but database operation failed",
          videoUrl: publicUrlData.publicUrl,
          error: dbError.message
        }, { status: 207 }); // 207 Multi-Status
      }
      
    } catch (error) {
      console.error("Error in upload handler:", error);
      return NextResponse.json(
        { error: "Upload failed", details: error.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Unhandled error in upload handler:", error);
    return NextResponse.json(
      { error: "Upload failed", details: error.message },
      { status: 500 }
    );
  }
}