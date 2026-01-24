import { useAuth } from "@clerk/clerk-react";
import { Outlet, Navigate } from "react-router-dom";

export default function ClerkAuthRoute() {
  const { isSignedIn, isLoaded } = useAuth();
  const adminToken = localStorage.getItem("adminToken");

  // Show loading while Clerk is initializing
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Check if user is authenticated (Clerk or Admin)
  const isAuthenticated = isSignedIn || adminToken;

  // If not authenticated, redirect to home
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // If authenticated, render the nested routes
  return <Outlet />;
}