import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "./AuthProvider";
import { notificationService } from "@/services/NotificationBus";
import { Loader2, Minus, Plus, Contrast, Info } from "lucide-react";

type LoginStep = "sso" | "otp" | "manual" | "loading";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, setUser, setIsAuthenticated } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<LoginStep>("sso");
  const [otpTimer, setOtpTimer] = useState(0);

  // Validate email domain
  const isValidDomain = (email: string) =>
    email.endsWith("@nic.in") || email.endsWith("@gov.in");

  // Handle SSO login
  const handleSSOLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidDomain(email)) {
      notificationService.error("Only @nic.in and @gov.in domains are authorized");
      return;
    }
    
    setLoading(true);
    // Simulate SSO process
    setTimeout(() => {
      setStep("otp");
      setOtpTimer(30);
      startOTPTimer();
      setLoading(false);
    }, 1500);
  };

  // Handle OTP verification
  const handleOTPVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      notificationService.error("Please enter complete OTP");
      return;
    }
    
    setLoading(true);
    setStep("loading");
    
    // Simulate OTP verification and profile preparation
    setTimeout(async () => {
      try {
        // Simulate successful login with proper user data
        const mockUser = {
          id: "1",
          _id: "1",
          email: email,
          firstName: email.split("@")[0],
          lastName: "",
          name: email.split("@")[0],
          role: "NODAL_OFFICER",
          state: "Maharashtra",
          stateName: "Maharashtra",
          stateUt: "Maharashtra",
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Create tokens object
        const tokens = {
          accessToken: "mock-access-token",
          refreshToken: "",
          tokenType: "Bearer",
          expiresIn: "3600",
          expiresAt: Date.now() + 3600000, // 1 hour
        };

        // Use actual auth service to set user
        const { authService } = await import("@/services/auth.service");
        authService.setAuth(mockUser, tokens);
        
        // Update auth context
        setUser(mockUser);
        setIsAuthenticated(true);
        
        notificationService.success(`Welcome back, ${mockUser.firstName}!`, "Login Successful");
        
        // Navigate to dashboard
        const from = location.state?.from?.pathname || "/dashboard";
        navigate(from, { replace: true });
      } catch (error) {
        console.error("OTP verification error:", error);
        notificationService.error("OTP verification failed. Please try again.", "Authentication Error");
        setStep("otp");
      } finally {
        setLoading(false);
      }
    }, 3000);
  };

  // Handle manual login with backend
  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      notificationService.error("Please enter both email and password");
      return;
    }
    
    setLoading(true);
    try {
      const result = await login(email, password);
      
      if (result.success) {
        notificationService.success(`Welcome back, ${result.user.firstName}!`, "Login Successful");
        const from = location.state?.from?.pathname || "/dashboard";
        navigate(from, { replace: true });
      } else {
        notificationService.error(result.message || "Login failed", "Authentication Error");
      }
    } catch (error) {
      notificationService.error("Login failed. Please try again.", "Network Error");
    } finally {
      setLoading(false);
    }
  };

  // Start OTP timer
  const startOTPTimer = () => {
    const interval = setInterval(() => {
      setOtpTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Format timer
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* --- Top Bar (edge-to-edge) --- */}
      <header className="w-full bg-[#003366] text-white py-2 px-6 flex justify-between items-center text-sm">
        <div className="flex items-center space-x-3">
          <img
            src="https://doc.ux4g.gov.in/assets/img/icon/in-flag.png"
            alt="Emblem"
            className="h-4 w-6"
          />
          <div>
            <p className="font-semibold leading-tight">Government of India</p>
            <p className="text-[11px] text-gray-200">
              Ministry of Statistics and Programme Implementation (MoSPI)
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <a href="#main" className="hover:underline">Skip to Main Content</a>
          <button title="Decrease text size" aria-label="Decrease text size" className="opacity-90 hover:opacity-100">
            <Minus size={16} />
          </button>
          <button title="Increase text size" aria-label="Increase text size" className="opacity-90 hover:opacity-100">
            <Plus size={16} />
          </button>
          <button title="High Contrast" aria-label="High Contrast" className="opacity-90 hover:opacity-100">
            <Contrast size={16} />
          </button>
          <select className="bg-[#002850] text-white border-none text-xs p-1 rounded">
            <option>English</option>
            <option>हिन्दी</option>
          </select>
        </div>
      </header>

      {/* Main Content Row: Left banner + Right auth card */}
      <div className="flex flex-1">
        {/* Left Banner Section */}
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-gray-100">
          <img
            src="/images/login-banner.jpeg"
            alt="Login Banner"
            className="object-contain h-full w-full  shadow-lg"
            style={{ maxWidth: '100%', maxHeight: '100%', display: 'block' }}
            loading="lazy"
          />
        </div>

        {/* Right Login Section */}
        <div id="main" className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-xl">
            {/* SSO Login Step */}
            {step === "sso" && (
              <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="text-center mb-8">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Login to your account with SSO
                  </h1>
                </div>

                <form onSubmit={handleSSOLogin} className="space-y-6">
                  <div>
                    <Label htmlFor="sso-email" className="text-sm font-medium text-gray-400">
                      Email Id* (SSO Disabled)
                    </Label>
                    <Input
                      id="sso-email"
                      type="email"
                      value={email}
                      placeholder="name@gov.in or name@nic.in"
                      className="mt-1 bg-gray-100 cursor-not-allowed"
                      disabled
                      readOnly
                    />
                    <div className="mt-2 flex items-center text-sm text-gray-400">
                      <Info className="w-4 h-4 mr-1" />
                      SSO login is currently disabled. Please use manual login below.
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-blue-300 cursor-not-allowed"
                    disabled
                  >
                    SSO Disabled
                  </Button>
                </form>

                <div className="mt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">Or</span>
                    </div>
                  </div>

                  <form onSubmit={handleManualLogin} className="mt-6 space-y-4">
                    <div>
                      <Label htmlFor="manual-email" className="text-sm font-medium text-gray-700">
                        Email ID
                      </Label>
                      <Input
                        id="manual-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your Email ID"
                        required
                        className="mt-1"
                        disabled={loading}
                      />
                      <div className="mt-2 flex items-center text-sm text-gray-600">
                        <Info className="w-4 h-4 mr-1" />
                        Only @nic.in and @gov.in domains are authorized
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="manual-password" className="text-sm font-medium text-gray-700">
                        Password
                      </Label>
                      <Input
                        id="manual-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        required
                        className="mt-1"
                        disabled={loading}
                      />
                    </div>

                    <Button
                      type="submit"
                      variant="outline"
                      className="w-full border-blue-600 text-blue-600 hover:bg-blue-50"
                      disabled={loading}
                    >
                      Login Manually
                    </Button>
                  </form>
                </div>

                <div className="mt-8 text-center text-sm text-gray-600">
                  <p className="font-medium mb-2">
                    (For Official Use Only Nodal Officer, State Reviewers, Ministry of Statistics and Programme Implementation (MoSPI) Reviewer & Approver)
                  </p>
                  <p className="mb-2">
                    By continuing, you agree to our{" "}
                    <a href="#" className="text-blue-600 hover:underline">Terms of Services</a>{" "}
                    &{" "}
                    <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
                  </p>
                  <p className="text-xs">
                    Powered by National Informatics Centre
                  </p>
                </div>
              </div>
            )}

            {/* OTP Verification Step */}
            {step === "otp" && (
              <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="text-center mb-8">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Verify your account
                  </h1>
                  <p className="text-gray-600">
                    Please enter the OTP we've sent to your official email address
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    {email.replace(/(.{3}).*(@.*)/, "$1***$2")}
                  </p>
                </div>

                <form onSubmit={handleOTPVerification} className="space-y-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Enter OTP
                    </Label>
                    <div className="mt-2 flex space-x-2 justify-center">
                      {[0, 1, 2, 3, 4, 5].map((index) => (
                        <Input
                          key={index}
                          type="text"
                          maxLength={1}
                          value={otp[index] || ""}
                          onChange={(e) => {
                            const newOtp = otp.split("");
                            newOtp[index] = e.target.value;
                            setOtp(newOtp.join(""));
                            
                            // Auto-focus next input
                            if (e.target.value && index < 5) {
                              const nextInput = e.target.parentElement?.parentElement?.children[index + 1] as HTMLInputElement;
                              nextInput?.focus();
                            }
                          }}
                          className="w-12 h-12 text-center text-lg font-semibold border-2 border-gray-300 focus:border-blue-500"
                          disabled={loading}
                        />
                      ))}
                    </div>
                    <div className="mt-2 text-center text-sm text-gray-600">
                      Get verification code again in{" "}
                      <span className="text-blue-600 font-medium">
                        {otpTimer > 0 ? formatTimer(otpTimer) : "00:00"}
                      </span>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={loading || otp.length !== 6}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Confirm"
                    )}
                  </Button>
                </form>

                <div className="mt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">Or</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full mt-4 border-blue-600 text-blue-600 hover:bg-blue-50"
                    onClick={() => setStep("sso")}
                  >
                    Login Manually
                  </Button>
                </div>

                <div className="mt-8 text-center text-sm text-gray-600">
                  <p className="font-medium mb-2">
                    (For Official Use Only Nodal Officer, State Reviewers, Ministry of Statistics and Programme Implementation (MoSPI) Reviewer & Approver)
                  </p>
                  <p className="text-xs">
                    Powered by National Informatics Centre
                  </p>
                </div>
              </div>
            )}

            {/* Loading Step */}
            {step === "loading" && (
              <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-gray-900 mb-4">
                    Please wait...
                  </h1>
                  <p className="text-gray-600 mb-6">
                    Verification complete. Your details have been successfully retrieved. We are now preparing your profile.
                  </p>
                  <div className="flex justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}