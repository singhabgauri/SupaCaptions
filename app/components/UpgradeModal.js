"use client";
import { useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function UpgradeModal({ isOpen, onClose, usageData = {} }) {
  const router = useRouter();
  const modalRef = useRef(null);
  
  const handleUpgrade = () => {
    onClose();
    // Will implement this later
    alert("Payment integration will be implemented soon!");
    // router.push('/pricing');
  };
  
  // Close when clicking outside the modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);
  
  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);
  
  const freeLimit = usageData?.freeLimit || 5;
  const usedCount = usageData?.usedCount || 0;
  const percentUsed = Math.min(100, (usedCount / freeLimit) * 100);
  
  if (!isOpen) return null;

  return (
    <div className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" />

        {/* Modal */}
        <div 
          ref={modalRef}
          className="relative inline-block align-bottom bg-gradient-to-b from-gray-900 to-black border border-violet-500/20 rounded-2xl px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6"
        >
          <div>
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-violet-600/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="mt-3 text-center sm:mt-5">
              <h3 className="text-2xl leading-6 font-bold text-white">
                Upgrade to Pro
              </h3>
              <div className="mt-4">
                <p className="text-white/70">
                  You've reached your free limit of {freeLimit} videos.
                </p>
                
                {/* Usage bar */}
                <div className="mt-6 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/70">{usedCount} videos used</span>
                    <span className="text-white/70">{freeLimit} videos total</span>
                  </div>
                  <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-violet-600 to-blue-600" 
                      style={{ width: `${percentUsed}%` }}
                    ></div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-white/5 rounded-xl">
                  <h4 className="text-lg font-semibold mb-2">Pro Plan Benefits:</h4>
                  <ul className="space-y-2 text-left">
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-violet-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"></path>
                      </svg>
                      <span className="text-white/70">Unlimited video processing</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-violet-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"></path>
                      </svg>
                      <span className="text-white/70">Higher resolution output (1080p)</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-violet-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"></path>
                      </svg>
                      <span className="text-white/70">Priority processing</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 sm:mt-8 sm:grid sm:grid-cols-2 sm:gap-3">
            <button
              type="button"
              className="w-full inline-flex justify-center rounded-xl px-4 py-3 bg-violet-600 hover:bg-violet-700 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 sm:text-sm"
              onClick={handleUpgrade}
            >
              Upgrade Now
            </button>
            <button
              type="button"
              className="mt-3 sm:mt-0 w-full inline-flex justify-center rounded-xl bg-white/10 hover:bg-white/20 px-4 py-3 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 sm:text-sm"
              onClick={onClose}
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}