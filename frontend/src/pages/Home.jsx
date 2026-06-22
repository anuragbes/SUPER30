import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import DetailsCard from "@/components/DetailsCard";
import { SkeletonDetailsCard } from "@/components/SkeletonCard";
import {
  CalendarDays,
  Clock,
  FileCheck,
  Target,
  TrendingUp,
  Users,
  ChevronDown,
} from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import Footer from "@/components/Footer";
import FAQ from "@/components/FAQ";
import AnnouncementSection from "@/components/AnnouncementSection";
import UdaanSection from "@/components/UdaanSection";
import Directors from "@/components/Directors";

export function AutoSlider() {
  const [images, setImages] = useState([]);
  const backendURL = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    const fetchPosters = async () => {
      try {
        const res = await axios.get(`${backendURL}/api/admin/posters`);
        if (res.data?.data?.length > 0) {
          setImages(res.data.data.map((p) => p.imageUrl));
        }
      } catch {
        // Silently fall back to default images
      }
    };
    fetchPosters();
  }, [backendURL]);

  return (
    <Carousel
      plugins={[
        Autoplay({
          delay: 3000,
        }),
      ]}
      className="w-full max-w-6xl mx-auto mb-8"
    >
      <CarouselContent>
        {images.map((src, index) => (
          <CarouselItem key={index}>
            <img
              src={src}
              alt={`Slide ${index + 1}`}
              className="w-full h-72 sm:h-80 md:h-160 object-contain bg-transparent rounded-xl"
            />
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}

const formatDateForDisplay = (dateString) => {
  if (!dateString) return "To Be Announced";
  const [year, month, day] = dateString.split("-");
  return `${day}-${month}-${year}`;
};

const formatDateWithOrdinal = (dateString) => {
  if (!dateString) return "To Be Announced";
  const [year, month, day] = dateString.split("-");
  const date = new Date(year, month - 1, day);
  const d = date.getDate();
  const ordinal = (d > 3 && d < 21) ? 'th' : ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'][d % 10];
  const monthName = date.toLocaleDateString('en-US', { month: 'long' });
  return `${d}${ordinal} ${monthName}, ${year}`;
};

const getDayOfWeek = (dateString) => {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-");
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
};

export default function Home() {
  const navigate = useNavigate();
  const backendURL = import.meta.env.VITE_BACKEND_URL;

  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get(`${backendURL}/api/admin/exam-settings`);
        setSettings(res.data);
      } catch {
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [backendURL]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Eagerly preload both hero images so they are ready the moment `loading` becomes false */}
      <div style={{ display: 'none' }}>
        <img src="/images/hero-junior.webp" alt="preload" />
        <img src="/images/hero.webp" alt="preload" />
      </div>

      {/* ---- Under Maintenance Tag ---- */}
      {/* <div className="fixed top-2 right-2 sm:top-4 sm:right-4 z-50 bg-red-500 text-white py-1 px-2 sm:py-2 sm:px-4 rounded-md sm:rounded-lg font-semibold text-[10px] sm:text-sm shadow-md">
        🚧 Under Maintenance
      </div> */}

      {/* ---- Navbar ---- */}
      <header
        className="fixed top-0 left-0 w-full z-40 transition-all duration-300 px-2 sm:px-15 py-3 flex justify-between items-center border-b border-gray-300"
        style={{
          background: "oklch(0.98 0.001 70 / 0.35)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
        }}
      >
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate("/")}
        >
          <img
            src="/images/logo.jpg"
            alt="British School – Gurukul Logo"
            className="h-12 sm:h-10 md:h-12 object-contain"
          />

          <span className="text-xs sm:text-xl md:text-2xl font-bold text-[#00afd0]">
            British School – Gurukul
          </span>
        </div>
      </header>

      <div className="mt-10 pt-12">
        <div className="max-w-8xl mx-auto px-2 grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          {/* AutoSlider */}
          <div className="lg:col-span-2">
            <AutoSlider />
          </div>

          {/* Redirect Dialog */}
          <div className="flex h-100 sm:h-80 md:h-160 items-center justify-center">
            <div className="bg-gray-100 border border-gray-300 shadow-md rounded-2xl mb-8 sm:mb-9 w-full max-w-sm text-center flex flex-col h-full overflow-hidden">
              {/* Scrollable Announcements */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                <AnnouncementSection compact={true} />
              </div>

              {/* Fixed Bottom Section */}
              <div className="border-t border-gray-300 p-4 sm:p-6 bg-white rounded-b-2xl">
                <h3 className="text-lg font-semibold mb-3">
                  Student Performance Report
                </h3>

                <p className="text-sm text-gray-500 mb-4">
                  Track Your Performance
                </p>

                <Button
                  onClick={() =>
                    window.open(
                      "https://bsgurukul.etutor.co",
                      "_blank",
                      "noopener,noreferrer",
                    )
                  }
                  className="w-full bg-[#00afd0] hover:bg-[#0295b3] text-white"
                >
                  Go to Login Page
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Hero Section ---- */}
      <section className="relative flex items-center bg-gray-100 border-t border-gray-300 pt-6 pb-8 sm:pt-10 sm:pb-12">
        <div className="w-full px-4 sm:px-6 flex justify-center relative">
          {loading ? (
            <div className="w-full max-w-xs sm:max-w-md md:max-w-2xl h-48 sm:h-64 md:h-80 animate-pulse bg-gray-200 rounded-2xl" />
          ) : (
            <div className="relative inline-block">
              <img
                src={settings?.formMode === "junior" ? "/images/hero-junior.webp" : "/images/hero.webp"}
                alt="SUPER30 Poster"
                className={
                  settings?.formMode === "junior"
                    ? "w-full max-w-xs sm:max-w-lg md:max-w-2xl lg:max-w-4xl h-auto object-contain"
                    : "w-full max-w-xs sm:max-w-sm md:max-w-lg lg:max-w-2xl h-auto object-contain"
                }
              />
              <button
                onClick={() => {
                  const el = document.getElementById("register-cta");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className="absolute -bottom-12 -right-2 sm:-bottom-12 sm:-right-8 lg:-bottom-18 lg:-right-40 flex items-center gap-1.5 sm:gap-2 bg-white/95 backdrop-blur-md shadow-xl border border-[#00afd0]/20 px-3 py-1.5 sm:px-6 sm:py-3 rounded-full text-[#00afd0] hover:bg-[#00afd0] hover:text-white transition-all duration-300 z-10 font-semibold text-[11px] sm:text-sm group"
              >
                <span>Go to registration form</span>
                <ChevronDown strokeWidth={2.5} className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ---- About UDAAN Section ---- */}
      <UdaanSection
        registrationOpen={settings?.registrationOpen}
        loading={loading}
        examDate={settings?.examDate ? formatDateWithOrdinal(settings.examDate) : "To Be Announced"}
      />

      {/* ---- Exam Details Section ---- */}
      <section className="py-12 bg-white border-y border-gray-300">
        <div className="max-w-7xl mx-auto px-4 w-full">
          <div className="flex items-center gap-3 mb-10">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileCheck className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--section-title))]">
              Exam Details
            </h2>
            <div className="flex-1 h-px bg-border ml-4" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading
              ? Array(6)
                .fill(0)
                .map((_, i) => <SkeletonDetailsCard key={i} />)
              : [
                {
                  icon: <Users className="w-10 h-10 text-[#00afd0]" />,
                  title: "Eligibility",
                  text: (
                    <>
                      {/* To Be Announced */}
                      Class 8th, 9th and 10th
                      {/* <br />
                        Class 11th to 12th Moving Students */}
                    </>
                  ),
                },
                {
                  icon: <Target className="w-10 h-10 text-[#00afd0]" />,
                  title: "Target",
                  // text: "To Be Announced",
                  // text: "JEE Main/Advanced, NEET (UG) - 2027 / 2028",
                  text: (
                    <>
                      JEE Main/Advanced
                      <br />
                      Olympiads / NEET (UG)
                    </>
                  ),
                },
                {
                  icon: <CalendarDays className="w-10 h-10 text-[#00afd0]" />,
                  title: "Exam Date",
                  text: settings?.examDate ? (
                    <>
                      {formatDateForDisplay(settings.examDate)}
                      <br />
                      <span className="text-sm">({getDayOfWeek(settings.examDate)})</span>
                    </>
                  ) : (
                    "To Be Announced"
                  ),
                },
                {
                  icon: <Clock className="w-10 h-10 text-[#00afd0]" />,
                  title: "Exam Time & Mode",
                  text: (
                    <>
                      {/* To Be Announced */}
                      09:00 AM - 11:00 AM • Offline (At Center)
                      {/* <br />
                        <span className="text-sm text-muted-foreground">
                          Reporting Time: 09:00 AM
                        </span> */}
                    </>
                  ),
                },
                {
                  icon: <TrendingUp className="w-10 h-10 text-[#00afd0]" />,
                  title: "Last Date to Register",
                  text:
                    formatDateForDisplay(settings?.lastDateToRegister) ||
                    "To Be Announced",
                },
                {
                  icon: <FileCheck className="w-10 h-10 text-[#00afd0]" />,
                  title: "Result Date",
                  text:
                    formatDateForDisplay(settings?.resultDate) ||
                    "To Be Announced",
                },
              ].map((card, i) => (
                <DetailsCard
                  key={i}
                  icon={card.icon}
                  title={card.title}
                  text={card.text}
                />
              ))}
          </div>
        </div>
      </section>

      {/* ---- FAQ Section ---- */}
      <FAQ mode={settings?.formMode || "senior"} />

      {/* ---- Directors Section ---- */}
      <Directors />

      {/* ---- Footer ---- */}
      <Footer />
    </div>
  );
}
