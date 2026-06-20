import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";


import RegisterStudent from "./pages/RegisterStudent";
import Success from "./pages/Success";
import Dashboard from "./pages/admin/Dashboard";
import StudentsList from "./pages/admin/StudentsList";
import AdminLogin from "./pages/admin/adminLogin";
import AdminRoute from "./auth/AdminRoute";
import ClerkAuthRoute from "./auth/ClerkAuthRoute";

import { Toaster } from "sonner";
import Home from "./pages/Home";
import Announcements from "./pages/admin/Announcements";
import Posters from "./pages/admin/Posters";
import AdminLayout from "./components/AdminLayout";

export default function App() {
  useEffect(() => {
    localStorage.removeItem("adminToken");
  }, []);

  return (
    <>
      <BrowserRouter>
        <Routes>

          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/success/:studentId" element={<Success />} />

          {/* Protected Routes (Clerk auth or Admin) */}
          <Route element={<ClerkAuthRoute />}>
            <Route path="/register" element={<RegisterStudent />} />
          </Route>

          {/* Admin Login Route */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Admin Protected Routes */}
          <Route element={<AdminRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin/dashboard" element={<Dashboard />} />
              <Route path="/admin/students" element={<StudentsList />} />
              <Route path="/admin/announcements" element={<Announcements />} />
              <Route path="/admin/posters" element={<Posters />} />
            </Route>
          </Route>

        </Routes>
      </BrowserRouter>

      <Toaster richColors position="top-center" />
    </>
  );
}
