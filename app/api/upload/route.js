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
      // Upload to Supabase Storage
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
      
      console.log("File uploaded successfully to Supabase Storage");
      
      // Get public URL
      const { data: publicUrlData } = supabase
        .storage
        .from('videos')
        .getPublicUrl(filePath);
      
      if (!publicUrlData || !publicUrlData.publicUrl) {
        console.error("Failed to get public URL");
        throw new Error("Failed to get public URL for uploaded file");
      }
      
      console.log(`Public URL generated: ${publicUrlData.publicUrl}`);
      
      // Store video in database
      console.log("Inserting video record into database");
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
        console.error("Database insert error (videos):", videoError);
        throw videoError;
      }
      
      console.log(`Video record created with ID: ${videoData.id}`);
      
      // Store caption preferences
      console.log("Inserting caption preferences");
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
        console.error("Database insert error (captions):", captionError);
        throw captionError;
      }
      
      console.log("Caption preferences stored successfully");
      
      return NextResponse.json({
        message: "Video uploaded successfully",
        videoUrl: publicUrlData.publicUrl,
        videoId: videoData.id
      });
    } catch (storageError) {
      console.error("Error in storage or database operations:", storageError);
      return NextResponse.json(
        { error: "Storage or database operation failed", details: storageError.message },
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