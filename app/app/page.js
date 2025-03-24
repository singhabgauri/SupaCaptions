"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import UploadForm from '../components/UploadForm';
import { useAuth } from '../context/AuthContext';

export default function AppPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  // If you want to enforce authentication, uncomment this:
  /*
  useEffect(() => {
    if (!loading && !user) {
      // Redirect to homepage if not logged in
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null; // This prevents flash of content before redirect
  }
  */
  
  return <UploadForm />;
}