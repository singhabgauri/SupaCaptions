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

      // Generate a signed URL with 7-day expiration (adjust as needed)
      console.log("Generating signed URL for secure access");
      const { data: signedUrlData, error: signedUrlError } = await supabase
        .storage
        .from('videos')
        .createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7 days in seconds

      // Also get the public URL as fallback and for database storage
      const { data: publicUrlData } = supabase
        .storage
        .from('videos')
        .getPublicUrl(filePath);

      // Log both URLs for debugging
      console.log("Public URL:", publicUrlData.publicUrl);

      let finalVideoUrl;
      let viewUrl;

      if (signedUrlError) {
        console.error("Failed to generate signed URL:", signedUrlError);
        // Fall back to public URL
        finalVideoUrl = `${publicUrlData.publicUrl}?download=true`;
        viewUrl = publicUrlData.publicUrl;
      } else {
        // Use the signed URL which includes authentication
        finalVideoUrl = signedUrlData.signedUrl;
        
        // Create a view URL (without download parameter)
        // We need to check if the signed URL already has query parameters
        viewUrl = finalVideoUrl.includes('?') 
          ? finalVideoUrl.replace(/(\?|&)download=true/, '') 
          : finalVideoUrl;
          
        console.log("Generated signed URL with 7-day expiry");
      }

      // Create an API download URL as fallback
      const apiDownloadUrl = `/api/download?userId=${encodeURIComponent(userId)}&filename=${encodeURIComponent(filename)}`;

      // Proceed with database operations
      try {
        // Insert into videos table
        console.log("Inserting into videos table with user_id:", userId);
        const { data: videoData, error: videoError } = await supabase
          .from('videos')
          .insert({
            title: file.name,
            video_url: publicUrlData.publicUrl, // Store the permanent public URL in database
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
              videoUrl: finalVideoUrl,  // Use the finalVideoUrl with download param
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
            videoUrl: viewUrl,
            downloadUrl: finalVideoUrl,
            apiDownloadUrl: apiDownloadUrl,
            videoId: videoData.id,
            error: captionError.message
          }, { status: 207 });
        }

        // Return complete success
        return NextResponse.json({
          message: "Video uploaded successfully",
          videoUrl: viewUrl,             // URL for viewing (without download parameter)
          downloadUrl: finalVideoUrl,    // Signed URL with download parameter
          apiDownloadUrl: apiDownloadUrl, // Fallback API download URL
          videoId: videoData?.id || 'unknown'
        });

      } catch (dbError) {
        console.error("Database operation error:", dbError);

        // Still return a partial success since the video was uploaded
        return NextResponse.json({
          message: "Video uploaded to storage but database operation failed",
          videoUrl: viewUrl,
          downloadUrl: finalVideoUrl,
          apiDownloadUrl: apiDownloadUrl,
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