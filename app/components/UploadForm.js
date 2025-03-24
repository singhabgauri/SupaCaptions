"use client";
import { useState, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid"; // For temporary solution
import Link from "next/link";
import { useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal';

// Add this near the top of your component
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function UploadForm() {
  // Replace the existing user state with useAuth
  const { user, loading, signOut } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  // State declarations
  const [file, setFile] = useState(null);
  const [fontSize, setFontSize] = useState("24");
  const [fontColor, setFontColor] = useState("#ffffff");
  const [fontType, setFontType] = useState("Liberation Sans");
  const [highlightColor, setHighlightColor] = useState("#9333ea"); // Violet color to match theme
  const [animation, setAnimation] = useState("");
  const [uploading, setUploading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState("");
  const [textCase, setTextCase] = useState("normal");
  const [position, setPosition] = useState("bottom");
  const [enableHighlight, setEnableHighlight] = useState(true); // Default to true
  const [enableBorder, setEnableBorder] = useState(true);
  const [borderColor, setBorderColor] = useState("#000000");
  const [borderSize, setBorderSize] = useState(2);
  const fileInputRef = useRef(null);
  // Add a state variable for job ID
  const [currentJobId, setCurrentJobId] = useState(null);
  const [processedVideoUrl, setProcessedVideoUrl] = useState("");
  const [activeStep, setActiveStep] = useState(1); // Track the active step (1: Upload, 2: Style, 3: Process)

  // Add these refs to track mounted state
  const isMountedRef = useRef(true);
  const statusIntervalRef = useRef(null);
  const safetyTimeoutRef = useRef(null);

  // Add this useEffect to inject global styles for select options
  useEffect(() => {
    // Create a style element
    const styleElement = document.createElement('style');
    // Add CSS rules
    styleElement.textContent = `
      option {
        background-color: #1a1a1a !important;
        color: white !important;
      }
      option:hover, option:focus, option:active {
        background-color: rgba(139, 92, 246, 0.8) !important;
        color: white !important;
      }
    `;
    // Append to document head
    document.head.appendChild(styleElement);
    
    // Clean up on component unmount
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Add cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (statusIntervalRef.current) clearInterval(statusIntervalRef.current);
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    };
  }, []);

  // Automatically advance to Style step when file is selected
  useEffect(() => {
    if (file && activeStep === 1) {
      setTimeout(() => setActiveStep(2), 500);
    }
  }, [file, activeStep]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  // Modify the handleUpload function to check for authentication first
  const handleUpload = async (e) => {
    e.preventDefault();
    
    // Check if user is logged in
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    
    setUploading(true);
    setProgress(10);
    setActiveStep(3);
    
    try {
      // Prepare form data
      const formData = new FormData();
      formData.append('video', file);
      
      // Add your caption configuration
      Object.entries({
        fontSize,
        fontColor,
        fontType,
        textCase,
        position,
        enableHighlight,
        highlightColor,
        animation,
        enableBorder,
        borderColor,
        borderSize
      }).forEach(([key, value]) => {
        formData.append(key, value);
      });

      // In your handleUpload function, add before the fetch call:
      console.log('Sending upload request with form data:', {
        video: file.name,
        fontSize,
        fontColor,
        fontType,
        textCase,
        position,
        enableHighlight,
        highlightColor,
        animation,
        enableBorder,
        borderColor,
        borderSize
      });
      
      // Send the upload request
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'x-user-id': user?.id || 'anonymous'
        },
        body: formData
      });
      
      const data = await response.json();
      console.log('Response from upload API:', data);
      
      // Check for immediate completion first
      if (data.status === 'completed') {
        setProgress(100);
        setProcessedVideoUrl(data.videoUrl);
        setDownloadUrl({
          view: data.videoUrl,
          download: data.downloadUrl
        });
        setUploading(false);
        return;
      }
      
      // If we make it here, the job is in progress and we need to poll
      setProgress(30);
      
      // Start polling for status if we have a job ID
      if (!data.jobId) {
        console.error('No job ID returned from server:', data);
        throw new Error('Server did not return a job ID');
      }
      
      const jobId = data.jobId;
      
      // Start polling for job status
      statusIntervalRef.current = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/job-status?jobId=${jobId}`);
          
          if (!statusResponse.ok) {
            console.error(`Status check failed: ${statusResponse.status}`);
            return;
          }
          
          const statusData = await statusResponse.json();
          console.log(`Job ${jobId} status:`, statusData);
          
          // Only update if component still mounted
          if (!isMountedRef.current) return;
          
          if (statusData.status === 'completed') {
            clearInterval(statusIntervalRef.current);
            setProgress(100);
            setProcessedVideoUrl(statusData.videoUrl);
            setDownloadUrl({
              view: statusData.videoUrl,
              download: statusData.downloadUrl
            });
            setUploading(false);
          } else if (statusData.status === 'failed') {
            clearInterval(statusIntervalRef.current);
            setUploading(false);
            setProgress(0);
            alert(statusData.error || 'Processing failed');
          } else {
            // Still processing
            setProgress(prev => Math.min(prev + 5, 90));
          }
        } catch (statusError) {
          console.error('Error checking status:', statusError);
        }
      }, 3000);
      
      // Safety cleanup after 10 minutes
      safetyTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          clearInterval(statusIntervalRef.current);
          setUploading(false);
          setProgress(0);
          alert('Processing timed out. Please try again.');
        }
      }, 10 * 60 * 1000);
      
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Error: ${error.message}`);
      setProgress(0);
      setUploading(false);
    }
  };

  // For now, let's add a shortcut for testing:
  const handleBypassAuth = () => {
    // This won't work anymore since we don't have setUser
    // Instead, you'd need to modify your code to handle this differently
    // Maybe just log a message for now
    console.log("Auth bypass not available when using useAuth()");
    // Or you could redirect to the login modal
    setAuthModalOpen(true);
  };

  // Replace your current handleDownload function with this simpler version
  const handleDownload = (url) => {
    if (!url) {
      console.error("No URL provided for download");
      return;
    }
    
    // Use the download URL if available, otherwise fall back to view URL
    const downloadLink = typeof downloadUrl === 'object' ? downloadUrl.download : url;
    console.log("Starting download:", downloadLink);
    
    // Create a temporary anchor element for download
    const link = document.createElement('a');
    link.href = downloadLink;
    link.setAttribute('download', `supacaption-video-${Date.now()}.mp4`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // For the download button's onClick handler
  const handleDownloadClick = () => {
    console.log('Download button clicked, URL:', typeof downloadUrl === 'object' ? downloadUrl.download : downloadUrl);
    // Then proceed with the download logic
    handleDownload(typeof downloadUrl === 'object' ? downloadUrl.download : downloadUrl);
  };

  const resetForm = () => {
    setFile(null);
    setPreviewUrl("");
    setDownloadUrl("");
    setProgress(0);
    setActiveStep(1);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black text-white">
      {/* Header with Logo */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                #SupaCaptions
              </span>
            </Link>
            
            {user ? (
              <div className="relative group">
                <button 
                  className="flex items-center h-16 px-2"
                  data-tooltip={user.user_metadata?.full_name || user.email || 'User'}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-violet-600 to-blue-600 user-avatar">
                    <span className="text-white text-sm font-medium">
                      {(user.email?.charAt(0) || user.user_metadata?.full_name?.charAt(0) || '?').toUpperCase()}
                    </span>
                  </div>
                </button>
                
                {/* Dropdown Menu */}
                <div className="absolute right-0 top-full mt-1 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-lg z-50">
                  <div className="px-4 py-3 border-b border-white/10">
                    <p className="text-sm font-medium text-white truncate">
                      {user.user_metadata?.full_name || 'User'}
                    </p>
                    <p className="text-xs text-white/60 truncate">
                      {user.email}
                    </p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => signOut()}
                      className="w-full px-4 py-2 text-sm text-left text-white/80 hover:bg-white/10 transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center h-16 px-4 bg-violet-600 hover:bg-violet-700 rounded-lg text-white text-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>
      
      {/* Main */}
      <main className="pt-24 px-4 pb-24 relative">
        <div className="max-w-7xl mx-auto">
          {/* Title */}
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent mb-4">
              Create Video Captions
            </h2>
            <p className="text-white/70 max-w-2xl mx-auto">
              Transform your videos with word-by-word highlighting captions that make your content stand out
            </p>
          </div>

          {/* Steps Indicator */}
          <div className="mb-10">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-between">
                {/* Step 1 */}
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    activeStep >= 1 ? 'bg-violet-600' : 'bg-white/10'
                  } transition-colors duration-300`}>
                    <span className="text-white font-medium">1</span>
                  </div>
                  <span className={`mt-2 text-sm ${
                    activeStep >= 1 ? 'text-white' : 'text-white/50'
                  }`}>Upload</span>
                </div>
                
                {/* Line */}
                <div className={`h-1 flex-1 mx-2 ${
                  activeStep >= 2 ? 'bg-violet-600' : 'bg-white/10'
                } transition-colors duration-300`}></div>
                
                {/* Step 2 */}
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    activeStep >= 2 ? 'bg-violet-600' : 'bg-white/10'
                  } transition-colors duration-300`}>
                    <span className="text-white font-medium">2</span>
                  </div>
                  <span className={`mt-2 text-sm ${
                    activeStep >= 2 ? 'text-white' : 'text-white/50'
                  }`}>Style</span>
                </div>
                
                {/* Line */}
                <div className={`h-1 flex-1 mx-2 ${
                  activeStep >= 3 ? 'bg-violet-600' : 'bg-white/10'
                } transition-colors duration-300`}></div>
                
                {/* Step 3 */}
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    activeStep >= 3 ? 'bg-violet-600' : 'bg-white/10'
                  } transition-colors duration-300`}>
                    <span className="text-white font-medium">3</span>
                  </div>
                  <span className={`mt-2 text-sm ${
                    activeStep >= 3 ? 'text-white' : 'text-white/50'
                  }`}>Process</span>
                </div>
              </div>
            </div>
          </div>

          {/* Content based on active step */}
          <div className={`transition-all duration-500 ${activeStep === 1 ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
            <div className="flex justify-center">
              <div className="w-full max-w-3xl bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-lg">
                <h2 className="text-xl font-semibold mb-6 text-center">
                  Upload Your Video
                </h2>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-video rounded-xl border-4 border-dashed border-violet-500/40 bg-black/20 flex items-center justify-center cursor-pointer hover:bg-black/25 transition-all"
                >
                  <div className="text-center p-8">
                    <svg
                      className="mx-auto h-16 w-16 text-violet-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <p className="mt-4 text-sm font-medium text-violet-200">
                      Drop your video here or click to upload
                    </p>
                    <p className="mt-2 text-xs text-violet-400">
                      MP4, AVI, MOV up to 10MB
                    </p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Step 2: Style */}
          <div className={`transition-all duration-500 ${activeStep === 2 ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
            {!user && (
              <div className="mb-6 bg-gradient-to-r from-violet-500/20 to-blue-500/20 rounded-xl p-4 border border-violet-500/30">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-violet-300 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-white">
                    <span className="font-medium">Sign in required.</span> Please {' '}
                    <button 
                      onClick={() => setAuthModalOpen(true)}
                      className="text-violet-300 hover:text-violet-200 font-medium underline"
                    >
                      sign in
                    </button> 
                    {' '} to process your video and add captions.
                  </p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Video Preview */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-lg">
                <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-white/10">
                  Video Preview
                </h2>
                <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
                  {previewUrl ? (
                    <video src={previewUrl} className="w-full h-full object-contain" controls />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/30">
                      <p>No video selected</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Caption Style Section */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-lg">
                <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-white/10">
                  Caption Style
                </h2>
                <div className="space-y-6 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                  {/* Font Settings Group */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-violet-300 uppercase">Font Settings</h3>
                    
                    <label className="block">
                      <span className="text-sm font-medium text-white/80">Font Style</span>
                      <select
                        value={fontType}
                        onChange={(e) => setFontType(e.target.value)}
                        className="mt-1 block w-full rounded-lg border-white/10 bg-white/10 text-white focus:border-violet-400 focus:ring-violet-400"
                      >
                        {[
                          {name: "Liberation Sans", style: "font-sans", desc: "(Arial style)"},
                          {name: "Liberation Serif", style: "font-serif", desc: "(Times style)"},
                          {name: "Liberation Mono", style: "font-mono", desc: "(Courier style)"},
                          {name: "DejaVu Sans", style: "font-sans", desc: "(Modern)"},
                          {name: "DejaVu Serif", style: "font-serif", desc: "(Elegant)"},
                          {name: "DejaVu Sans Mono", style: "font-mono", desc: "(Code style)"},
                          {name: "FreeSans", style: "font-sans", desc: "(Clean)"},
                          {name: "FreeSerif", style: "font-serif", desc: "(Classic)"},
                          {name: "Noto Sans", style: "font-sans", desc: "(International)"}
                        ].map((font) => (
                          <option key={font.name} value={font.name} className={font.style}>
                            {font.name} {font.desc}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="grid grid-cols-2 gap-4">
                      <label className="block">
                        <span className="text-sm font-medium text-white/80">Font Size</span>
                        <select
                          value={fontSize}
                          onChange={(e) => setFontSize(e.target.value)}
                          className="mt-1 block w-full rounded-lg border-white/10 bg-white/10 text-white focus:border-violet-400 focus:ring-violet-400"
                        >
                          {[16, 20, 24, 28, 32, 36, 40].map((size) => (
                            <option key={size} value={size}>
                              {size}px
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block">
                        <span className="text-sm font-medium text-white/80">Position</span>
                        <select
                          value={position}
                          onChange={(e) => setPosition(e.target.value)}
                          className="mt-1 block w-full rounded-lg border-white/10 bg-white/10 text-white focus:border-violet-400 focus:ring-violet-400"
                        >
                          <option value="top">Top</option>
                          <option value="middle">Middle</option>
                          <option value="bottom">Bottom</option>
                        </select>
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <label className="block">
                        <span className="text-sm font-medium text-white/80">Font Color</span>
                        <div className="mt-1 flex items-center">
                          <div className="w-8 h-8 rounded-lg border border-white/20 mr-2" style={{ backgroundColor: fontColor }}></div>
                          <input
                            type="color"
                            value={fontColor}
                            onChange={(e) => setFontColor(e.target.value)}
                            className="sr-only"
                            id="fontColorPicker"
                          />
                          <label 
                            htmlFor="fontColorPicker"
                            className="flex-1 py-2 px-3 bg-white/10 rounded-lg cursor-pointer hover:bg-white/20 transition-colors text-sm overflow-hidden whitespace-nowrap overflow-ellipsis"
                          >
                            {fontColor}
                          </label>
                        </div>
                      </label>

                      <div className="flex items-center space-x-4">
                        <label className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-white/80">All Caps</span>
                          <div className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={textCase === "uppercase"}
                              onChange={(e) =>
                                setTextCase(e.target.checked ? "uppercase" : "normal")
                              }
                              className="sr-only peer"
                            />
                            <div className="w-10 h-5 bg-white/10 peer-focus:outline-none rounded-full peer-checked:bg-violet-600 transition-all relative peer-checked:before:translate-x-full before:content-[''] before:absolute before:left-0 before:top-0 before:w-5 before:h-5 before:bg-white before:rounded-full before:transition-all"></div>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-white/10 my-4"></div>
                  
                  {/* Border Settings Group */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-violet-300 uppercase">Text Border</h3>
                      <label className="flex items-center space-x-2">
                        <div className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enableBorder}
                            onChange={(e) => setEnableBorder(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-10 h-5 bg-white/10 peer-focus:outline-none rounded-full peer-checked:bg-violet-600 transition-all relative peer-checked:before:translate-x-full before:content-[''] before:absolute before:left-0 before:top-0 before:w-5 before:h-5 before:bg-white before:rounded-full before:transition-all"></div>
                        </div>
                      </label>
                    </div>

                    {enableBorder && (
                      <div className="grid grid-cols-2 gap-4">
                        <label className="block">
                          <span className="text-sm font-medium text-white/80">Border Color</span>
                          <div className="mt-1 flex items-center">
                            <div className="w-8 h-8 rounded-lg border border-white/20 mr-2" style={{ backgroundColor: borderColor }}></div>
                            <input
                              type="color"
                              value={borderColor}
                              onChange={(e) => setBorderColor(e.target.value)}
                              className="sr-only"
                              id="borderColorPicker"
                            />
                            <label 
                              htmlFor="borderColorPicker"
                              className="flex-1 py-2 px-3 bg-white/10 rounded-lg cursor-pointer hover:bg-white/20 transition-colors text-sm overflow-hidden whitespace-nowrap overflow-ellipsis"
                            >
                              {borderColor}
                            </label>
                          </div>
                        </label>

                        <label className="block">
                          <span className="text-sm font-medium text-white/80">Border Size</span>
                          <select
                            value={borderSize}
                            onChange={(e) => setBorderSize(parseInt(e.target.value))}
                            className="mt-1 block w-full rounded-lg border-white/10 bg-white/10 text-white focus:border-violet-400 focus:ring-violet-400"
                          >
                            {[1, 2, 3, 4, 5].map((size) => (
                              <option key={size} value={size}>
                                {size}px
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-white/10 my-4"></div>

                  {/* Highlight Settings Group */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-violet-300 uppercase">Word Highlighting</h3>
                      <label className="flex items-center space-x-2">
                        <div className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enableHighlight}
                            onChange={(e) => {
                              setEnableHighlight(e.target.checked);
                              if (!e.target.checked) {
                                setAnimation("");
                              }
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-10 h-5 bg-white/10 peer-focus:outline-none rounded-full peer-checked:bg-violet-600 transition-all relative peer-checked:before:translate-x-full before:content-[''] before:absolute before:left-0 before:top-0 before:w-5 before:h-5 before:bg-white before:rounded-full before:transition-all"></div>
                        </div>
                      </label>
                    </div>

                    {enableHighlight && (
                      <div className="grid grid-cols-2 gap-4">
                        <label className="block">
                          <span className="text-sm font-medium text-white/80">Highlight Color</span>
                          <div className="mt-1 flex items-center">
                            <div className="w-8 h-8 rounded-lg border border-white/20 mr-2" style={{ backgroundColor: highlightColor }}></div>
                            <input
                              type="color"
                              value={highlightColor}
                              onChange={(e) => setHighlightColor(e.target.value)}
                              className="sr-only"
                              id="highlightColorPicker"
                            />
                            <label 
                              htmlFor="highlightColorPicker"
                              className="flex-1 py-2 px-3 bg-white/10 rounded-lg cursor-pointer hover:bg-white/20 transition-colors text-sm overflow-hidden whitespace-nowrap overflow-ellipsis"
                            >
                              {highlightColor}
                            </label>
                          </div>
                        </label>

                        <label className="block">
                          <span className="text-sm font-medium text-white/80">Animation</span>
                          <select
                            value={animation}
                            onChange={(e) => setAnimation(e.target.value)}
                            className="mt-1 block w-full rounded-lg border-white/10 bg-white/10 text-white focus:border-violet-400 focus:ring-violet-400"
                          >
                            <option value="">None</option>
                            <option value="scale">Scale</option>
                          </select>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Navigation Buttons */}
            <div className="mt-8 flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => setActiveStep(1)}
                className="px-6 py-2.5 border border-white/10 rounded-lg text-white/80 hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 focus:ring-offset-gray-900"
              >
                Back
              </button>
              <button
                onClick={handleUpload}
                className={`px-8 py-2.5 rounded-lg font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                  user 
                    ? 'bg-violet-600 hover:bg-violet-700' 
                    : 'bg-violet-600/50 hover:bg-violet-600 flex items-center'
                }`}
              >
                {!user && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )}
                {user ? 'Process Video' : 'Sign in to Process'}
              </button>
            </div>
          </div>

          {/* Step 3: Process */}
          <div className={`transition-all duration-500 ${activeStep === 3 ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
            <div className="max-w-3xl mx-auto bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-lg">
              {/* Progress */}
              {uploading && (
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-center text-white mb-6">Processing Your Video</h3>
                  <div className="bg-black/30 rounded-xl p-6 border border-violet-500/20">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-violet-300">
                        {progress < 30 ? 'Uploading...' : 
                         progress < 60 ? 'Creating captions...' : 
                         'Finalizing video...'}
                      </span>
                      <span className="text-sm font-medium text-violet-300">{progress}%</span>
                    </div>
                    <div className="h-3 w-full bg-black/30 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-violet-600 to-blue-500 transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="mt-4 text-center text-sm text-white/60">
                      This may take a few minutes depending on video length
                    </p>
                  </div>
                </div>
              )}

              {/* Result */}
              {downloadUrl && (
                <div>
                  <h3 className="text-xl font-medium text-center text-white mb-6">Your Video is Ready!</h3>
                  
                  <div className="bg-gradient-to-r from-violet-500/10 to-blue-500/10 rounded-xl p-6 border border-violet-500/20">
                    <div className="relative aspect-video mb-6 rounded-lg overflow-hidden">
                      {typeof downloadUrl === 'object' && downloadUrl.view ? (
                        <video 
                          src={downloadUrl.view} 
                          className="w-full h-full object-contain" 
                          controls 
                        />
                      ) : downloadUrl ? (
                        <video 
                          src={downloadUrl} 
                          className="w-full h-full object-contain" 
                          controls 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-black/50 text-white/30">
                          <p>Video processing...</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                      <a
                        href={typeof downloadUrl === 'object' ? downloadUrl.view : downloadUrl}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1 py-3 px-6 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-center font-medium transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View in Browser
                      </a>
                      
                      <button
                        onClick={handleDownloadClick}
                        className="flex-1 py-3 px-6 bg-violet-600 hover:bg-violet-700 rounded-xl text-center font-medium transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download Video
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-8 text-center">
                    <button
                      onClick={resetForm}
                      className="px-6 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                    >
                      Process Another Video
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-black/40 backdrop-blur-md border-t border-white/10 py-3">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm text-white/50">© 2025 SupaCaptions. All rights reserved.</p>
        </div>
      </footer>
      
      {/* Custom scrollbar styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.8);
        }

        /* Add this for tooltips */
        [data-tooltip]:hover::after {
          content: attr(data-tooltip);
          position: absolute;
          bottom: -35px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          white-space: nowrap;
          z-index: 60;
          pointer-events: none;
        }
      `}</style>
      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
      />
    </div>
  );
}
