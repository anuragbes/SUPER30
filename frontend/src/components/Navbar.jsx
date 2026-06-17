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
    navigate("/");
  };

  const navLinks = [
    { name: "Home", path:"/"},
    { name: "Dashboard", path: "/admin/dashboard" },
    { name: "Students List", path: "/admin/students" },
    { name: "Announcements", path: "/admin/announcements" },
    { name: "Posters", path: "/admin/posters" },
  ];

  return (
    <header
      className="fixed top-0 left-0 w-full z-50 bg-card border-b border-border transition-all duration-300"
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-10 py-3 flex justify-between items-center">
        {/* Logo / Title */}
        <div
          className="flex items-center gap-3 cursor-pointer pl-1 sm:pl-2"
          onClick={() => navigate("/")}>
          
          <img
            src="/images/logo.jpg"
            alt="British School – Gurukul Logo"
            className="h-8 sm:h-10 md:h-12 object-contain"
          />

          <span className="text-lg sm:text-xl md:text-2xl font-bold text-primary">
            British School – Gurukul
          </span>
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
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-primary"}
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
          className="md:hidden h-9 w-9 p-1 text-muted-foreground hover:text-primary hover:bg-primary/10"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </Button>
      </div>

      {/* Mobile Dropdown Menu */}
      {isOpen && (
        <div className="md:hidden border-t border-border bg-card shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`block px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  location.pathname === link.path
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted"
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

