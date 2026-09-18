import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Calendar,
  Eye,
  EyeOff,
  Home,
  Loader2,
  Mail,
  Phone,
  Shield,
  Users,
} from "lucide-react";
import { z } from "zod";
import hrHubLogo from "@/assets/hr-hub-logo.svg";
import hrHubLogoLight from "@/assets/hr-hub-logo-light.svg";
import { supabase } from "@/integrations/supabase/client";
import { checkEmailDomainAllowed } from "@/lib/domainWhitelist";

const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name is too long"),
    mobile: z
      .string()
      .trim()
      .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit Indian mobile number"),
    email: z.string().trim().email("Please enter a valid email address"),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

const normalizeIndianPhone = (value: string) => {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("91") && digits.length === 12) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  return "";
};

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);

  const [loginMethod, setLoginMethod] =
    useState<"email" | "phone">("email");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [loginPhone, setLoginPhone] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [phoneCooldown, setPhoneCooldown] = useState(0);

  const [showForgotPassword, setShowForgotPassword] =
    useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const [signupName, setSignupName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] =
    useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [showLoginPassword, setShowLoginPassword] =
    useState(false);
  const [showSignupPassword, setShowSignupPassword] =
    useState(false);
  const [
    showSignupConfirmPassword,
    setShowSignupConfirmPassword,
  ] = useState(false);

  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (phoneCooldown <= 0) return;

    const timer = window.setInterval(() => {
      setPhoneCooldown((current) =>
        current > 0 ? current - 1 : 0
      );
    }, 1000);

    return () => window.clearInterval(timer);
  }, [phoneCooldown]);

  const handleGoogleSignIn = async () => {
    if (isLoading) return;

    setErrors({});
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        console.error("Google sign-in error:", error);
        toast({
          title: "Google Sign-In Failed",
          description: error.message,
          variant: "destructive",
        });
        setIsLoading(false);
      }
      // No setIsLoading(false) on success: the browser is redirected to Google.
    } catch (error) {
      console.error("Google sign-in error:", error);
      toast({
        title: "Google Sign-In Failed",
        description:
          error instanceof Error
            ? error.message
            : "Unable to start Google sign-in. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = loginSchema.safeParse({
      email: loginEmail,
      password: loginPassword,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};

      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          fieldErrors[`login_${issue.path[0]}`] =
            issue.message;
        }
      });

      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    const { error } = await signIn(
      loginEmail.trim(),
      loginPassword
    );

    setIsLoading(false);

    if (error) {
      if (
        error.message.includes(
          "Invalid login credentials"
        )
      ) {
        toast({
          title: "Login Failed",
          description:
            "Invalid email or password. Please try again.",
          variant: "destructive",
        });
      } else if (
        error.message.includes(
          "Email not confirmed"
        )
      ) {
        toast({
          title: "Email Not Verified",
          description:
            "Please check your email and verify your account first.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  const handleSendPhoneOtp = async () => {
    setPhoneError("");

    if (phoneCooldown > 0) {
      return;
    }

    const phone = normalizeIndianPhone(loginPhone);

    if (!phone) {
      setPhoneError(
        "Please enter a valid 10-digit Indian mobile number."
      );
      return;
    }

    setPhoneLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: {
        shouldCreateUser: false,
      },
    });

    setPhoneLoading(false);

    if (error) {
      console.error("Phone OTP send error:", error);

      setPhoneError(
        error.message || "Unable to send OTP."
      );

      toast({
        title: "OTP Failed",
        description:
          error.message || "Unable to send OTP.",
        variant: "destructive",
      });

      return;
    }

    setPhoneOtpSent(true);
    setPhoneOtp("");
    setPhoneCooldown(60);

    toast({
      title: "OTP Sent",
      description:
        `A verification code has been sent to ${phone}.`,
    });
  };

  const handleSendPhoneOtpForm = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();
    await handleSendPhoneOtp();
  };

  const handleVerifyPhoneOtp = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();
    setPhoneError("");

    const phone = normalizeIndianPhone(loginPhone);

    if (!phone) {
      setPhoneError(
        "Please enter a valid 10-digit Indian mobile number."
      );
      return;
    }

    if (!/^\d{6}$/.test(phoneOtp)) {
      setPhoneError(
        "Please enter the 6-digit OTP."
      );
      return;
    }

    setPhoneLoading(true);

    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: phoneOtp,
      type: "sms",
    });

    setPhoneLoading(false);

    if (error) {
      console.error(
        "Phone OTP verification error:",
        error
      );

      setPhoneError(
        error.message ||
          "Invalid or expired OTP."
      );

      toast({
        title: "Verification Failed",
        description:
          error.message ||
          "Invalid or expired OTP.",
        variant: "destructive",
      });

      return;
    }

    toast({
      title: "Login Successful",
      description: "Welcome back to MJIS.",
    });

    navigate("/dashboard", {
      replace: true,
    });
  };

  const handleForgotPassword = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!resetEmail.trim()) {
      toast({
        title: "Error",
        description:
          "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const { error } =
      await supabase.auth.resetPasswordForEmail(
        resetEmail.trim(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

    setIsLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Email Sent",
        description:
          "Check your email for the password reset link.",
      });

      setShowForgotPassword(false);
    }
  };

  const handleSignup = async (
    e: React.FormEvent,
  ) => {
    e.preventDefault();
    setErrors({});

    const result = signupSchema.safeParse({
      fullName: signupName,
      mobile: signupPhone,
      email: signupEmail,
      password: signupPassword,
      confirmPassword: signupConfirmPassword,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};

      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          fieldErrors[`signup_${issue.path[0]}`] = issue.message;
        }
      });

      setErrors(fieldErrors);
      return;
    }

    const email = signupEmail.trim().toLowerCase();
    const fullName = signupName.trim();
    const mobile = normalizeIndianPhone(signupPhone);

    if (!mobile) {
      setErrors({
        signup_mobile: "Please enter a valid 10-digit Indian mobile number.",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Keep domain whitelist, but prevent a slow settings lookup from
      // hanging account creation forever.
      const domainCheck = await Promise.race([
        checkEmailDomainAllowed(email),
        new Promise<{ allowed: true }>((resolve) =>
          window.setTimeout(() => resolve({ allowed: true }), 8000),
        ),
      ]);

      if (!domainCheck.allowed) {
        toast({
          title: "Registration Restricted",
          description:
            domainCheck.message ||
            "This email domain is not allowed for registration.",
          variant: "destructive",
        });
        return;
      }

      // IMPORTANT: pass the fourth argument expected by AuthContext.
      const signupResult = await Promise.race([
        signUp(email, signupPassword, fullName, mobile),
        new Promise<{ error: Error | null }>((_, reject) =>
          window.setTimeout(
            () =>
              reject(
                new Error(
                  "Account creation timed out. Please check your internet connection and try again.",
                ),
              ),
            20000,
          ),
        ),
      ]);

      if (signupResult.error) {
        const message =
          signupResult.error.message || "Unable to create your account.";

        console.error("Supabase signup error:", signupResult.error);

        if (
          message.toLowerCase().includes("user already registered") ||
          message.toLowerCase().includes("already been registered")
        ) {
          toast({
            title: "Account Exists",
            description:
              "An account with this email already exists. Please log in instead.",
            variant: "destructive",
          });
        } else if (message.toLowerCase().includes("rate limit")) {
          toast({
            title: "Too Many Attempts",
            description:
              "Please wait a few minutes and try creating the account again.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Signup Failed",
            description: message,
            variant: "destructive",
          });
        }

        return;
      }

      toast({
        title: "Account Created",
        description:
          "Your account has been created. Please verify your email before signing in.",
      });

      setSignupName("");
      setSignupPhone("");
      setSignupEmail("");
      setSignupPassword("");
      setSignupConfirmPassword("");
    } catch (error) {
      console.error("Create account error:", error);

      toast({
        title: "Create Account Failed",
        description:
          error instanceof Error
            ? error.message
            : "Something went wrong while creating your account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const switchLoginMethod = (
    method: "email" | "phone"
  ) => {
    setLoginMethod(method);
    setErrors({});
    setPhoneError("");
    setShowForgotPassword(false);

    if (method === "email") {
      setPhoneOtp("");
      setPhoneOtpSent(false);
    }
  };

  const features = [
    {
      icon: <Users className="h-5 w-5" />,
      text: "Employee Management",
    },
    {
      icon: <Calendar className="h-5 w-5" />,
      text: "Leave Tracking",
    },
    {
      icon: <Shield className="h-5 w-5" />,
      text: "Role-Based Access",
    },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">

      {/* DESKTOP BRANDING */}

      <motion.div
        initial={{
          opacity: 0,
          x: -40,
          rotateY: 7,
        }}
        animate={{
          opacity: 1,
          x: 0,
          rotateY: 0,
        }}
        transition={{
          duration: 0.7,
          ease: [0.22, 1, 0.36, 1],
        }}
        style={{ transformPerspective: 1200 }}
        className="fixed inset-y-0 left-0 hidden w-1/2 flex-col justify-between bg-primary p-8 text-primary-foreground lg:flex lg:p-12"
      >
        <div className="flex items-center gap-3">
          <img
            src={hrHubLogoLight}
            alt="MJIS"
            className="h-12 w-auto"
          />
          <h1 className="text-3xl font-bold">
            MJIS
          </h1>
        </div>

        <div className="max-w-xl space-y-6">

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.2,
              duration: 0.55,
            }}
            className="text-4xl font-bold leading-tight xl:text-5xl"
          >
            Streamline Your HR Operations
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.3,
              duration: 0.55,
            }}
            className="text-lg opacity-90"
          >
            Manage employees, track leaves, handle
            payroll, and more — all in one powerful
            platform.
          </motion.p>

          <div className="space-y-4">
            {features.map(
              (feature, index) => (
                <motion.div
                  key={feature.text}
                  initial={{
                    opacity: 0,
                    x: -20,
                  }}
                  animate={{
                    opacity: 1,
                    x: 0,
                  }}
                  transition={{
                    delay:
                      0.4 +
                      index * 0.1,
                    duration: 0.45,
                  }}
                  whileHover={{
                    x: 8,
                  }}
                  className="flex items-center gap-3"
                >
                  <div className="rounded-lg bg-primary-foreground/10 p-2">
                    {feature.icon}
                  </div>

                  <span className="text-lg">
                    {feature.text}
                  </span>
                </motion.div>
              )
            )}
          </div>
        </div>

        <p className="text-sm opacity-70">
          © 2026 MJIS. All rights reserved.
        </p>
      </motion.div>

      {/* AUTH SIDE */}

      <div className="relative flex min-h-screen w-full items-center justify-center bg-background p-4 sm:p-6 lg:ml-[50%] lg:w-1/2">

        {/* HOME */}

        <motion.div
          initial={{
            opacity: 0,
            y: -15,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{ duration: 0.45 }}
          className="absolute left-4 top-4 z-20 sm:left-6 sm:top-6"
        >
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              navigate("/")
            }
            className="gap-2 rounded-xl"
          >
            <Home className="h-4 w-4" />
            Home
          </Button>
        </motion.div>

        <motion.div
          initial={{
            opacity: 0,
            scale: 0.94,
            rotateX: 6,
            y: 20,
          }}
          animate={{
            opacity: 1,
            scale: 1,
            rotateX: 0,
            y: 0,
          }}
          transition={{
            delay: 0.08,
            duration: 0.65,
            type: "spring",
            stiffness: 120,
            damping: 18,
          }}
          style={{ transformPerspective: 1400 }}
          className="w-full max-w-md"
        >
          <Card className="w-full border-border shadow-xl">

            <CardHeader className="text-center">

              <motion.div
                initial={{
                  opacity: 0,
                  scale: 0.8,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                }}
                transition={{
                  delay: 0.18,
                  duration: 0.45,
                }}
                className="mx-auto mb-4"
              >
                <img
                  src={hrHubLogo}
                  alt="MJIS"
                  className="mx-auto h-12 w-auto"
                />
              </motion.div>

              <CardTitle className="text-2xl">
                Welcome to MJIS
              </CardTitle>

              <CardDescription>
                Sign in to your account or create
                a new one
              </CardDescription>

            </CardHeader>

            <CardContent>

              <Tabs
                defaultValue="login"
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">
                    Login
                  </TabsTrigger>

                  <TabsTrigger value="signup">
                    Sign Up
                  </TabsTrigger>
                </TabsList>

                {/* LOGIN */}

                <TabsContent
                  value="login"
                  className="mt-6"
                >

                  <div className="mb-5 grid grid-cols-2 rounded-xl bg-muted p-1">

                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={() =>
                        switchLoginMethod(
                          "email"
                        )
                      }
                      className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                        loginMethod === "email"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground"
                      }`}
                    >
                      <Mail className="h-4 w-4" />
                      Email
                    </motion.button>

                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={() =>
                        switchLoginMethod(
                          "phone"
                        )
                      }
                      className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                        loginMethod === "phone"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground"
                      }`}
                    >
                      <Phone className="h-4 w-4" />
                      Phone
                    </motion.button>

                  </div>

                  <AnimatePresence mode="wait">

                    {loginMethod === "email" ? (
                      <motion.div
                        key="email-login"
                        initial={{
                          opacity: 0,
                          x: -18,
                        }}
                        animate={{
                          opacity: 1,
                          x: 0,
                        }}
                        exit={{
                          opacity: 0,
                          x: 18,
                        }}
                        transition={{
                          duration: 0.25,
                        }}
                      >

                        <form
                          onSubmit={handleLogin}
                          className="space-y-4"
                        >

                          <div className="space-y-2">
                            <Label htmlFor="login-email">
                              Email
                            </Label>

                            <Input
                              id="login-email"
                              type="email"
                              autoComplete="email"
                              placeholder="Enter Email Address"
                              value={loginEmail}
                              onChange={(e) =>
                                setLoginEmail(
                                  e.target.value
                                )
                              }
                              disabled={isLoading}
                            />

                            {errors.login_email && (
                              <p className="text-sm text-destructive">
                                {errors.login_email}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="login-password">
                              Password
                            </Label>

                            <div className="relative">
                              <Input
                                id="login-password"
                                type={
                                  showLoginPassword
                                    ? "text"
                                    : "password"
                                }
                                autoComplete="current-password"
                                placeholder="••••••••"
                                value={loginPassword}
                                onChange={(e) =>
                                  setLoginPassword(
                                    e.target.value
                                  )
                                }
                                disabled={
                                  isLoading
                                }
                                className="pr-10"
                              />

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                aria-label={
                                  showLoginPassword
                                    ? "Hide password"
                                    : "Show password"
                                }
                                onClick={() =>
                                  setShowLoginPassword(
                                    (current) =>
                                      !current
                                  )
                                }
                                tabIndex={-1}
                              >
                                {showLoginPassword ? (
                                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                            </div>

                            {errors.login_password && (
                              <p className="text-sm text-destructive">
                                {errors.login_password}
                              </p>
                            )}
                          </div>

                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="link"
                              className="h-auto p-0 text-sm"
                              onClick={() => {
                                setShowForgotPassword(
                                  true
                                );
                                setResetEmail(
                                  loginEmail
                                );
                              }}
                            >
                              Forgot password?
                            </Button>
                          </div>

                          <motion.div
                            whileTap={{ scale: 0.98 }}
                          >
                            <Button
                              type="submit"
                              className="w-full"
                              disabled={isLoading}
                            >
                              {isLoading ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Signing in...
                                </>
                              ) : (
                                "Sign In"
                              )}
                            </Button>
                          </motion.div>

                        </form>

                        <div className="my-5 flex items-center gap-3">
                          <div className="h-px flex-1 bg-border" />
                          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            or
                          </span>
                          <div className="h-px flex-1 bg-border" />
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          className="w-full gap-3"
                          onClick={handleGoogleSignIn}
                          disabled={isLoading}
                        >
                          <svg
                            className="h-5 w-5"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              fill="#4285F4"
                              d="M21.35 12.22c0-.71-.06-1.39-.18-2.05H12v3.88h5.22a4.46 4.46 0 0 1-1.94 2.93v2.43h3.15c1.85-1.7 2.92-4.2 2.92-7.19Z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 21.77c2.65 0 4.87-.88 6.49-2.36l-3.15-2.43c-.88.59-2 .95-3.34.95-2.56 0-4.73-1.73-5.51-4.05H3.24v2.51A9.8 9.8 0 0 0 12 21.77Z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M6.49 13.88A5.86 5.86 0 0 1 6.18 12c0-.65.11-1.28.31-1.88V7.61H3.24A9.8 9.8 0 0 0 2.2 12c0 1.58.38 3.08 1.04 4.39l3.25-2.51Z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 6.07c1.44 0 2.73.5 3.75 1.48l2.81-2.81C16.87 3.17 14.65 2.23 12 2.23a9.8 9.8 0 0 0-8.76 5.38l3.25 2.51C7.27 7.8 9.44 6.07 12 6.07Z"
                            />
                          </svg>
                          {isLoading ? "Connecting to Google..." : "Continue with Google"}
                        </Button>

                        <AnimatePresence>
                          {showForgotPassword && (
                            <motion.div
                              initial={{
                                opacity: 0,
                                height: 0,
                                y: -8,
                              }}
                              animate={{
                                opacity: 1,
                                height: "auto",
                                y: 0,
                              }}
                              exit={{
                                opacity: 0,
                                height: 0,
                                y: -8,
                              }}
                              className="overflow-hidden"
                            >
                              <div className="mt-6 border-t pt-6">

                                <h3 className="mb-2 text-sm font-medium">
                                  Reset Password
                                </h3>

                                <form
                                  onSubmit={
                                    handleForgotPassword
                                  }
                                  className="space-y-3"
                                >
                                  <Input
                                    type="email"
                                    autoComplete="email"
                                    placeholder="Enter your email"
                                    value={
                                      resetEmail
                                    }
                                    onChange={(e) =>
                                      setResetEmail(
                                        e.target.value
                                      )
                                    }
                                    disabled={
                                      isLoading
                                    }
                                  />

                                  <div className="flex flex-col gap-2 sm:flex-row">

                                    <Button
                                      type="submit"
                                      className="flex-1"
                                      disabled={
                                        isLoading
                                      }
                                    >
                                      {isLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        "Send Reset Link"
                                      )}
                                    </Button>

                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() =>
                                        setShowForgotPassword(
                                          false
                                        )
                                      }
                                    >
                                      Cancel
                                    </Button>

                                  </div>
                                </form>

                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                      </motion.div>
                    ) : (
                      <motion.div
                        key="phone-login"
                        initial={{
                          opacity: 0,
                          x: 18,
                        }}
                        animate={{
                          opacity: 1,
                          x: 0,
                        }}
                        exit={{
                          opacity: 0,
                          x: -18,
                        }}
                        transition={{
                          duration: 0.25,
                        }}
                      >

                        <AnimatePresence mode="wait">

                          {!phoneOtpSent ? (
                            <motion.form
                              key="phone-number"
                              initial={{
                                opacity: 0,
                                y: 8,
                              }}
                              animate={{
                                opacity: 1,
                                y: 0,
                              }}
                              exit={{
                                opacity: 0,
                                y: -8,
                              }}
                              onSubmit={
                                handleSendPhoneOtpForm
                              }
                              className="space-y-4"
                            >

                              <div className="space-y-2">

                                <Label htmlFor="login-phone">
                                  Mobile Number
                                </Label>

                                <div className="flex">

                                  <div className="flex shrink-0 items-center rounded-l-lg border border-r-0 border-input bg-muted px-3 text-sm font-medium text-muted-foreground">
                                    +91
                                  </div>

                                  <Input
                                    id="login-phone"
                                    type="tel"
                                    inputMode="numeric"
                                    autoComplete="tel"
                                    maxLength={10}
                                    placeholder="9876543210"
                                    value={
                                      loginPhone
                                    }
                                    onChange={(
                                      e
                                    ) => {
                                      const value =
                                        e.target.value
                                          .replace(
                                            /\D/g,
                                            ""
                                          )
                                          .slice(
                                            0,
                                            10
                                          );

                                      setLoginPhone(
                                        value
                                      );
                                      setPhoneError(
                                        ""
                                      );
                                    }}
                                    disabled={
                                      phoneLoading
                                    }
                                    className="rounded-l-none"
                                  />
                                </div>

                                {phoneError && (
                                  <p className="text-sm text-destructive">
                                    {phoneError}
                                  </p>
                                )}

                                <p className="text-xs leading-5 text-muted-foreground">
                                  Use the mobile number already
                                  linked to your MJIS account.
                                </p>

                              </div>

                              <motion.div
                                whileTap={{
                                  scale: 0.98,
                                }}
                              >
                                <Button
                                  type="submit"
                                  className="w-full"
                                  disabled={
                                    phoneLoading
                                  }
                                >
                                  {phoneLoading ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Sending OTP...
                                    </>
                                  ) : (
                                    <>
                                      <Phone className="mr-2 h-4 w-4" />
                                      Send OTP
                                    </>
                                  )}
                                </Button>
                              </motion.div>

                            </motion.form>
                          ) : (
                            <motion.form
                              key="phone-otp"
                              initial={{
                                opacity: 0,
                                scale: 0.97,
                                y: 8,
                              }}
                              animate={{
                                opacity: 1,
                                scale: 1,
                                y: 0,
                              }}
                              exit={{
                                opacity: 0,
                                scale: 0.97,
                                y: -8,
                              }}
                              onSubmit={
                                handleVerifyPhoneOtp
                              }
                              className="space-y-4"
                            >

                              <div className="rounded-xl bg-muted/50 p-4">

                                <p className="text-xs text-muted-foreground">
                                  OTP sent to
                                </p>

                                <div className="mt-1 flex items-center justify-between gap-3">

                                  <p className="font-semibold">
                                    +91{" "}
                                    {loginPhone}
                                  </p>

                                  <button
                                    type="button"
                                    className="text-xs font-semibold text-primary hover:underline"
                                    onClick={() => {
                                      setPhoneOtp(
                                        ""
                                      );
                                      setPhoneOtpSent(
                                        false
                                      );
                                      setPhoneError(
                                        ""
                                      );
                                    }}
                                  >
                                    Change
                                  </button>

                                </div>
                              </div>

                              <div className="space-y-2">

                                <Label htmlFor="phone-otp">
                                  Enter OTP
                                </Label>

                                <Input
                                  id="phone-otp"
                                  type="text"
                                  inputMode="numeric"
                                  autoComplete="one-time-code"
                                  maxLength={6}
                                  placeholder="123456"
                                  value={phoneOtp}
                                  onChange={(e) => {
                                    const value =
                                      e.target.value
                                        .replace(
                                          /\D/g,
                                          ""
                                        )
                                        .slice(
                                          0,
                                          6
                                        );

                                    setPhoneOtp(
                                      value
                                    );
                                    setPhoneError(
                                      ""
                                    );
                                  }}
                                  disabled={
                                    phoneLoading
                                  }
                                  className="text-center text-lg tracking-[0.45em]"
                                />

                                {phoneError && (
                                  <p className="text-sm text-destructive">
                                    {phoneError}
                                  </p>
                                )}

                              </div>

                              <motion.div
                                whileTap={{
                                  scale: 0.98,
                                }}
                              >
                                <Button
                                  type="submit"
                                  className="w-full"
                                  disabled={
                                    phoneLoading ||
                                    phoneOtp.length !==
                                      6
                                  }
                                >
                                  {phoneLoading ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Verifying...
                                    </>
                                  ) : (
                                    "Verify & Sign In"
                                  )}
                                </Button>
                              </motion.div>

                              <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">

                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="w-full justify-start px-0 sm:w-auto"
                                  onClick={() => {
                                    setPhoneOtp(
                                      ""
                                    );
                                    setPhoneOtpSent(
                                      false
                                    );
                                    setPhoneError(
                                      ""
                                    );
                                  }}
                                >
                                  <ArrowLeft className="mr-2 h-4 w-4" />
                                  Change Number
                                </Button>

                                <Button
                                  type="button"
                                  variant="link"
                                  className="w-full px-0 sm:w-auto"
                                  disabled={
                                    phoneLoading ||
                                    phoneCooldown > 0
                                  }
                                  onClick={() =>
                                    void handleSendPhoneOtp()
                                  }
                                >
                                  {phoneCooldown >
                                  0
                                    ? `Resend in ${phoneCooldown}s`
                                    : "Resend OTP"}
                                </Button>

                              </div>

                              <p className="text-center text-xs leading-5 text-muted-foreground">
                                Enter the 6-digit code sent
                                to your mobile number.
                              </p>

                            </motion.form>
                          )}

                        </AnimatePresence>

                      </motion.div>
                    )}

                  </AnimatePresence>

                </TabsContent>

                {/* SIGN UP */}

                <TabsContent
                  value="signup"
                  className="mt-6"
                >

                  <motion.div
                    initial={{
                      opacity: 0,
                      y: 12,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    transition={{
                      duration: 0.3,
                    }}
                  >

                    <form
                      onSubmit={handleSignup}
                      className="space-y-4"
                    >

                      <div className="space-y-2">
                        <Label htmlFor="signup-name">
                          Full Name
                        </Label>

                        <Input
                          id="signup-name"
                          type="text"
                          autoComplete="name"
                          placeholder="Name"
                          value={signupName}
                          onChange={(e) =>
                            setSignupName(
                              e.target.value
                            )
                          }
                          disabled={isLoading}
                        />

                        {errors.signup_fullName && (
                          <p className="text-sm text-destructive">
                            {
                              errors.signup_fullName
                            }
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-mobile">
                          Mobile Number
                        </Label>

                        <div className="flex">
                          <div className="flex shrink-0 items-center rounded-l-lg border border-r-0 border-input bg-muted px-3 text-sm font-medium text-muted-foreground">
                            +91
                          </div>

                          <Input
                            id="signup-mobile"
                            type="tel"
                            inputMode="numeric"
                            autoComplete="tel"
                            maxLength={10}
                            placeholder="10-digit mobile number"
                            value={signupPhone}
                            onChange={(e) =>
                              setSignupPhone(
                                e.target.value.replace(/\D/g, "").slice(0, 10)
                              )
                            }
                            disabled={isLoading}
                            className="rounded-l-none"
                          />
                        </div>

                        {errors.signup_mobile && (
                          <p className="text-sm text-destructive">
                            {errors.signup_mobile}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-email">
                          Email
                        </Label>

                        <Input
                          id="signup-email"
                          type="email"
                          autoComplete="email"
                          placeholder="Enter Email Address"
                          value={signupEmail}
                          onChange={(e) =>
                            setSignupEmail(
                              e.target.value
                            )
                          }
                          disabled={isLoading}
                        />

                        {errors.signup_email && (
                          <p className="text-sm text-destructive">
                            {
                              errors.signup_email
                            }
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-password">
                          Password
                        </Label>

                        <div className="relative">

                          <Input
                            id="signup-password"
                            type={
                              showSignupPassword
                                ? "text"
                                : "password"
                            }
                            autoComplete="new-password"
                            placeholder="••••••••"
                            value={
                              signupPassword
                            }
                            onChange={(e) =>
                              setSignupPassword(
                                e.target.value
                              )
                            }
                            disabled={
                              isLoading
                            }
                            className="pr-10"
                          />

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() =>
                              setShowSignupPassword(
                                (current) =>
                                  !current
                              )
                            }
                            tabIndex={-1}
                          >
                            {showSignupPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>

                        </div>

                        {errors.signup_password && (
                          <p className="text-sm text-destructive">
                            {
                              errors.signup_password
                            }
                          </p>
                        )}

                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-confirm">
                          Confirm Password
                        </Label>

                        <div className="relative">

                          <Input
                            id="signup-confirm"
                            type={
                              showSignupConfirmPassword
                                ? "text"
                                : "password"
                            }
                            autoComplete="new-password"
                            placeholder="••••••••"
                            value={
                              signupConfirmPassword
                            }
                            onChange={(e) =>
                              setSignupConfirmPassword(
                                e.target.value
                              )
                            }
                            disabled={
                              isLoading
                            }
                            className="pr-10"
                          />

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() =>
                              setShowSignupConfirmPassword(
                                (current) =>
                                  !current
                              )
                            }
                            tabIndex={-1}
                          >
                            {showSignupConfirmPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>

                        </div>

                        {errors.signup_confirmPassword && (
                          <p className="text-sm text-destructive">
                            {
                              errors.signup_confirmPassword
                            }
                          </p>
                        )}

                      </div>

                      <motion.div
                        whileTap={{
                          scale: 0.98,
                        }}
                      >
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating account...
                            </>
                          ) : (
                            "Create Account"
                          )}
                        </Button>
                      </motion.div>

                    </form>

                  </motion.div>

                </TabsContent>

              </Tabs>

            </CardContent>

          </Card>
        </motion.div>

      </div>

    </div>
  );
};

export default Auth;