"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './context/AuthContext';
import AuthModal from './components/AuthModal';

export default function LandingPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [activeWord, setActiveWord] = useState(0);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const demoWords = ["Transform", "your", "videos", "with", "beautiful", "captions"];
  
  useEffect(() => {
    // Create word animation interval
    const wordInterval = setInterval(() => {
      setActiveWord(prev => (prev + 1) % demoWords.length);
    }, 800);
    
    return () => clearInterval(wordInterval);
  }, []);

  // Add this useEffect to debug the user avatar URL issue
  useEffect(() => {
    if (user) {
      console.log("User metadata:", user.user_metadata);
      console.log("Avatar URL:", user.user_metadata?.avatar_url);
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                #SupaCaptions
              </span>
            </div>
            <div className="flex items-center space-x-8">
              <a href="#features" className="text-sm text-white/70 hover:text-white transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-sm text-white/70 hover:text-white transition-colors">
                How It Works
              </a>
              <a href="#pricing" className="text-sm text-white/70 hover:text-white transition-colors">
                Pricing
              </a>
              
              {user ? (
                <div className="relative group">
                  <button className="flex items-center space-x-2 text-sm">
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
                      <Link
                        href="/app"
                        className="block w-full px-4 py-2 text-sm text-left text-white/80 hover:bg-white/10 transition-colors"
                      >
                        Dashboard
                      </Link>
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
                  className="flex items-center px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg text-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Sign In
                </button>
              )}

              <Link 
                href="/app" 
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg text-sm font-medium transition-colors"
              >
                Launch App
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 md:min-h-[90vh] flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight">
                <span className="block">AI-Powered</span>
                <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">Word-by-Word</span>
                <span className="block">Video Captions</span>
              </h1>
              <p className="mt-6 text-xl text-white/70 leading-relaxed">
                Transform your videos with beautiful, precisely timed captions that highlight each word as it's spoken.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <button
                  onClick={user ? () => router.push('/app') : () => setAuthModalOpen(true)}
                  className="px-8 py-3 bg-violet-600 hover:bg-violet-700 rounded-xl text-center font-medium transition-colors"
                >
                  {user ? 'Go to Dashboard' : 'Get Started'}
                </button>
                <a
                  href="#demo"
                  className="px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-center font-medium transition-colors"
                >
                  Watch Demo
                </a>
              </div>
            </div>
            <div className="flex justify-center">
              <div className="relative aspect-video w-full max-w-xl bg-gradient-to-br from-violet-800/30 to-blue-900/30 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                {/* Word Animation */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="p-8 text-center">
                    {demoWords.map((word, idx) => (
                      <span 
                        key={idx}
                        className={`inline-block mx-1 text-3xl md:text-4xl font-bold transition-all duration-300 ${
                          idx === activeWord 
                            ? 'text-violet-400 scale-125' 
                            : 'text-white/50'
                        }`}
                      >
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-black/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">
              <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                Powerful Features
              </span>
            </h2>
            <p className="mt-4 text-xl text-white/70">
              Everything you need for professional video captions
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all hover:translate-y-[-5px] duration-300">
              <div className="w-12 h-12 bg-violet-600/30 rounded-lg flex items-center justify-center mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Word-Level Highlighting</h3>
              <p className="text-white/70">
                Each word is highlighted precisely as it's spoken, creating engaging, dynamic captions that captivate viewers.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all hover:translate-y-[-5px] duration-300">
              <div className="w-12 h-12 bg-violet-600/30 rounded-lg flex items-center justify-center mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">AI-Powered Transcription</h3>
              <p className="text-white/70">
                Advanced speech recognition technology delivers accurate transcriptions in multiple languages, perfect for global audiences.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all hover:translate-y-[-5px] duration-300">
              <div className="w-12 h-12 bg-violet-600/30 rounded-lg flex items-center justify-center mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Custom Styling</h3>
              <p className="text-white/70">
                Customize fonts, colors, animations, and positioning to perfectly match your brand's identity and aesthetic.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">
              <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                How It Works
              </span>
            </h2>
            <p className="mt-4 text-xl text-white/70">
              Three simple steps to perfect captions
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="relative">
              <div className="hidden md:block absolute top-12 left-full w-24 h-0.5 bg-violet-600/30 -translate-x-12"></div>
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-white/5 border border-violet-500/30 rounded-full flex items-center justify-center mb-6">
                  <span className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">1</span>
                </div>
                <h3 className="text-xl font-bold mb-3">Upload Your Video</h3>
                <p className="text-white/70">
                  Upload your video directly to our secure platform or provide a URL from popular video hosting sites.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="hidden md:block absolute top-12 left-full w-24 h-0.5 bg-violet-600/30 -translate-x-12"></div>
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-white/5 border border-violet-500/30 rounded-full flex items-center justify-center mb-6">
                  <span className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">2</span>
                </div>
                <h3 className="text-xl font-bold mb-3">Customize Captions</h3>
                <p className="text-white/70">
                  Choose fonts, colors, animation styles, and text positioning to perfectly match your brand identity.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-white/5 border border-violet-500/30 rounded-full flex items-center justify-center mb-6">
                <span className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">3</span>
              </div>
              <h3 className="text-xl font-bold mb-3">Download & Share</h3>
              <p className="text-white/70">
                Get your captioned video and share it directly on social media platforms for maximum engagement.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Video Section */}
      <section id="demo" className="py-20 bg-black/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">
              <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                See It In Action
              </span>
            </h2>
            <p className="mt-4 text-xl text-white/70">
              Watch how SupaCaptions transforms videos
            </p>
          </div>

          <div className="max-w-4xl mx-auto bg-black/30 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden shadow-2xl">
            <div className="aspect-video">
              {/* Replace with your actual demo video */}
              <div className="w-full h-full bg-gradient-to-br from-violet-900/30 to-blue-900/30 flex items-center justify-center">
                <p className="text-white/50 text-lg">Demo video coming soon</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">
              <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                Simple Pricing
              </span>
            </h2>
            <p className="mt-4 text-xl text-white/70">
              Choose the plan that's right for your needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Basic Plan */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8 hover:bg-white/10 transition-all duration-300">
              <h3 className="text-xl font-bold mb-3">Basic</h3>
              <div className="flex items-end mb-6">
                <span className="text-4xl font-extrabold mr-2">$9</span>
                <span className="text-white/70 mb-1">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-violet-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span className="text-white/70">Up to 1 hour of video/month</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-violet-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span className="text-white/70">Standard caption styling</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-violet-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span className="text-white/70">720p output resolution</span>
                </li>
              </ul>
              <button
                onClick={user ? () => router.push('/app') : () => setAuthModalOpen(true)}
                className="block w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-center font-medium transition-colors"
              >
                {user ? 'Go to Dashboard' : 'Get Started'}
              </button>
            </div>

            {/* Pro Plan */}
            <div className="bg-white/5 backdrop-blur-sm border-2 border-violet-500 rounded-xl p-8 hover:bg-white/10 transition-all duration-300 transform scale-105 relative z-10 shadow-xl">
              <div className="absolute top-0 right-0 bg-violet-600 text-xs font-bold uppercase px-3 py-1 rounded-bl-lg rounded-tr-xl">
                Popular
              </div>
              <h3 className="text-xl font-bold mb-3">Pro</h3>
              <div className="flex items-end mb-6">
                <span className="text-4xl font-extrabold mr-2">$29</span>
                <span className="text-white/70 mb-1">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-violet-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span className="text-white/70">Up to 5 hours of video/month</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-violet-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span className="text-white/70">Advanced styling options</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-violet-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span className="text-white/70">1080p output resolution</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-violet-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span className="text-white/70">Word-level highlighting</span>
                </li>
              </ul>
              <button
                onClick={user ? () => router.push('/app') : () => setAuthModalOpen(true)}
                className="block w-full py-3 bg-violet-600 hover:bg-violet-700 border border-transparent rounded-xl text-center font-medium transition-colors"
              >
                {user ? 'Go to Dashboard' : 'Get Started'}
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8 hover:bg-white/10 transition-all duration-300">
              <h3 className="text-xl font-bold mb-3">Enterprise</h3>
              <div className="flex items-end mb-6">
                <span className="text-4xl font-extrabold mr-2">$99</span>
                <span className="text-white/70 mb-1">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-violet-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span className="text-white/70">Unlimited video processing</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-violet-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span className="text-white/70">All styling options</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-violet-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span className="text-white/70">4K output resolution</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-violet-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span className="text-white/70">Priority processing</span>
                </li>
              </ul>
              <button
                onClick={user ? () => router.push('/app') : () => setAuthModalOpen(true)}
                className="block w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-center font-medium transition-colors"
              >
                {user ? 'Go to Dashboard' : 'Get Started'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
              SupaCaptions
            </div>
            <div className="mt-8 md:mt-0 flex justify-center md:justify-end space-x-6">
              <a href="#" className="text-white/50 hover:text-white/80">
                <span className="sr-only">Twitter</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path>
                </svg>
              </a>
              <a href="#" className="text-white/50 hover:text-white/80">
                <span className="sr-only">GitHub</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"></path>
                </svg>
              </a>
            </div>
          </div>
          <div className="mt-8 md:flex md:items-center md:justify-between">
            <p className="text-center md:text-left text-white/50">
              &copy; 2025 SupaCaptions. All rights reserved.
            </p>
            <div className="mt-4 md:mt-0 flex justify-center md:justify-end space-x-6">
              <a href="#" className="text-white/50 hover:text-white/80">Terms</a>
              <a href="#" className="text-white/50 hover:text-white/80">Privacy</a>
              <a href="#" className="text-white/50 hover:text-white/80">Contact</a>
            </div>
          </div>
        </div>
      </footer>
      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
      />
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        /* ...other styles... */
        
        /* Fix for broken avatar images */
        .avatar-container {
          position: relative;
        }
        
        .avatar-container img {
          position: relative;
          z-index: 2;
        }
        
        .avatar-container img:not([src]), 
        .avatar-container img[src=""], 
        .avatar-container img[src="null"], 
        .avatar-container img[src="undefined"] {
          opacity: 0;
        }
        
        .avatar-fallback {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1;
        }

        /* User avatar styles */
        .user-avatar {
          background-size: 150% 150%;
          animation: gradientMove 3s ease infinite;
        }
        
        @keyframes gradientMove {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>
    </div>
  );
}
