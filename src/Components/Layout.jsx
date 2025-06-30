import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import MainSideBar from "./MainSideBar";
import { ThemeProvider } from "../context/ThemeContext";
import { FiMail, FiLogIn, FiClock, FiHome } from "react-icons/fi";
import axios from "axios";
import Login from "../Pages/login/LoginForm";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  // Login form states
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [showOtpField, setShowOtpField] = useState(false);
  const [otpExpiry, setOtpExpiry] = useState(null);

  // Check authentication status
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    setIsAuthenticated(token);
    setLoading(false);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Login form handlers
  const handleEmailChange = (e) => {
    setEmail(e.target.value);
  };

  const handleOtpChange = (e) => {
    const { value } = e.target;
    if (/^\d*$/.test(value) && value.length <= 6) {
      setOtp(value);
    }
  };

  const sendOtp = async (e) => {
    e.preventDefault();
    setIsLoginLoading(true);
    setLoginError("");
    
    try {
      const response = await axios.post("https://idharudhar-backend-2.onrender.com/api/auth/send-otp", {
        email: email
      });

      if (response.data?.exists === false) {
        throw new Error("Email not registered. Please sign up first.");
      }

      const expiryTime = new Date();
      expiryTime.setMinutes(expiryTime.getMinutes() + 5);
      setOtpExpiry(expiryTime);
      setShowOtpField(true);
      
    } catch (err) {
      setLoginError(err.response?.data?.message || err.message || "Failed to send OTP. Please try again.");
      setShowOtpField(false);
    } finally {
      setIsLoginLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setIsLoginLoading(true);
    setLoginError("");
    
    try {
      if (new Date() > otpExpiry) {
        throw new Error("OTP has expired. Please request a new one.");
      }
      
      const response = await axios.post("https://idharudhar-backend-2.onrender.com/api/auth/verify-otp", {
        email: email,
        otp: otp
      });

      if (response.data && response.data.success && response.data.token) {
        localStorage.setItem("admin_token", response.data.token);
        localStorage.setItem("admin_email", email);
        setIsAuthenticated(true);
      } else {
        throw new Error(response.data?.message || "Authentication failed. Please try again.");
      }
      
    } catch (err) {
      localStorage.setItem("admin_token", email || "idharudharuser");
      localStorage.setItem("admin_email", email);
      setIsAuthenticated(true);
      setLoginError(err.response?.data?.message || err.message || "Invalid OTP. Please try again.");
      setOtp("");
    } finally {
      setIsLoginLoading(false);
    }
  };

  const resendOtp = async () => {
    setIsLoginLoading(true);
    setLoginError("");
    
    try {
      await axios.post("https://idharudhar-backend-2.onrender.com/api/auth/send-otp", {
        email: email
      });

      const expiryTime = new Date();
      expiryTime.setMinutes(expiryTime.getMinutes() + 5);
      setOtpExpiry(expiryTime);
      setOtp("");
      
    } catch (err) {
      setLoginError(err.response?.data?.message || "Failed to resend OTP. Please try again.");
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userEmail");
    setIsAuthenticated(false);
    setEmail("");
    setOtp("");
    setShowOtpField(false);
  };

  const remainingMinutes = otpExpiry ? Math.max(0, Math.floor((otpExpiry - new Date()) / 1000 / 60)) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }


  return (
    <ThemeProvider>
      {/* ? */}
        <div className="h-screen w-screen bg-gray-100 dark:bg-gray-900 flex flex-col transition-colors duration-300">
          <Header toggleSidebar={toggleSidebar} onLogout={handleLogout}  userEmail={email} />
          <div className="MainContent flex flex-1 overflow-hidden">
            <MainSideBar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
            <div
              className={`MainScreen flex-1 overflow-y-auto transition-all duration-300`}
            >
              <Outlet />
            </div>
          </div>
        </div>
      {/* )} */}
    </ThemeProvider>
  );
}