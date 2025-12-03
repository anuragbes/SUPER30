import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { Menu, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    navigate("/admin/login");
  };

  const navLinks = [
    { name: "Home", path:"/"},
    { name: "Dashboard", path: "/admin/dashboard" },
    { name: "Students List", path: "/admin/students" },
    { name: "Register Student", path: "/register" },
  ];

  return (
    <header
      className="fixed top-0 left-0 w-full z-50 shadow-lg transition-all duration-300"
      style={{
        background: "oklch(0.98 0.001 70 / 0.35)", 
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)", 
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
        {/* Logo / Title */}
        <div
          className="text-xl sm:text-2xl font-bold text-blue-600 cursor-pointer truncate"
          onClick={() => navigate("/admin/dashboard")}
        >
          British School - Gurukul
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              className={`
                px-3 py-2 font-medium tracking-wide transition-all duration-200 whitespace-nowrap
                ${location.pathname === link.path
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500 hover:text-blue-500"}
              `}
            >
              {link.name}
            </Link>
          ))}

          <Button
            onClick={handleLogout}
            variant="destructive"
            size="sm"
            className="ml-4 flex items-center gap-2"
          >
            <LogOut size={16} />
            Logout
          </Button>
        </nav>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-9 w-9 p-1 text-gray-700 hover:text-blue-600 hover:bg-blue-50"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </Button>
      </div>

      {/* Mobile Dropdown Menu */}
      {isOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`block px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  location.pathname === link.path
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {link.name}
              </Link>
            ))}

            <Button
              onClick={() => {
                setIsOpen(false);
                handleLogout();
              }}
              variant="destructive"
              size="sm"
              className="w-full flex items-center justify-center gap-2 mt-4"
            >
              <LogOut size={18} /> Logout
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}

