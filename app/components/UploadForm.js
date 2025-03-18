"use client";
import { useState, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid"; // For temporary solution

// Add this near the top of your component
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function UploadForm() {
  // Add user state
  const [user, setUser] = useState(null);
  // State declarations
  const [file, setFile] = useState(null);
  const [fontSize, setFontSize] = useState("24");
  const [fontColor, setFontColor] = useState("#ffffff");
  const [fontType, setFontType] = useState("Arial");
  const [highlightColor, setHighlightColor] = useState("#00ff00");
  const [animation, setAnimation] = useState("");
  const [uploading, setUploading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState("");
  const [textCase, setTextCase] = useState("normal");
  const [position, setPosition] = useState("bottom");
  const [enableHighlight, setEnableHighlight] = useState(false);
  const [enableBorder, setEnableBorder] = useState(true);
  const [borderColor, setBorderColor] = useState("#000000");
  const [borderSize, setBorderSize] = useState(2);
  const fileInputRef = useRef(null);

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

  // Add this useEffect to check for authentication
  useEffect(() => {
    // Check for existing session
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      
      // Set up auth state change listener
      const { data: authListener } = supabase.auth.onAuthStateChange(
        (event, session) => {
          setUser(session?.user || null);
        }
      );
      
      return () => {
        authListener?.subscription?.unsubscribe();
      };
    };
    
    checkUser();
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      alert("Please select a video file.");
      return;
    }
    
    // If no user is signed in, use a temporary ID or show auth UI
    if (!user) {
      // Option 1: Show authentication UI
      alert("Please sign in to upload videos.");
      return;
      
      // Option 2 (for testing): Generate temporary user ID
      // const tempUserId = uuidv4();
      // console.log("Using temporary user ID:", tempUserId);
    }
    
    setUploading(true);
    setDownloadUrl("");
    setProgress(0);

    const formData = new FormData();
    formData.append("video", file);
    formData.append("fontSize", fontSize);
    formData.append("fontColor", fontColor);
    formData.append("fontType", fontType);
    formData.append("textCase", textCase);
    formData.append("position", position);
    formData.append("enableHighlight", enableHighlight.toString());
    if (enableHighlight) {
      formData.append("highlightColor", highlightColor);
      formData.append("animation", animation);
    }
    formData.append("enableBorder", enableBorder.toString());
    formData.append("borderColor", borderColor);
    formData.append("borderSize", borderSize.toString());

    try {
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 5, 90));
      }, 500);

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: {
          // Use real user ID if available, or a temporary one for testing
          "x-user-id": user?.id || "temp-user-id"
        },
        body: formData,
      });
      
      clearInterval(progressInterval);
      
      if (!res.ok) {
        let errorMessage = "Upload failed";
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorData.details || errorMessage;
        } catch (jsonError) {
          errorMessage = `Server error: ${res.status} ${res.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      const data = await res.json();
      setProgress(100);
      setDownloadUrl(data.videoUrl);
      
    } catch (error) {
      alert(`Error: ${error.message}`);
      console.error(error);
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  // Add authentication UI
  const renderAuthSection = () => {
    if (user) {
      return (
        <div className="mb-4 text-sm text-white/70">
          Logged in as: <span className="text-violet-300">{user.email}</span>
          <button 
            onClick={() => supabase.auth.signOut()}
            className="ml-4 text-violet-400 hover:text-violet-300 underline"
          >
            Sign Out
          </button>
        </div>
      );
    }
    
    return (
      <div className="mb-6 p-4 bg-violet-900/20 border border-violet-500/20 rounded-lg">
        <p className="text-sm text-white/70 mb-3">
          Sign in to upload and access your captioned videos
        </p>
        <LoginForm />
      </div>
    );
  };

  // For now, let's add a shortcut for testing:
  const handleBypassAuth = () => {
    setUser({ id: "temp-user-" + uuidv4(), email: "test@example.com" });
  };

  return (
    <div className="min-h-screen min-w-screen bg-gradient-to-b from-black via-gray-950 to-black text-white">
      {/* Add this near the top of your UI for testing */}
      {!user && (
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={handleBypassAuth}
            className="px-4 py-2 bg-red-600/50 text-white text-sm rounded-lg"
          >
            Temporary Login (Dev Only)
          </button>
        </div>
      )}
      
      {/* Main */}
      <main className="pt-24 px-4 pb-24 relative">
        <div className="max-w-7xl mx-auto">
          {/* Title */}
          <div className="text-center mb-12">
            <h2 className="text-5xl font-extrabold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent mb-4">
              SUPACAPTIONS
            </h2>
            <p className="text-white/70">Transform your videos with smart, synchronized captions</p>
          </div>

          {/* Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Upload Section */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-lg">
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-white/10">
                Upload Your Video
              </h2>
              <div className="mb-8">
                {previewUrl ? (
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
                    <video src={previewUrl} className="w-full h-full object-contain" controls />
                  </div>
                ) : (
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
                        Drop your video here or click to browse
                      </p>
                      <p className="mt-2 text-xs text-violet-400">
                        MP4, AVI, MOV up to 10MB
                      </p>
                    </div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Caption Style Section */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-lg">
              <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-white/10">Caption Style</h2>
              <div className="space-y-6">
                {/* Font Settings */}
                <div className="space-y-4">
                  <label className="block">
                    <span className="text-sm font-medium text-white/80">Font Style</span>
                    <select
                      value={fontType}
                      onChange={(e) => setFontType(e.target.value)}
                      className="mt-1 block w-full rounded-lg border-white/10 bg-white/10 text-white focus:border-violet-400 focus:ring-violet-400"
                    >
                      {["Arial", "Verdana", "Times New Roman", "Courier New", "Georgia"].map((font) => (
                        <option key={font} value={font}>
                          {font}
                        </option>
                      ))}
                    </select>
                  </label>

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
                    <span className="text-sm font-medium text-white/80">Font Color</span>
                    <div className="mt-1">
                      <input
                        type="color"
                        value={fontColor}
                        onChange={(e) => setFontColor(e.target.value)}
                        className="h-10 w-full rounded-lg border-white/10 bg-white/10 cursor-pointer"
                      />
                    </div>
                  </label>

                  <div className="flex items-center justify-between">
                    {/* Modern Switch for All Caps */}
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
                        <div className="w-10 h-5 bg-white/10 peer-focus:outline-none rounded-full peer-checked:bg-violet-600 transition-all peer-checked:translate-x-0 relative peer-checked:before:translate-x-full before:content-[''] before:absolute before:left-0 before:top-0 before:w-5 before:h-5 before:bg-white before:rounded-full before:transition-all"></div>
                      </div>
                    </label>

                    {/* Modern Switch for Font Border */}
                    <label className="flex items-left space-x-2">
                      <span className="text-sm font-medium text-white/80">Font Border</span>
                      <div className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enableBorder}
                          onChange={(e) => setEnableBorder(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-white/10 peer-focus:outline-none rounded-full peer-checked:bg-violet-600 transition-all peer-checked:translate-x-0 relative peer-checked:before:translate-x-full before:content-[''] before:absolute before:left-0 before:top-0 before:w-5 before:h-5 before:bg-white before:rounded-full before:transition-all"></div>
                      </div>
                    </label>
                  </div>

                  {enableBorder && (
                    <div className="space-y-4 pl-4">
                      <label className="block">
                        <span className="text-sm font-medium text-white/80">Border Color</span>
                        <div className="mt-1">
                          <input
                            type="color"
                            value={borderColor}
                            onChange={(e) => setBorderColor(e.target.value)}
                            className="h-10 w-full rounded-lg border-white/10 bg-white/10 cursor-pointer"
                          />
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

                  {/* Caption Position */}
                  <label className="block">
                    <span className="text-sm font-medium text-white/80">Caption Position</span>
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

                <div className="border-t border-white/10 my-6"></div>

                {/* Highlight Settings */}
                <div className="space-y-4">
                  {/* Modern Switch for Highlight Toggle */}
                  <label className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-white/80">Highlight Captions</span>
                    <div className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableHighlight}
                        onChange={(e) => {
                          setEnableHighlight(e.target.checked);
                          if (!e.target.checked) {
                            setAnimation("");
                            setHighlightColor("#00ff00");
                          }
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-white/10 peer-focus:outline-none rounded-full peer-checked:bg-violet-600 transition-all peer-checked:translate-x-0 relative peer-checked:before:translate-x-full before:content-[''] before:absolute before:left-0 before:top-0 before:w-5 before:h-5 before:bg-white before:rounded-full before:transition-all"></div>
                    </div>
                  </label>

                  {enableHighlight && (
                    <div className="space-y-4 pl-4">
                      <label className="block">
                        <span className="text-sm font-medium text-white/80">Highlight Color</span>
                        <div className="mt-1">
                          <input
                            type="color"
                            value={highlightColor}
                            onChange={(e) => setHighlightColor(e.target.value)}
                            className="h-10 w-full rounded-lg border-white/10 bg-white/10 cursor-pointer"
                          />
                        </div>
                      </label>

                      <label className="block">
                        <span className="text-sm font-medium text-white/80">Animation Style</span>
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

          {/* Progress & Actions */}
          <div className="mt-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-lg">
            {/* Progress */}
            {uploading && (
              <section className="mb-8">
                <div className="bg-white/5 rounded-xl p-6 border border-violet-500/20">
                  <h3 className="text-sm font-medium text-violet-200 mb-4">Processing Video</h3>
                  <div className="h-2 w-full bg-violet-900/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-violet-500 transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-sm text-violet-300">
                    <span>Processing...</span>
                    <span>{progress}%</span>
                  </div>
                </div>
              </section>
            )}

            {/* Buttons */}
            <section className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setPreviewUrl("");
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="px-6 py-2.5 border border-white/10 rounded-lg text-white/80 hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2"
              >
                Clear
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || !file}
                className={`px-8 py-2.5 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  uploading || !file
                    ? "bg-white/10 text-white/40 cursor-not-allowed"
                    : "bg-violet-600 hover:bg-violet-700 text-white"
                }`}
              >
                {uploading ? "Processing..." : "Generate Captions"}
              </button>
            </section>

            {/* Download */}
            {downloadUrl && (
              <section className="mt-8">
                <div className="bg-emerald-400/10 rounded-xl p-6 border border-emerald-400/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-emerald-300">Processing Complete!</h3>
                      <p className="text-sm text-emerald-200">Your video is ready to download</p>
                    </div>
                    <a
                      href={downloadUrl}
                      download
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                    >
                      Download Video
                    </a>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-black/40 backdrop-blur-md border-t border-white/10 py-3">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm text-white/50">© 2025 SupaCaptions. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
