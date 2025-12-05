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
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from "../firebase";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

const images = [
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
      className="w-full max-w-6xl mx-auto"
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

  // Login State
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("PHONE"); // PHONE or OTP
  const [loginLoading, setLoginLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);

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

  useEffect(() => {
    // Initialize Recaptcha
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
        callback: () => {
          // reCAPTCHA solved
        },
      });
    }
  }, []);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoginLoading(true);

    const formattedPhone = phoneNumber.startsWith("+91") ? phoneNumber : `+91${phoneNumber}`;

    try {
      const appVerifier = window.recaptchaVerifier;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      setStep("OTP");
      toast.success("OTP sent successfully!");
    } catch (error) {
      console.error("Error sending OTP:", error);
      toast.error("Failed to send OTP. Try again.");
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.render().then(widgetId => {
          window.grecaptcha.reset(widgetId);
        });
      }
    }
    setLoginLoading(false);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoginLoading(true);

    try {
      const result = await confirmationResult.confirm(otp);
      const user = result.user;
      const token = await user.getIdToken();

      // Check if user is already registered in our DB
      const checkRes = await axios.post(`${backendURL}/api/students/check-phone`, {
        phoneNumber: phoneNumber.replace("+91", "") // Send without country code for consistency
      });

      if (checkRes.data.exists) {
        toast.info("You are already registered.");
        // Optional: Redirect to dashboard if implemented
      } else {
        toast.success("Phone verified! Proceeding to registration.");
        navigate("/register");
      }

      // Store token for subsequent requests
      localStorage.setItem("studentToken", token);

    } catch (error) {
      console.error("Error verifying OTP:", error);
      toast.error("Invalid OTP");
    }
    setLoginLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col">

      {/* ---- Navbar ---- */}
      <header
        className="fixed top-0 left-0 w-full z-50 transition-all duration-300 px-2 sm:px-15 py-3 flex justify-between items-center"
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

          <span className="text-xs sm:text-xl md:text-2xl font-bold text-blue-700">
            British School – Gurukul
          </span>
        </div>

        <Button
          variant="glass"
          className="hidden sm:flex"
          onClick={() => navigate("/login")}
        >
          Student Login
        </Button>
      </header>

      {/* ---- Hero Section ---- */}
      <section className="min-h-[70vh] flex items-center pt-20 bg-blue-50">
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

                <div id="recaptcha-container"></div>

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
                  // Embedded Login Flow
                  <div className="w-full">
                    {step === "PHONE" ? (
                      <form onSubmit={handleSendOtp} className="flex flex-col gap-3">
                        <Input
                          type="tel"
                          placeholder="Enter Mobile Number"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          required
                          className="rounded-lg p-3 border-slate-200"
                          maxLength={10}
                        />
                        <Button
                          disabled={loginLoading || phoneNumber.length < 10}
                          type="submit"
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                        >
                          {loginLoading ? <Spinner /> : "Verify & Register"}
                        </Button>
                      </form>
                    ) : (
                      <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3">
                        <Input
                          type="text"
                          placeholder="Enter OTP"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          required
                          className="rounded-lg p-3 text-center tracking-widest text-lg border-slate-200"
                          maxLength={6}
                        />
                        <Button
                          disabled={loginLoading || otp.length < 6}
                          type="submit"
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                        >
                          {loginLoading ? <Spinner /> : "Verify OTP"}
                        </Button>
                        <Button
                          variant="ghost"
                          type="button"
                          onClick={() => setStep("PHONE")}
                          className="w-full text-sm text-gray-500 hover:text-gray-700"
                        >
                          Change Phone Number
                        </Button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </div>
            {/* Mobile Student Login Text */}
            <div className="block sm:hidden text-right text-sm">
              <button
                onClick={() => navigate("/login")}
                className="text-blue-600 font-semibold underline"
              >
                Already Registered? Login
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-10">
        <AutoSlider />
      </div>


      {/* ---- Exam Details Section ---- */}
      <section className="min-h-screen flex items-center py-10 bg-white">
        <div className="max-w-7xl mx-auto px-4 w-full">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">
            Exam Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <DetailsCard
              icon={<Users className="w-10 h-10 text-blue-700" />}
              title="Eligibility"
              text="Class 10th to 11th Moving Students"
            />

            <DetailsCard
              icon={<Target className="w-10 h-10 text-blue-700" />}
              title="Target"
              text="JEE Main/Advanced, NEET (UG) - 2028"
            />

            <DetailsCard
              icon={<CalendarDays className="w-10 h-10 text-blue-700" />}
              title="Exam Date"
              text={
                formatDateForDisplay(settings?.examDate) || "To Be Announced"
              }
            />

            <DetailsCard
              icon={<Clock className="w-10 h-10 text-blue-700" />}
              title="Exam Time & Mode"
              text="9:00 AM – 12:00 PM • Offline (At Center)"
            />

            <DetailsCard
              icon={<TrendingUp className="w-10 h-10 text-blue-700" />}
              title="Last Date to Register"
              text={
                formatDateForDisplay(settings?.lastDateToRegister) ||
                "To Be Announced"
              }
            />

            <DetailsCard
              icon={<FileCheck className="w-10 h-10 text-blue-700" />}
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