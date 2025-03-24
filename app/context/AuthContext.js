"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// Create Supabase client with default browser storage
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      setLoading(false);
    };

    getSession();

    // Listen for authentication state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    signUp: (data) => supabase.auth.signUp(data),
    signIn: (data) => supabase.auth.signInWithPassword(data),
    signInWithGoogle: () => 
      supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      }),
    signOut: () => supabase.auth.signOut(),
    user,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  return useContext(AuthContext);
};