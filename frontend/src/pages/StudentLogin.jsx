import { useState, useEffect } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import axios from "axios";

export default function StudentLogin() {
    const [phoneNumber, setPhoneNumber] = useState("");
    const [otp, setOtp] = useState("");
    const [step, setStep] = useState("PHONE"); // PHONE or OTP
    const [loading, setLoading] = useState(false);
    const [confirmationResult, setConfirmationResult] = useState(null);
    const navigate = useNavigate();

    const backendURL = import.meta.env.VITE_BACKEND_URL;

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
        setLoading(true);

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
        setLoading(false);
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const result = await confirmationResult.confirm(otp);
            const user = result.user;
            const token = await user.getIdToken();

            // Check if user is already registered in our DB
            const checkRes = await axios.post(`${backendURL}/api/students/check-phone`, {
                phoneNumber: phoneNumber.replace("+91", "") // Send without country code for consistency
            });

            if (checkRes.data.exists) {
                toast.success("Login Successful!");
                // Redirect to dashboard or status page (to be implemented later, for now just home)
                // For now, we assume if they are logging in, they might want to register if not already
                toast.info("You are already registered.");
                // navigate("/student/dashboard"); // Future implementation
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
        setLoading(false);
    };

    return (
        <div className="flex justify-center items-center h-screen bg-gray-50">
            <div className="bg-white shadow-lg rounded-xl p-10 w-[380px] flex flex-col gap-6">
                <h2 className="text-3xl text-center font-semibold pb-2">Student Login</h2>

                <div id="recaptcha-container"></div>

                {step === "PHONE" ? (
                    <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium">Phone Number</label>
                            <Input
                                type="tel"
                                placeholder="Enter 10 digit number"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                required
                                className="rounded-lg p-3"
                                maxLength={10}
                            />
                        </div>
                        <Button disabled={loading || phoneNumber.length < 10} type="submit" className="w-full">
                            {loading ? <Spinner /> : "Send OTP"}
                        </Button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium">Enter OTP</label>
                            <Input
                                type="text"
                                placeholder="Enter 6 digit OTP"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                required
                                className="rounded-lg p-3 text-center tracking-widest text-lg"
                                maxLength={6}
                            />
                        </div>
                        <Button disabled={loading || otp.length < 6} type="submit" className="w-full">
                            {loading ? <Spinner /> : "Verify & Login"}
                        </Button>
                        <Button
                            variant="ghost"
                            type="button"
                            onClick={() => setStep("PHONE")}
                            className="w-full text-sm text-gray-500"
                        >
                            Change Phone Number
                        </Button>
                    </form>
                )}
            </div>
        </div>
    );
}
