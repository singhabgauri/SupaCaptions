'use client';

import { useEffect } from 'react';

export function ErrorHandler() {
  useEffect(() => {
    // Store original console error
    const originalConsoleError = console.error;
    
    // Replace console.error to filter out known router errors
    console.error = function filterErrors(...args) {
      // If this is a Next.js Router error during unmounting, suppress it
      const errorString = args.join(' ');
      if (
        errorString.includes('Cannot read properties of null') ||
        errorString.includes('Cancel rendering route') ||
        errorString.includes('aborted') ||
        errorString.includes('isNextRouterError')
      ) {
        // Suppress the noise
        return;
      }
      
      // Otherwise pass through to original handler
      return originalConsoleError.apply(console, args);
    };
    
    // Clean up when component unmounts
    return () => {
      console.error = originalConsoleError;
    };
  }, []);
  
  return null;
}