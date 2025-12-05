import { BrowserRouter, Routes, Route } from "react-router-dom";

import StudentLogin from "./pages/StudentLogin";
import StudentRoute from "./auth/StudentRoute";

import RegisterStudent from "./pages/RegisterStudent";
import Success from "./pages/Success";
import Dashboard from "./pages/Dashboard";
import StudentsList from "./pages/StudentsList";
import AdminLogin from "./pages/admin/adminLogin";
import AdminRoute from "./auth/AdminRoute";

import { Toaster } from "sonner";
import Home from "./pages/Home";

export default function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>

          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<StudentLogin />} />

          {/* Protected Student Routes */}
          <Route element={<StudentRoute />}>
            <Route path="/register" element={<RegisterStudent />} />
            <Route path="/success/:studentId" element={<Success />} />
          </Route>

          {/* Admin Login Route */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Admin Protected Routes */}
          <Route element={<AdminRoute />}>
            <Route path="/admin/dashboard" element={<Dashboard />} />
            <Route path="/admin/students" element={<StudentsList />} />
          </Route>

        </Routes>
      </BrowserRouter>

      <Toaster richColors position="top-center" />
    </>
  );
}
