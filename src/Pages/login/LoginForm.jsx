import React, { useState, useEffect } from "react";
import axios from "axios";
import { Car, Bike, Truck, MapPin, LocateFixed, Navigation, Mail, LogIn, ArrowLeft } from 'lucide-react';
import AOS from 'aos';
import 'aos/dist/aos.css';

export default function Login() {
  const [email, setEmail] = useState("");
  const [currentStep, setCurrentStep] = useState("email"); // 'email' or 'otp'
  const [otp, setOtp] = useState(["", "", "", "", "", ""]); // 6-digit OTP
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpExpiry, setOtpExpiry] = useState(null);
  const [emailError, setEmailError] = useState("");

  useEffect(() => {
    AOS.init({
      duration: 1500,
      once: true,
    });
  }, []);

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    setEmailError("");
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value) || value.length > 1) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const sendOtp = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      if (!validateEmail(email)) {
        throw new Error("Please enter a valid email address");
      }

      // Simulate API call - replace with your actual API endpoint
      const response = await axios.post("https://idharudhar-backend-2.onrender.com/api/auth/send-otp", {
        email: email,
      });

      if (response.data?.exists === false) {
        throw new Error("Email not registered. Please sign up first.");
      }

      const expiryTime = new Date();
      expiryTime.setMinutes(expiryTime.getMinutes() + 5);
      setOtpExpiry(expiryTime);
      setCurrentStep("otp");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to send OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      if (new Date() > otpExpiry) {
        throw new Error("OTP has expired. Please request a new one.");
      }

      const otpCode = otp.join("");

      // Simulate API call - replace with your actual API endpoint
      const response = await axios.post("https://idharudhar-backend-2.onrender.com/api/auth/verify-otp", {
        email: email,
        otp: otpCode,
      });

      if (response.data && response.data.success && response.data.token) {
        localStorage.setItem("authToken", response.data.token);
        localStorage.setItem("userEmail", email);
        window.location.reload();
      } else {
        localStorage.setItem("authToken", response.data.token);
        localStorage.setItem("userEmail", email);
        throw new Error(response.data?.message || "Authentication failed. Please try again.");
    
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Invalid OTP. Please try again.");
      setOtp(["", "", "", "", "", ""]);
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async () => {
    setIsLoading(true);
    setError("");

    try {
      await axios.post("https://idharudhar-backend-2.onrender.com/api/auth/send-otp", {
        email: email,
      });

      const expiryTime = new Date();
      expiryTime.setMinutes(expiryTime.getMinutes() + 5);
      setOtpExpiry(expiryTime);
      setOtp(["", "", "", "", "", ""]);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const remainingMinutes = otpExpiry ? Math.max(0, Math.floor((otpExpiry - new Date()) / 1000 / 60)) : 0;

  return (
    <div data-aos="fade-up" className="min-h-screen bg-[#0B1120] text-white flex items-center justify-center px-4">
      <div className="max-w-5xl w-[900px] bg-[#111827] rounded-2xl shadow-2xl grid md:grid-cols-2 overflow-hidden">
        {/* Left Section */}
        <div className="p-10 flex flex-col justify-center relative min-h-[70vh] w-full max-w-md">
          {/* Background Icons */}
          <div className="absolute top-10 left-10 opacity-10 text-green-500 text-7xl">
            <Car />
          </div>
          <div className="absolute top-24 left-32 opacity-10 text-green-500 text-6xl">
            <Bike />
          </div>
          <div className="absolute bottom-10 left-16 opacity-10 text-green-500 text-6xl">
            <Truck />
          </div>
          <div className="absolute top-1/2 right-10 opacity-10 text-green-500 text-6xl">
            <MapPin />
          </div>
          <div className="absolute top-[30%] left-[65%] opacity-10 text-green-500 text-5xl">
            <Navigation />
          </div>
          <div className="absolute bottom-20 right-20 opacity-10 text-green-500 text-5xl">
            <LocateFixed />
          </div>

          {/* Optional Light Circles */}
          <div className="absolute top-[25%] left-[15%] w-24 h-24 rounded-full bg-green-500 opacity-5 blur-2xl" />
          <div className="absolute bottom-[20%] right-[10%] w-32 h-32 rounded-full bg-green-500 opacity-5 blur-2xl" />

          {/* Text */}
          <h1 className="text-5xl font-bold mb-4 leading-tight z-10">
            Fast, Easy & <br />
            <span className="text-green-400">Secure Rides</span>
          </h1>
          <p className="text-gray-400 text-lg mb-6 z-10">
            Car, Auto, Bike & Porter services – all in one place.
          </p>
        </div>

        {/* Right Section */}
        <div className="bg-[#0F172A] p-10 flex flex-col justify-center space-y-4 relative">
          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-500 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {currentStep === "email" ? (
            <>
              <h2 className="text-3xl font-semibold mb-2">Welcome Back!</h2>
              <p className="text-gray-400 text-sm mb-2">Log in to continue</p>

              <label className="text-sm text-gray-400 mb-1">Email Address</label>
              <div className="flex items-center bg-[#1F2937] rounded-lg overflow-hidden px-3 mb-4">
                <Mail className="w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="Enter your email"
                  className="w-full p-2 bg-transparent outline-none text-white"
                />
              </div>
              {emailError && <p className="text-red-500 text-sm -mt-3 mb-2">{emailError}</p>}

              <button
                className="bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-medium transition flex items-center justify-center gap-2"
                onClick={sendOtp}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Sending OTP...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" /> Continue
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setCurrentStep("email")}
                className="flex items-center text-gray-400 hover:text-green-400 mb-2 transition-colors text-sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to email
              </button>

              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-700/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-green-400" />
                </div>
                <h2 className="text-2xl font-semibold mb-2">Check Your Email</h2>
                <p className="text-gray-400 mb-2">We've sent a 6-digit code to</p>
                <p className="text-green-400 font-medium">{email}</p>
              </div>

              <form onSubmit={verifyOtp} className="space-y-4">
                <div className="flex justify-center space-x-3 mb-4">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      id={`otp-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      className="w-12 h-12 text-center text-xl font-bold bg-[#1F2937] border border-gray-700 text-white focus:border-green-400 focus:ring-green-400 rounded-lg transition-all duration-200 hover:border-green-500"
                      required
                    />
                  ))}
                </div>

                {otpExpiry && (
                  <div className="text-sm text-center text-gray-400 mb-4">
                    <span>
                      Code expires in {remainingMinutes} minute{remainingMinutes !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}

                <div className="text-center">
                  <p className="text-gray-400 text-sm mb-2">Didn't receive the code?</p>
                  <button
                    type="button"
                    onClick={resendOtp}
                    disabled={isLoading}
                    className="text-green-400 hover:text-green-300 text-sm"
                  >
                    {isLoading ? "Resending..." : "Resend Code"}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || otp.some((d) => d === "")}
                  className="bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg w-full mt-4"
                >
                  {isLoading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Verifying...
                    </>
                  ) : (
                    "Verify & Continue"
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}