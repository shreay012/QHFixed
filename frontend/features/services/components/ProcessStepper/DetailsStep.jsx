"use client";

import React, { useState, useRef, useEffect } from "react";
import { showError, showSuccess } from "@/lib/utils/toast";
import {
  Box,
  Typography,
  TextField,
  Button,
  Dialog,
  DialogContent,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import { useStepperContext } from "./StepperContext";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import {
  sendOtp,
  verifyOtp,
  clearError,
  resetOtpState,
  completeProfile,
  setAuthenticatedAfterDetails,
  setAuthFromStorage,
} from "@/lib/redux/slices/authSlice/authSlice";
import {
  getUserProfile,
  updateUserProfile,
} from "@/lib/redux/slices/userProfileSlice/userProfileSlice";
import { fetchDashboardStats } from "@/lib/redux/slices/dashboardSlice";
import { bookingService } from "@/lib/services/bookingApi";
import { paymentService } from "@/lib/services/paymentApi";
import Image from "next/image";
import {
  fetchCustomerBookings,
  createJob,
  updateJob,
  setSelectedJobId,
  fetchJobById,
} from "@/lib/redux/slices/bookingSlice/bookingSlice";
import { useTranslations } from "next-intl";

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

const DetailsStep = () => {
  const {
    setNavigationCallback,
    goToStep,
    nextStep,
    previousStep,
    isFirstStep,
    setIsDetailsCompleted,
    detailsBookingData,
    setDetailsBookingData,
    savePendingBooking,
    pendingRestoredRef,
  } = useStepperContext();
  const dispatch = useDispatch();
  const router = useRouter();
  const t = useTranslations("detailsStep");
  const {
    isLoading,
    error,
    otpSent: reduxOtpSent,
    isNewUser,
    user: authUser,
  } = useSelector((state) => state.auth);
  const { createdJobId } = useSelector((state) => state.booking);

  const [mobileNumber, setMobileNumber] = useState("");
  const [countryCode, setCountryCode] = useState("IN");
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const selectedCountry =
    COUNTRY_CODES.find((c) => c.code === countryCode) || COUNTRY_CODES[0];
  const e164Mobile = `${selectedCountry.dial}${mobileNumber}`;
  const isMobileLenValid =
    mobileNumber.length >= selectedCountry.min &&
    mobileNumber.length <= selectedCountry.max;
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [otpVerified, setOtpVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showResendTimer, setShowResendTimer] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(120);

  // New user profile fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [bookingsResponse, setBookingsResponse] = useState(null);

  // Payment states
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);

  const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const otpVerifiedRef = useRef(false);
  const proceedFuncRef = useRef(null);
  const hasRestoredRef = useRef(false);

  useEffect(() => {
    const cc = readCountryCookie();
    if (COUNTRY_CODES.some((c) => c.code === cc)) {
      setCountryCode(cc);
    }
  }, []);

  // Restore mobile number and OTP state from context on mount
  useEffect(() => {
    if (detailsBookingData && !hasRestoredRef.current) {
      hasRestoredRef.current = true;
      if (detailsBookingData.mobileNumber) {
        setMobileNumber(detailsBookingData.mobileNumber);
      }
      if (detailsBookingData.otpSent) {
        setOtpSent(detailsBookingData.otpSent);
      }
      if (detailsBookingData.showResendTimer) {
        setShowResendTimer(detailsBookingData.showResendTimer);
      }
      if (detailsBookingData.resendSeconds) {
        setResendSeconds(detailsBookingData.resendSeconds);
      }
    }
  }, [detailsBookingData]);

  // Keep ref in sync with state
  useEffect(() => {
    otpVerifiedRef.current = otpVerified;
  }, [otpVerified]);

  // Auto-open modal when OTP is verified (for existing users)
  useEffect(() => {
    if (otpVerified && !isNewUser) {
      // pendingRestoredRef.current is set synchronously by StepperContext's effect
      // (parent effects run before child effects in React's commit phase).
      // If true, booking state was already restored and activeStep set to 2 (Summary).
      // No modal needed — user seamlessly continues the booking.
      if (pendingRestoredRef && pendingRestoredRef.current) {
        console.log("✅ OTP verified — booking state restored, skipping modal");
        setIsDetailsCompleted(true);
        return;
      }
      console.log("✅ OTP verified — opening confirmation modal for existing user");
      savePendingBooking();
      setShowModal(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpVerified, isNewUser]);

  useEffect(() => {
    if (createdJobId) {
      router.push(`?jobId=${createdJobId}`, { scroll: false });
    }
  }, [createdJobId, router]);

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Update error message when Redux error changes
  useEffect(() => {
    if (error) {
      setErrorMessage(
        typeof error === "string"
          ? error
          : error.message || "An error occurred",
      );
    }
  }, [error]);

  // Update OTP step when OTP is sent
  useEffect(() => {
    if (reduxOtpSent) {
      setOtpSent(true);
      startResendTimer();
    }
  }, [reduxOtpSent]);

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

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // Set up navigation callback when component mounts
  useEffect(() => {
    const callback = (proceedFunc) => {
      // For guest users, don't require OTP verification - proceed to payment
      // Login will happen at PaymentStep
      proceedFunc();
    };
    setNavigationCallback(callback);

    // Clean up callback when component unmounts
    return () => {
      setNavigationCallback(null);
      proceedFuncRef.current = null;
    };
  }, [setNavigationCallback]);
  const handleReviewCart = async () => {
    try {
      // Check if bookings exist
      const hasBookings =
        bookingsResponse?.data && bookingsResponse.data.length > 0;

      if (hasBookings) {
        // Bookings exist - UPDATE existing job
        console.log("📦 Existing bookings found - Updating job...");

        const existingJobId = bookingsResponse.data[0]._id;
        console.log("🆔 Existing Job ID:", existingJobId);

        // Get pricing data from localStorage
        const storedPricingData = localStorage.getItem("_pricing_data");

        if (storedPricingData) {
          const pricingData = JSON.parse(storedPricingData);
          const serviceData = pricingData.data?.servicesWithPricing?.[0];

          if (serviceData) {
            // Prepare job payload
            const jobPayload = {
              services: [
                {
                  serviceId:
                    serviceData.serviceId?._id || serviceData.serviceId,
                  technologyIds:
                    serviceData.technologyIds?.map((tech) => typeof tech === "string" ? tech : tech._id || tech.id || tech).filter(Boolean) || [],
                  selectedDays: serviceData.selectedDays || 1,
                  requirements:
                    serviceData.requirements || "Selected from web v3",
                  preferredStartDate: serviceData.preferredStartDate,
                  preferredEndDate: serviceData.preferredEndDate,
                  durationTime: serviceData.durationTime,
                  startTime: serviceData.timeSlot?.startTime || "09:00",
                  endTime: serviceData.timeSlot?.endTime || "18:00",
                  timeSlot: {
                    startTime: serviceData.timeSlot?.startTime || "09:00",
                    endTime: serviceData.timeSlot?.endTime || "18:00",
                  },
                  bookingType: serviceData.bookingType || "later",
                },
              ],
            };

            console.log("📤 Updating job with payload:", jobPayload);

            // PUT job (update)
            const updatedJob = await dispatch(
              updateJob({
                jobId: existingJobId,
                jobData: jobPayload,
              }),
            ).unwrap();
            console.log("✅ Job updated:", updatedJob);
            dispatch(fetchDashboardStats());

            // Store the existing job ID
            dispatch(setSelectedJobId(existingJobId));
            console.log("💾 Stored existing job ID:", existingJobId);

            // Fetch updated job details
            // await dispatch(fetchJobById(existingJobId)).unwrap();
            console.log("✅ Job details fetched after update");
          }
        }
      } else {
        // No bookings - CREATE new job
        console.log("📭 No existing bookings - Creating new job...");

        // Get pricing data from localStorage
        const storedPricingData = localStorage.getItem("_pricing_data");

        if (storedPricingData) {
          const pricingData = JSON.parse(storedPricingData);
          const serviceData = pricingData.data?.servicesWithPricing?.[0];

          if (serviceData) {
            // Prepare job payload
            const jobPayload = {
              services: [
                {
                  serviceId:
                    serviceData.serviceId?._id || serviceData.serviceId,
                  technologyIds:
                    serviceData.technologyIds?.map((tech) => typeof tech === "string" ? tech : tech._id || tech.id || tech).filter(Boolean) || [],
                  selectedDays: serviceData.selectedDays || 1,
                  requirements:
                    serviceData.requirements || "Selected from web v3",
                  preferredStartDate: serviceData.preferredStartDate,
                  preferredEndDate: serviceData.preferredEndDate,
                  durationTime: serviceData.durationTime,
                  startTime: serviceData.timeSlot?.startTime || "09:00",
                  endTime: serviceData.timeSlot?.endTime || "18:00",
                  timeSlot: {
                    startTime: serviceData.timeSlot?.startTime || "09:00",
                    endTime: serviceData.timeSlot?.endTime || "18:00",
                  },
                  bookingType: serviceData.bookingType || "later",
                },
              ],
            };

            console.log("📤 Creating job with payload:", jobPayload);

            // POST job (create)
            const createdJob = await dispatch(createJob(jobPayload)).unwrap();
            console.log("✅ Job created:", createdJob);

            // Store the created job ID
            if (createdJob.data?._id) {
              dispatch(setSelectedJobId(createdJob.data._id));
              console.log("💾 Stored created job ID:", createdJob.data._id);
              router.push(`?jobId=${createdJob.data._id}`, { scroll: false });
              // Fetch created job details
              // await dispatch(fetchJobById(createdJob.data._id)).unwrap();
              console.log("✅ Job details fetched after creation");
            }
          }
        }
      }

      // Mark details as completed
      setIsDetailsCompleted(true);
      // Complete profile if it was a new user
      dispatch(completeProfile());
      // Set authenticated before navigation
      dispatch(setAuthenticatedAfterDetails());
      setShowModal(false);
      // ✅ Let restore logic handle navigation to step 2 (Summary) if pending booking exists
      // Otherwise redirect to home
      const hasPendingBooking = typeof window !== 'undefined' && localStorage.getItem('_pending_booking');
      if (!hasPendingBooking) {
        // No pending booking - go to home or stay on current step
        console.log('✅ No pending booking - redirecting home');
        router.push('/');
      }
    } catch (error) {
      console.error("❌ Error in handleReviewCart:", error);
      setErrorMessage(
        error.message || "Failed to process booking. Please try again.",
      );
    }
  };

  const handlePayNow = async () => {
    try {
      let finalJobId = null;

      // Check if bookings exist
      const hasBookings =
        bookingsResponse?.data && bookingsResponse.data.length > 0;

      if (hasBookings) {
        // Bookings exist - UPDATE existing job
        console.log("📦 Existing bookings found - Updating job...");

        const existingJobId = bookingsResponse.data[0]._id;
        console.log("🆔 Existing Job ID:", existingJobId);
        finalJobId = existingJobId;

        // Get pricing data from localStorage
        const storedPricingData = localStorage.getItem("_pricing_data");

        if (storedPricingData) {
          const pricingData = JSON.parse(storedPricingData);
          const serviceData = pricingData.data?.servicesWithPricing?.[0];

          if (serviceData) {
            // Prepare job payload
            const jobPayload = {
              services: [
                {
                  serviceId:
                    serviceData.serviceId?._id || serviceData.serviceId,
                  technologyIds:
                    serviceData.technologyIds?.map((tech) => typeof tech === "string" ? tech : tech._id || tech.id || tech).filter(Boolean) || [],
                  selectedDays: serviceData.selectedDays || 1,
                  requirements:
                    serviceData.requirements || "Selected from web v3",
                  preferredStartDate: serviceData.preferredStartDate,
                  preferredEndDate: serviceData.preferredEndDate,
                  durationTime: serviceData.durationTime,
                  startTime: serviceData.timeSlot?.startTime || "09:00",
                  endTime: serviceData.timeSlot?.endTime || "18:00",
                  timeSlot: {
                    startTime: serviceData.timeSlot?.startTime || "09:00",
                    endTime: serviceData.timeSlot?.endTime || "18:00",
                  },
                  bookingType: serviceData.bookingType || "later",
                },
              ],
            };

            console.log("📤 Updating job with payload:", jobPayload);

            // PUT job (update)
            const updatedJob = await dispatch(
              updateJob({
                jobId: existingJobId,
                jobData: jobPayload,
              }),
            ).unwrap();
            console.log("✅ Job updated:", updatedJob);
            dispatch(fetchDashboardStats());

            // Store the existing job ID
            dispatch(setSelectedJobId(existingJobId));
            console.log("💾 Stored existing job ID:", existingJobId);
          }
        }
      } else {
        // No bookings - CREATE new job
        console.log("📭 No existing bookings - Creating new job...");

        // Get pricing data from localStorage
        const storedPricingData = localStorage.getItem("_pricing_data");

        if (storedPricingData) {
          const pricingData = JSON.parse(storedPricingData);
          const serviceData = pricingData.data?.servicesWithPricing?.[0];

          if (serviceData) {
            // Prepare job payload
            const jobPayload = {
              services: [
                {
                  serviceId:
                    serviceData.serviceId?._id || serviceData.serviceId,
                  technologyIds:
                    serviceData.technologyIds?.map((tech) => typeof tech === "string" ? tech : tech._id || tech.id || tech).filter(Boolean) || [],
                  selectedDays: serviceData.selectedDays || 1,
                  requirements:
                    serviceData.requirements || "Selected from web v3",
                  preferredStartDate: serviceData.preferredStartDate,
                  preferredEndDate: serviceData.preferredEndDate,
                  durationTime: serviceData.durationTime,
                  startTime: serviceData.timeSlot?.startTime || "09:00",
                  endTime: serviceData.timeSlot?.endTime || "18:00",
                  timeSlot: {
                    startTime: serviceData.timeSlot?.startTime || "09:00",
                    endTime: serviceData.timeSlot?.endTime || "18:00",
                  },
                  bookingType: serviceData.bookingType || "later",
                },
              ],
            };

            console.log("📤 Creating job with payload:", jobPayload);

            // POST job (create)
            const createdJob = await dispatch(createJob(jobPayload)).unwrap();
            console.log("✅ Job created:", createdJob);

            // Store the created job ID
            if (createdJob.data?._id) {
              finalJobId = createdJob.data._id;
              dispatch(setSelectedJobId(createdJob.data._id));
              console.log("💾 Stored created job ID:", createdJob.data._id);
              router.push(`?jobId=${createdJob.data._id}`, { scroll: false });
            }
          }
        }
      }

      // Mark details as completed
      setIsDetailsCompleted(true);
      // Complete profile if it was a new user
      dispatch(completeProfile());
      // Set authenticated before navigation
      dispatch(setAuthenticatedAfterDetails());
      setShowModal(false);

      // ====== RAZORPAY PAYMENT INTEGRATION ======
      if (finalJobId) {
        console.log("💳 Initiating payment for job ID:", finalJobId);
        setIsProcessingPayment(true);

        // Fetch job details to get pricing
        const jobDetails = await bookingService.getJobById(finalJobId);
        console.log("📄 Job details:", jobDetails.data);

        const amount = jobDetails.data.data.job.pricing.totalPriceWithGst;
        console.log("💵 Payment amount:", amount);

        // Create Razorpay order
        const orderResponse = await paymentService.createOrder(
          finalJobId,
          amount,
        );
        console.log("✅ Order created:", orderResponse.data);

        const paymentData = orderResponse.data.data;

        // Configure Razorpay options
        const razorpayOptions = {
          key: paymentData.keyId,
          amount: paymentData.amount * 100,
          currency: paymentData.currency,
          name: "QuickHire",
          description: "Service Booking Payment",
          order_id: paymentData.razorpayOrderId,

          handler: async function (response) {
            console.log("💰 Payment successful:", response);

            try {
              // Check payment status
              const statusResponse = await paymentService.getPaymentStatus(
                paymentData.paymentId,
              );
              console.log("📊 Payment status:", statusResponse.data);

              // Clear payment data from localStorage
              localStorage.removeItem("_current_job_id");
              localStorage.removeItem("_pricing_data");
              console.log("🧹 Cleared payment data from localStorage");
              router.push(`/payment-success?jobId=${finalJobId}`);
              // Show success screen
              // setShowPaymentSuccess(true);
              // setIsProcessingPayment(false);
            } catch (error) {
              console.error("❌ Error checking payment status:", error);
              setIsProcessingPayment(false);
              showError("Payment completed but status check failed. Please contact support.");
            }
          },

          prefill: {
            name: paymentData.userDetails?.name || "",
            email: paymentData.userDetails?.email || "",
            contact: paymentData.userDetails?.mobile || "",
          },

          notes: {
            jobId: finalJobId,
            bookingType: paymentData.bookingType,
          },

          theme: {
            color: "#45A735",
          },

          modal: {
            ondismiss: function () {
              console.log("⚠️ Payment cancelled by user");
              setIsProcessingPayment(false);
            },
          },
        };

        // Open Razorpay checkout
        if (window.Razorpay) {
          const razorpay = new window.Razorpay(razorpayOptions);
          razorpay.open();
        } else {
          throw new Error("Razorpay SDK not loaded");
        }
      }
    } catch (error) {
      console.error("❌ Error in handlePayNow:", error);
      setErrorMessage(
        error.message || "Failed to process booking. Please try again.",
      );
      setIsProcessingPayment(false);
    }
  };

  const handleSendOTP = async () => {
    // Validate mobile number for the selected country
    if (!isMobileLenValid) {
      setErrorMessage(
        `Please enter a valid mobile number (${selectedCountry.min}${
          selectedCountry.min !== selectedCountry.max ? `-${selectedCountry.max}` : ""
        } digits)`
      );
      return;
    }

    try {
      setErrorMessage(null);
      setSuccessMessage(null);
      dispatch(clearError());

      console.log("📡 Sending OTP to mobile number:", e164Mobile);
      // Dispatch the sendOtp action with E.164 (dial + national)

      await dispatch(sendOtp(e164Mobile)).unwrap();

      // Reset OTP fields
      setOtp(["", "", "", ""]);
      setOtpVerified(false);

      // Save to context for restoration if user navigates away
      setDetailsBookingData({
        mobileNumber,
        otpSent: true,
        showResendTimer: true,
        resendSeconds: 120,
      });

      // Show success message
      // setSuccessMessage("OTP has been sent successfully");

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      setErrorMessage(
        typeof error === "string"
          ? error
          : error.message || "Failed to send OTP. Please try again.",
      );
    }
  };

  const handleResendOtp = async () => {
    // Validate mobile number for the selected country
    if (!isMobileLenValid) {
      setErrorMessage(
        `Please enter a valid mobile number (${selectedCountry.min}${
          selectedCountry.min !== selectedCountry.max ? `-${selectedCountry.max}` : ""
        } digits)`
      );
      return;
    }

    try {
      setErrorMessage(null);
      setSuccessMessage(null);
      dispatch(clearError());
      dispatch(resetOtpState());

      // Reset timer
      setResendSeconds(120);

      // Call send OTP API with E.164
      await dispatch(sendOtp(e164Mobile)).unwrap();

      // Reset OTP fields
      setOtp(["", "", "", ""]);
      setOtpVerified(false);

      // Save to context for restoration if user navigates away
      setDetailsBookingData({
        mobileNumber,
        otpSent: true,
        showResendTimer: true,
        resendSeconds: 120,
      });

      // Show success message
      // setSuccessMessage("OTP has been resent successfully");

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      setErrorMessage(
        typeof error === "string"
          ? error
          : error.message || "Failed to resend OTP. Please try again.",
      );
    }
  };

  const handleVerifyOtp = async (otpString) => {
    if (otpString.length !== 4) {
      setErrorMessage("Please enter complete OTP");
      return;
    }

    try {
      setErrorMessage(null);
      setSuccessMessage(null);
      dispatch(clearError());

      const fcmToken = "";

      // Call verify OTP API with E.164 (matches what was sent)
      const result = await dispatch(
        verifyOtp({ mobileNumber: e164Mobile, otp: otpString, fcmToken }),
      ).unwrap();

      console.log("User role:", result?.data?.user?.role);
      console.log("OTP verification token:", result?.data?.token);

      // Redux already saves token and user to localStorage in authSlice
      // Just verify it was saved by Redux
      await new Promise((resolve) => setTimeout(resolve, 100));

      const savedToken = localStorage.getItem("token");
      const savedUserType = localStorage.getItem("userType");

      console.log("✅ Token from localStorage:", savedToken);
      console.log("✅ UserType from localStorage:", savedUserType);

      // Show success message for OTP verification
      setSuccessMessage("OTP Verified");
      setOtpVerified(true);

      // Clear context data since OTP is verified
      setDetailsBookingData(null);

      console.log("📡 Triggering socket connection from DetailsStep...");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("userLoggedIn"));
        console.log("✅ userLoggedIn event dispatched");
      }

      // Wait for localStorage and axios interceptor to sync
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Fetch complete profile after successful login
      try {
        const user = result.data?.user || result.user;

        // Ensure axios has the token before making the request
        console.log("📡 Calling getUserProfile with token:", savedToken);

        const profileResult = await dispatch(getUserProfile()).unwrap();

        console.log("Fetched user profile:", profileResult);

        if (profileResult.user || profileResult) {
          const fetchedProfile = profileResult.user || profileResult;
          const completeUser = {
            ...fetchedProfile,
            id: user.id || fetchedProfile.id || fetchedProfile._id,
            mobile: user.mobile || fetchedProfile.mobile,
            role: user.role || fetchedProfile.role,
          };
          localStorage.setItem("user", JSON.stringify(completeUser));
        }

        // ✨ Fetch customer bookings - only for existing users (isNewUser = false)
        if (!result.data?.isNewUser) {
          console.log("📚 Fetching customer bookings for existing user...");
          const bookingsResponse = await dispatch(
            fetchCustomerBookings("pending"),
          ).unwrap();
          setBookingsResponse(bookingsResponse);

          // Only push jobId to URL if a real job exists (prevents ?jobId=undefined)
          if (bookingsResponse?.data && bookingsResponse.data.length > 0) {
            const jobId = bookingsResponse.data[0]._id;
            dispatch(setSelectedJobId(jobId));
            router.push(`?jobId=${jobId}`, { scroll: false });
            console.log("💾 Stored job ID:", jobId);
          } else {
            console.log("📭 No existing jobs — guest will create job at payment");
          }

          console.log("✅ Customer bookings fetched successfully");
        } else {
          console.log(
            "⏭️ Skipping bookings fetch - new user will fetch after profile completion",
          );
        }
      } catch (profileError) {
        console.error("Failed to fetch profile or bookings:", profileError);
      }

      // Auto-hide success message after 2 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 2000);
    } catch (error) {
      setErrorMessage(
        typeof error === "string"
          ? error
          : error.message || "Invalid OTP. Please try again.",
      );
      setOtpVerified(false);
    }
  };

  const handleOtpChange = (index, value) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 1);
    if (!cleaned) {
      const nextOtp = [...otp];
      nextOtp[index] = "";
      setOtp(nextOtp);
      return;
    }

    const nextOtp = [...otp];
    nextOtp[index] = cleaned;
    setOtp(nextOtp);

    if (errorMessage) {
      setErrorMessage(null);
    }

    if (index < 3) {
      otpRefs[index + 1].current?.focus();
    }

    if (!isLoading && otpSent && nextOtp.every((d) => d !== "")) {
      handleVerifyOtp(nextOtp.join(""));
    }
  };

  const handleOtpKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  const handleMobileNumberChange = (e) => {
    const value = e.target.value;
    // Only allow numbers, capped at the selected country's max length
    const max = selectedCountry.max;
    if (new RegExp(`^\\d{0,${max}}$`).test(value)) {
      setMobileNumber(value);

      // Reset OTP step if mobile number changes
      if (otpSent) {
        setOtp(["", "", "", ""]);
        setOtpSent(false);
        setErrorMessage(null);
        setSuccessMessage(null);
        setOtpVerified(false);
        dispatch(resetOtpState());

        // Clear context data since mobile number changed
        setDetailsBookingData(null);
      }
    }
  };

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        py: { xs: 2, sm: 2, md: 3 },
        px: { xs: 2, sm: 3, md: 2 },
        paddingLeft: { xs: 0, sm: 0, md: 0 },
        paddingBottom: { xs: 0, sm: 0, md: 0 },
        pb: 0,
        paddingLeft: { xs: 0, sm: 0, md: 4 },
      }}
    >
      {/* Error Message */}
      {errorMessage && (
        <Box
          sx={{
            mb: 3,
            padding: "10px 16px",
            backgroundColor: "#EF4444",
            borderRadius: "26px",
            border: "1px solid #EF4444",
          }}
        >
          <Typography
            sx={{
              fontSize: { xs: "13px", sm: "14px" },
              fontWeight: 500,
              color: "#fff",
              textAlign: "center",
            }}
          >
            {errorMessage}
          </Typography>
        </Box>
      )}

      {/* Success Message */}
      {successMessage && (
        <Box
          sx={{
            mb: 3,
            padding: "12px 16px",
            backgroundColor: "#D1FAE5",
            borderRadius: "8px",
            border: "1px solid #45A735",
          }}
        >
          <Typography
            sx={{
              fontSize: { xs: "13px", sm: "14px" },
              fontWeight: 500,
              color: "#45A735",
            }}
          >
            {successMessage}
          </Typography>
        </Box>
      )}

      {/* Header */}
      <Typography
        sx={{
          fontSize: { xs: "20px", sm: "24px", md: "24px" },
          fontWeight: 700,
          color: "#1F2937",
          mb: { xs: 1, sm: 0.5 },
          lineHeight: 1.3,
        }}
      >
        {t('title')}
      </Typography>

      {/* Subheading */}
      <Typography
        sx={{
          fontSize: { xs: "13px", sm: "14px", md: "14px" },
          fontWeight: 400,
          color: "#6B7280",
          mb: { xs: 3, sm: 1 },
          lineHeight: 1.5,
        }}
      >
        {t('subtitle')}
      </Typography>
      <Box
        sx={{
          width: "100%",
          height: "1px",
          backgroundColor: "#E5E7EB",
          mb: { xs: 3, md: 2.5 },
        }}
      />

      {/* Mobile Number */}
      <Box sx={{ mb: { xs: 3, sm: 4, md: 2 } }}>
        <Typography
          sx={{
            fontSize: { xs: "13px", sm: "14px", md: "12px" },
            fontWeight: 500,
            color: "#1F2937",
            mb: { xs: 1, sm: 1.5 },
          }}
        >
          {t('mobileNumber')}{" "}
          <Box component="span" sx={{ color: "#EF4444" }}>
            *
          </Box>
        </Typography>

        <Box
          sx={{
            position: "relative",
            display: "flex",
            alignItems: "stretch",
            backgroundColor: otpSent ? "#F9FAFB" : "#fff",
            border: "1px solid #E5E7EB",
            borderRadius: { xs: "8px", sm: "12px" },
            "&:hover": { borderColor: otpSent ? "#E5E7EB" : "#D1D5DB" },
            "&:focus-within": {
              borderColor: "#45A735",
            },
          }}
        >
          {/* Country code picker */}
          <Box
            component="button"
            type="button"
            onClick={() => !otpSent && setShowCountryPicker((v) => !v)}
            disabled={otpSent}
            aria-haspopup="listbox"
            aria-expanded={showCountryPicker}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              borderRight: "1px solid #E5E7EB",
              px: { xs: 1.25, sm: 1.5 },
              fontSize: { xs: "13px", sm: "14px" },
              color: "#374151",
              background: "transparent",
              border: "none",
              cursor: otpSent ? "not-allowed" : "pointer",
              minWidth: { xs: "84px", sm: "96px" },
              fontFamily: "inherit",
            }}
          >
            <Box component="span" sx={{ fontSize: "16px" }}>
              {selectedCountry.flag}
            </Box>
            <Box component="span" sx={{ fontWeight: 500 }}>
              {selectedCountry.dial}
            </Box>
            <Box
              component="svg"
              width={10}
              height={10}
              viewBox="0 0 24 24"
              sx={{ color: "#9CA3AF", ml: "2px" }}
            >
              <path
                d="M6 9l6 6 6-6"
                stroke="currentColor"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </Box>
          </Box>

          {showCountryPicker && (
            <Box
              role="listbox"
              sx={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                zIndex: 30,
                backgroundColor: "#fff",
                border: "1px solid #E5E7EB",
                borderRadius: "12px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                minWidth: "240px",
                maxHeight: "280px",
                overflowY: "auto",
              }}
            >
              {COUNTRY_CODES.map((c) => (
                <Box
                  component="button"
                  type="button"
                  role="option"
                  key={c.code}
                  aria-selected={c.code === countryCode}
                  onClick={() => {
                    setCountryCode(c.code);
                    setShowCountryPicker(false);
                    // Reset mobile if it overflows the new country's max
                    if (mobileNumber.length > c.max) {
                      setMobileNumber("");
                    }
                  }}
                  sx={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    px: 1.5,
                    py: 1.25,
                    textAlign: "left",
                    fontSize: "14px",
                    color: c.code === countryCode ? "#26472B" : "#484848",
                    background: c.code === countryCode ? "#F2F9F1" : "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    "&:hover": { background: "#F2F9F1" },
                  }}
                >
                  <Box component="span" sx={{ fontSize: "18px" }}>
                    {c.flag}
                  </Box>
                  <Box
                    component="span"
                    sx={{
                      flex: 1,
                      fontWeight: c.code === countryCode ? 600 : 400,
                    }}
                  >
                    {c.name}
                  </Box>
                  <Box component="span" sx={{ color: "#9CA3AF" }}>
                    {c.dial}
                  </Box>
                </Box>
              ))}
            </Box>
          )}

          <Box
            component="input"
            type="tel"
            inputMode="numeric"
            autoComplete="off"
            name="qh-booking-mobile"
            placeholder={t('enterMobileNumber')}
            value={mobileNumber}
            onChange={handleMobileNumberChange}
            disabled={otpSent}
            maxLength={selectedCountry.max}
            sx={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: { xs: "13px", sm: "14px" },
              color: "#1F2937",
              padding: { xs: "12px 14px", sm: "14px 16px" },
              fontFamily: "inherit",
              "&::placeholder": { color: "#9CA3AF", opacity: 1 },
              "&:disabled": { color: "#6B7280" },
            }}
          />

          {/* Send OTP Button */}
          <Button
            onClick={handleSendOTP}
            disabled={!isMobileLenValid || otpSent}
            sx={{
              fontSize: { xs: "12px", sm: "13px", md: "14px" },
              fontWeight: 600,
              color: "#45A735",
              textTransform: "none",
              px: { xs: 1.25, sm: 1.5 },
              minWidth: "auto",
              backgroundColor: "transparent",
              borderRadius: 0,
              "&:hover": {
                backgroundColor: "rgba(69, 167, 53, 0.04)",
              },
              "&:disabled": {
                color: "#9CA3AF",
              },
            }}
          >
            {otpVerified ? t('verified') : otpSent ? t('otpSent') || "OTP Sent" : t('sendOtp')}
          </Button>
        </Box>
      </Box>

      {/* OTP Input */}
      <Box>
        <Typography
          sx={{
            fontSize: { xs: "13px", sm: "14px", md: "13px" },
            fontWeight: 500,
            color: "#1F2937",
            mb: { xs: 1, sm: 1.5 },
          }}
        >
          {t('otp')}{" "}
          <Box component="span" sx={{ color: "#EF4444" }}>
            *
          </Box>
        </Typography>

        {/* Resend OTP Section */}

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: { xs: 1, sm: 1.5 },
            width: "100%",
          }}
        >
          {otp.map((digit, index) => (
            <React.Fragment key={index}>
              <TextField
                inputRef={otpRefs[index]}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                disabled={!otpSent || isLoading}
                autoComplete="off"
                name={`qh-booking-otp-${index}`}
                inputProps={{
                  maxLength: 1,
                  inputMode: "numeric",
                  autoComplete: "off",
                  style: { textAlign: "center" },
                }}
                sx={{
                  flex: 1,
                  "& .MuiOutlinedInput-root": {
                    fontSize: { xs: "18px", sm: "20px", md: "24px" },
                    fontWeight: 400,
                    backgroundColor: "#fff",
                    borderRadius: { xs: "8px", sm: "10px" },
                    "& fieldset": {
                      borderColor: errorMessage
                        ? "#EF4444"
                        : otpVerified
                          ? "#45A735"
                          : "#E5E7EB",
                    },
                    "&:hover fieldset": {
                      borderColor: errorMessage
                        ? "#EF4444"
                        : otpVerified
                          ? "#45A735"
                          : "#D1D5DB",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: errorMessage
                        ? "#EF4444"
                        : otpVerified
                          ? "#45A735"
                          : "#45A735",
                      borderWidth: "2px",
                    },
                    "&.Mui-disabled": {
                      backgroundColor: "#ffff",
                    },
                  },
                  "& .MuiOutlinedInput-input": {
                    padding: {
                      xs: "12px 8px",
                      sm: "14px 10px",
                      md: "6px 12px",
                    },
                    color: "#1F2937",
                  },
                }}
              />
              {index < 3 && (
                <Box
                  sx={{
                    width: { xs: "4px", sm: "5px", md: "6px" },
                    height: { xs: "4px", sm: "5px", md: "6px" },
                    borderRadius: "50%",
                    backgroundColor: "#D1D5DB",
                    flexShrink: 0,
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </Box>
        {otpSent && (
          <Box
            sx={{
              mb: { xs: 1.5, sm: 2 },
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mt: 1,
            }}
          >
            <Typography
              sx={{
                fontSize: { xs: "12px", sm: "13px" },
                fontWeight: 400,
                color: "#6B7280",
              }}
            >
              {t('didntReceiveOtp')}
            </Typography>
            {/* {showResendTimer && resendSeconds > 0 ? (
              <Button
                onClick={handleResendOtp}
                // disabled={isLoading}
                disabled={isLoading || (showResendTimer && resendSeconds > 0)}
                sx={{
                  fontSize: { xs: "12px", sm: "13px", mt: 0.5 },
                  fontWeight: 400,
                  color: "grey",
                  textTransform: "none",
                  padding: "4px 10px",
                  minWidth: "auto",
                  "&:hover": {
                    backgroundColor: "rgba(69, 167, 53, 0.04)",
                  },
                  "&:disabled": {
                    color: "#9CA3AF",
                  },
                }}
              >
                <Image
                  src="/resendicon.svg"
                  alt="Resend"
                  width={20}
                  height={20}
                  style={{
                    display: "inline-block",
                    verticalAlign: "middle",
                  }}
                />
                {t('resend')}
                <Typography
                  sx={{
                    fontSize: { xs: "12px", sm: "13px" },
                    fontWeight: 400,
                    color: "#45A735",
                    paddingLeft: "4px",
                  }}
                >
                  {showResendTimer && resendSeconds > 0
                    ? ` ${formatTime(resendSeconds)}`
                    : t('resend')}
                </Typography>
              </Button>
            ) : (
              <Button
                onClick={handleResendOtp}
                disabled={isLoading}
                sx={{
                  fontSize: { xs: "12px", sm: "13px", mt: 0.5 },
                  fontWeight: 400,
                  color: "#6B7280",
                  textTransform: "none",
                  padding: "4px 10px",
                  minWidth: "auto",
                  "&:hover": {
                    backgroundColor: "rgba(69, 167, 53, 0.04)",
                  },
                  "&:disabled": {
                    color: "#9CA3AF",
                  },
                }}
              >
                <Image
                  src="/resendicon.svg"
                  alt="Resend"
                  width={20}
                  height={20}
                  style={{
                    display: "inline-block",
                    verticalAlign: "middle",
                  }}
                />
                {t('resend')}
                <Typography
                  sx={{
                    fontSize: { xs: "12px", sm: "13px" },
                    fontWeight: 400,
                    color: "#45A735",
                    paddingLeft: "4px",
                  }}
                ></Typography>
              </Button>
            )} */}

            {otpSent && !otpVerified && (
              <Box
                sx={{
                  mb: { xs: 1.5, sm: 2 },
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mt: 1,
                }}
              >
                <Typography
                  sx={{
                    fontSize: { xs: "12px", sm: "13px", pt: 1 },
                    fontWeight: 400,
                    color: "#6B7280",
                  }}
                ></Typography>
                {showResendTimer && resendSeconds > 0 ? (
                  <Button
                    onClick={handleResendOtp}
                    disabled={
                      isLoading || (showResendTimer && resendSeconds > 0)
                    }
                    sx={{
                      fontSize: { xs: "12px", sm: "13px", mt: 0.5 },
                      fontWeight: 400,
                      color: "grey",
                      textTransform: "none",
                      padding: "4px 10px",
                      minWidth: "auto",
                      "&:hover": {
                        backgroundColor: "rgba(69, 167, 53, 0.04)",
                      },
                      "&:disabled": {
                        color: "#9CA3AF",
                      },
                    }}
                  >
                    <Image
                      src="/resendicon.svg"
                      alt="Resend"
                      width={20}
                      height={20}
                      style={{
                        display: "inline-block",
                        verticalAlign: "middle",
                      }}
                    />
                    {t('resend')}
                    <Typography
                      sx={{
                        fontSize: { xs: "12px", sm: "13px" },
                        fontWeight: 400,
                        color: "#45A735",
                        paddingLeft: "4px",
                      }}
                    >
                      {showResendTimer && resendSeconds > 0
                        ? ` ${formatTime(resendSeconds)}`
                        : t('resend')}
                    </Typography>
                  </Button>
                ) : (
                  <Button
                    onClick={handleResendOtp}
                    disabled={isLoading}
                    sx={{
                      fontSize: { xs: "12px", sm: "13px", mt: 0.5 },
                      fontWeight: 400,
                      color: "#6B7280",
                      textTransform: "none",
                      padding: "4px 10px",
                      minWidth: "auto",
                      "&:hover": {
                        backgroundColor: "rgba(69, 167, 53, 0.04)",
                      },
                      "&:disabled": {
                        color: "#9CA3AF",
                      },
                    }}
                  >
                    <Image
                      src="/resendicon.svg"
                      alt="Resend"
                      width={20}
                      height={20}
                      style={{
                        display: "inline-block",
                        verticalAlign: "middle",
                      }}
                    />
                    {t('resend')}
                    <Typography
                      sx={{
                        fontSize: { xs: "12px", sm: "13px" },
                        fontWeight: 400,
                        color: "#45A735",
                        paddingLeft: "4px",
                      }}
                    ></Typography>
                  </Button>
                )}
              </Box>
            )}
          </Box>
        )}

        {/* OTP Feedback Messages */}
        {otpVerified && (
          <Typography
            sx={{
              fontSize: { xs: "12px", sm: "13px" },
              fontWeight: 400,
              color: "#45A735",
              mt: 1,
            }}
          ></Typography>
        )}
      </Box>

      {/* New User Profile Form - Show only if isNewUser is true */}
      {otpVerified && isNewUser && (
        <Box sx={{ mt: { xs: 4, sm: 5 } }}>
          {/* Section Header */}
          <Typography
            sx={{
              fontSize: { xs: "20px", sm: "24px", md: "24px" },
              fontWeight: 700,
              color: "#1F2937",
              mb: { xs: 1, sm: 1.5 },
              lineHeight: 1.3,
            }}
          >
            {t('fillYourDetails')}
          </Typography>

          {/* Full Name Field */}
          <Box sx={{ mb: { xs: 3, sm: 3.5 } }}>
            <Typography
              sx={{
                fontSize: { xs: "13px", sm: "14px", md: "12px" },
                fontWeight: 500,
                color: "#1F2937",
                mb: { xs: 1, sm: 1 },
              }}
            >
              {t('fullName')}{" "}
              <Box component="span" sx={{ color: "#EF4444" }}>
                *
              </Box>
            </Typography>
            <TextField
              fullWidth
              placeholder={t('enterFullName')}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              sx={{
                "& .MuiOutlinedInput-root": {
                  fontSize: { xs: "13px", sm: "14px", md: "15px" },
                  backgroundColor: "#fff",
                  borderRadius: { xs: "8px", sm: "10px" },
                  "& fieldset": {
                    borderColor: "#E5E7EB",
                  },
                  "&:hover fieldset": {
                    borderColor: "#D1D5DB",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#45A735",
                    borderWidth: "1px",
                  },
                },
                "& .MuiOutlinedInput-input": {
                  padding: { xs: "12px 14px", sm: "14px 16px" },
                  color: "#1F2937",
                  "&::placeholder": {
                    color: "#9CA3AF",
                    opacity: 1,
                  },
                },
              }}
            />
          </Box>

          {/* Email Field */}
          <Box sx={{ mb: { xs: 3, sm: 3.5 } }}>
            <Typography
              sx={{
                fontSize: { xs: "13px", sm: "14px", md: "12px" },
                fontWeight: 500,
                color: "#1F2937",
                mb: { xs: 1, sm: 1 },
              }}
            >
              {t('email')}{" "}
              <Box component="span" sx={{ color: "#EF4444" }}>
                *
              </Box>
            </Typography>
            <TextField
              fullWidth
              type="email"
              placeholder={t('enterEmail')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{
                "& .MuiOutlinedInput-root": {
                  fontSize: { xs: "13px", sm: "14px", md: "15px" },
                  backgroundColor: "#fff",
                  borderRadius: { xs: "8px", sm: "10px" },
                  "& fieldset": {
                    borderColor: "#E5E7EB",
                  },
                  "&:hover fieldset": {
                    borderColor: "#D1D5DB",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#45A735",
                    borderWidth: "1px",
                  },
                },
                "& .MuiOutlinedInput-input": {
                  padding: { xs: "12px 14px", sm: "14px 16px" },
                  color: "#1F2937",
                  "&::placeholder": {
                    color: "#9CA3AF",
                    opacity: 1,
                  },
                },
              }}
            />
          </Box>
        </Box>
      )}

      {/* Confirmation Modal */}
      <Dialog
        open={showModal}
        onClose={() => setShowModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: { xs: "16px", sm: "20px" },
            padding: { xs: "24px", sm: "32px", md: "40px" },
            margin: { xs: 2, sm: 3 },
            maxWidth: { xs: "90%", sm: "500px" },
          },
        }}
      >
        <DialogContent sx={{ padding: 0 }}>
          {/* Modal Header */}
          <Typography
            sx={{
              fontSize: { xs: "22px", sm: "26px", md: "30px" },
              fontWeight: 700,
              color: "#45A735",
              mb: { xs: 2, sm: 2.5 },
              lineHeight: 1.3,
              textAlign: "left",
            }}
          >
            {t('reviewBooking')}
          </Typography>

          {/* Modal Subtext */}
          <Typography
            sx={{
              fontSize: { xs: "13px", sm: "14px", md: "15px" },
              fontWeight: 400,
              color: "#6B7280",
              mb: { xs: 3, sm: 4 },
              lineHeight: 1.6,
            }}
          >
            {t('decideHowToProceed')}
          </Typography>

          {/* Question Text */}
          <Typography
            sx={{
              fontSize: { xs: "15px", sm: "16px", md: "17px" },
              fontWeight: 500,
              color: "#4B5563",
              mb: { xs: 3, sm: 4 },
              lineHeight: 1.6,
              textAlign: "center",
            }}
          >
            {t('reviewCartQuestion')}
          </Typography>

          {/* Action Buttons */}
          <Box
            sx={{
              display: "flex",
              gap: { xs: 2, sm: 2.5 },
              flexDirection: { xs: "column", sm: "row" },
            }}
          >
            {/* Review Button */}
            <Button
              onClick={handleReviewCart}
              startIcon={<VisibilityIcon />}
              sx={{
                flex: 1,
                backgroundColor: "#45A735",
                color: "#FFFFFF",
                fontSize: { xs: "15px", sm: "16px" },
                fontWeight: 600,
                padding: { xs: "14px 24px", sm: "16px 32px" },
                borderRadius: "10px",
                textTransform: "none",
                boxShadow: "0 4px 6px rgba(69, 167, 53, 0.2)",
                "&:hover": {
                  backgroundColor: "#3D9330",
                  boxShadow: "0 6px 12px rgba(69, 167, 53, 0.3)",
                },
              }}
            >
              {t('review')}
            </Button>

            {/* Pay Now Button */}
            <Button
              onClick={handlePayNow}
              startIcon={<CreditCardIcon />}
              sx={{
                flex: 1,
                backgroundColor: "transparent",
                color: "#45A735",
                fontSize: { xs: "15px", sm: "16px" },
                fontWeight: 600,
                padding: { xs: "14px 24px", sm: "16px 32px" },
                borderRadius: "10px",
                textTransform: "none",
                border: "2px solid #45A735",
                "&:hover": {
                  backgroundColor: "rgba(69, 167, 53, 0.04)",
                  border: "2px solid #3D9330",
                },
              }}
            >
              {t('payNow')}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Spacer - Pushes buttons to bottom */}
      <Box sx={{ flex: 1 }} />

      {/* Back and Continue Buttons - Sticky at Bottom */}
      <Box
        sx={{
          position: "sticky",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "#FFFFFF",

          paddingTop: { xs: "16px", sm: "20px", md: "24px" },
          paddingBottom: { xs: "16px", sm: "20px", md: "24px" },
          display: "flex",
          justifyContent: "flex-end",
          zIndex: 10,
          // boxShadow: "0 -2px 10px rgba(0, 0, 0, 0.05)",

          // paddingRight: { xs: 0, sm: 0, md: 2 },
          // boxShadow: "0 -2px 10px rgba(0, 0, 0, 0.05)",
          boxShadow: "0 -93px 34px rgba(0, 0, 0, 0.05)",

          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
        }}
      >
        {!isFirstStep && (
          <Button
            onClick={previousStep}
            sx={{
              backgroundColor: "var(--text-tertiary)",
              color: "var(--text-primary)",
              fontSize: { xs: "16px", sm: "17px", md: "var(--font-size-16)" },
              fontWeight: "var(--font-weight-400)",
              padding: { xs: "12px 48px", sm: "13px 56px", md: "8px 32px" },
              borderRadius: "12px",
              textTransform: "none",
              boxShadow: "none",
              width: { xs: "48%", sm: "auto" },
              "&:hover": {
                backgroundColor: "var(--text-tertiary)",
                boxShadow: "none",
              },
              transition: "all 0.3s ease",
            }}
          >
            {t('back')}
          </Button>
        )}

        <Button
          onClick={async () => {
            // Check if OTP is verified
            if (!otpVerified) {
              setErrorMessage(
                "Please verify your mobile number with OTP first.",
              );
              return;
            }

            // If new user, validate and save profile
            if (isNewUser) {
              if (!fullName.trim()) {
                setErrorMessage("Please enter your full name");
                return;
              }
              // if (!email.trim()) {
              //   setErrorMessage("Please enter your email address");
              //   return;
              // }

              try {
                setIsProfileSaving(true);
                setErrorMessage(null);

                // Get user ID from authUser or localStorage
                const userId =
                  authUser?.id ||
                  authUser?._id ||
                  JSON.parse(localStorage.getItem("user") || "{}").id;
                const userMobile = authUser?.mobile || mobileNumber;
                const userRole = authUser?.role || "user";

                if (!userId) {
                  throw new Error(
                    "User ID not found. Please try logging in again.",
                  );
                }

                const profilePayload = {
                  id: userId,
                  name: fullName,
                  email: email,
                  mobile: userMobile,
                  role: userRole,
                };

                console.log("Updating profile with:", profilePayload);
                await dispatch(updateUserProfile(profilePayload)).unwrap();

                console.log(
                  "📡 Triggering socket connection from DetailsStep...",
                );
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new Event("userLoggedIn"));
                  console.log("✅ userLoggedIn event dispatched");
                }
                // Fetch updated profile to refresh Redux state
                const updatedProfile =
                  await dispatch(getUserProfile()).unwrap();

                // Update localStorage with complete user data to ensure authentication state
                if (updatedProfile.user || updatedProfile) {
                  const fetchedProfile = updatedProfile.user || updatedProfile;
                  const completeUser = {
                    ...fetchedProfile,
                    id: userId,
                    name: fullName,
                    email: email,
                    mobile: userMobile,
                    role: userRole,
                  };
                  localStorage.setItem("user", JSON.stringify(completeUser));

                  // Update Redux auth state with the complete user data
                  const token = localStorage.getItem("token");
                  dispatch(
                    setAuthFromStorage({
                      token: token,
                      user: completeUser,
                    }),
                  );

                  console.log(
                    "✅ User data synced to localStorage and Redux:",
                    completeUser,
                  );
                }

                // Don't call completeProfile yet - wait for modal interaction
                console.log("✅ Profile saved successfully");

                // ✨ Fetch customer bookings after new user completes profile
                try {
                  console.log("📚 Fetching customer bookings for new user...");
                  const bookingsResponse = await dispatch(
                    fetchCustomerBookings("pending"),
                  ).unwrap();
                  console.log(
                    "📚 Bookings API Response (New User):",
                    bookingsResponse,
                  );
                  setBookingsResponse(bookingsResponse);

                  // Store job ID if bookings exist
                  if (
                    bookingsResponse.data &&
                    bookingsResponse.data.length > 0
                  ) {
                    const jobId = bookingsResponse.data[0]._id;
                    dispatch(setSelectedJobId(jobId));
                    router.push(`?jobId=${jobId}`, { scroll: false });
                    console.log("💾 Stored job ID:", jobId);
                  }

                  console.log("✅ Customer bookings fetched successfully");
                } catch (bookingError) {
                  console.error(
                    "❌ Failed to fetch customer bookings:",
                    bookingError,
                  );
                  // Don't block the flow if bookings fetch fails
                }

                // Show modal after profile save and bookings fetch
                // Don't call completeProfile yet to prevent navigation
                savePendingBooking();
                setShowModal(true);
              } catch (error) {
                console.error("❌ Profile save error:", error);
                setErrorMessage(
                  typeof error === "string"
                    ? error
                    : error.message || "Failed to save profile",
                );
              } finally {
                setIsProfileSaving(false);
              }
              return;
            }

            // For existing users, show modal
            savePendingBooking();
            setShowModal(true);
          }}
          disabled={
            !otpVerified ||
            (isNewUser && (!fullName.trim() || !email.trim())) ||
            isProfileSaving
          }
          sx={{
            background: "linear-gradient(to right, #26472B 50%, #45A735 50%)",
            backgroundSize: "200% 100%",
            backgroundPosition: "right bottom",
            color: "#FFFFFF",
            fontSize: { xs: "16px", sm: "17px", md: "16px" },
            fontWeight: 700,
            padding: { xs: "12px 48px", sm: "13px 56px", md: "8px 24px" },
            borderRadius: "12px",
            textTransform: "none",
            boxShadow: "none",
            width: { xs: isFirstStep ? "100%" : "48%", sm: "auto" },
            marginLeft: isFirstStep ? "auto" : 0,
            transition: "all 0.3s ease-out",
            "&:hover": {
              backgroundPosition: "left bottom",
              boxShadow: "none",
            },
            "&:disabled": {
              background: "#D1D5DB",
              color: "#9CA3AF",
              cursor: "not-allowed",
            },
          }}
        >
          {isProfileSaving ? t('saving') : t('continue')}
        </Button>
      </Box>

      {/* Payment Success Full Page */}
      {showPaymentSuccess && (
        <div className="fixed inset-0 z-[100] bg-white flex items-center justify-center">
          <Image
            src="/images/cart/Frame 1707481081.png"
            alt="Payment Successful"
            width={1200}
            height={800}
            className="w-full h-full object-contain"
            priority
          />
        </div>
      )}
    </Box>
  );
};

export default DetailsStep;
