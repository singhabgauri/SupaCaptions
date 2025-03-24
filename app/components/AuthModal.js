"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ isOpen, onClose }) {
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const { signIn, signUp, signInWithGoogle } = useAuth();
  
  // Prevent hydration errors
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted || !isOpen) return null;
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      if (isSignUp) {
        const { error } = await signUp({ email, password });
        if (error) throw error;
        // Show confirmation message
        setError({ message: "Check your email for a confirmation link!", type: "success" });
      } else {
        const { error } = await signIn({ email, password });
        if (error) throw error;
        onClose();
      }
    } catch (error) {
      setError({ message: error.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };
  
  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      const { error } = await signInWithGoogle();
      if (error) throw error;
    } catch (error) {
      setError({ message: error.message, type: "error" });
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        ></div>
        
        {/* Modal */}
        <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-gradient-to-b from-gray-900 to-black p-6 text-left align-middle shadow-xl transition-all border border-white/10">
          <div className="mb-6 text-center">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
              {isSignUp ? "Create Account" : "Sign In"}
            </h3>
            <p className="mt-2 text-white/60">
              {isSignUp 
                ? "Create an account to save your videos" 
                : "Sign in to continue to SupaCaptions"}
            </p>
          </div>
          
          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center space-x-2 bg-white text-gray-800 hover:bg-gray-100 py-3 px-4 rounded-xl mb-4 transition-colors font-medium"
            disabled={loading}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
              <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
              </g>
            </svg>
            <span>Continue with Google</span>
          </button>
          
          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-900 text-white/50">Or continue with email</span>
            </div>
          </div>
          
          {/* Error Message */}
          {error && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${
              error.type === "success" 
                ? "bg-green-500/20 text-green-200 border border-green-500/30" 
                : "bg-red-500/20 text-red-200 border border-red-500/30"
            }`}>
              {error.message}
            </div>
          )}
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-1">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                className="w-full px-4 py-2 bg-white/10 border border-white/10 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-white"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white/80 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                className="w-full px-4 py-2 bg-white/10 border border-white/10 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-white"
                placeholder="••••••••"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            
            <button
              type="submit"
              className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-700 rounded-xl text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : isSignUp ? "Create Account" : "Sign In"}
            </button>
          </form>
          
          {/* Toggle Sign In/Sign Up */}
          <div className="mt-4 text-center text-sm">
            <p className="text-white/60">
              {isSignUp 
                ? "Already have an account?" 
                : "Don't have an account?"}
              {" "}
              <button 
                className="text-violet-400 hover:text-violet-300 font-medium"
                onClick={() => setIsSignUp(!isSignUp)}
              >
                {isSignUp ? "Sign in" : "Sign up"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}