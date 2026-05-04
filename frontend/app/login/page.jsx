"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { useTranslations } from "next-intl";
import {
  sendOtp,
  verifyOtp,
  clearError,
  resetOtpState,
} from "@/lib/redux/slices/authSlice/authSlice";
import {
  getUserProfile,
  updateUserProfile,
} from "@/lib/redux/slices/userProfileSlice/userProfileSlice";
import Image from "next/image";

// Supported countries for the login phone input. Order: served markets
// first, popular destinations after. Min/max digit length is the national
// number length (excluding country code) so we can validate per country
// without yanking in libphonenumber.
const COUNTRY_CODES = [
  { code: "IN", name: "India",          dial: "+91",  flag: "🇮🇳", min: 10, max: 10 },
  { code: "AE", name: "UAE",            dial: "+971", flag: "🇦🇪", min: 8,  max: 9  },
  { code: "US", name: "United States",  dial: "+1",   flag: "🇺🇸", min: 10, max: 10 },
  { code: "GB", name: "United Kingdom", dial: "+44",  flag: "🇬🇧", min: 10, max: 10 },
  { code: "DE", name: "Germany",        dial: "+49",  flag: "🇩🇪", min: 10, max: 11 },
  { code: "AU", name: "Australia",      dial: "+61",  flag: "🇦🇺", min: 9,  max: 9  },
  { code: "SA", name: "Saudi Arabia",   dial: "+966", flag: "🇸🇦", min: 9,  max: 9  },
  { code: "SG", name: "Singapore",      dial: "+65",  flag: "🇸🇬", min: 8,  max: 8  },
  { code: "CA", name: "Canada",         dial: "+1",   flag: "🇨🇦", min: 10, max: 10 },
];

function readCountryCookie() {
  if (typeof document === "undefined") return "IN";
  const m = document.cookie.match(/(?:^|;\s*)qh_country=([A-Z]{2})/);
  return m ? m[1] : "IN";
}

const LoginPage = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const t = useTranslations("auth");
  const { isLoading, error, otpSent } = useSelector((state) => state.auth);

  const [isOtpStep, setIsOtpStep] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [mobileNumber, setMobileNumber] = useState("");
  // Default to the user's detected country (qh_country cookie set by edge
  // proxy). Falls back to IN. The selected country drives min/max digit
  // length and the dial-code prefix sent to the backend in E.164 format.
  const [countryCode, setCountryCode] = useState("IN");
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const selectedCountry = COUNTRY_CODES.find((c) => c.code === countryCode) || COUNTRY_CODES[0];
  // Full E.164 number sent to backend: dial + national digits (no spaces).
  const e164Mobile = `${selectedCountry.dial}${mobileNumber}`;
  // Per-country length validity — covers IN/UAE/US/etc. without libphonenumber.
  const isMobileLenValid =
    mobileNumber.length >= selectedCountry.min &&
    mobileNumber.length <= selectedCountry.max;
  const [otpValues, setOtpValues] = useState(["", "", "", ""]);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [showResendTimer, setShowResendTimer] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(120);
  const [isMobileFocused, setIsMobileFocused] = useState(false);
  const [isOtpFocused, setIsOtpFocused] = useState([
    false,
    false,
    false,
    false,
  ]);

  // New user profile states
  const [isNewUserStep, setIsNewUserStep] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [isFullNameFocused, setIsFullNameFocused] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [userData, setUserData] = useState(null);

  const autoLoginOtpRef = useRef("");
  const autoSentNumberRef = useRef("");

  // Responsive detection with multiple breakpoints
  const [screenSize, setScreenSize] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isIpadPro: false,
    width: 0,
    height: 0,
  });
  const [isMounted, setIsMounted] = useState(false);
  const [contentWidth, setContentWidth] = useState(400);
  const [logoHeight, setLogoHeight] = useState(40);
  const [verticalSpacing, setVerticalSpacing] = useState(24);

  // Mount effect - runs once on client
  useEffect(() => {
    setIsMounted(true);
    // Pre-select the country dropdown based on the qh_country cookie
    // (set by the edge proxy from CF-IPCountry / Accept-Language). Only
    // override if the detected country is one we explicitly support.
    const cookieCountry = readCountryCookie();
    if (COUNTRY_CODES.some((c) => c.code === cookieCountry)) {
      setCountryCode(cookieCountry);
    }
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Detect iPad Pro (1024x1366 or similar resolutions)
      const isIpadPro =
        (width === 1024 && height === 1366) ||
        (width === 1366 && height === 1024) ||
        (width >= 1024 && width <= 1366 && height >= 1024 && height <= 1366);

      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1024 && !isIpadPro;
      const isDesktop = width >= 1024 && !isIpadPro;

      setScreenSize({
        isMobile,
        isTablet,
        isDesktop,
        isIpadPro,
        width,
        height,
      });

      // Adjust content width based on screen size
      if (isMobile) {
        setContentWidth(width - 40);
        setLogoHeight(32);
        setVerticalSpacing(16);
      } else if (isTablet) {
        setContentWidth(450);
        setLogoHeight(38);
        setVerticalSpacing(20);
      } else if (isIpadPro) {
        setContentWidth(500);
        setLogoHeight(42);
        setVerticalSpacing(24);
      } else {
        setContentWidth(400);
        setLogoHeight(40);
        setVerticalSpacing(24);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Update error message when Redux error changes
  useEffect(() => {
    if (error) {
      setErrorMessage(
        typeof error === "string"
          ? error
          : error.message || t("errorGeneric"),
      );
    }
  }, [error]);

  // Update OTP step when OTP is sent
  useEffect(() => {
    if (otpSent) {
      setIsOtpStep(true);
      startResendTimer();
    }
  }, [otpSent]);

  // Timer for resend OTP functionality
  useEffect(() => {
    let timer;
    if (showResendTimer && resendSeconds > 0) {
      timer = setTimeout(() => {
        setResendSeconds(resendSeconds - 1);
      }, 1000);
    }

    return () => clearTimeout(timer);
  }, [showResendTimer, resendSeconds]);

  const startResendTimer = () => {
    setResendSeconds(120);
    setShowResendTimer(true);
  };

  useEffect(() => {
    setErrorMessage(null); // Clear any existing error messages on mount
    
  }, []);

  // const handleMobileChange = (value) => {
  //   const digitsOnly = value.replace(/\D/g, "").slice(0, 10);
  //   setMobileNumber(digitsOnly);

  //   // Clear OTP fields when mobile number changes (Flutter behavior)
  //   if (isOtpStep) {
  //     setOtpValues(["", "", "", ""]);
  //     setIsOtpStep(false);
  //     setErrorMessage(null);
  //     setIsOtpVerified(false);
  //     dispatch(resetOtpState());
  //   }
  // };

  // 3) replace your handleMobileChange with this
  // update handleMobileChange (reset OTP auto-login guard when number changes)
  const handleMobileChange = (value) => {
    // Slice to selected country's max length so admins typing more than
    // expected get a hard cap instead of a backend rejection later.
    const digitsOnly = value.replace(/\D/g, "").slice(0, selectedCountry.max);
    setMobileNumber(digitsOnly);

    if (isOtpStep) {
      setOtpValues(["", "", "", ""]);
      setIsOtpStep(false);
      setErrorMessage(null);
      setIsOtpVerified(false);
      dispatch(resetOtpState());
    }

    autoLoginOtpRef.current = "";

    const lenOk =
      digitsOnly.length >= selectedCountry.min &&
      digitsOnly.length <= selectedCountry.max;

    if (!lenOk) {
      autoSentNumberRef.current = "";
      return;
    }

    // Auto-fire OTP send when the user has entered a complete national
    // number for the selected country. We compare on the full E.164 form
    // so changing the country re-arms the auto-send without re-typing.
    const fullE164 = `${selectedCountry.dial}${digitsOnly}`;
    if (
      lenOk &&
      !isLoading &&
      !isOtpStep &&
      autoSentNumberRef.current !== fullE164
    ) {
      autoSentNumberRef.current = fullE164;
      handleSendOtp(fullE164);
    }
  };

  const handleOtpChange = (index, value) => {
    // Allow only a single digit
    const digit = value.replace(/\D/g, "").slice(-1);

    const newOtpValues = [...otpValues];
    newOtpValues[index] = digit;
    setOtpValues(newOtpValues);

    if (digit && index < 3) {
      // Advance focus to next field
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }

    const otp = newOtpValues.join("");
    const isComplete = otp.length === 4 && newOtpValues.every((d) => d !== "");

    if (isComplete) {
      setIsOtpVerified(true);
      setErrorMessage(null);

      if (
        isOtpStep &&
        !isLoading &&
        isMobileLenValid &&
        autoLoginOtpRef.current !== otp
      ) {
        autoLoginOtpRef.current = otp;
        handleLogin(otp);
      }
    } else {
      setIsOtpVerified(false);
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpValues[index] && index > 0) {
      // Move focus back on backspace when field is empty
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  // Accept either a full E.164 ("+919876543210") or a national number
  // ("9876543210") — caller passes whichever they have. We always send
  // the E.164 form to the backend so the validator's phoneRegex passes
  // and Twilio can route internationally.
  const toE164ForApi = (input) => {
    const s = String(input || "");
    if (s.startsWith("+")) return s;
    return `${selectedCountry.dial}${s.replace(/\D/g, "")}`;
  };

  const handleSendOtp = async (number) => {
    const e164 = toE164ForApi(number);
    // Validate against the selected country's national-number length
    // (slice off the dial code first).
    const national = e164.replace(selectedCountry.dial, "");
    if (
      national.length < selectedCountry.min ||
      national.length > selectedCountry.max
    ) {
      setErrorMessage(t("errorMobileInvalid"));
      return;
    }

    try {
      setErrorMessage(null);
      dispatch(clearError());

      const result = await dispatch(sendOtp(e164)).unwrap();

      setSuccessMessage(t("successOtpSent"));

      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      setErrorMessage(
        typeof error === "string"
          ? error
          : error.message || t("errorSendOtp"),
      );
    }
  };

  const handleResendOtp = async (number) => {
    const e164 = toE164ForApi(number);
    const national = e164.replace(selectedCountry.dial, "");
    if (
      national.length < selectedCountry.min ||
      national.length > selectedCountry.max
    ) {
      setErrorMessage(t("errorMobileInvalid"));
      return;
    }

    try {
      setErrorMessage(null);
      dispatch(clearError());
      dispatch(resetOtpState());
      autoLoginOtpRef.current = "";

      setResendSeconds(120);
      await dispatch(sendOtp(e164)).unwrap();

      setSuccessMessage(t("successOtpSent"));
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      setErrorMessage(
        typeof error === "string"
          ? error
          : error.message || t("errorResendOtp"),
      );
    }
  };

  const handleLogin = async (otpOverride) => {
    const otp = otpOverride ?? otpValues.join("");
    if (otp.length !== 4) {
      setErrorMessage(t("errorOtpIncomplete"));
      return;
    }

    try {
      setErrorMessage(null);
      dispatch(clearError());

      const fcmToken = "";
      // Send E.164 (+countrycode + national) so backend Twilio + validator
      // accept the same number used during sendOtp.
      const result = await dispatch(
        verifyOtp({ mobileNumber: e164Mobile, otp, fcmToken }),
      ).unwrap();

      setSuccessMessage(t("successOtpVerified"));
      setTimeout(() => setSuccessMessage(null), 2000);

      if (result.data?.token || result.token) {
        const token = result.data?.token || result.token;
        localStorage.setItem("token", token);
      }

      const user = result.data?.user || result.user;
      if (user) {
        localStorage.setItem("user", JSON.stringify(user));
        setUserData(user);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("userLoggedIn"));
        }
      }

      try {
        const profileResult = await dispatch(getUserProfile()).unwrap();
        if (profileResult.user || profileResult) {
          const fetchedProfile = profileResult.user || profileResult;
          const completeUser = {
            ...fetchedProfile,
            id: user.id || fetchedProfile.id || fetchedProfile._id,
            mobile: user.mobile || fetchedProfile.mobile,
            role: user.role || fetchedProfile.role,
          };
          localStorage.setItem("user", JSON.stringify(completeUser));
          setUserData(completeUser);
        }
      } catch (profileError) {}

      if (result.data?.isNewUser || result.isNewUser) {
        setIsNewUserStep(true);
        return;
      }

      setTimeout(() => router.push("/"), 500);
    } catch (error) {
      setErrorMessage(
        typeof error === "string"
          ? error
          : error.message || t("errorLogin"),
      );
      setIsOtpVerified(false);
      autoLoginOtpRef.current = "";
    }
  };

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      setErrorMessage(t("errorNameRequired"));
      return;
    }
    if (!email.trim()) {
      setErrorMessage(t("errorEmailRequired"));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMessage(t("errorEmailInvalid"));
      return;
    }

    if (!userData) {
      setErrorMessage(t("errorUserDataMissing"));
      return;
    }

    const userId = userData.id || userData._id || userData.userId;

    if (!userId) {
      setErrorMessage(t("errorUserIdMissing"));
      return;
    }

    try {
      setErrorMessage(null);
      dispatch(clearError());

      const profilePayload = {
        id: userId,
        name: fullName,
        email: email,
        // Persist the full E.164 number so country-aware features
        // (international SMS, currency detection from country code) keep
        // working long after login. userData.mobile already arrives in
        // E.164 from the verifyOtp response.
        mobile: userData.mobile || e164Mobile,
        role: userData.role || "user",
      };

      const response = await dispatch(
        updateUserProfile(profilePayload),
      ).unwrap();

      try {
        const profileResult = await dispatch(getUserProfile()).unwrap();
        if (profileResult.user || profileResult) {
          const completeUser = profileResult.user || profileResult;
          localStorage.setItem("user", JSON.stringify(completeUser));
        }
      } catch (profileError) {
        const updatedUser = {
          ...userData,
          name: fullName,
          email: email,
        };
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }

      setTimeout(() => {
        router.push("/");
      }, 500);
    } catch (error) {
      setErrorMessage(
        typeof error === "string"
          ? error
          : error.message || t("errorSaveProfile"),
      );
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // Responsive values based on screen size
  const getResponsiveValues = () => {
    if (screenSize.isMobile) {
      return {
        containerHeight: 52,
        fontSize: 14,
        otpFieldWidth: 56,
        otpFieldHeight: 52,
        spacingBetweenFields: 10,
        buttonHeight: 52,
        logoMarginBottom: 32,
        contentPadding: "20px",
        titleSize: "22px",
        buttonFontSize: "16px",
        otpInputFontSize: "18px",
        dotSize: 6,
        maxWidth: "100%",
        formPadding: "20px",
      };
    } else if (screenSize.isTablet) {
      return {
        containerHeight: 52,
        fontSize: 15,
        otpFieldWidth: 62,
        otpFieldHeight: 52,
        spacingBetweenFields: 12,
        buttonHeight: 52,
        logoMarginBottom: 32,
        contentPadding: "24px",
        titleSize: "26px",
        buttonFontSize: "17px",
        otpInputFontSize: "20px",
        dotSize: 7,
        maxWidth: "550px",
        formPadding: "32px",
      };
    } else if (screenSize.isIpadPro) {
      return {
        containerHeight: 56,
        fontSize: 16,
        otpFieldWidth: 70,
        otpFieldHeight: 56,
        spacingBetweenFields: 14,
        buttonHeight: 56,
        logoMarginBottom: 40,
        contentPadding: "32px",
        titleSize: "28px",
        buttonFontSize: "18px",
        otpInputFontSize: "22px",
        dotSize: 8,
        maxWidth: "600px",
        formPadding: "40px",
      };
    } else {
      return {
        containerHeight: 45,
        fontSize: 14,
        otpFieldWidth: 68,
        otpFieldHeight: 45,
        spacingBetweenFields: 10,
        buttonHeight: 45,
        logoMarginBottom: 24,
        contentPadding: "16px",
        titleSize: "24px",
        buttonFontSize: "16px",
        otpInputFontSize: "16px",
        dotSize: 8,
        maxWidth: "400px",
        formPadding: "16px",
      };
    }
  };

  const responsive = getResponsiveValues();

  // Don't render anything until mounted to prevent hydration mismatch and flash
  if (!isMounted) {
    return null;
  }

  const { isMobile, isTablet, isDesktop, isIpadPro } = screenSize;

  // For iPad Pro and larger tablets, show a centered form without sidebar
  const showSidebar = isDesktop && !isIpadPro;
  const isFullWidthForm = isMobile || isTablet || isIpadPro;

  return (
    <div
      className={
        showSidebar
          ? "h-screen flex flex-row"
          : "min-h-screen bg-white flex items-center justify-center"
      }
    >
      {/* Left Side - Login Image (Desktop only - not for iPad Pro) */}
      {showSidebar && (
        <div className="w-1/2 h-full relative">
          <Image
            src="/images/login/login_image.png"
            alt="Login"
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      {/* Right Side - Login Form */}
      <div
        className={showSidebar ? "w-1/2 h-full" : "w-full"}
        style={{ backgroundColor: "#FFFFFF" }}
      >
        {/* Success Message - Top Center */}
        {/* {successMessage && (
          <div
            className="fixed left-1/2 transform -translate-x-1/2 z-50"
            style={{
              top: isMobile ? "16px" : "20px",
              animation: "fadeIn 0.3s ease-in-out",
              width: "auto",
              maxWidth: isMobile ? "calc(100% - 32px)" : "310px",
            }}
          >
            <div
              className="flex items-center justify-center"
              style={{
                backgroundColor:
                  successMessage === "OTP Verified" ? "#45A735" : "#242424",
                borderRadius: "40px",
                boxShadow: "none",
                padding: isMobile ? "10px 20px" : "12px 20px",
                whiteSpace: "nowrap",
              }}
            > */}

               {successMessage && (
          <div
            className={isMobile ? "fixed left-1/2 transform -translate-x-1/2 z-50" : "fixed z-50"}
            style={{
              top: isMobile ? "16px" : isIpadPro ? "24px" : "30px",
              right: isMobile ? "auto" : isIpadPro ? "24px" : "250px",
              left: isMobile ? "50%" : "auto",
              transform: isMobile ? "translateX(-50%)" : "none",
              animation: "fadeIn 0.3s ease-in-out",
              width: "auto",
              maxWidth: isMobile ? "calc(100% - 32px)" : "310px",
            }}
          >
            <div
              className="flex items-center justify-center"
              style={{
                backgroundColor:
                  successMessage === "OTP Verified" ? "#45A735" : "#242424",
                borderRadius: "40px",
                boxShadow: "none",
                padding: isMobile ? "10px 20px" : "12px 20px",
                whiteSpace: "nowrap",
              }}
            >
              <span
                style={{
                  fontSize: isMobile ? "12px" : "14px",
                  fontWeight: 400,
                  color: "#FFFFFF",
                  fontFamily: "'OpenSauceOne', sans-serif",
                  textAlign: "center",
                }}
              >
                {successMessage}
              </span>
            </div>
          </div>
        )}

        {/* Skip Button - Top Right */}
        {!isNewUserStep && (
          <div
            className="absolute"
            style={{
              top: isMobile ? "16px" : isIpadPro ? "24px" : "30px",
              right: isMobile ? "16px" : isIpadPro ? "24px" : "20px",
              zIndex: 10,
            }}
          >
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors hover:bg-gray-100"
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
              }}
            >
              <span
                style={{
                  fontSize: isMobile ? "14px" : isIpadPro ? "16px" : "15px",
                  fontWeight: 700,
                  color: "#45A735",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                {t("skip")}
                <Image
                  src="/ArrowLeft.svg"
                  alt="arrow"
                  width={16}
                  height={16}
                  style={{
                    marginLeft: "6px",
                    verticalAlign: "middle",
                    transform: "rotate(45deg)",
                  }}
                />
              </span>
            </button>
          </div>
        )}

        {/* Login Form Content */}
        <div
          className="flex items-center justify-center min-h-screen"
          style={{
            padding: isIpadPro ? "40px" : isMobile ? "20px" : "32px",
          }}
        >
          <div
            className="w-full"
            style={{
              maxWidth: responsive.maxWidth,
              margin: "0 auto",
            }}
          >
            <div className="flex flex-col items-center">
              <div className="w-full">
                {/* QuickHire Logo */}
                <div
                  style={{
                    height: `${logoHeight}px`,
                    marginBottom: `${responsive.logoMarginBottom}px`,
                    textAlign: "center",
                  }}
                >
                  <Image
                    src="/quickhire-logo.svg"
                    alt="QuickHire"
                    width={logoHeight * 3}
                    height={logoHeight}
                    className="h-auto"
                    style={{
                      height: `${logoHeight}px`,
                      width: "auto",
                      margin: "0 auto",
                    }}
                  />
                </div>

                {/* Conditional Rendering: New User Profile or Login Form */}
                {isNewUserStep ? (
                  <>
                    {/* Welcome Text */}
                    <div style={{ marginBottom: "16px" }}>
                      <h2
                        style={{
                          fontSize: responsive.titleSize,
                          fontWeight: "600",
                          color: "#1A1A1A",
                          textAlign: "center",
                        }}
                      >
                        {t("welcomeQuickHireNew")}
                      </h2>
                    </div>

                    {/* Subtitle */}
                    <p
                      style={{
                        fontSize: isIpadPro ? "16px" : "14px",
                        fontWeight: "400",
                        color: "#666666",
                        fontFamily: "'OpenSauceOne', sans-serif",
                        marginBottom: isMobile ? "16px" : "20px",
                        textAlign: "center",
                      }}
                    >
                      {t("tellUsAboutYou")}
                    </p>

                    {/* Divider line */}
                    <div
                      style={{
                        width: "100%",
                        borderBottom: "1px solid #E5E5E5",
                        marginBottom: isMobile ? "20px" : "24px",
                      }}
                    />

                    {/* Error message display */}
                    {errorMessage && errorMessage !== "" && (
                      <div
                        className="flex items-start gap-3"
                        style={{
                          width: "100%",
                          padding: "12px 16px",
                          marginBottom: isMobile ? "16px" : "20px",
                          backgroundColor: "#E74C3C",
                          borderRadius: "24px",
                        }}
                      >
                        <div
                          className="text-white flex-shrink-0"
                          style={{ fontSize: "20px", marginTop: "2px" }}
                        >
                          ⚠️
                        </div>
                        <span
                          className="text-white flex-1"
                          style={{
                            fontSize: isIpadPro ? "14px" : "13px",
                            color: "#FFFFFF",
                            fontFamily: "'OpenSauceOne', sans-serif",
                            lineHeight: 1.4,
                          }}
                        >
                          {errorMessage}
                        </span>
                      </div>
                    )}

                    {/* Full Name Field */}
                    <div style={{ marginBottom: `${verticalSpacing}px` }}>
                      <div style={{ marginBottom: isMobile ? "8px" : "12px" }}>
                        <span
                          style={{
                            fontSize: isIpadPro ? "14px" : "12px",
                            fontWeight: "500",
                            color: "#1A1A1A",
                          }}
                        >
                          {t("fullName")} <span style={{ color: "#DC3545" }}>*</span>
                        </span>
                      </div>
                      <div
                        style={{
                          width: "100%",
                          height: `${responsive.containerHeight}px`,
                          backgroundColor: "#FFFFFF",
                          borderRadius: "12px",
                          border: `1px solid ${isFullNameFocused ? "#45A735" : "#E5E5E5"}`,
                        }}
                      >
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          onFocus={() => setIsFullNameFocused(true)}
                          onBlur={() => setIsFullNameFocused(false)}
                          placeholder={t("enterFullName")}
                          className="w-full h-full bg-transparent outline-none"
                          style={{
                            fontSize: `${responsive.fontSize}px`,
                            color: "#484848",
                            fontFamily: "'OpenSauceOne', sans-serif",
                            paddingLeft: isMobile ? "16px" : "20px",
                            paddingRight: isMobile ? "16px" : "20px",
                            paddingTop: "12px",
                            paddingBottom: "12px",
                            borderRadius: "12px",
                          }}
                        />
                      </div>
                    </div>

                    {/* Email Address Field */}
                    <div style={{ marginBottom: `${verticalSpacing}px` }}>
                      <div style={{ marginBottom: isMobile ? "8px" : "12px" }}>
                        <span
                          style={{
                            fontSize: isIpadPro ? "14px" : "12px",
                            fontWeight: "500",
                            color: "#1A1A1A",
                          }}
                        >
                          {t("emailAddress")}{" "}
                          <span style={{ color: "#DC3545" }}>*</span>
                        </span>
                      </div>
                      <div
                        style={{
                          width: "100%",
                          height: `${responsive.containerHeight}px`,
                          backgroundColor: "#FFFFFF",
                          borderRadius: "12px",
                          border: `1px solid ${isEmailFocused ? "#45A735" : "#E5E5E5"}`,
                        }}
                      >
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onFocus={() => setIsEmailFocused(true)}
                          onBlur={() => setIsEmailFocused(false)}
                          placeholder={t("emailPlaceholder")}
                          className="w-full h-full bg-transparent outline-none"
                          style={{
                            fontSize: `${responsive.fontSize}px`,
                            color: "#484848",
                            fontFamily: "'OpenSauceOne', sans-serif",
                            paddingLeft: isMobile ? "16px" : "20px",
                            paddingRight: isMobile ? "16px" : "20px",
                            paddingTop: "12px",
                            paddingBottom: "12px",
                            borderRadius: "12px",
                          }}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Welcome Text */}
                    <div style={{ marginBottom: "16px" }}>
                      <h2
                        style={{
                          fontSize: responsive.titleSize,
                          fontWeight: "600",
                          color: "#1A1A1A",
                          textAlign: "center",
                        }}
                      >
                        {t("welcomeQuickHire")}
                      </h2>
                    </div>

                    {/* Subtitle */}
                    <p
                      style={{
                        fontSize: isIpadPro ? "16px" : "14px",
                        fontWeight: "400",
                        color: "#666666",
                        fontFamily: "'OpenSauceOne', sans-serif",
                        marginBottom: isMobile ? "16px" : "20px",
                        textAlign: "center",
                      }}
                    >
                      {t("signInTagline")}
                    </p>

                    {/* Divider line */}
                    <div
                      style={{
                        width: "100%",
                        borderBottom: "1px solid #E5E5E5",
                        marginBottom: isMobile ? "20px" : "24px",
                      }}
                    />

                    {/* Error message display */}
                    {errorMessage && errorMessage !== "" && (
                      <div
                        className="flex items-start gap-3"
                        style={{
                          width: "100%",
                          padding: "12px 16px",
                          marginBottom: isMobile ? "16px" : "20px",
                          backgroundColor: "#FF48481A",
                          borderRadius: "12px",
                          border: "1px solid #FF4848",
                        }}
                      >
                        <span
                          className="flex-1"
                          style={{
                            fontSize: isIpadPro ? "15px" : "14px",
                            color: "#FF4848",
                            fontFamily: "'OpenSauceOne', sans-serif",
                            textAlign: "center",
                          }}
                        >
                          {errorMessage}
                        </span>
                      </div>
                    )}

                    {/* Mobile Number Section */}
                    <div style={{ marginBottom: `${verticalSpacing}px` }}>
                      {/* Mobile Number Label */}
                      <div style={{ marginBottom: isMobile ? "8px" : "12px" }}>
                        <span
                          style={{
                            fontSize: isIpadPro ? "14px" : "12px",
                            fontWeight: "500",
                            color: "#1A1A1A",
                          }}
                        >
                          {t("mobileNumber")}{" "}
                          <span style={{ color: "#DC3545" }}>*</span>
                        </span>
                      </div>

                      {/* Mobile Number Input */}
                      <div
                        className="flex"
                        style={{
                          width: "100%",
                          height: `${responsive.containerHeight}px`,
                          backgroundColor: "#FFFFFF",
                          borderRadius: "12px",
                          border: `1px solid ${isMobileFocused ? "#45A735" : "#E5E5E5"}`,
                          position: "relative",
                        }}
                      >
                        {/* Country code picker — opens a dropdown of supported
                            countries with flag + dial code. Selected dial is
                            sent to backend as part of E.164 number. */}
                        <button
                          type="button"
                          onClick={() => setShowCountryPicker((v) => !v)}
                          className="flex items-center gap-1.5 border-r border-[#E5E5E5]"
                          style={{
                            paddingLeft: isMobile ? "12px" : "16px",
                            paddingRight: isMobile ? "10px" : "12px",
                            fontSize: `${responsive.fontSize}px`,
                            color: "#484848",
                            fontFamily: "'OpenSauceOne', sans-serif",
                            cursor: "pointer",
                            background: "transparent",
                            minWidth: isMobile ? "92px" : "104px",
                          }}
                          aria-haspopup="listbox"
                          aria-expanded={showCountryPicker}
                        >
                          <span style={{ fontSize: "16px" }}>{selectedCountry.flag}</span>
                          <span style={{ fontWeight: 500 }}>{selectedCountry.dial}</span>
                          <svg width={10} height={10} viewBox="0 0 24 24" fill="none" style={{ marginLeft: "2px", color: "#909090" }}>
                            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>

                        {showCountryPicker && (
                          <div
                            role="listbox"
                            className="absolute top-full left-0 mt-1 bg-white border border-[#E5E5E5] rounded-xl shadow-lg z-30 overflow-hidden"
                            style={{ minWidth: "240px", maxHeight: "280px", overflowY: "auto" }}
                          >
                            {COUNTRY_CODES.map((c) => (
                              <button
                                key={c.code}
                                type="button"
                                role="option"
                                aria-selected={c.code === countryCode}
                                onClick={() => {
                                  setCountryCode(c.code);
                                  setShowCountryPicker(false);
                                  // Reset auto-send tracker so changing
                                  // country re-arms the OTP send.
                                  autoSentNumberRef.current = "";
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[#F2F9F1] transition-colors"
                                style={{
                                  fontSize: "14px",
                                  color: c.code === countryCode ? "#26472B" : "#484848",
                                  background: c.code === countryCode ? "#F2F9F1" : "transparent",
                                }}
                              >
                                <span style={{ fontSize: "18px" }}>{c.flag}</span>
                                <span style={{ flex: 1, fontWeight: c.code === countryCode ? 600 : 400 }}>{c.name}</span>
                                <span style={{ color: "#909090" }}>{c.dial}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="flex-1 flex items-center">
                          <input
                            type="tel"
                            value={mobileNumber}
                            onChange={(e) => handleMobileChange(e.target.value)}
                            onFocus={() => setIsMobileFocused(true)}
                            onBlur={() => setIsMobileFocused(false)}
                            placeholder={t("enterMobileNumber")}
                            className="w-full h-full bg-transparent outline-none"
                            style={{
                              fontSize: `${responsive.fontSize}px`,
                              color: "#484848",
                              fontFamily: "'OpenSauceOne', sans-serif",
                              paddingLeft: isMobile ? "12px" : "16px",
                              paddingRight: "12px",
                              paddingTop: "12px",
                              paddingBottom: "12px",
                            }}
                            maxLength={selectedCountry.max}
                          />
                        </div>

                        {/* Send OTP Button */}
                        <div
                          className="flex items-center"
                          style={{
                            height: `${responsive.containerHeight}px`,
                            padding: isMobile ? "2px" : "4px",
                          }}
                        >
                          <button
                            onClick={() =>
                              isMobileLenValid && handleSendOtp(e164Mobile)
                            }
                            disabled={isLoading || isOtpStep}
                            className="px-4 py-2 transition-colors"
                            style={{
                              fontSize: `${responsive.fontSize}px`,
                              fontWeight: 500,
                              color: "#45A735",
                              fontFamily: "'OpenSauceOne', sans-serif",
                              backgroundColor: "transparent",
                              border: "none",
                              cursor:
                                isLoading || isOtpStep
                                  ? "not-allowed"
                                  : "pointer",
                              opacity: isLoading || isOtpStep ? 0.6 : 1,
                              padding: isMobile ? "12px 16px" : "16px 24px",
                              borderRadius: "12px",
                            }}
                          >
                            {isOtpVerified
                              ? t("verified")
                              : isLoading
                                ? t("verifying")
                                : isOtpStep
                                  ? t("otpSent")
                                  : t("sendOtp")}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* OTP Section */}
                    <div style={{ marginBottom: `${verticalSpacing}px` }}>
                      {/* OTP Label */}
                      <div style={{ marginBottom: isMobile ? "8px" : "12px" }}>
                        <span
                          style={{
                            fontSize: isIpadPro ? "14px" : "12px",
                            fontWeight: "500",
                            color: "#1A1A1A",
                          }}
                        >
                          {t("otp")} <span style={{ color: "#DC3545" }}>*</span>
                        </span>
                      </div>

                      {/* OTP Input Row */}
                      <div className="flex items-center justify-center">
                        {otpValues.map((value, index) => (
                          <div key={index} className="flex items-center">
                            <div
                              style={{
                                width: `${responsive.otpFieldWidth}px`,
                                height: `${responsive.otpFieldHeight}px`,
                                backgroundColor: "#FFFFFF",
                                borderRadius: "12px",
                                border: `1px solid ${
                                  errorMessage && isOtpStep
                                    ? "#DC3545"
                                    : isOtpFocused[index]
                                      ? "#45A735"
                                      : "#D9D9D9"
                                }`,
                              }}
                            >
                              <input
                                id={`otp-${index}`}
                                type="text"
                                inputMode="numeric"
                                value={value}
                                onChange={(e) =>
                                  handleOtpChange(index, e.target.value)
                                }
                                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                onFocus={() => {
                                  const newFocused = [...isOtpFocused];
                                  newFocused[index] = true;
                                  setIsOtpFocused(newFocused);
                                }}
                                onBlur={() => {
                                  const newFocused = [...isOtpFocused];
                                  newFocused[index] = false;
                                  setIsOtpFocused(newFocused);
                                }}
                                placeholder="-"
                                className="w-full h-full bg-transparent outline-none text-center"
                                style={{
                                  fontSize: `${responsive.otpInputFontSize}px`,
                                  fontWeight: "500",
                                  color: "#1A1A1A",
                                  fontFamily: "'OpenSauceOne', sans-serif",
                                }}
                                maxLength={1}
                                disabled={!isOtpStep}
                              />
                            </div>

                            {index < 3 && (
                              <>
                                <div
                                  style={{
                                    width: `${responsive.spacingBetweenFields}px`,
                                  }}
                                />
                                <div
                                  style={{
                                    width: `${responsive.dotSize}px`,
                                    height: `${responsive.dotSize}px`,
                                    backgroundColor: "#CCCCCC",
                                    borderRadius: "50%",
                                  }}
                                />
                                <div
                                  style={{
                                    width: `${responsive.spacingBetweenFields}px`,
                                  }}
                                />
                              </>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Resend OTP Section - exact Flutter implementation */}
                      {showResendTimer && (
                        <div
                          className="flex items-center mt-3"
                          style={{ marginTop: isMobile ? 12 : 16 }}
                        >
                          <span
                            className="flex-1"
                            style={{
                              fontSize: "12px",
                              fontWeight: 400,
                              color: "#484848",
                              fontFamily: "'OpenSauceOne', sans-serif",
                            }}
                          >
                            {t("didNotReceive")}
                          </span>
                          <div className="flex items-center">
                            <Image
                              src="/resendicon.svg"
                              alt="check"
                              width={24}
                              height={24}
                              style={{ marginRight: "8px" }}
                            />
                            {resendSeconds === 0 ? (
                              <button
                                onClick={() => handleResendOtp(mobileNumber)}
                                className="text-green-600 font-medium"
                                style={{
                                  fontSize: "12px",
                                  fontWeight: 400,
                                  color: "#484848",
                                  fontFamily: "'OpenSauceOne', sans-serif",
                                  cursor: "pointer",
                                }}
                              >
                                {t("resend")}
                              </button>
                            ) : (
                              <div className="flex items-center">
                                <span
                                  style={{
                                    fontSize: isIpadPro ? "13px" : "12px",
                                    fontWeight: 500,
                                    color: "#45A735",
                                    fontFamily: "'OpenSauceOne', sans-serif",
                                  }}
                                >
                                  {t("resend")}{" "}
                                </span>

                                <span
                                  style={{
                                    fontSize: "12px",
                                    fontWeight: 700,
                                    color: "#45A735",
                                    fontFamily: "'OpenSauceOne', sans-serif",
                                    marginLeft: "8px", // Add space between "Resend" and timer
                                  }}
                                >
                                  {formatTime(resendSeconds)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Divider line */}
                <div
                  style={{
                    width: "100%",
                    height: "1px",
                    borderBottom: "1px solid #E5E5E5",
                    marginBottom: `${verticalSpacing}px`,
                  }}
                />
              </div>

              {/* Action Button */}
              <div
                style={{
                  width: "100%",
                  height: `${responsive.buttonHeight}px`,
                  marginTop: isMobile ? "8px" : "0",
                }}
              >
                {isLoading ? (
                  <div
                    className="flex items-center justify-center w-full h-full"
                    style={{
                      backgroundColor: "rgba(69, 167, 53, 0.5)",
                      borderRadius: "12px",
                    }}
                  >
                    <div
                      className="animate-spin rounded-full border-2 border-white border-t-transparent"
                      style={{
                        width: "24px",
                        height: "24px",
                        borderWidth: "2px",
                      }}
                    />
                  </div>
                ) : (
                  <button
                    onClick={isNewUserStep ? handleSaveProfile : handleLogin}
                    disabled={
                      isNewUserStep
                        ? !fullName.trim() || !email.trim()
                        : !isOtpVerified
                    }
                    className="w-full h-full transition-colors"
                    style={{
                      backgroundColor: (
                        isNewUserStep
                          ? fullName.trim() && email.trim()
                          : isOtpVerified
                      )
                        ? "#45A735"
                        : "rgba(69, 167, 53, 0.5)",
                      borderRadius: "12px",
                      padding: isMobile ? "0 20px" : "0 24px",
                      cursor: (
                        isNewUserStep
                          ? fullName.trim() && email.trim()
                          : isOtpVerified
                      )
                        ? "pointer"
                        : "not-allowed",
                      border: "none",
                    }}
                  >
                    <span
                      style={{
                        fontSize: responsive.buttonFontSize,
                        fontWeight: 500,
                        color: "#FFFFFF",
                        fontFamily: "'OpenSauceOne', sans-serif",
                      }}
                    >
                      {isNewUserStep ? t("saveAndContinue") : t("login")}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
