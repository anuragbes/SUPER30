import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminLayout() {
  const [isOpen, setIsOpen] = useState(false); // Mobile drawer state
  const [isCollapsed, setIsCollapsed] = useState(true); // Desktop sidebar state default collapsed
  const navigate = useNavigate();

  const handleToggleSidebar = () => {
    if (window.innerWidth >= 768) {
      setIsCollapsed(!isCollapsed);
    } else {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-background">
      {/* Top Navbar */}
      <header className="fixed top-0 left-0 w-full h-16 md:h-20 z-50 bg-card border-b border-border flex items-center px-0 py-3 transition-all duration-300">
        {/* Hamburger Container (aligned with Sidebar width) */}
        <div 
          className={`flex items-center pl-4 md:pl-6 h-full transition-all duration-300 shrink-0 ${
            isCollapsed ? "w-16 md:w-20" : "w-16 md:w-64"
          }`}
        >
          {/* Hamburger Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleSidebar}
            className="h-10 w-10 -ml-2 text-muted-foreground hover:text-primary hover:bg-primary/10"
          >
            <Menu size={24} />
          </Button>
        </div>

        {/* Logo + School Name Container (aligned with Page Content padding) */}
        <div className="flex-1 flex items-center h-full pl-4 sm:pl-6 md:pl-8 border-l border-border/40">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <img
              src="/images/logo.jpg"
              alt="British School – Gurukul Logo"
              className="h-8 sm:h-10 md:h-12 object-contain"
            />
            <span className="text-lg sm:text-xl md:text-2xl font-bold text-primary font-sans leading-none">
              British School – Gurukul
            </span>
          </div>
        </div>
      </header>

      {/* Sidebar + Main Content Layout Container */}
      <div className="flex flex-1 pt-16 md:pt-20 h-full overflow-hidden">
        {/* Sidebar */}
        <Sidebar 
          isOpen={isOpen} 
          setIsOpen={setIsOpen} 
          isCollapsed={isCollapsed} 
          setIsCollapsed={setIsCollapsed} 
        />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
