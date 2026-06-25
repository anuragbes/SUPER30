import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { axiosInstance } from "@/lib/axios";
import { Spinner } from "@/components/ui/spinner";

export default function AdminRoute() {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    const verifySession = async () => {
      try {
        await axiosInstance.get("/api/admin/me");
        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
      }
    };
    verifySession();
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/admin/login" replace />;
}