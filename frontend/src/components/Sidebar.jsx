import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  Bell, 
  Image as ImageIcon, 
  LogOut, 
  Menu, 
  X, 
  ChevronLeft,
  ChevronRight,
  Home
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Sidebar({ isOpen, setIsOpen, isCollapsed, setIsCollapsed }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    navigate("/admin/login");
  };

  const navLinks = [
    { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Students List", path: "/admin/students", icon: Users },
    { name: "Announcements", path: "/admin/announcements", icon: Bell },
    { name: "Posters", path: "/admin/posters", icon: ImageIcon },
  ];

  const SidebarContent = ({ isMobile = false }) => {
    const collapsed = isMobile ? false : isCollapsed;
    
    return (
    <div className="flex flex-col h-full bg-card border-r border-border text-foreground transition-all duration-300">
      {/* Mobile-only Header */}
      <div className="flex md:hidden items-center justify-between p-4 border-b border-border h-16 shrink-0">
        <span className="font-bold text-primary">Admin Panel</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 p-1 text-muted-foreground hover:text-primary"
          onClick={() => setIsOpen(false)}
        >
          <X size={24} />
        </Button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <Link
          to="/"
          className={`
            flex items-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all duration-300 mb-4 w-full h-12 px-3.5 mx-auto
            ${collapsed ? "max-w-12" : "max-w-[232px] md:max-w-full"}
          `}
          title={collapsed ? "Back to Home" : undefined}
          onClick={() => setIsOpen(false)} // Close mobile menu if open
        >
          <Home size={20} className="shrink-0" />
          <span 
            className={`
              whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out font-medium
              ${collapsed ? "max-w-0 opacity-0 ml-0 pointer-events-none" : "max-w-48 opacity-100 ml-3"}
            `}
          >
            Back to Home
          </span>
        </Link>
        
        {navLinks.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.name}
              to={link.path}
              onClick={() => setIsOpen(false)} // Close mobile menu on click
              title={collapsed ? link.name : undefined}
              className={`
                flex items-center rounded-lg transition-all duration-300 w-full h-12 px-3.5 mx-auto
                ${collapsed ? "max-w-12" : "max-w-[232px] md:max-w-full"}
                ${isActive 
                  ? "bg-primary/10 text-primary font-semibold" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground font-medium"
                }
              `}
            >
              <link.icon size={20} className="shrink-0" />
              <span 
                className={`
                  whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out
                  ${collapsed ? "max-w-0 opacity-0 ml-0 pointer-events-none" : "max-w-48 opacity-100 ml-3"}
                `}
              >
                {link.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-border flex justify-center w-full">
        <Button
          onClick={handleLogout}
          variant="destructive"
          className={`
            flex items-center justify-center transition-all duration-300 w-full h-12 mx-auto
            ${collapsed ? "max-w-12 p-0 rounded-lg" : "max-w-[232px] md:max-w-full px-3.5 rounded-lg"}
          `}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut size={18} className="shrink-0" />
          <span 
            className={`
              whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out font-medium
              ${collapsed ? "max-w-0 opacity-0 ml-0 pointer-events-none" : "max-w-48 opacity-100 ml-2"}
            `}
          >
            Logout
          </span>
        </Button>
      </div>
    </div>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside 
        className={`hidden md:block h-full transition-all duration-300 z-40 ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside 
        className={`md:hidden fixed inset-y-0 left-0 w-64 bg-card z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent isMobile={true} />
      </aside>
    </>
  );
}
