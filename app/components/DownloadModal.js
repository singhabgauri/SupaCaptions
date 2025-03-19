'use client';

import { useState } from 'react';

export default function DownloadModal({ show, onClose, downloadUrl }) {
  if (!show) return null;
  
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full mx-4 border border-white/20">
        <h3 className="text-xl font-semibold text-white mb-4">Download Your Video</h3>
        <p className="text-white/80 mb-6">
          Some browsers restrict automatic downloads. Please use one of these options:
        </p>
        
        <div className="space-y-4">
          <div className="p-4 bg-white/5 rounded-lg">
            <h4 className="font-medium text-white mb-2">Option 1: Right-click and Save</h4>
            <p className="text-sm text-white/70 mb-3">
              Right-click the button below and select &ldquo;Save link as...&rdquo;
            </p>
            <a 
              href={downloadUrl}
              download
              className="block w-full text-center py-2 bg-violet-600 hover:bg-violet-700 text-white rounded"
            >
              Right-click to Save Video
            </a>
          </div>
          
          <div className="p-4 bg-white/5 rounded-lg">
            <h4 className="font-medium text-white mb-2">Option 2: Copy Link</h4>
            <p className="text-sm text-white/70 mb-3">
              Copy this link and paste it in a new browser tab:
            </p>
            <div className="flex">
              <input 
                type="text" 
                value={downloadUrl} 
                readOnly
                className="flex-1 bg-black/30 border border-white/10 text-white/90 px-3 py-2 rounded-l text-sm"
              />
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(downloadUrl);
                  alert('Link copied to clipboard!');
                }}
                className="bg-violet-600 hover:bg-violet-700 px-4 rounded-r"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}