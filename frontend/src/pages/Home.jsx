import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import DetailsCard from "@/components/DetailsCard";
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
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import Footer from "@/components/Footer";
import Result from "@/assets/result.svg";
import { SignedIn, SignedOut, SignIn, useAuth, useClerk } from "@clerk/clerk-react";


const images = [
  "/images/poster9.jpeg",
  "/images/poster8.png",
  "/images/poster1.jpeg",
  "/images/poster2.jpeg",
  "/images/poster3.png",
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

      {/* ---- Navbar ---- */}
      <header
        className="fixed top-0 left-0 w-full z-50 transition-all duration-300 px-2 sm:px-15 py-3 flex justify-between items-center border-b border-gray-300"
        style={{
          background: "oklch(0.98 0.001 70 / 0.35)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
        }}
      >
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate("/")}>

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

      {/* ---- Hero Section ---- */}
      <section className="min-h-[70vh] flex items-center pt-20 bg-blue-50 border-b border-gray-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:pr-8 lg:pl-0 py-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-0 lg:gap-6 items-center">

            {/* Left Image */}
            <div className="flex justify-center lg:justify-start">
              <img
                src="/images/hero.png"
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
                    <Button
                      disabled
                      className="w-full bg-gray-200 text-gray-700 cursor-not-allowed"
                    >
                      Registration Closed
                    </Button>
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
                    </div>
                  )}

              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Announcement */}
    <div className="max-w-7xl mx-auto px-4 mt-6 mb-4">
      <div className="bg-blue-100 border border-blue-300 text-blue-900 text-base sm:text-lg md:text-xl rounded-2xl px-6 py-4 text-center font-semibold shadow-sm flex flex-col items-center gap-2">
        {/* Result line */}
        <div className="flex items-center justify-center gap-3">
          <img
            src={Result}
            alt="Result Icon"
            className="w-5 h-5 sm:w-7 sm:h-7"
          />
          <span>
            Result Declared! The examination results have been officially released.
          </span>
        </div>

        {/* New batch line */}
        <div className="flex items-center justify-center gap-2">
          <CalendarDays className="w-5 h-5 sm:w-7 sm:h-7" />
          <span>New batch starts 16 March 2026 (Monday)</span>
        </div>
      </div>


      {/* Check Result */}
      <div className="mt-4 text-center">
        <a
          href="https://www.britishenglishschool.in/result.php"
          target="_blank"
          rel="noopener noreferrer"
          
          className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm sm:text-base hover:bg-blue-700 transition-all duration-200"
        >
          Check Result
        </a>
      </div>
    </div>


      <div className="mt-10">
        <AutoSlider />
      </div>


      {/* ---- Exam Details Section ---- */}
      <section className="py-12 bg-white border-y border-gray-300">
        <div className="max-w-7xl mx-auto px-4 w-full">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">
            Exam Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <DetailsCard
              icon={<Users className="w-10 h-10 text-[#00afd0]" />}
              title="Eligibility"
              text="Class 10th to 11th Moving Students"
            />

            <DetailsCard
              icon={<Target className="w-10 h-10 text-[#00afd0]" />}
              title="Target"
              text="JEE Main/Advanced, NEET (UG) - 2028"
            />

            <DetailsCard
              icon={<CalendarDays className="w-10 h-10 text-[#00afd0]" />}
              title="Exam Date"
              text={
                formatDateForDisplay(settings?.examDate) || "To Be Announced"
              }
            />

            <DetailsCard
              icon={<Clock className="w-10 h-10 text-[#00afd0]" />}
              title="Exam Time & Mode (Revised)"
              text={
                <>
                  11:00 AM – 01:00 PM • Offline (At Center)
                  <br />
                  <span className="text-sm text-muted-foreground">
                    Reporting Time: 10:00 AM
                  </span>
                </>
              }
            />

            <DetailsCard
              icon={<TrendingUp className="w-10 h-10 text-[#00afd0]" />}
              title="Last Date to Register"
              text={
                formatDateForDisplay(settings?.lastDateToRegister) ||
                "To Be Announced"
              }
            />

            <DetailsCard
              icon={<FileCheck className="w-10 h-10 text-[#00afd0]" />}
              title="Result Date"
              text={
                formatDateForDisplay(settings?.resultDate) ||
                "To Be Announced"
              }
            />
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