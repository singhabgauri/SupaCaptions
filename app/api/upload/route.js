import { NextResponse } from "next/server";
import fs from "fs-extra";
import path from "path";
import { exec } from "child_process";
import OpenAI from "openai";
import dotenv from "dotenv";
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const uploadDir = path.join(process.cwd(), "public/uploads");
fs.ensureDirSync(uploadDir);

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function for executing shell commands
const execPromise = (command, options = {}) => {
  return new Promise((resolve, reject) => {
    exec(command, { maxBuffer: 1024 * 1024 * 10, ...options }, (err, stdout, stderr) => {
      if (err) {
        console.error(`Error executing command: ${command}`);
        console.error('stderr:', stderr);
        reject(err);
      } else {
        resolve(stdout);
      }
    });
  });
};

// Helper function to generate file paths
const generatePaths = (originalFileName) => {
  const timestamp = Date.now();
  return {
    video: path.join(uploadDir, `video_${timestamp}${path.extname(originalFileName)}`),
    audio: path.join(uploadDir, `audio_${timestamp}.mp3`),
    subtitle: path.join(uploadDir, `subtitles_${timestamp}.srt`),
    output: path.join(uploadDir, `final_${timestamp}.mp4`)
  };
};

// Update the escapePath function
const escapePath = (filePath) => {
  // Convert to forward slashes and escape spaces
  return filePath.replace(/\\/g, '/').replace(/ /g, '\\ ');
};

// Updated helper function to convert regular hex ("#RRGGBB") to ASS hex in AABBGGRR format.
// If your renderer expects &H00RRGGBB, revert this change.
const convertHexToAss = (hex) => {
  // Extract red, green, and blue components
  const r = hex.substring(1, 3);
  const g = hex.substring(3, 5);
  const b = hex.substring(5, 7);
  // For ASS, many renderers expect color as &H00BBGGRR (opaque alpha "00").
  return `&H00${b}${g}${r}`.toUpperCase();
};

// Helper function to convert a time string (HH:MM:SS.mmm) to centiseconds.
const timeToCentiseconds = (timeStr) => {
  const [hours, minutes, seconds] = timeStr.split(':');
  return Math.floor((parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds)) * 100);
};

// New helper: convert SRT to ASS with per-word animation (karaoke-style)
// When animation=="scale", each word will instantly scale and be highlighted in the chosen color.
const convertSrtToAss = (srtContent, fontType, fontSize, fontColor, enableHighlight, highlightColor, animation, textCase, position, enableBorder, borderColor, borderSize) => {
  const assFontColor = convertHexToAss(fontColor);
  const assHighlightColor = convertHexToAss(highlightColor);
  const assBorderColor = convertHexToAss(borderColor);
  const alignment = getPositionAlignment(position);

  let assHeader = `[Script Info]
ScriptType: v4.00+
Collisions: Normal
PlayResX: 1280
PlayResY: 720
Timer: 100.0000

[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: Default,${fontType},${fontSize},${assFontColor},${assFontColor},${assBorderColor},&H64000000,0,0,0,0,100,100,0,0,1,${enableBorder ? borderSize : 0},0,${alignment},10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  let assEvents = "";

  const csToAssTime = (cs) => {
    const totalSeconds = cs / 100;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = (totalSeconds % 60).toFixed(2).padStart(5, '0');
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds}`;
  };

  const timeToCentiseconds = (timeStr) => {
    const [hours, minutes, seconds] = timeStr.split(':');
    return Math.floor((parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds)) * 100);
  };

  const lines = srtContent.split('\n');
  let i = 0;

  while (i < lines.length) {
    if (lines[i].match(/^\d+$/)) {
      i++;
      if (i >= lines.length) break;

      const timeLine = lines[i++].replace(/,/g, '.');
      const [start, end] = timeLine.split(/\s*-->\s*/);
      let text = "";
      while (i < lines.length && lines[i].trim() !== "") {
        text += lines[i++] + " ";
      }
      text = text.trim();

      // Apply text case transformation
      if (textCase === 'uppercase') {
        text = text.toUpperCase();
      }

      const startCS = timeToCentiseconds(start);
      const endCS = timeToCentiseconds(end);
      const totalCS = Math.max(endCS - startCS, 1);

      // Split into words and process in chunks of 5
      const words = text.split(' ').filter(Boolean);
      const chunks = [];
      for (let j = 0; j < words.length; j += 5) {
        chunks.push(words.slice(j, j + 5));
      }

      // Calculate duration for each chunk
      const chunkDuration = Math.floor(totalCS / chunks.length);

      chunks.forEach((chunk, chunkIndex) => {
        const chunkStartCS = startCS + chunkIndex * chunkDuration;
        const chunkEndCS = chunkStartCS + chunkDuration;
        const dialogueStart = csToAssTime(chunkStartCS);
        const dialogueEnd = csToAssTime(chunkEndCS);

        if (enableHighlight) {
          // Process each word in the chunk with highlighting
          const wordDuration = Math.floor(chunkDuration / chunk.length);
          chunk.forEach((word, idx) => {
            const wordStartCS = chunkStartCS + idx * wordDuration;
            const wordEndCS = wordStartCS + wordDuration;
            const wordStart = csToAssTime(wordStartCS);
            const wordEnd = csToAssTime(wordEndCS);

            const formattedText = chunk.map((w, j) => {
              if (j === idx) {
                return animation === "scale"
                  ? `{\\fscx120\\fscy120\\c${assHighlightColor}}${w}{\\fscx100\\fscy100\\c${assFontColor}}`
                  : `{\\c${assHighlightColor}}${w}{\\c${assFontColor}}`;
              }
              return w;
            }).join(' ');

            assEvents += `Dialogue: 0,${wordStart},${wordEnd},Default,,0,0,0,,{\\c${assFontColor}}${formattedText}\n`;
          });
        } else {
          // No highlighting, show whole chunk at once
          const chunkText = chunk.join(' ');
          assEvents += `Dialogue: 0,${dialogueStart},${dialogueEnd},Default,,0,0,0,,{\\c${assFontColor}}${chunkText}\n`;
        }
      });
    } else {
      i++;
    }
  }

  return assHeader + assEvents;
};

// Add this helper function after the other helper functions
const getPositionAlignment = (position) => {
  switch(position) {
    case 'top': return '8';    // Top-center alignment
    case 'middle': return '5'; // Middle-center alignment
    case 'bottom': return '2'; // Bottom-center alignment (default)
    default: return '2';
  }
};

export async function POST(req) {
  try {
    // Get form data
    const formData = await req.formData();
    const file = formData.get("video");
    
    if (!file) {
      return NextResponse.json(
        { error: "No video file uploaded" }, 
        { status: 400 }
      );
    }
    
    // Get user ID
    const userId = req.headers.get("x-user-id");
    if (!userId) {
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
    
    // Generate unique filename
    const filename = `${uuidv4()}${path.extname(file.name)}`;
    const filePath = `${userId}/${filename}`;
    
    // Upload video to Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const { data, error } = await supabase
      .storage
      .from('videos')
      .upload(filePath, Buffer.from(fileBuffer), {
        contentType: 'video/mp4',
        cacheControl: '3600'
      });
      
    if (error) throw error;
    
    // Get public URL
    const { data: publicUrlData } = supabase
      .storage
      .from('videos')
      .getPublicUrl(filePath);
    
    // Store video in database
    const { data: videoData, error: videoError } = await supabase
      .from('videos')
      .insert({
        title: file.name,
        video_url: publicUrlData.publicUrl,
        user_id: userId,
        status: 'uploaded' // Will be processed separately
      })
      .select()
      .single();
      
    if (videoError) throw videoError;
    
    // Store caption preferences
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
      
    if (captionError) throw captionError;
    
    return NextResponse.json({
      message: "Video uploaded successfully",
      videoUrl: publicUrlData.publicUrl,
      videoId: videoData.id
    });
    
  } catch (error) {
    console.error("Error uploading video:", error);
    return NextResponse.json(
      { error: "Upload failed", details: error.message },
      { status: 500 }
    );
  }
}