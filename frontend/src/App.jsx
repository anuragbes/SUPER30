import { BrowserRouter, Routes, Route } from "react-router-dom";

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

          {/* Student-facing Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<RegisterStudent />} />
          <Route path="/success/:studentId" element={<Success />} />

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
