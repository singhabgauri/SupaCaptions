"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Handle the callback
    const processAuth = async () => {
      try {
        const { error } = await supabase.auth.getSession();
        if (error) console.error("Auth error:", error);
      } catch (err) {
        console.error("Failed to process auth callback:", err);
      } finally {
        // Redirect back to app regardless of result
        setTimeout(() => {
          router.push("/app");
        }, 100);
      }
    };

    processAuth();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black flex items-center justify-center">
      <div className="text-center text-white">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-violet-400 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
          <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
            Loading...
          </span>
        </div>
        <p className="mt-4 text-lg font-medium">Completing authentication...</p>
        <p className="text-white/50">You will be redirected shortly</p>
      </div>
    </div>
  );
}