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
} from "lucide-react";
import RegisterIcon from "@/assets/register.svg";
import FAQ from "@/components/FAQ";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import Footer from "@/components/Footer";
import Result from "@/assets/result.svg";
import {
  SignedIn,
  SignedOut,
  SignIn,
  useAuth,
  useClerk,
} from "@clerk/clerk-react";
import AnnouncementSection from "@/components/AnnouncementSection";

const images = [
  "/images/poster10.webp",
  "/images/poster11.webp",
  "/images/poster12.webp",
  "/images/poster13.webp",
  "/images/poster14.webp",
  "/images/poster9.webp",
  "/images/poster8.webp",
  "/images/poster1.webp",
  "/images/poster2.webp",
  "/images/poster3.webp",
  "/images/poster4.jpg",
  "/images/poster5.jpg",
  "/images/poster6.jpg",
];

export function AutoSlider() {
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

export default function Home() {
  const navigate = useNavigate();
  const backendURL = import.meta.env.VITE_BACKEND_URL;

  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const { isSignedIn } = useAuth();
  const { openSignIn } = useClerk();

  useEffect(() => {
    if (isSignedIn) {
      navigate("/register");
    }
  }, [isSignedIn, navigate]);

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
      <section className="min-h-[70vh] flex items-center pt-20 bg-gray-100 border-t border-gray-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:pr-8 lg:pl-0 py-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-0 lg:gap-6 items-center">
            {/* Left Image */}
            <div className="flex justify-center lg:justify-start">
              <img
                src="/images/hero.webp"
                alt="SUPER30 Poster"
                className="w-full max-w-xl sm:max-w-xl lg:max-w-xl object-contain"
              />
            </div>

            {/* Registration Card */}
            <div className="flex justify-center lg:justify-end mt-8 mb-1 lg:mt-0 lg:mb-0">
              <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-sm border border-slate-300 shadow-md">
                {/* Icon */}
                <div className="flex justify-center mb-4 sm:mb-6">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
                    <img
                      src={RegisterIcon}
                      alt="Register Icon"
                      className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
                    />
                  </div>
                </div>

                <h3 className="text-xl sm:text-xl font-bold text-gray-700 text-center mb-2 sm:mb-3">
                  Register for SUPER30
                </h3>

                {loading ? (
                  <p className="text-center text-gray-500">Loading...</p>
                ) : !settings?.registrationOpen ? (
                  <>
                    <Button
                      disabled
                      className="w-full bg-gray-200 text-gray-700 cursor-not-allowed"
                    >
                      Registration Closed
                    </Button>
                    <p className="text-center text-sm text-gray-500 mt-3">
                      The exam has been conducted for this year
                    </p>
                  </>
                ) : (
                  <div className="w-full">
                    <SignedOut>
                      <Button
                        onClick={() =>
                          openSignIn({
                            routing: "virtual",
                            signUpUrl: null,
                            appearance: {
                              elements: {
                                footerAction: "hidden",
                              },
                            },
                          })
                        }
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                      >
                        Register
                      </Button>
                    </SignedOut>

                    <SignedIn>
                      <Button
                        onClick={() => navigate("/register")}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                      >
                        Continue to Registration
                      </Button>
                    </SignedIn>

                    <p className="text-center text-sm text-gray-500 mt-3">
                      The exam has been conducted for this year
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

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
                      To Be Announced
                        {/* Class 10th to 11th Moving Students
                        <br />
                        Class 11th to 12th Moving Students */}
                      </>
                    ),
                  },
                  {
                    icon: <Target className="w-10 h-10 text-[#00afd0]" />,
                    title: "Target",
                    text: "To Be Announced",
                    // text: "JEE Main/Advanced, NEET (UG) - 2027 / 2028",
                  },
                  {
                    icon: <CalendarDays className="w-10 h-10 text-[#00afd0]" />,
                    title: "Exam Date",
                    text:
                      formatDateForDisplay(settings?.examDate) ||
                      "To Be Announced",
                  },
                  {
                    icon: <Clock className="w-10 h-10 text-[#00afd0]" />,
                    title: "Exam Time & Mode",
                    text: (
                      <>
                      To Be Announced
                        {/* 10:00 AM • Offline (At Center) */}
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
      <FAQ />

      {/* ---- Footer ---- */}
      <Footer />
    </div>
  );
}
