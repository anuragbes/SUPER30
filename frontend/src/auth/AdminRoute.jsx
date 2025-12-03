import { Navigate, Outlet } from "react-router-dom";

export default function AdminRoute() {
  const token = localStorage.getItem("adminToken");

  // If token exists → allow access to protected pages
  return token ? <Outlet /> : <Navigate to="/admin/login" replace />;
}