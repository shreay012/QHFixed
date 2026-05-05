"use client";

import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { showError, showSuccess } from "@/lib/utils/toast";
import {
  Box,
  Typography,
  TextField,
  Checkbox,
  Button,
  Tooltip,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useStepperContext } from "./StepperContext";
import { useSelector, useDispatch } from "react-redux";
import { usePrice } from "@/lib/hooks/usePrice";
import { useSearchParams } from "next/navigation";
import { fetchJobById, createJob, setSelectedJobId } from "@/lib/redux/slices/bookingSlice/bookingSlice";
import { paymentService } from "@/lib/services/paymentApi";
import { bookingService } from "@/lib/services/bookingApi";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useCmsTranslate } from "@/lib/i18n/useCmsTranslate";
import { fetchDashboardStats } from "@/lib/redux/slices/dashboardSlice";
import { addToCart } from "@/lib/redux/slices/cartSlice/cartSlice";
import { selectTaxInfo } from "@/lib/redux/slices/regionSlice/regionSlice";

const SummaryStep = () => {
  const topRef = useRef(null);
  const t = useTranslations("summaryStep");
  const tPay = useTranslations("paymentStep");
  const { format: fmtMoney } = usePrice();
  // Active next-intl locale → use as BCP-47 for Date.toLocaleDateString
  // so the start-date reads as "8 Mai 2026" in DE, "May 8, 2026" in EN, etc.
  const locale = useLocale();
  const localeBcp = locale || "en-US";
  // Service names are i18n objects ({en, de, …}); tCms picks the active locale.
  const tCms = useCmsTranslate();
  const {
    gstNumber,
    setGstNumber,
    termsAccepted,
    setTermsAccepted,
    nextStep,
    previousStep,
    isFirstStep,
  } = useStepperContext();
  const dispatch = useDispatch();
  const searchParams = useSearchParams();
  const [pricingData, setPricingData] = useState(null);
  const [bookingData, setBookingData] = useState(null);

  const router = useRouter();
  // Payment states
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [showBackConfirmModal, setShowBackConfirmModal] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [showTermsDrawer, setShowTermsDrawer] = useState(false);

  const normalizeJobId = (rawJobId) => {
    const normalized = typeof rawJobId === "string" ? rawJobId.trim() : "";
    return normalized && normalized !== "undefined" && normalized !== "null"
      ? normalized
      : null;
  };

  // Get jobId from query params
  const jobId = normalizeJobId(searchParams.get("jobId"));

  // Get job details from Redux
  const { jobDetails, isFetchingJobDetails } = useSelector(
    (state) => state.booking,
  );

  // Handle client-side mounting for portal
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Scroll to top when component mounts
  useEffect(() => {
    console.log("SummaryStep mounted - scrolling to top");

    const scrollToTop = () => {
      if (topRef?.current) {
        console.log("✅ Using scrollIntoView on topRef");
        // scrollIntoView is more reliable than manual scroll
        topRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        console.log("⚠️ topRef not available");
      }
    };

    // Try at multiple timing points
    scrollToTop(); // Immediate
    requestAnimationFrame(scrollToTop); // Next frame
    setTimeout(scrollToTop, 200); // 200ms delay for safety
  }, []);

  // Fetch job details on mount if jobId exists in query params (LOGGED-IN USER)
  useEffect(() => {
    console.log("SummaryStep - jobId from query:", jobId);
    console.log("SummaryStep - jobDetails:", jobDetails);

    if (jobId) {
      console.log("🔄 Fetching job details for job ID:", jobId);
      dispatch(fetchJobById(jobId));
    } else {
      console.log("👤 No jobId - Guest user, will use localStorage");
    }
  }, [jobId, dispatch]);

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

  // Load data from Redux jobDetails (API data - LOGGED-IN USER)
  useEffect(() => {
    console.log("📋 useEffect triggered - jobDetails changed:", jobDetails);

    if (jobDetails?.job || jobDetails) {
      const job = jobDetails?.job || jobDetails;
      console.log("📊 Loading data from API (Redux jobDetails):", job);

      // Use aggregated pricing from job.pricing
      setPricingData({
        data: {
          totalPricing: job.pricing,
        },
      });

      // Format each service separately
      const allServices = job.services || [];
      const formattedServices = allServices.map((service) => {
        const techNames =
          service.technologyIds?.map((tech) => tech.name).join(", ") || "";

        const bookingTypeDisplay =
          service.serviceId?.bookingType === "instant"
            ? tPay('bookInstantly')
            : tPay('scheduleLater');

        let startDateDisplay = "N/A";
        if (service.preferredStartDate) {
          if (service.serviceId?.bookingType === "instant") {
            startDateDisplay = tPay('immediately');
          } else {
            const startDate = new Date(service.preferredStartDate);
            startDateDisplay = startDate.toLocaleDateString(localeBcp, {
              day: "numeric",
              month: "short",
              year: "numeric",
            });
          }
        }

        return {
          serviceName: tCms(service.serviceId?.nameI18n || service.serviceId?.name) || "—",
          technicalSkills: techNames,
          hours: service.durationTime || 0,
          bookingType: bookingTypeDisplay,
          startDate: startDateDisplay,
          isInstant: service.serviceId?.bookingType === "instant",
          basePrice: service.pricing?.basePrice || 0,
        };
      });

      setBookingData({
        services: formattedServices,
        totalHours: job.durationTime || 0,
      });

      console.log("✅ Formatted data from API - Services:", formattedServices);
    } else {
      console.warn("⚠️ No job details available yet");
    }
  }, [jobDetails]);

  // Load data from localStorage (GUEST USER FALLBACK or recent guest-turned-user)
  useEffect(() => {
    // If API data exists for authenticated user, use that
    if (jobDetails?.job || jobDetails) {
      console.log("✅ User logged in with API data - skipping localStorage load");
      return;
    }

    // Otherwise, load from localStorage as fallback (guest or newly authenticated user)
    const storedPricingData = localStorage.getItem("_pricing_data");
    const selectedDate = localStorage.getItem("_selected_date");
    const selectedAssignment = localStorage.getItem(
      "_selected_assignment_type",
    );

    console.log("📊 Loading pricing data from localStorage (Guest or recently authenticated user)");

    if (storedPricingData) {
      const parsedPricingData = JSON.parse(storedPricingData);
      setPricingData(parsedPricingData);

      console.log("✅ Pricing Data:", parsedPricingData);

      // Extract relevant fields from API response
      const serviceData = parsedPricingData.data?.servicesWithPricing?.[0];

      if (serviceData) {
        // Get technology names
        const techNames =
          serviceData.technologyIds?.map((tech) => tech.name).join(", ") || "";

        // Format booking type
        const bookingTypeDisplay =
          serviceData.bookingType === "instant"
            ? tPay('bookInstantly')
            : tPay('scheduleLater');

        // Format start date display based on booking type
        let startDateDisplay;
        if (serviceData.bookingType === "instant") {
          // For instant booking, show "Immediately" or current time
          startDateDisplay = tPay('immediately');
        } else {
          // For scheduled booking, show formatted date
          const startDate = new Date(serviceData.preferredStartDate);
          startDateDisplay = startDate.toLocaleDateString(localeBcp, {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
        }

        const formattedBookingData = {
          services: [
            {
              serviceName: tCms(serviceData.serviceId?.nameI18n || serviceData.serviceId?.name) || "",
              technicalSkills: techNames,
              hours: serviceData.durationTime || 0,
              bookingType: bookingTypeDisplay,
              startDate: startDateDisplay,
              isInstant: serviceData.bookingType === "instant",
              basePrice: parsedPricingData.data?.totalPricing?.basePrice || 0,
            },
          ],
          totalHours: serviceData.durationTime || 0,
        };

        setBookingData(formattedBookingData);
        console.log("✅ Formatted Booking Data:", formattedBookingData);
      }
    } else {
      console.warn("⚠️ No pricing data found in localStorage");
    }
  }, [jobDetails]); // Re-run if jobDetails changes, fallback dependency on jobId for initial mount

  // Calculate pricing from API response
  // Backend job.pricing shape: { hourly, subtotal, tax, total, currency,
  //                              taxRate, taxName, taxType, taxInclusive }
  // Legacy shape:               { basePrice, gstAmount, totalPriceWithGst, discountAmount }
  const _tp = pricingData?.data?.totalPricing || {};
  const subtotal = _tp.basePrice ?? _tp.subtotal ?? 0;
  const gstAmount = _tp.gstAmount ?? _tp.tax ?? 0;
  const discountAmount = _tp.discountAmount ?? 0;

  // COUNTRY_TAX_DISPLAY_V2: tax line is country-aware. Backend ships
  // taxName ("GST", "VAT", "MwSt.") and taxRate (0.18, 0.05, 0.19, …) when
  // it correctly resolves the user's country from cookies/headers. If the
  // backend response doesn't include those fields (or returns IN-defaults
  // because the country header didn't reach it), fall back to the frontend's
  // own region selector so a user on /de/ never sees "GST 18%" — they see
  // "MwSt. 19%" computed against their selected country instead.
  const region    = useSelector(selectTaxInfo);
  const backendHasTax = typeof _tp.taxRate === 'number' && Boolean(_tp.taxName);
  const taxRate   = backendHasTax ? _tp.taxRate : (region?.taxRate ?? 0);
  const taxName   = backendHasTax ? _tp.taxName : (region?.taxLabel || 'Tax');
  const taxType   = _tp.taxType ?? (taxRate > 0 ? 'tax' : 'none');
  // If the backend's tax rate doesn't match the user's country (e.g. backend
  // didn't see the country header), recompute the tax amount client-side
  // using the country-correct rate so the displayed line matches its label.
  const taxAmount = backendHasTax
    ? gstAmount
    : +(Number(subtotal) * Number(taxRate)).toFixed(2);
  const total     = backendHasTax
    ? (_tp.totalPriceWithGst ?? _tp.total ?? subtotal + gstAmount)
    : +(Number(subtotal) + taxAmount).toFixed(2);
  const showTaxLine = taxAmount > 0 && taxRate > 0 && taxType !== 'none';
  const taxLabel    = `${taxName}${taxRate > 0 ? ` (${(taxRate * 100).toFixed(0)}%)` : ''}`;

  // Opens Razorpay modal with the order data from backend
  const openRazorpay = (paymentData, resolvedJobId) => {
    return new Promise((resolve, reject) => {
      const options = {
        key: paymentData.keyId,
        amount: paymentData.amount * 100,
        currency: paymentData.currency,
        name: "QuickHire",
        description: "Service Booking Payment",
        order_id: paymentData.razorpayOrderId,
        handler: async (response) => {
          try {
            await paymentService.getPaymentStatus(paymentData.paymentId);
          } catch {}
          localStorage.removeItem("_current_job_id");
          localStorage.removeItem("_pricing_data");
          router.push(`/payment-success?jobId=${resolvedJobId}`);
          resolve();
        },
        prefill: {
          name: paymentData.userDetails?.name || "",
          email: paymentData.userDetails?.email || "",
          contact: paymentData.userDetails?.mobile || "",
        },
        notes: {
          jobId: resolvedJobId,
          bookingType: paymentData.bookingType,
          gstNumber: gstNumber || "N/A",
        },
        theme: { color: "#45A735" },
        modal: { ondismiss: () => reject(new Error("dismissed")) },
      };
      if (!window.Razorpay) { reject(new Error("Razorpay SDK not loaded")); return; }
      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (resp) => reject(new Error(resp?.error?.description || "Payment failed")));
      rzp.open();
    });
  };

  // Handle Continue - Check login and open Razorpay for logged-in users
  const handleContinue = async () => {
    if (!termsAccepted) return;

    // Check if user is logged in
    const token = localStorage.getItem("token");
    const isLoggedIn = !!token;

    console.log("🔑 Login check:", isLoggedIn);

    // If NOT logged in, just go to next step
    if (!isLoggedIn) {
      console.log("🚪 Guest user - proceeding to next step");
      nextStep();
      return;
    }

    // If logged in, open Razorpay payment
    console.log("👤 Logged in user - initiating payment");

    if (!jobId) {
      // No jobId — try to create job from stored pricing data
      const storedPricingData = localStorage.getItem("_pricing_data");
      if (!storedPricingData) {
        showError("Booking data not found. Please start again.");
        return;
      }
      try {
        setIsProcessingPayment(true);
        const pricingData = JSON.parse(storedPricingData);

        // Handle both guest format { data: { servicesWithPricing: [...] } }
        // AND auth format (job object from createJob response)
        let serviceData = pricingData.data?.servicesWithPricing?.[0];

        // Auth-user format: job object has .services[] or .job.services[]
        if (!serviceData) {
          const job = pricingData.job || pricingData.data?.job || pricingData;
          const svc = job.services?.[0];
          if (svc) {
            serviceData = {
              serviceId: svc.serviceId,
              technologyIds: svc.technologyIds || [],
              selectedDays: svc.selectedDays || 1,
              requirements: svc.requirements || "Booked from web",
              preferredStartDate: svc.preferredStartDate,
              preferredEndDate: svc.preferredEndDate,
              durationTime: svc.durationTime,
              timeSlot: svc.timeSlot || { startTime: svc.startTime || "09:00", endTime: svc.endTime || "18:00" },
              bookingType: svc.bookingType || "later",
            };
          }
        }

        // If job already exists in pricing data (auth user already created it)
        const existingJobId = String(
          pricingData.job?._id || pricingData.data?.job?._id ||
          pricingData._id || pricingData.data?._id || ""
        ).replace(/^ObjectId\(["']?|["']?\)$/g, "") || null;
        if (existingJobId) {
          // Job already created — just proceed to payment
          dispatch(setSelectedJobId(existingJobId));
          router.push(`?jobId=${existingJobId}`, { scroll: false });
          await dispatch(fetchJobById(existingJobId)).unwrap();
          const orderResponse = await paymentService.createOrder(existingJobId, total);
          const paymentData = orderResponse.data.data;
          if (paymentData?.mock) {
            localStorage.removeItem("_pricing_data");
            router.push(`/payment-success?jobId=${existingJobId}`);
            return;
          }
          try {
            await openRazorpay(paymentData, existingJobId);
          } catch (e) {
            setIsProcessingPayment(false);
            if (e?.message !== "dismissed") showError("Payment failed. Please try again.");
          }
          return;
        }

        if (!serviceData) throw new Error("Service data missing from pricing data");

        const jobPayload = {
          services: [{
            serviceId: serviceData.serviceId?._id || serviceData.serviceId,
            technologyIds: (serviceData.technologyIds || []).map(t => typeof t === "string" ? t : t._id || t.id || t).filter(Boolean),
            selectedDays: serviceData.selectedDays || 1,
            requirements: serviceData.requirements || "Booked from web",
            preferredStartDate: serviceData.preferredStartDate,
            preferredEndDate: serviceData.preferredEndDate,
            durationTime: serviceData.durationTime,
            startTime: serviceData.timeSlot?.startTime || "09:00",
            endTime: serviceData.timeSlot?.endTime || "18:00",
            timeSlot: { startTime: serviceData.timeSlot?.startTime || "09:00", endTime: serviceData.timeSlot?.endTime || "18:00" },
            bookingType: serviceData.bookingType || "later",
          }],
        };
        const createdJob = await dispatch(createJob(jobPayload)).unwrap();

        // Helper: extract string ID from any MongoDB ObjectId format
        const extractId = (val) => {
          if (!val) return "";
          if (typeof val === "string") return val;
          // MongoDB Extended JSON: { $oid: "..." }
          if (val.$oid) return String(val.$oid);
          // ObjectId object with toString
          const str = String(val);
          // Strip ObjectId(...) wrapper if present
          return str.replace(/^ObjectId\(["']?|["']?\)$/g, "").replace(/[^a-f0-9]/gi, "");
        };

        // Exhaustively search all known response shapes
        const rawId =
          createdJob?.job?._id ?? createdJob?.job?.id ??
          createdJob?.data?.job?._id ?? createdJob?.data?._id ?? createdJob?.data?.id ??
          createdJob?._id ?? createdJob?.id;

        const newJobId = extractId(rawId) || (typeof createdJob === "string" ? createdJob : "");
        if (!newJobId || newJobId === "undefined" || newJobId === "null" || newJobId.length < 12) {
          throw new Error(`Job creation failed — response was: ${JSON.stringify(createdJob)?.slice(0, 300)}`);
        }
        dispatch(setSelectedJobId(newJobId));
        router.push(`?jobId=${newJobId}`, { scroll: false });
        await dispatch(fetchJobById(newJobId)).unwrap();
        const orderResponse = await paymentService.createOrder(newJobId, total);
        const paymentData = orderResponse.data.data;
        if (paymentData?.mock) {
          localStorage.removeItem("_pricing_data");
          router.push(`/payment-success?jobId=${newJobId}`);
          return;
        }
        try {
          await openRazorpay(paymentData, newJobId);
        } catch (e) {
          setIsProcessingPayment(false);
          if (e?.message !== "dismissed") showError("Payment failed. Please try again.");
        }
        return;
      } catch (e) {
        console.error("❌ Job creation failed:", e);
        setIsProcessingPayment(false);
        showError("Failed to create booking. Please try again.");
        return;
      }
    }

    try {
      setIsProcessingPayment(true);

      console.log("💳 Initiating payment for job ID:", jobId);
      console.log("💵 Payment amount:", total);

      // Create Razorpay order
      const orderResponse = await paymentService.createOrder(jobId, total);
      console.log("✅ Order created:", orderResponse.data);

      const paymentData = orderResponse.data.data;

      // Dev mock path — no real Razorpay configured on backend
      if (paymentData?.mock) {
        console.log("🧪 Mock payment — skipping Razorpay modal");
        localStorage.removeItem("_current_job_id");
        localStorage.removeItem("_pricing_data");
        router.push(`/payment-success?jobId=${jobId}`);
        return;
      }

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

            // Show success screen
            // setShowPaymentSuccess(true);
            // setIsProcessingPayment(false);
            // Navigate to success page
            // onClose();

            router.push(`/payment-success?jobId=${jobId}`);
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
          jobId: jobId,
          bookingType: paymentData.bookingType,
          gstNumber: gstNumber || "N/A",
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
    } catch (error) {
      console.error("❌ Error creating payment order:", error);
      showError("Failed to initiate payment. Please try again.");
      setIsProcessingPayment(false);
    }
  };

  const handleBackClick = () => {
    // Check if user is logged in
    const token = localStorage.getItem("token");
    const isLoggedIn = !!token;

    if (isLoggedIn) {
      // If logged in, show confirmation modal
      setShowBackConfirmModal(true);
      console.log("👤 Logged in user - showing back confirmation modal");
    } else {
      // If not logged in, go back directly
      previousStep();
    }
  };

  const handleConfirmBack = () => {
    // Persist current selection into the Redux cart so the user can resume from /cart later.
    try {
      const services = bookingData?.services || [];
      const fallbackServiceId = (typeof window !== "undefined" && window.localStorage.getItem("_service_id")) || jobId || "";
      services.forEach((s, idx) => {
        const id = `${jobId || fallbackServiceId || "draft"}_${idx}`;
        dispatch(
          addToCart({
            id,
            serviceId: fallbackServiceId,
            name: s.serviceName,
            image: "/AI.svg",
            duration: `${s.hours} Hours`,
            price: Number(s.basePrice || 0),
            quantity: 1,
            meta: {
              technicalSkills: s.technicalSkills,
              bookingType: s.bookingType,
              startDate: s.startDate,
              jobId: jobId || null,
            },
          }),
        );
      });
    } catch (e) {
      console.error("Failed to add to cart:", e);
    }
    dispatch(fetchDashboardStats());
    setShowBackConfirmModal(false);
    router.push("/cart");
  };

  const handleCancelBack = () => {
    setShowBackConfirmModal(false);
    handleContinue();
  };

  const handleCloseModal = () => {
    setShowBackConfirmModal(false);
  };

  return (
    <>
      <Box
        sx={{
          position: "relative",
          py: { xs: 2, sm: 2, md: 3 },
          px: { xs: 2, sm: 3, md: 2 },
          paddingLeft: { xs: 0, sm: 0, md: 0 },
          paddingBottom: { xs: 0, sm: 0, md: 0 },
          pb: 0,

          marginLeft: { xs: 0, sm: 0, md: 3 },
        }}
      >
        {/* Loading State */}
        {isFetchingJobDetails && (
          <Box
            sx={{
              mb: 3,
              padding: "12px 16px",
              backgroundColor: "#F0F9FF",
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
              {`🔄 ${tPay('loadingJob')}`}
            </Typography>
          </Box>
        )}

        {/* Header */}
        <Typography
          ref={topRef}
          sx={{
            fontSize: { xs: "20px", sm: "24px", md: "var( --font-size-24)" },
            fontWeight: "var(--font-weight-700)",
            color: "var(--text-primary)",
            mb: { xs: 1, sm: 1.5 },
            lineHeight: 1.3,
          }}
        >
          {tPay('reviewBooking')}
        </Typography>

        {/* Subheading */}
        <Typography
          sx={{
            fontSize: { xs: "13px", sm: "14px", md: "var(--font-size-14)" },
            fontWeight: "var(--font-weight-500)",
            color: "var(--text-muted)",
            mb: { xs: 3, sm: 2 },
            lineHeight: 1.5,
          }}
        >
          {tPay('reviewBookingSubtitle')}
        </Typography>

        {/* Booking Summary Card */}
        {bookingData?.services && bookingData.services.length > 0 ? (
          bookingData.services.map((service, index) => (
            <Box
              key={index}
              sx={{
                background:
                  "linear-gradient(0.01deg, #FFFFFF 0.01%, #F0FFEE 99.99%)",
                border: " 1px solid #78EB54",
                borderRadius: { xs: "12px", sm: "14px", md: "16px" },
                padding: { xs: "20px", sm: "24px", md: "28px" },
                mb: { xs: 2, sm: 3 },
              }}
            >
              {/* Service */}
              <Box sx={{ mb: { xs: 2.5, sm: 3, md: 2 } }}>
                <Typography
                  sx={{
                    fontSize: {
                      xs: "12px",
                      sm: "12px",
                      md: "var(--font-size-12)",
                    },
                    fontWeight: "var(--font-weight-500)",
                    color: "var(--text-primary)",
                    mb: 0.75,
                  }}
                >
                  {t('service')}
                  {bookingData.services.length > 1 ? ` #${index + 1}` : ""}
                </Typography>
                <Typography
                  sx={{
                    fontSize: {
                      xs: "18px",
                      sm: "18px",
                      md: "var(--font-size-18)",
                    },
                    fontWeight: "var(--font-weight-500)",
                    color: "var(--dark-text-primary)",
                    lineHeight: 1.3,
                  }}
                >
                  {service.serviceName}
                </Typography>
              </Box>

              {/* Divider Line */}
              <Box
                sx={{
                  width: "100%",
                  height: "1px",
                  backgroundColor: "#E5E7EB",
                  mb: { xs: 3, md: 2 },
                }}
              />

              {/* Technical Skills */}
              <Box sx={{ mb: { xs: 3, sm: 3.5, md: 2 } }}>
                <Typography
                  sx={{
                    fontSize: {
                      xs: "12px",
                      sm: "12px",
                      md: "var( --font-size-12)",
                    },
                    fontWeight: "var( --font-weight-500)",
                    color: "var(--text-primary)",
                    mb: 0.75,
                  }}
                >
                  {t('technicalSkills')}
                </Typography>
                <Typography
                  sx={{
                    fontSize: {
                      xs: "15px",
                      sm: "14px",
                      md: "var(--font-size-14)",
                    },
                    fontWeight: "var(--font-weight-400)",
                    color: "var(--dark-text-primary)",
                    lineHeight: 1.4,
                  }}
                >
                  {service.technicalSkills || "N/A"}
                </Typography>
              </Box>

              {/* Divider Line */}
              <Box
                sx={{
                  width: "100%",
                  height: "1px",
                  backgroundColor: "#E5E7EB",
                  mb: { xs: 3, md: 2 },
                }}
              />

              {/* Two Column Layout: Hours & Booking Type */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                  gap: { xs: 3, sm: 4 },
                }}
              >
                {/* Left Column: Hours & Total Cost */}
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      mb: 0.75,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: {
                          xs: "12px",
                          sm: "12px",
                          md: "var( --font-size-12)",
                        },
                        fontWeight: "var(--font-weight-500)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {tPay('hoursTotalCost')}
                    </Typography>
                    <Tooltip
                      title={showTaxLine ? tPay('taxAppliedAtCheckout', { label: taxLabel }) : tPay('noAdditionalTax')}
                      arrow
                      placement="bottom"
                      componentsProps={{
                        tooltip: {
                          sx: {
                            backgroundColor: "#1F2937",
                            color: "#FFFFFF",
                            fontSize: "13px",
                            padding: "8px 12px",
                            borderRadius: "8px",
                            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                            "& .MuiTooltip-arrow": {
                              color: "#1F2937",
                            },
                          },
                        },
                      }}
                    >
                      <InfoOutlinedIcon
                        sx={{
                          fontSize: { xs: 16, sm: 17, md: 18 },
                          color: "#45A735",
                          cursor: "pointer",
                        }}
                      />
                    </Tooltip>
                  </Box>
                  <Typography
                    sx={{
                      fontSize: {
                        xs: "15px",
                        sm: "14px",
                        md: "var(--font-size-14 )",
                      },
                      fontWeight: "var(--font-weight-500)",
                      color: "var(--dark-text-primary)",
                      lineHeight: 1.4,
                    }}
                  >
                    {tPay('hoursAndPrice', {
                      hours: service.hours || 0,
                      price: fmtMoney(service.basePrice, { maxDigits: 2 }),
                    })}
                  </Typography>
                </Box>

                {/* Right Column: Booking Type */}
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      mb: 0.75,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: {
                          xs: "12px",
                          sm: "12px",
                          md: "var( --font-size-12)",
                        },
                        fontWeight: "var( --font-weight-500)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {t('bookingType')}
                    </Typography>
                    <InfoOutlinedIcon
                      sx={{
                        fontSize: { xs: 16, sm: 17, md: 18 },
                        color: "#45A735",
                      }}
                    />
                  </Box>
                  <Typography
                    sx={{
                      fontSize: {
                        xs: "15px",
                        sm: "14px",
                        md: "var(--font-size-14 )",
                      },
                      fontWeight: "var(--font-weight-500)",
                      color: "var( --dark-text-primary)",
                      lineHeight: 1.4,
                      mb: 0.5,
                    }}
                  >
                    {service.bookingType}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: { xs: "12px", sm: "13px" },
                      fontWeight: 400,
                      color: "#6B7280",
                      lineHeight: 1.4,
                    }}
                  >
                    {service.isInstant
                      ? tPay('starting', { date: service.startDate })
                      : tPay('startingFrom', { date: service.startDate })}
                  </Typography>
                </Box>
              </Box>
            </Box>
          ))
        ) : (
          <Box
            sx={{
              background:
                "linear-gradient(0.01deg, #FFFFFF 0.01%, #F0FFEE 99.99%)",
              border: " 1px solid #78EB54",
              borderRadius: { xs: "12px", sm: "14px", md: "16px" },
              padding: { xs: "20px", sm: "24px", md: "28px" },
            }}
          >
            <Typography
              sx={{
                fontSize: { xs: "15px", sm: "16px" },
                fontWeight: 400,
                color: "#6B7280",
                textAlign: "center",
              }}
            >
              {tPay('loadingBooking')}
            </Typography>
          </Box>
        )}

        {/* Total Hours Summary - Only show if multiple services */}
        {bookingData?.services && bookingData.services.length > 1 && (
          <Box
            sx={{
              backgroundColor: "#F9FAFB",
              border: "1px solid #E5E7EB",
              borderRadius: { xs: "10px", sm: "12px" },
              padding: { xs: "16px", sm: "20px" },
              mb: { xs: 3, sm: 4 },
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography
              sx={{
                fontSize: { xs: "14px", sm: "15px", md: "16px" },
                fontWeight: 600,
                color: "#1F2937",
              }}
            >
              {tPay('totalHoursAll')}
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: "16px", sm: "17px", md: "18px" },
                fontWeight: 700,
                color: "#45A735",
              }}
            >
              {tPay('hoursLabel', { hours: bookingData.totalHours })}
            </Typography>
          </Box>
        )}

        {/* Price Breakdown Card */}
        <Box
          sx={{
            mt: { xs: 3, sm: 4 },
            border: " 1px solid var(--Grey-Shade-Grey-5, #D9D9D9)",
            borderRadius: { xs: "12px", sm: "14px", md: "16px" },
            padding: { xs: "20px", sm: "24px", md: "28px" },
          }}
        >
          <Typography
            sx={{
              fontSize: { xs: "18px", sm: "20px", md: "var(--font-size-18)" },
              fontWeight: "var(--font-weight-600)",
              color: "var(--text-primary)",
              mb: { xs: 2.5, sm: 3 },
              lineHeight: 1.3,
            }}
          >
            {t('priceBreakdown')}
          </Typography>

          {/* Divider Line */}
          <Box
            sx={{
              width: "100%",
              height: "1px",
              backgroundColor: "#E5E7EB",
              mb: { xs: 3, md: 2 },
            }}
          />

          {/* Subtotal */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: { xs: 1.5, sm: 2 },
            }}
          >
            <Typography
              sx={{
                fontSize: { xs: "14px", sm: "15px", md: "16px" },
                fontWeight: 400,
                color: "#6B7280",
              }}
            >
              {t('subtotal')}
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: "14px", sm: "15px", md: "16px" },
                fontWeight: 400,
                color: "#6B7280",
              }}
            >
              {fmtMoney(subtotal, { maxDigits: 2 })}
            </Typography>
          </Box>

          {/* Discount - Only show if discount > 0 */}
          {discountAmount > 0 && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: { xs: 1.5, sm: 2 },
              }}
            >
              <Typography
                sx={{
                  fontSize: { xs: "14px", sm: "15px", md: "16px" },
                  fontWeight: 400,
                  color: "#45A735",
                }}
              >
                {tPay('discount')}
              </Typography>
              <Typography
                sx={{
                  fontSize: { xs: "14px", sm: "15px", md: "16px" },
                  fontWeight: 400,
                  color: "#45A735",
                }}
              >
                -{fmtMoney(discountAmount, { maxDigits: 2 })}
              </Typography>
            </Box>
          )}

          {/* Tax (country-aware: GST 18% in IN, VAT 5% in AE, MwSt. 19% in DE,
              GST 10% in AU, hidden entirely in US where type='none') */}
          {showTaxLine && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: { xs: 2, sm: 2.5 },
                pb: { xs: 2, sm: 2.5 },
                borderBottom: "1px solid #E5E7EB",
              }}
            >
              <Typography
                sx={{
                  fontSize: { xs: "14px", sm: "15px", md: "16px" },
                  fontWeight: 400,
                  color: "#6B7280",
                }}
              >
                {taxLabel}
              </Typography>
              <Typography
                sx={{
                  fontSize: { xs: "14px", sm: "15px", md: "16px" },
                  fontWeight: 400,
                  color: "#6B7280",
                }}
              >
                {fmtMoney(taxAmount, { maxDigits: 2 })}
              </Typography>
            </Box>
          )}

          {/* Total */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography
              sx={{
                fontSize: { xs: "16px", sm: "17px", md: "18px" },
                fontWeight: 700,
                color: "#1F2937",
              }}
            >
              {t('total')}
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: "16px", sm: "17px", md: "18px" },
                fontWeight: 700,
                color: "#1F2937",
              }}
            >
              {fmtMoney(total, { maxDigits: 2 })}
            </Typography>
          </Box>
        </Box>

        {/* Tax Registration Number Input — only show when the resolved tax
            type is GST/VAT (skip in countries with type='none', e.g. US).
            Label uses the country's own term (GSTIN, TRN, USt-IdNr, ABN). */}
        {showTaxLine && (
        <Box sx={{ mt: { xs: 3, sm: 4 } }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              mb: { xs: 1, sm: 1.5 },
            }}
          >
            <Typography
              sx={{
                fontSize: { xs: "13px", sm: "14px", md: "15px" },
                fontWeight: 500,
                color: "#1F2937",
              }}
            >
              {tPay('taxNumberOptional', { taxName })}
            </Typography>
            <Tooltip
              title={tPay('taxNumberTooltip', { taxName })}
              arrow
              placement="bottom"
              componentsProps={{
                tooltip: {
                  sx: {
                    backgroundColor: "#1F2937",
                    color: "#FFFFFF",
                    fontSize: "13px",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                    "& .MuiTooltip-arrow": {
                      color: "#1F2937",
                    },
                  },
                },
              }}
            >
              <InfoOutlinedIcon
                sx={{
                  fontSize: { xs: 16, sm: 17, md: 18 },
                  color: "#45A735",
                  cursor: "pointer",
                }}
              />
            </Tooltip>
          </Box>
          <TextField
            fullWidth
            placeholder={taxType === 'gst' && taxName === 'GST'
              ? tPay('enterTaxNumberWithExample', { taxName, example: '27AAPCT1234A1Z0' })
              : tPay('enterTaxNumber', { taxName })}
            value={gstNumber}
            onChange={(e) => setGstNumber(e.target.value)}
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
        )}

        {/* Terms & Conditions Checkbox */}
        <Box
          sx={{
            mt: { xs: 2.5, sm: 3 },
            display: "flex",
            alignItems: "flex-start",
            gap: { xs: 0.5, sm: 1 },
          }}
        >
          <Checkbox
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            sx={{
              padding: 0,
              color: "#D1D5DB",
              "&.Mui-checked": {
                color: "#45A735",
              },
              "& .MuiSvgIcon-root": {
                fontSize: { xs: 20, sm: 22 },
              },
            }}
          />
          <Typography
            sx={{
              fontSize: { xs: "13px", sm: "14px", md: "15px" },
              fontWeight: 400,
              color: "#1F2937",
              lineHeight: 1.5,
              pt: 0.25,
            }}
          >
            I have read and agree to the{" "}
            <Box
              component="span"
              onClick={() => setShowTermsDrawer(true)}
              sx={{
                textDecoration: "underline",
                cursor: "pointer",
                "&:hover": {
                  color: "#45A735",
                },
              }}
            >
              Terms & Conditions
            </Box>
            .
          </Typography>
        </Box>

        {/* Back and Continue Buttons - Sticky at Bottom */}
        <Box
          sx={{
            position: "sticky",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "#FFFFFF",

            // padding: { xs: "16px 20px", sm: "20px 24px", md: "24px 32px" },
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
              onClick={handleBackClick}
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
              Back
            </Button>
          )}

          <Button
            onClick={handleContinue}
            disabled={!termsAccepted || isProcessingPayment}
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
            {isProcessingPayment ? "Processing..." : "Continue"}
          </Button>
        </Box>
      </Box>

      {/* Payment Success Full Page */}
      {showPaymentSuccess && (
        <div className="fixed inset-0 z-[9999] bg-white flex items-center justify-center">
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

      {/* Back Confirmation Modal - Matches the screenshot design */}
      {isMounted &&
        showBackConfirmModal &&
        ReactDOM.createPortal(
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 z-[9998] transition-opacity duration-300"
              onClick={handleCloseModal}
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            />

            {/* Modal */}
            <Box
              sx={{
                position: "fixed !important",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: { xs: "90%", sm: "496px" },
                maxWidth: "496px",
                background:
                  "linear-gradient(0.01deg, #FFFFFF 0.01%, #DDEFDA 99.99%)",
                borderRadius: "16px",
                boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
                zIndex: 9999,
                padding: "24px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
              style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }}
            >
              {/* Close Button */}
              <Box
                onClick={handleCloseModal}
                sx={{
                  position: "absolute",
                  top: { xs: 16, sm: 20 },
                  right: { xs: 16, sm: 20 },
                  cursor: "pointer",
                  color: "#9CA3AF",
                  zIndex: 1,
                  "&:hover": { color: "#1F2937" },
                  transition: "color 0.2s",
                }}
              >
                <svg
                  width={24}
                  height={24}
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M18 6L6 18M6 6l12 12"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Box>

              {/* Warning Icon */}
              <Box
                sx={{
                  marginTop: { xs: 0, sm: 4 },
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  alignSelf: "center",
                  width: { xs: "48px", sm: "48px" },
                  height: { xs: "48px", sm: "48px" },
                  backgroundColor: "#FEF2F2",
                  borderRadius: "14px",
                  border: "1px solid #FF4848",
                }}
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 9V13M12 17H12.01M5.07183 19H18.9282C20.4678 19 21.4301 17.3333 20.6603 16L13.7321 4C12.9623 2.66667 11.0377 2.66667 10.2679 4L3.33975 16C2.56995 17.3333 3.53223 19 5.07183 19Z"
                    stroke="#EF4444"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Box>

              {/* Title */}
              <Typography
                sx={{
                  fontSize: "18px",
                  fontWeight: 600,
                  color: "#1F2937",
                }}
              >
                Wait! Don't lose your progress
              </Typography>

              {/* Subtitle */}
              <Typography
                sx={{
                  fontSize: "14px",
                  fontWeight: 400,
                  color: "#636363",
                  lineHeight: "150%",
                  textAlign: "center",
                }}
              >
                Save your selection to the cart, or continue checkout.
              </Typography>

              {/* Action Buttons */}
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  gap: "10px",
                  justifyContent: "center",
                }}
              >
                {/* Add to Cart & Leave - Green Button */}
                <Button
                  onClick={() => {
                    // Save to cart logic here if needed
                    handleConfirmBack();
                  }}
                  sx={{
                    width: { xs: "100%", sm: "206px" },
                    height: "44px",
                    background:
                      "linear-gradient(to right, #26472B 50%, #45A735 50%)",
                    backgroundSize: "200% 100%",
                    backgroundPosition: "right bottom",
                    color: "#FFFFFF",
                    fontSize: "14px",
                    fontWeight: 600,
                    padding: "16px 24px",
                    borderRadius: "8px",
                    textTransform: "none",
                    boxShadow: "none",
                    order: { xs: 2, sm: 1 },
                    transition: "all 0.5s ease-out",
                    "&:hover": {
                      backgroundPosition: "left bottom",
                      color: "#FFFFFF",
                      boxShadow: "none",
                    },
                  }}
                >
                  Add to Cart & Leave
                </Button>

                {/* Continue Checkout - White/Outlined Button */}
                <Button
                  onClick={handleCancelBack}
                  sx={{
                    width: { xs: "100%", sm: "186px" },
                    height: "44px",
                    backgroundColor: "#FFFFFF",
                    color: "#45A735",
                    fontSize: "14px",
                    fontWeight: 600,
                    padding: "16px",
                    borderRadius: "8px",
                    textTransform: "none",
                    boxShadow: "none",
                    border: "1px solid #45A735",
                    order: { xs: 1, sm: 2 },
                    "&:hover": {
                      backgroundColor: "#26472B",
                      color: "#FFFFFF",
                      borderColor: "#26472B",
                      boxShadow: "none",
                    },
                    transition: "all 0.2s ease",
                  }}
                >
                  Continue Checkout
                </Button>
              </Box>
            </Box>
          </>,
          document.body,
        )}

      {/* Terms & Conditions Drawer */}
      {isMounted &&
        showTermsDrawer &&
        ReactDOM.createPortal(
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 z-[9998] transition-opacity duration-300"
              onClick={() => setShowTermsDrawer(false)}
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            />

            {/* Drawer - Slides in from right */}
            <Box
              sx={{
                position: "fixed !important",
                top: 0,
                right: 0,
                bottom: 0,
                width: { xs: "100%", sm: "500px", md: "600px" },
                maxWidth: "100%",
                backgroundColor: "#FFFFFF",
                boxShadow: "-4px 0 20px rgba(0, 0, 0, 0.15)",
                zIndex: 9999,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                animation: "slideInRight 0.3s ease-out",
                "@keyframes slideInRight": {
                  from: {
                    transform: "translateX(100%)",
                  },
                  to: {
                    transform: "translateX(0)",
                  },
                },
              }}
              style={{
                position: "fixed",
                top: 0,
                right: 0,
                bottom: 0,
              }}
            >
              {/* Header */}
              <Box
                sx={{
                  padding: { xs: "16px 20px", sm: "20px 24px" },
                  borderBottom: "1px solid #E5E7EB",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: "#FFFFFF",
                }}
              >
                <Typography
                  sx={{
                    fontSize: { xs: "18px", sm: "20px" },
                    fontWeight: 600,
                    color: "#1F2937",
                  }}
                >
                  Terms & Conditions
                </Typography>
                <Box
                  onClick={() => setShowTermsDrawer(false)}
                  sx={{
                    cursor: "pointer",
                    color: "#9CA3AF",
                    "&:hover": { color: "#1F2937" },
                    transition: "color 0.2s",
                  }}
                >
                  <svg
                    width={24}
                    height={24}
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M18 6L6 18M6 6l12 12"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Box>
              </Box>

              {/* Scrollable Content */}
              <Box
                sx={{
                  flex: 1,
                  overflowY: "auto",
                  padding: { xs: "20px", sm: "24px 28px" },
                  "&::-webkit-scrollbar": {
                    width: "6px",
                  },
                  "&::-webkit-scrollbar-track": {
                    background: "#F3F4F6",
                  },
                  "&::-webkit-scrollbar-thumb": {
                    background: "#D1D5DB",
                    borderRadius: "3px",
                    "&:hover": {
                      background: "#9CA3AF",
                    },
                  },
                }}
              >
                {/* Title */}
                <Typography
                  sx={{
                    fontSize: { xs: "16px", sm: "20px" },
                    fontWeight: 700,
                    color: "#484848",
                    mb: 2,
                  }}
                >
                  TERMS AND CONDITIONS OF USE –{" "}
                  <Box component="span" sx={{ color: "#45A735" }}>
                    QuickHire
                  </Box>
                </Typography>

                {/* Last Updated */}
                <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                  <Typography
                    sx={{
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#ABA9A9",
                      mr: 1,
                    }}
                  >
                    Last Updated:
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "14px",
                      fontWeight: 400,
                      color: "#000000",
                    }}
                  >
                    30 December, 2025
                  </Typography>
                </Box>

                {/* Introduction */}
                <Typography
                  sx={{
                    fontSize: { xs: "12px", sm: "14px" },
                    fontWeight: 400,
                    color: "#636363",
                    lineHeight: 1.7,
                    mb: 4,
                  }}
                >
                  This Terms and Conditions of Use ("Terms") is an electronic
                  record in terms of the Information Technology Act, 2000 and
                  rules made thereunder, as amended from time to time. This
                  electronic record is generated by a computer system and does
                  not require any physical or digital signatures.
                  <br />
                  <br />
                  This document is published in accordance with Rule 3(1) of the
                  Information Technology (Intermediaries Guidelines and Digital
                  Media Ethics Code) Rules, 2011.
                  <br />
                  <br />
                  The mobile & Web application "QuickHire" ("App" or "Platform")
                  is owned and operated by Ai Genie ("QuickHire", "We", "Us",
                  "Our").
                  <br />
                  <br />
                  By accessing, registering, or using the App, you ("User",
                  "You") agree to be bound by these Terms. If you do not agree,
                  please do not use the App.
                </Typography>

                {/* Sections */}
                <Box sx={{ "& > *:not(:last-child)": { mb: 3 } }}>
                  {/* 1. SCOPE OF SERVICES */}
                  <Box>
                    <Typography
                      sx={{
                        fontSize: { xs: "14px", sm: "16px" },
                        fontWeight: 700,
                        color: "#000000",
                        mb: 1,
                      }}
                    >
                      <Box component="span" sx={{ color: "#45A735" }}>
                        1.
                      </Box>{" "}
                      SCOPE OF SERVICES
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: { xs: "12px", sm: "14px" },
                        fontWeight: 400,
                        color: "#636363",
                        lineHeight: 1.7,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      QuickHire is a technology platform that enables Users to
                      access platform-managed, Ai-screened IT resources
                      coordinated through a Technical Project Manager (TPM). On
                      an hourly or custom day basis for virtual/remote services
                      only.{"\n\n"}QuickHire acts solely as an intermediary and
                      facilitator and does not itself provide IT development
                      services.{"\n\n"}All services provided through the App
                      are:{"\n"}• Remote / virtual only{"\n"}• Time-and-material
                      based{"\n"}• Not outcome- or milestone-based unless
                      explicitly agreed in writing
                    </Typography>
                  </Box>

                  {/* 2. USER ELIGIBILITY */}
                  <Box>
                    <Typography
                      sx={{
                        fontSize: { xs: "14px", sm: "16px" },
                        fontWeight: 700,
                        color: "#000000",
                        mb: 1,
                      }}
                    >
                      <Box component="span" sx={{ color: "#45A735" }}>
                        2.
                      </Box>{" "}
                      USER ELIGIBILITY
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: { xs: "12px", sm: "14px" },
                        fontWeight: 400,
                        color: "#636363",
                        lineHeight: 1.7,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      You must:{"\n"}• Be at least 18 years of age{"\n"}• Be
                      competent to contract under the Indian Contract Act, 1872
                      {"\n"}By using the App, you represent that all information
                      provided by you is true, accurate, and complete.
                    </Typography>
                  </Box>

                  {/* 3. ACCOUNT REGISTRATION & SECURITY */}
                  <Box>
                    <Typography
                      sx={{
                        fontSize: { xs: "14px", sm: "16px" },
                        fontWeight: 700,
                        color: "#000000",
                        mb: 1,
                      }}
                    >
                      <Box component="span" sx={{ color: "#45A735" }}>
                        3.
                      </Box>{" "}
                      ACCOUNT REGISTRATION & SECURITY
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: { xs: "12px", sm: "14px" },
                        fontWeight: 400,
                        color: "#636363",
                        lineHeight: 1.7,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      • Users must register using a valid mobile number and
                      email address{"\n"}• Login is enabled through OTP or
                      credentials{"\n"}• You are responsible for maintaining the
                      confidentiality of your account{"\n"}• Any activity
                      performed through your account shall be deemed to be
                      performed by you{"\n\n"}QuickHire reserves the right to
                      suspend or terminate accounts providing false or
                      misleading information.
                    </Typography>
                  </Box>

                  {/* 4. BOOKING PROCESS */}
                  <Box>
                    <Typography
                      sx={{
                        fontSize: { xs: "14px", sm: "16px" },
                        fontWeight: 700,
                        color: "#000000",
                        mb: 1,
                      }}
                    >
                      <Box component="span" sx={{ color: "#45A735" }}>
                        4.
                      </Box>{" "}
                      BOOKING PROCESS
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: { xs: "12px", sm: "14px" },
                        fontWeight: 400,
                        color: "#636363",
                        lineHeight: 1.7,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      To place a booking, User must:{"\n"}1. Select a Service
                      and Sub-Service{"\n"}2. Choose duration (4 hours / 8 hours
                      / Custom days){"\n"}3. Select date and time slot{"\n"}4.
                      Complete advance payment{"\n\n"}Booking confirmation is
                      subject to successful payment.
                    </Typography>
                  </Box>

                  {/* 5. PRICING, TAXES & PAYMENT */}
                  <Box>
                    <Typography
                      sx={{
                        fontSize: { xs: "14px", sm: "16px" },
                        fontWeight: 700,
                        color: "#000000",
                        mb: 1,
                      }}
                    >
                      <Box component="span" sx={{ color: "#45A735" }}>
                        5.
                      </Box>{" "}
                      PRICING, TAXES & PAYMENT
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: { xs: "12px", sm: "14px" },
                        fontWeight: 400,
                        color: "#636363",
                        lineHeight: 1.7,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      • Pricing is calculated on an hourly or custom-day basis
                      {"\n"}• 18% GST is applicable and displayed at checkout
                      {"\n"}• Full advance payment is mandatory to confirm any
                      booking{"\n"}• QuickHire only facilitates payments and is
                      not a banking or financial institution{"\n\n"}Any
                      third-party tools, licenses, or software costs are to
                      User's responsibility.
                    </Typography>
                  </Box>

                  {/* Continue with remaining sections... */}
                  {/* For brevity, I'll add a few more key sections */}

                  {/* 6. SERVICE EXECUTION */}
                  <Box>
                    <Typography
                      sx={{
                        fontSize: { xs: "14px", sm: "16px" },
                        fontWeight: 700,
                        color: "#000000",
                        mb: 1,
                      }}
                    >
                      <Box component="span" sx={{ color: "#45A735" }}>
                        6.
                      </Box>{" "}
                      SERVICE EXECUTION
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: { xs: "12px", sm: "14px" },
                        fontWeight: 400,
                        color: "#636363",
                        lineHeight: 1.7,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      • A Technical Project Manager ("TPM") is assigned after
                      booking confirmation.{"\n"}• The TPM assigns an
                      appropriate Resource based on the User's requirements.
                      {"\n"}• The service starts as per the confirmed booking
                      schedule once the Resource is ready.{"\n"}• Service
                      delivery is monitored to ensure quality and timely
                      execution.
                    </Typography>
                  </Box>

                  {/* 7. EXTENSION OF SERVICE */}
                  <Box>
                    <Typography
                      sx={{
                        fontSize: { xs: "14px", sm: "16px" },
                        fontWeight: 700,
                        color: "#000000",
                        mb: 1,
                      }}
                    >
                      <Box component="span" sx={{ color: "#45A735" }}>
                        7.
                      </Box>{" "}
                      EXTENSION OF SERVICE
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: { xs: "12px", sm: "14px" },
                        fontWeight: 400,
                        color: "#636363",
                        lineHeight: 1.7,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      • "Extend Service" option is enabled 30 minutes before service expiry{"\n"}• Extensions are subject to Resource and time availability{"\n"}• Extension charges must be paid in advance{"\n"}• Service timer updates only after successful payment
                    </Typography>
                  </Box>

                  {/* 8. RESOURCE AVAILABILITY & CONTINUITY */}
                  <Box>
                    <Typography
                      sx={{
                        fontSize: { xs: "14px", sm: "16px" },
                        fontWeight: 700,
                        color: "#000000",
                        mb: 1,
                      }}
                    >
                      <Box component="span" sx={{ color: "#45A735" }}>
                        8.
                      </Box>{" "}
                      RESOURCE AVAILABILITY & CONTINUITY
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: { xs: "12px", sm: "14px" },
                        fontWeight: 400,
                        color: "#636363",
                        lineHeight: 1.7,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      If the originally assigned Resource is unavailable for any subsequent or repeat booking, QuickHire shall, subject to availability, assign an alternative Resource with comparable domain expertise and experience. Continuity with the same individual Resource is not guaranteed, and such substitution shall not constitute a deficiency, default, or failure in service. QuickHire shall not be liable for any preferences, dependencies, or expectations relating to a specific Resource.
                    </Typography>
                  </Box>

                  {/* 9. CANCELLATIONS & REFUNDS */}
                  <Box>
                    <Typography
                      sx={{
                        fontSize: { xs: "14px", sm: "16px" },
                        fontWeight: 700,
                        color: "#000000",
                        mb: 1,
                      }}
                    >
                      <Box component="span" sx={{ color: "#45A735" }}>
                        9.
                      </Box>{" "}
                      CANCELLATIONS & REFUNDS
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: { xs: "12px", sm: "14px" },
                        fontWeight: 400,
                        color: "#636363",
                        lineHeight: 1.7,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      • User-initiated cancellation policies may vary and will be displayed in-app{"\n"}• If QuickHire fails to assign a Resource within a reasonable time, a full refund will be issued{"\n"}• No refunds will be provided once:{"\n"}   o OTP is shared{"\n"}   o Service timer has started{"\n"}   o Delay is caused due to User unavailability{"\n\n"}All refund decisions are subject to internal review in accordance with these Terms and applicable laws.
                    </Typography>
                  </Box>

                  {/* 10. USER CONDUCT & RESTRICTIONS */}
                  <Box>
                    <Typography
                      sx={{
                        fontSize: { xs: "14px", sm: "16px" },
                        fontWeight: 700,
                        color: "#000000",
                        mb: 1,
                      }}
                    >
                      <Box component="span" sx={{ color: "#45A735" }}>
                        10.
                      </Box>{" "}
                      USER CONDUCT & RESTRICTIONS
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: { xs: "12px", sm: "14px" },
                        fontWeight: 400,
                        color: "#636363",
                        lineHeight: 1.7,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      Users agree not to:{"\n"}• Directly hire or solicit Resources outside of Platform{"\n"}• Upload abusive, illegal, defamatory, or infringing content{"\n"}• Misuse chat or communication features{"\n\n"}QuickHire reserves the right to terminate services immediately without refund for misconduct or abuse.
                    </Typography>
                  </Box>

                  {/* 11. NO EMPLOYMENT RELATIONSHIP */}
                  <Box>
                    <Typography
                      sx={{
                        fontSize: { xs: "14px", sm: "16px" },
                        fontWeight: 700,
                        color: "#000000",
                        mb: 1,
                      }}
                    >
                      <Box component="span" sx={{ color: "#45A735" }}>
                        11.
                      </Box>{" "}
                      NO EMPLOYMENT RELATIONSHIP
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: { xs: "12px", sm: "14px" },
                        fontWeight: 400,
                        color: "#636363",
                        lineHeight: 1.7,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      Resources are independent professionals, not employees, agents, or representatives of QuickHire. No employment, partnership, or agency relationship is created.
                    </Typography>
                  </Box>

                  {/* 12. INTELLECTUAL PROPERTY */}
                  <Box>
                    <Typography
                      sx={{
                        fontSize: { xs: "14px", sm: "16px" },
                        fontWeight: 700,
                        color: "#000000",
                        mb: 1,
                      }}
                    >
                      <Box component="span" sx={{ color: "#45A735" }}>
                        12.
                      </Box>{" "}
                      INTELLECTUAL PROPERTY
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: { xs: "12px", sm: "14px" },
                        fontWeight: 400,
                        color: "#636363",
                        lineHeight: 1.7,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      • QuickHire owns all rights to App, design, branding, and platform technology{"\n"}• Work product created during paid service hours belongs to the User after full payment, unless otherwise agreed in writing{"\n"}• QuickHire retains ownership of any pre-existing tools, frameworks, or templates used in delivery.
                    </Typography>
                  </Box>

                  {/* 13. THIRD-PARTY SERVICES */}
                  <Box>
                    <Typography
                      sx={{
                        fontSize: { xs: "14px", sm: "16px" },
                        fontWeight: 700,
                        color: "#000000",
                        mb: 1,
                      }}
                    >
                      <Box component="span" sx={{ color: "#45A735" }}>
                        13.
                      </Box>{" "}
                      THIRD-PARTY SERVICES
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: { xs: "12px", sm: "14px" },
                        fontWeight: 400,
                        color: "#636363",
                        lineHeight: 1.7,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      Resources may use third-party tools or platforms. QuickHire is not responsible for:{"\n"}• Downtime or failures of third-party services{"\n"}• Licensing or compliance issues{"\n"}• Data loss caused by external platforms
                    </Typography>
                  </Box>

                  {/* 14. DISCLAIMER & LIMITATION OF LIABILITY */}
                  <Box>
                    <Typography
                      sx={{
                        fontSize: { xs: "14px", sm: "16px" },
                        fontWeight: 700,
                        color: "#000000",
                        mb: 1,
                      }}
                    >
                      <Box component="span" sx={{ color: "#45A735" }}>
                        14.
                      </Box>{" "}
                      DISCLAIMER & LIMITATION OF LIABILITY
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: { xs: "12px", sm: "14px" },
                        fontWeight: 400,
                        color: "#636363",
                        lineHeight: 1.7,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      Services are provided on an "as is" and "as available" basis.{"\n\n"}QuickHire does not guarantee:{"\n"}• Bug-free or error-free code{"\n"}• Business outcomes or timelines{"\n\n"}Total liability, if any, shall be limited to the amount paid by the User for the specific booking.
                    </Typography>
                  </Box>

                  {/* 15. FORCE MAJEURE */}
                  <Box>
                    <Typography
                      sx={{
                        fontSize: { xs: "14px", sm: "16px" },
                        fontWeight: 700,
                        color: "#000000",
                        mb: 1,
                      }}
                    >
                      <Box component="span" sx={{ color: "#45A735" }}>
                        15.
                      </Box>{" "}
                      FORCE MAJEURE
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: { xs: "12px", sm: "14px" },
                        fontWeight: 400,
                        color: "#636363",
                        lineHeight: 1.7,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      QuickHire shall not be liable for delays or failures due to events beyond reasonable control, including natural disasters, network failures, government actions, or third-party outages.
                    </Typography>
                  </Box>

                  {/* 16. CONFIDENTIALITY */}
                  <Box>
                    <Typography
                      sx={{
                        fontSize: { xs: "14px", sm: "16px" },
                        fontWeight: 700,
                        color: "#000000",
                        mb: 1,
                      }}
                    >
                      <Box component="span" sx={{ color: "#45A735" }}>
                        16.
                      </Box>{" "}
                      CONFIDENTIALITY
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: { xs: "12px", sm: "14px" },
                        fontWeight: 400,
                        color: "#636363",
                        lineHeight: 1.7,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      Both parties agree to maintain confidentiality of information shared during service engagement. QuickHire shall not be responsible for the loss of User data. Users are solely responsible for maintaining backups.
                    </Typography>
                  </Box>

                  {/* 17. PRIVACY & DATA PROTECTION */}
                  <Box>
                    <Typography
                      sx={{
                        fontSize: { xs: "14px", sm: "16px" },
                        fontWeight: 700,
                        color: "#000000",
                        mb: 1,
                      }}
                    >
                      <Box component="span" sx={{ color: "#45A735" }}>
                        17.
                      </Box>{" "}
                      PRIVACY & DATA PROTECTION
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: { xs: "12px", sm: "14px" },
                        fontWeight: 400,
                        color: "#636363",
                        lineHeight: 1.7,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      QuickHire collects personal, transactional, communication, and technical information to:{"\n"}• Provide services{"\n"}• Comply with legal obligations{"\n"}• Prevent fraud and resolve disputes{"\n\n"}Data is protected using reasonable security practices as per the IT Act, 2000. QuickHire does not sell user data.
                    </Typography>
                  </Box>

                  {/* 18. ACCOUNT SUSPENSION & TERMINATION */}
                  <Box>
                    <Typography
                      sx={{
                        fontSize: { xs: "14px", sm: "16px" },
                        fontWeight: 700,
                        color: "#000000",
                        mb: 1,
                      }}
                    >
                      <Box component="span" sx={{ color: "#45A735" }}>
                        18.
                      </Box>{" "}
                      ACCOUNT SUSPENSION & TERMINATION
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: { xs: "12px", sm: "14px" },
                        fontWeight: 400,
                        color: "#636363",
                        lineHeight: 1.7,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      QuickHire may suspend or terminate accounts for:{"\n"}• Violation of these Terms{"\n"}• Fraudulent or abusive behavior{"\n"}• Attempt to bypass the Platform{"\n\n"}Users may request account deletion, subject to legal retention requirements.
                    </Typography>
                  </Box>

                  {/* 19. MODIFICATION OF TERMS */}
                  <Box>
                    <Typography
                      sx={{
                        fontSize: { xs: "14px", sm: "16px" },
                        fontWeight: 700,
                        color: "#000000",
                        mb: 1,
                      }}
                    >
                      <Box component="span" sx={{ color: "#45A735" }}>
                        19.
                      </Box>{" "}
                      MODIFICATION OF TERMS
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: { xs: "12px", sm: "14px" },
                        fontWeight: 400,
                        color: "#636363",
                        lineHeight: 1.7,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      QuickHire reserves the right to update these Terms at any time. Continued use of the App constitutes acceptance of the revised Terms.
                    </Typography>
                  </Box>

                  {/* 20. INDEMNITY */}
                  <Box>
                    <Typography
                      sx={{
                        fontSize: { xs: "14px", sm: "16px" },
                        fontWeight: 700,
                        color: "#000000",
                        mb: 1,
                      }}
                    >
                      <Box component="span" sx={{ color: "#45A735" }}>
                        20.
                      </Box>{" "}
                      INDEMNITY
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: { xs: "12px", sm: "14px" },
                        fontWeight: 400,
                        color: "#636363",
                        lineHeight: 1.7,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      You agree to indemnify and hold QuickHire harmless against claims arising from misuse of the App, violation of laws, or infringement of third-party rights.
                    </Typography>
                  </Box>

                  {/* 21. GRIEVANCE OFFICER */}
                  <Box>
                    <Typography
                      sx={{
                        fontSize: { xs: "14px", sm: "16px" },
                        fontWeight: 700,
                        color: "#000000",
                        mb: 1,
                      }}
                    >
                      <Box component="span" sx={{ color: "#45A735" }}>
                        21.
                      </Box>{" "}
                      GRIEVANCE OFFICER
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: { xs: "12px", sm: "14px" },
                        fontWeight: 400,
                        color: "#636363",
                        lineHeight: 1.7,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      In accordance with the Information Technology Act, 2000 and rules made thereunder, name and contact details of the Grievance Officer are provided below:{"\n\n"}• Name: [Insert Name]{"\n"}• Designation: Grievance Officer{"\n"}• Address: [Insert Office Address]{"\n"}• Email: [Insert Email]{"\n"}• Time: 10 AM - 6 PM (Monday - Friday){"\n\n"}Any person aggrieved as a result of access or usage of the App can notify the Grievance Officer in the form of a written complaint. The Grievance Officer shall redress the complaints within 1 month from the date of receipt of the complaint.
                    </Typography>
                  </Box>

                  {/* 22. GOVERNING LAW AND JURISDICTION */}
                  <Box>
                    <Typography
                      sx={{
                        fontSize: { xs: "14px", sm: "16px" },
                        fontWeight: 700,
                        color: "#000000",
                        mb: 1,
                      }}
                    >
                      <Box component="span" sx={{ color: "#45A735" }}>
                        22.
                      </Box>{" "}
                      GOVERNING LAW AND JURISDICTION
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: { xs: "12px", sm: "14px" },
                        fontWeight: 400,
                        color: "#636363",
                        lineHeight: 1.7,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      These Terms of Use shall be governed by and interpreted in accordance with the laws of India. The courts of Gurugram, Haryana shall have the sole and exclusive jurisdiction in respect of any matters arising from the use of the App.
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </>,
          document.body,
        )}
    </>
  );
};

export default SummaryStep;
