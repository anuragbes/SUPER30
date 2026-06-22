import { useAuth } from "@clerk/clerk-react";
import { Outlet, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { axiosInstance } from "@/lib/axios";

export default function ClerkAuthRoute() {
  const { isSignedIn, isLoaded: isClerkLoaded } = useAuth();
  const [isAdmin, setIsAdmin] = useState(null);

  useEffect(() => {
    if (!isClerkLoaded) return;

    // If already signed in via Clerk, skip the admin check entirely
    if (isSignedIn) {
      setIsAdmin(false); // set to false to resolve loading state
      return;
    }

    const checkAdmin = async () => {
      try {
        await axiosInstance.get("/api/admin/me");
        setIsAdmin(true);
      } catch {
        setIsAdmin(false);
      }
    };
    
    checkAdmin();
  }, [isClerkLoaded, isSignedIn]);

  // Show loading while Clerk is initializing or checking admin
  if (!isClerkLoaded || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Check if user is authenticated (Clerk or Admin)
  const isAuthenticated = isSignedIn || isAdmin;

  // If not authenticated, redirect to home
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // If authenticated, render the nested routes
  return <Outlet />;
}