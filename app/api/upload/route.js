import { NextResponse } from "next/server";
import fs from "fs-extra";
import path from "path";
import { exec } from "child_process";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const uploadDir = path.join(process.cwd(), "public/uploads");
fs.ensureDirSync(uploadDir);

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
  const paths = { video: '', audio: '', subtitle: '', output: '' };

  try {
    // Validate request
    const formData = await req.formData();
    const file = formData.get("video");

    if (!file || !file.name) {
      return NextResponse.json({ error: "No video file uploaded" }, { status: 400 });
    }

    // Get highlight settings from form data
    const enableHighlight = formData.get("enableHighlight") === "true";
    const highlightColor = enableHighlight ? (formData.get("highlightColor") || "#00FF00") : "#FFFFFF";
    const fontColor = formData.get("fontColor") || "#ffffff";
    
    // Get border settings from form data
    const enableBorder = formData.get("enableBorder") === "true";
    const borderColor = formData.get("borderColor") || "#000000";
    const borderSize = parseInt(formData.get("borderSize") || "2", 10);
    
    // Convert colors to ASS format
    const assHighlightColor = convertHexToAss(highlightColor);
    const assFontColor = convertHexToAss(fontColor);
    const assBorderColor = convertHexToAss(borderColor);
    
    const animation = enableHighlight ? (formData.get("animation") || "") : "";
    const textCase = formData.get("textCase") || "normal";
    const position = formData.get("position") || "bottom";
    const fontSize = formData.get("fontSize") || "24";
    const fontType = formData.get("fontType") || "Arial";

    // Generate paths
    Object.assign(paths, generatePaths(file.name));
    // Change subtitle extension to .ass
    paths.subtitle = paths.subtitle.replace(/\.srt$/, ".ass");

    // Save uploaded video
    await fs.writeFile(paths.video, Buffer.from(await file.arrayBuffer()));
    console.log('Video saved:', paths.video);

    // Extract audio
    await execPromise(`ffmpeg -i "${paths.video}" -q:a 0 -map a "${paths.audio}"`);
    console.log('Audio extracted:', paths.audio);

    // Generate subtitles using Whisper AI in SRT format first
    const transcript = await openai.audio.transcriptions.create({
      file: fs.createReadStream(paths.audio),
      model: "whisper-1",
      response_format: "srt",
    });
    // Convert SRT transcript to ASS with animation/highlight options
    const assContent = convertSrtToAss(
      transcript,
      fontType,
      fontSize,
      fontColor,
      enableHighlight,
      highlightColor,
      animation,
      textCase,
      position,
      enableBorder,
      borderColor,
      borderSize
    );
    await fs.writeFile(paths.subtitle, assContent);
    console.log('Subtitles generated (ASS):', paths.subtitle);

    // Burn subtitles into video with improved command using the ASS file
    const videoPath = paths.video.replace(/\\/g, '/');
    const subtitlePath = paths.subtitle.replace(/\\/g, '/').replace(/^([A-Za-z]):\//, '$1\\\\:/'); // Fix for C:\ drive issue
    const outputPath = paths.output.replace(/\\/g, '/');
    console.log('outputPath is:', outputPath);

    // Font settings already used in the ASS file; now, execute FFmpeg to burn in the ASS subtitles.
    const ffmpegCommand = [
      'ffmpeg',
      '-i', `"${videoPath}"`,
      '-vf', `"subtitles=${subtitlePath}:force_style='PrimaryColour=${assHighlightColor},SecondaryColour=${assFontColor}'"`,
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-c:a', 'copy',
      `"${outputPath}"`
    ].join(' ');

    console.log('Executing FFmpeg command:', ffmpegCommand);

    try {
      await execPromise(ffmpegCommand);
    } catch (ffmpegError) {
      console.error('FFmpeg error details:', ffmpegError);
      throw ffmpegError;
    }

    console.log('Video processing complete:', paths.output);

  } catch (error) {
    console.error("Error processing video:", error);
    // Cleanup on error
    await Promise.all(
      Object.values(paths)
        .filter(p => p && fs.existsSync(p))
        .map(p => fs.remove(p))
    );
    return NextResponse.json(
      { error: "Video processing failed", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "Processing complete",
    videoUrl: `/uploads/${path.basename(paths.output)}`
  });
}