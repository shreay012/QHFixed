"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { usePrice } from "@/lib/hooks/usePrice";
import { showError, showWarning } from "@/lib/utils/toast";
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Button,
  Tooltip,
} from "@mui/material";
import Image from "next/image";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import RadioButtonCheckedIcon from "@mui/icons-material/RadioButtonChecked";
import RemoveIcon from "@mui/icons-material/Remove";
import AddIcon from "@mui/icons-material/Add";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { fetchHoursAvailability } from "@/lib/redux/slices/availabilitySlice/availabilitySlice";
import {
  updateJob,
  fetchCustomerBookings,
  createJob,
  fetchServiceById as fetchServiceByIdBooking,
} from "@/lib/redux/slices/bookingSlice/bookingSlice";
import { useStepperContext } from "./StepperContext";
import { fetchDashboardStats } from "@/lib/redux/slices/dashboardSlice";
const HoursStep = ({ selectedService: selectedServiceProp, serviceId } = {}) => {
  const dispatch = useDispatch();
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations("hoursStep");
  // Active next-intl locale → BCP-47 tag for date formatting (weekday labels).
  const localeBcp = useLocale() || "en-US";

  const {
    setHoursBookingData,
    hoursBookingData,
    nextStep,
    previousStep,
    isFirstStep,
  } = useStepperContext();
  const { hoursAvailability, isLoading, error } = useSelector(
    (state) => state.availability,
  );
  // Pull hourly rate: prop (immediate, passed from page) > Redux discover > Redux booking > fallback
  const selectedServiceRedux = useSelector((state) => state.services?.selectedService);
  const serviceDetailsRedux = useSelector((state) => state.booking?.serviceDetails);
  const isAuthenticated = useSelector((state) => state.auth?.isAuthenticated);
  const activeService = selectedServiceProp || selectedServiceRedux || serviceDetailsRedux;

  // Country-specific price from the geo_pricing collection (overrides the
  // embedded service.hourlyRate for customers outside the default country).
  const [geoPrice, setGeoPrice] = useState(null);

  useEffect(() => {
    const id = serviceId || selectedServiceProp?._id || selectedServiceRedux?._id;
    if (!id) return;

    // Fetch country-specific override — falls back to service default if none set
    import('@/lib/axios/axiosInstance').then(({ default: axiosInstance }) => {
      axiosInstance.get(`/geo-pricing/price/${id}`)
        .then((r) => {
          const price = r.data?.data?.basePrice || r.data?.basePrice;
          if (price && price > 0) setGeoPrice(price);
        })
        .catch(() => {}); // silently fall back to service default
    });
  }, [serviceId, selectedServiceProp?._id, selectedServiceRedux?._id]);

  // Priority: geo override > service.hourlyRate > service.pricing.hourly > safe fallback
  const hourlyRate =
    geoPrice ||
    activeService?.hourlyRate ||
    activeService?.pricing?.hourly ||
    1250;

  // If no service data yet, fetch it directly
  useEffect(() => {
    const id = serviceId || selectedServiceProp?._id || selectedServiceRedux?._id;
    if (id && !activeService?.pricing?.hourly && !activeService?.hourlyRate) {
      dispatch(fetchServiceByIdBooking(id));
    }
  }, [serviceId, selectedServiceProp?._id, selectedServiceRedux?._id, activeService?.pricing?.hourly, activeService?.hourlyRate, dispatch]);

  // Format helpers — currency-aware via active region
  const { format: fmtINR } = usePrice();
  const calcPlan = (hours, days = 1) => {
    const subtotal = hourlyRate * hours * days;
    const gst = subtotal * 0.18;
    const total = subtotal + gst;
    return { subtotal, gst, total };
  };
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [selectedDates, setSelectedDates] = useState([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [selectedDays, setSelectedDays] = useState(1);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [instantAvailable, setInstantAvailable] = useState(false);
  const [instantSlot, setInstantSlot] = useState(null);
  const [isPricingLoading, setIsPricingLoading] = useState(false);
  const dateScrollContainerRef = useRef(null);

  // Calculate instant availability based on current time
  useEffect(() => {
    const checkInstantAvailability = () => {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTimeInMinutes = currentHours * 60 + currentMinutes;

      // Convert times to minutes for easier comparison
      const afternoonCutoff = 14 * 60; // 14:00 (2 PM) - disable after this
      const morningStart = 9 * 60; // 09:00

      // If current time > 14:00 (2 PM) → instant not available
      if (currentTimeInMinutes > afternoonCutoff) {
        setInstantAvailable(false);
        setInstantSlot(null);
        console.log("⏰ Instant booking not available (after 2:00 PM)");
      }
      // If current time <= 09:00 → assign slot 09:00–13:00
      else if (currentTimeInMinutes <= morningStart) {
        setInstantAvailable(true);
        setInstantSlot({
          startTime: "09:00",
          endTime: "13:00",
          label: "9:00 AM – 1:00 PM",
        });
        console.log(
          "⚡ Instant booking available: Morning slot (9:00 AM – 1:00 PM)",
        );
      }
      // If current time > 09:00 and <= 14:00 → assign slot 14:00–18:00
      else {
        setInstantAvailable(true);
        setInstantSlot({
          startTime: "14:00",
          endTime: "18:00",
          label: "2:00 PM – 6:00 PM",
        });
        console.log(
          "⚡ Instant booking available: Afternoon slot (2:00 PM – 6:00 PM)",
        );
      }
    };

    checkInstantAvailability();

    // Recheck every minute in case time crosses a boundary
    const interval = setInterval(checkInstantAvailability, 60000);

    return () => clearInterval(interval);
  }, []);

  // Clear instant selection if it becomes unavailable
  useEffect(() => {
    if (!instantAvailable && selectedAssignment === "instant") {
      console.warn(
        "⚠️ Instant booking no longer available, clearing selection",
      );
      setSelectedAssignment(null);
    }
  }, [instantAvailable, selectedAssignment]);

  // Process API availability data to get first 15 dates
  // For guests (no auth), generate next 15 weekdays as fallback
  const getAvailableDates = () => {
    if (!hoursAvailability?.data?.availability) {
      // Guest fallback: generate next 15 weekdays
      const dates = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let current = new Date(today);
      current.setDate(current.getDate() + 1); // start from tomorrow
      while (dates.length < 15) {
        const day = current.getDay();
        if (day !== 0 && day !== 6) { // skip weekends
          const isToday = current.getTime() === today.getTime();
          dates.push({
            date: new Date(current),
            dayLabel: current.toLocaleDateString(localeBcp, { weekday: "short" }),
            dateNumber: current.getDate(),
            isDisabled: false,
            isToday,
            availabilityData: {
              timeSlots: [
                { startTime: "09:00", endTime: "13:00", isBooked: false },
                { startTime: "14:00", endTime: "18:00", isBooked: false },
              ],
            },
          });
        }
        current.setDate(current.getDate() + 1);
      }
      return dates;
    }

    const availabilityData = hoursAvailability.data.availability;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Take only first 15 dates from API response
    const first15Dates = availabilityData.slice(0, 15);

    return first15Dates.map((apiDate, index) => {
      const date = new Date(apiDate.date);
      date.setHours(0, 0, 0, 0);

      const isToday = date.getTime() === today.getTime();

      return {
        date: date,
        dayLabel: date.toLocaleDateString(localeBcp, { weekday: "short" }),
        dateNumber: date.getDate(),
        // Disable if: not available OR marked as off OR is weekend
        isDisabled: !apiDate.isAvailable || apiDate.isOff || apiDate.isWeekend,
        isToday: isToday,
        availabilityData: apiDate, // Store full API data for reference
      };
    });
  };

  // Memoize allDates to prevent infinite loop in useEffect dependencies.
  // Includes localeBcp so weekday labels (Mon/Mo./月) re-render on locale switch.
  const allDates = useMemo(() => getAvailableDates(), [hoursAvailability, localeBcp]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check scroll position to enable/disable arrows
  const checkScrollPosition = () => {
    if (dateScrollContainerRef.current) {
      const container = dateScrollContainerRef.current;
      const scrollLeft = container.scrollLeft;
      const maxScroll = container.scrollWidth - container.clientWidth;

      // If maxScroll is very small (< 5px), there's nothing to scroll
      if (maxScroll < 5) {
        setCanScrollLeft(false);
        setCanScrollRight(false);
      } else {
        setCanScrollLeft(scrollLeft > 5); // 5px threshold to avoid floating point issues
        setCanScrollRight(scrollLeft < maxScroll - 5);
      }
    }
  };

  // Update scroll position on mount and when container changes
  useEffect(() => {
    const container = dateScrollContainerRef.current;
    if (container) {
      // Check immediately
      checkScrollPosition();

      // Also check after a brief delay to ensure container is fully rendered
      const timeoutId = setTimeout(checkScrollPosition, 100);

      container.addEventListener("scroll", checkScrollPosition);

      return () => {
        clearTimeout(timeoutId);
        container.removeEventListener("scroll", checkScrollPosition);
      };
    }
  }, [selectedAssignment]); // Re-run when date picker is shown

  // Helper function to convert 24-hour time to 12-hour format
  const formatTimeTo12Hour = (time24) => {
    const [hours, minutes] = time24.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const formatLocalSelectedDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}T00:00:00.000`;
  };

  // Get dynamic time slots based on selected date
  const getTimeSlotsForSelectedDate = () => {
    if (selectedDates.length === 0) return [];

    // Use the first selected date for time slots
    const selectedDate = selectedDates[0];
    
    // Find the selected date in the allDates array
    const selectedDateObj = allDates.find(
      (dateObj) => dateObj.date.getTime() === selectedDate.getTime(),
    );

    if (!selectedDateObj?.availabilityData?.timeSlots) return [];

    const apiTimeSlots = selectedDateObj.availabilityData.timeSlots;

    // Check if selected date is today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDateOnly = new Date(selectedDate);
    selectedDateOnly.setHours(0, 0, 0, 0);
    const isToday = selectedDateOnly.getTime() === today.getTime();

    // Get current time for comparison
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();

    // Filter and format time slots - exclude booked ones and passed times for today
    const formattedSlots = apiTimeSlots
      .filter((slot) => !slot.isBooked) // Only show available slots
      .map((slot, index) => {
        // Check if this time slot has passed (only for today)
        let isPassed = false;
        if (isToday && slot.startTime) {
          const [slotHours, slotMinutes] = slot.startTime
            .split(":")
            .map(Number);
          // Compare current time with slot start time
          if (
            currentHours > slotHours ||
            (currentHours === slotHours && currentMinutes > slotMinutes)
          ) {
            isPassed = true;
          }
        }

        return {
          id: `slot-${index}-${slot.startTime}-${slot.endTime}`,
          startTime: slot.startTime,
          endTime: slot.endTime,
          start: formatTimeTo12Hour(slot.startTime),
          end: formatTimeTo12Hour(slot.endTime),
          label: `${formatTimeTo12Hour(slot.startTime)} – ${formatTimeTo12Hour(slot.endTime)}`,
          isBooked: slot.isBooked,
          bookingId: slot.bookingId,
          isPassed: isPassed, // Mark if time has passed
        };
      });

    // Log passed slots for debugging
    if (isToday) {
      const passedSlots = formattedSlots.filter((s) => s.isPassed);
      if (passedSlots.length > 0) {
        console.log(
          `⏰ ${passedSlots.length} time slot(s) disabled (already passed):`,
          passedSlots.map((s) => s.label).join(", "),
        );
      }
    }

    return formattedSlots;
  };

  const timeSlots = getTimeSlotsForSelectedDate();

  // For guests: auto-select default plan, assignment, and date on first load
  useEffect(() => {
    if (!isAuthenticated && !selectedPlan && allDates?.length > 0) {
      console.log("🎯 Auto-selecting defaults for guest user");
      setSelectedPlan("plan-4"); // Default to 4-hour plan
      setSelectedAssignment("schedule"); // Default to scheduled booking
      setSelectedDates([allDates[0].date]); // Select first available date
      setSelectedTimeSlot(allDates[0].availabilityData?.timeSlots?.[0] ? 
        `slot-${allDates[0].dateNumber}-0` : null);
    }
  }, [isAuthenticated, selectedPlan]); // Only depend on auth state, not allDates (recalculated each render)

  // Helper function to check if a date has non-passed available slots
  const hasAvailableSlots = (dateObj) => {
    if (dateObj.isDisabled) return false;
    
    const timeSlots = dateObj.availabilityData?.timeSlots || [];
    const availableSlots = timeSlots.filter((slot) => !slot.isBooked);
    
    if (availableSlots.length === 0) return false;
    
    // Check if this date is today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateObjDate = new Date(dateObj.date);
    dateObjDate.setHours(0, 0, 0, 0);
    const isToday = dateObjDate.getTime() === today.getTime();
    
    // If it's today, check if there are non-passed slots
    if (isToday) {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      
      const hasNonPassedSlot = availableSlots.some((slot) => {
        if (!slot.startTime) return false;
        const [slotHours, slotMinutes] = slot.startTime.split(":").map(Number);
        return currentHours < slotHours || (currentHours === slotHours && currentMinutes <= slotMinutes);
      });
      
      return hasNonPassedSlot;
    }
    
    return true;
  };

  // Call API with duration=9 by default on component mount (only for authenticated users)
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchHoursAvailability(9));
    }
  }, [dispatch, isAuthenticated]);

  const handleSelectPlan = (planId) => {
    setSelectedPlan(planId);
    setSelectedAssignment(null);
    setSelectedDates([]);
    setSelectedTimeSlot(null);
    // Reset selectedDays to 1 when switching plans
    setSelectedDays(1);

    // Extract hours from plan ID and call API (only for authenticated users)
    if (isAuthenticated) {
      let hours = 8;
      if (planId === "plan-4") hours = 4;
      else if (planId === "plan-8") hours = 8;
      else if (planId === "plan-custom") hours = 8;
      dispatch(fetchHoursAvailability(hours));
    }
  };

  const handleSelectAssignment = (assignmentType) => {
    setSelectedAssignment(assignmentType);
    setSelectedDates([]);
    setSelectedTimeSlot(null);
  };

  useEffect(() => {
    if (selectedDates.length === 0 || selectedTimeSlot) return;

    // 8-hour and custom plans consume the full day (both fixed slots,
    // 9 AM – 6 PM). No picker is shown; auto-select a virtual full-day slot
    // so downstream pricing/job submit works.
    if (selectedPlan === "plan-8" || selectedPlan === "plan-custom") {
      const fullDayId = "slot-fullday-09:00-18:00";
      console.log(
        `✅ Auto-selecting full-day slot (9 AM – 6 PM) for ${selectedPlan}`,
      );
      setSelectedTimeSlot(fullDayId);
      return;
    }

    // 4-hour plan: pick the first non-passed slot from the API list.
    if (timeSlots.length > 0) {
      const firstAvailableSlot = timeSlots.find((slot) => !slot.isPassed);
      if (firstAvailableSlot) {
        console.log(
          "✅ Auto-selecting first available slot:",
          firstAvailableSlot.label,
        );
        setSelectedTimeSlot(firstAvailableSlot.id);
      }
    }
  }, [selectedDates, timeSlots, selectedPlan, selectedTimeSlot]);

  useEffect(() => {
    if (
      selectedAssignment === "schedule" &&
      allDates.length > 0 &&
      selectedDates.length === 0
    ) {
      // Find first non-disabled date with available time slots
      const firstAvailableDate = allDates.find(hasAvailableSlots);

      if (firstAvailableDate) {
        console.log(
          "✅ Auto-selecting first available date with time slots:",
          firstAvailableDate.dateNumber,
        );
        
        // Auto-select subsequent dates based on selectedDays qty
        if (selectedDays === 1) {
          setSelectedDates([firstAvailableDate.date]);
        } else {
          const firstDateIndex = allDates.findIndex(
            (d) => d.date.getTime() === firstAvailableDate.date.getTime()
          );
          
          if (firstDateIndex !== -1) {
            const newSelectedDates = [firstAvailableDate.date];
            let datesSelected = 1;
            
            // Select subsequent active dates with available time slots
            for (let i = firstDateIndex + 1; i < allDates.length && datesSelected < selectedDays; i++) {
              if (hasAvailableSlots(allDates[i])) {
                newSelectedDates.push(allDates[i].date);
                datesSelected++;
              }
            }
            
            setSelectedDates(newSelectedDates);
          }
        }
        setSelectedTimeSlot(null); // Reset time slot, it will auto-select next
      } else {
        console.warn("⚠️ No dates with available time slots found");
      }
    }
  }, [selectedAssignment, allDates, selectedDays]);

  // Adjust selected dates when quantity changes
  useEffect(() => {
    if (selectedDates.length > 0) {
      if (selectedDates.length > selectedDays) {
        // If selected dates exceed the new quantity, truncate the array
        setSelectedDates((prev) => prev.slice(0, selectedDays));
        console.log(`🔄 Truncated selected dates to ${selectedDays} days`);
      } else if (selectedDates.length < selectedDays) {
        // If selected dates are less than the new quantity, try to auto-select more
        const lastSelectedDate = selectedDates[selectedDates.length - 1];
        const lastSelectedDateIndex = allDates.findIndex(
          (d) => d.date.getTime() === lastSelectedDate.getTime()
        );
        
        if (lastSelectedDateIndex !== -1) {
          const newSelectedDates = [...selectedDates];
          let datesSelected = selectedDates.length;
          
          // Select subsequent active dates
          for (let i = lastSelectedDateIndex + 1; i < allDates.length && datesSelected < selectedDays; i++) {
            if (hasAvailableSlots(allDates[i])) {
              newSelectedDates.push(allDates[i].date);
              datesSelected++;
            }
          }
          
          setSelectedDates(newSelectedDates);
          console.log(`🔄 Auto-selected additional dates to match ${selectedDays} days`);
        }
      }
    }
  }, [selectedDays]);

  // Check if selected dates have available time slots, if not, select next available date
  useEffect(() => {
    if (selectedDates.length > 0 && selectedAssignment === "schedule") {
      const firstSelectedDate = selectedDates[0];
      const firstSelectedDateObj = allDates.find(
        (d) => d.date.getTime() === firstSelectedDate.getTime()
      );
      
      if (firstSelectedDateObj && !hasAvailableSlots(firstSelectedDateObj)) {
        console.warn("⚠️ Selected date has no available time slots, selecting next available date");
        
        // Find next date with available time slots
        const currentIndex = allDates.findIndex(
          (d) => d.date.getTime() === firstSelectedDate.getTime()
        );
        
        if (currentIndex !== -1) {
          for (let i = currentIndex + 1; i < allDates.length; i++) {
            if (hasAvailableSlots(allDates[i])) {
              // Select this date and subsequent dates based on quantity
              if (selectedDays === 1) {
                setSelectedDates([allDates[i].date]);
              } else {
                const newSelectedDates = [allDates[i].date];
                let datesSelected = 1;
                
                for (let j = i + 1; j < allDates.length && datesSelected < selectedDays; j++) {
                  if (hasAvailableSlots(allDates[j])) {
                    newSelectedDates.push(allDates[j].date);
                    datesSelected++;
                  }
                }
                
                setSelectedDates(newSelectedDates);
              }
              
              console.log(`✅ Auto-selected next available date: ${allDates[i].dateNumber}`);
              setSelectedTimeSlot(null);
              break;
            }
          }
        }
      }
    }
  }, [selectedDates, selectedAssignment, allDates, selectedDays]);

  const handleSelectDate = (dateObj) => {
    if (!dateObj.isDisabled) {
      // Check if the date has available slots
      if (!hasAvailableSlots(dateObj)) {
        console.warn("⚠️ Selected date has no available time slots");
        return;
      }
      
      // When qty is 1, only select the clicked date
      if (selectedDays === 1) {
        setSelectedDates([dateObj.date]);
      } else {
        // When qty is 2, 3, or 4, auto-select subsequent active dates
        const selectedDateIndex = allDates.findIndex(
          (d) => d.date.getTime() === dateObj.date.getTime()
        );
        
        if (selectedDateIndex !== -1) {
          const newSelectedDates = [dateObj.date];
          let datesSelected = 1;
          
          // Select subsequent active dates
          for (let i = selectedDateIndex + 1; i < allDates.length && datesSelected < selectedDays; i++) {
            if (hasAvailableSlots(allDates[i])) {
              newSelectedDates.push(allDates[i].date);
              datesSelected++;
            }
          }
          
          setSelectedDates(newSelectedDates);
        }
      }
      setSelectedTimeSlot(null);
    }
  };

  const handleSelectTimeSlot = (slotId) => {
    setSelectedTimeSlot(slotId);
  };

  // Clear selected time slot if it has passed (for today's date)
  useEffect(() => {
    if (selectedTimeSlot && selectedDates.length > 0) {
      const selectedSlot = timeSlots.find(
        (slot) => slot.id === selectedTimeSlot,
      );

      // If the selected slot has passed, clear the selection
      if (selectedSlot?.isPassed) {
        console.warn("⚠️ Selected time slot has passed, clearing selection");
        setSelectedTimeSlot(null);
      }
    }
  }, [selectedTimeSlot, timeSlots, selectedDates]);

  // Update context whenever selection changes
  useEffect(() => {
    console.log("🔄 Checking selections:", {
      selectedPlan,
      selectedAssignment,
      selectedDates: selectedDates.map((d) => d.toISOString()),
      selectedTimeSlot,
    });

    // For instant booking, only need plan and assignment
    if (selectedPlan && selectedAssignment === "instant" && instantSlot) {
      console.log(
        "⚡ Instant booking selected - Continue button should be enabled",
      );
      console.log("⚡ Assigned insta nt slot:", instantSlot);
      setHoursBookingData({
        selectedPlan,
        selectedAssignment: "instant",
        selectedDates: [],
        selectedTimeSlot: null,
        selectedSlotDetails: {
          startTime: instantSlot.startTime,
          endTime: instantSlot.endTime,
          start: instantSlot.label.split(" – ")[0],
          end: instantSlot.label.split(" – ")[1],
          label: instantSlot.label,
        },
      });
      return;
    }

    // For schedule booking, need all fields including date and time
    // Works for both API data (authenticated) and fallback dates (guests)
    const hasAvailabilityData = hoursAvailability?.data?.availability || allDates.length > 0;
    
    if (
      selectedPlan &&
      selectedAssignment === "schedule" &&
      selectedDates.length > 0 &&
      selectedTimeSlot &&
      hasAvailabilityData
    ) {
      // Helper function to convert 24-hour time to 12-hour format
      const formatTimeTo12Hour = (time24) => {
        const [hours, minutes] = time24.split(":");
        const hour = parseInt(hours, 10);
        const ampm = hour >= 12 ? "PM" : "AM";
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
      };

      // For guests: use allDates fallback; for authenticated: use API data
      const selectedDate = selectedDates[0];
      let selectedDateObj;
      
      if (hoursAvailability?.data?.availability) {
        // API data path (authenticated users)
        const availabilityData = hoursAvailability.data.availability;
        selectedDateObj = availabilityData.find((apiDate) => {
          const apiDateObj = new Date(apiDate.date);
          apiDateObj.setHours(0, 0, 0, 0);
          const selectedDateCopy = new Date(selectedDate);
          selectedDateCopy.setHours(0, 0, 0, 0);
          return apiDateObj.getTime() === selectedDateCopy.getTime();
        });
      } else {
        // Fallback path (guests) - find in allDates
        const allDatesObj = allDates.find((d) => {
          const dCopy = new Date(d.date);
          dCopy.setHours(0, 0, 0, 0);
          const selectedDateCopy = new Date(selectedDate);
          selectedDateCopy.setHours(0, 0, 0, 0);
          return dCopy.getTime() === selectedDateCopy.getTime();
        });
        
        if (allDatesObj) {
          selectedDateObj = {
            date: allDatesObj.date,
            timeSlots: allDatesObj.availabilityData?.timeSlots || [],
          };
        }
      }

      if (!selectedDateObj?.timeSlots) {
        console.warn("⚠️ No time slots found for selected date");
        setHoursBookingData(null);
        return;
      }

      const apiTimeSlots = selectedDateObj.timeSlots;
      const currentTimeSlots = apiTimeSlots
        .filter((slot) => !slot.isBooked)
        .map((slot, index) => ({
          id: `slot-${index}-${slot.startTime}-${slot.endTime}`,
          startTime: slot.startTime,
          endTime: slot.endTime,
          start: formatTimeTo12Hour(slot.startTime),
          end: formatTimeTo12Hour(slot.endTime),
          label: `${formatTimeTo12Hour(slot.startTime)} – ${formatTimeTo12Hour(slot.endTime)}`,
          isBooked: slot.isBooked,
          bookingId: slot.bookingId,
        }));

      // For 8-hour and custom plans the user does not pick a slot — both
      // fixed slots (9 AM – 6 PM) are consumed automatically. A virtual
      // "fullday" slot id is set; synthesize its details directly.
      let selectedSlotDetails;
      if (selectedTimeSlot === "slot-fullday-09:00-18:00") {
        selectedSlotDetails = {
          id: "slot-fullday-09:00-18:00",
          startTime: "09:00",
          endTime: "18:00",
          start: "9:00 AM",
          end: "6:00 PM",
          label: "9:00 AM – 6:00 PM",
          isFullDay: true,
        };
      } else {
        selectedSlotDetails = currentTimeSlots.find(
          (slot) => slot.id === selectedTimeSlot,
        );
      }

      console.log("🔍 Selected slot details:", selectedSlotDetails);
      console.log(
        "📋 Available slots:",
        currentTimeSlots.map((s) => s.id),
      );

      if (selectedSlotDetails) {
        console.log(
          "✅ Setting hoursBookingData - Continue button should be enabled",
        );
        setHoursBookingData({
          selectedPlan,
          selectedAssignment,
          selectedDates,
          selectedTimeSlot,
          selectedSlotDetails,
        });
      } else {
        console.warn("⚠️ Selected slot not found in timeSlots array!");
        setHoursBookingData(null);
      }
    } else {
      console.log("❌ Not all selections made yet");
      setHoursBookingData(null);
    }
  }, [
    selectedPlan,
    selectedAssignment,
    selectedDates,
    selectedTimeSlot,
    hoursAvailability,
    setHoursBookingData,
    instantSlot,
  ]);

  const handleNavigateDates = (direction) => {
    if (dateScrollContainerRef.current) {
      const container = dateScrollContainerRef.current;
      const scrollAmount = container.clientWidth * 0.8; // Scroll 80% of container width

      if (direction === "back") {
        container.scrollBy({ left: -scrollAmount, behavior: "smooth" });
      } else if (direction === "forward") {
        container.scrollBy({ left: scrollAmount, behavior: "smooth" });
      }
    }
  };

  const handleContinue = () => {
    if (selectedDates.length === 0 || !selectedTimeSlot) {
      console.warn("⚠️ Please select both date and time slot");
      return;
    }

    // Find the selected time slot details
    const selectedSlotDetails = timeSlots.find(
      (slot) => slot.id === selectedTimeSlot,
    );

    if (!selectedSlotDetails) {
      console.error("❌ Selected time slot not found");
      return;
    }

    // Get tech IDs from localStorage (from previous step)
    const storedTechIds = localStorage.getItem("_selected_tech_ids");
    const techIds = storedTechIds ? JSON.parse(storedTechIds) : [];

    // Prepare the booking data (use first selected date)
    const bookingData = {
      _selected_date: selectedDates[0].toISOString(),
      _selected_tech_ids: techIds,
      _selected_time_slot: JSON.stringify({
        startTime: selectedSlotDetails.startTime,
        endTime: selectedSlotDetails.endTime,
      }),
      _selected_plan: selectedPlan,
      _selected_assignment_type: selectedAssignment,
    };

    // Save to localStorage
    localStorage.setItem("_selected_date", bookingData._selected_date);
    localStorage.setItem(
      "_selected_time_slot",
      bookingData._selected_time_slot,
    );
    localStorage.setItem("_selected_plan", selectedPlan);
    localStorage.setItem("_selected_assignment_type", selectedAssignment);

    console.log("💾 Booking Data Saved:", bookingData);
    console.log("📅 Dates:", selectedDates.map((d) => d.toLocaleDateString()).join(", "));
    console.log(
      "⏰ Time:",
      `${selectedSlotDetails.start} - ${selectedSlotDetails.end}`,
    );

    // TODO: Dispatch to Redux or call parent callback
    // dispatch(saveBookingData(bookingData));
    // OR
    // props.onContinue?.(bookingData);

    // Move to the next step
    nextStep();
  };

  // Build pricing plans dynamically from the service's hourly rate.
  const plan4 = calcPlan(4);
  const plan8 = calcPlan(8);
  // Custom plan price updates live as user changes days qty
  const planCustom = calcPlan(8, selectedDays);
  const mrpRate = Math.round(hourlyRate * 1.2); // ~20% strikethrough MRP

  // Locale-aware "<rate>/hour" suffix used on every plan card.
  const perHourLabel = (rate) => t('perHour', { price: fmtINR(rate) });

  const pricingPlans = [
    {
      id: "plan-4",
      hours: t('hoursCount', { hours: 4 }),
      price: fmtINR(plan4.total),
      pricePerHour: perHourLabel(hourlyRate),
      originalPrice: perHourLabel(mrpRate),
    },
    {
      id: "plan-8",
      hours: t('hoursCount', { hours: 8 }),
      price: fmtINR(plan8.total),
      pricePerHour: perHourLabel(hourlyRate),
      originalPrice: perHourLabel(mrpRate),
    },
    {
      id: "plan-custom",
      hours: selectedDays > 1 ? t('daysWithHours', { days: selectedDays, hours: 8 * selectedDays }) : t('customDuration'),
      price: fmtINR(planCustom.total),
      pricePerHour: perHourLabel(hourlyRate),
      originalPrice: perHourLabel(mrpRate),
      popular: true,
      hasInfo: true,
      showDaySelector: true,
    },
  ];

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

        paddingLeft: { xs: 0, sm: 0, md: 3 },
      }}
    >
      {/* Header */}
      <Typography
        sx={{
          fontSize: {
            xs: "20px",
            sm: "22px",
            md: "var(--font-size-24)",
            lg: "var(--font-size-24)",
          },
          fontWeight: 700,
          color: "var(--text-primary)",
          mb: { xs: 1.5, sm: 2 },
        }}
      >
        {t('title')}
      </Typography>

      {/* Subheading */}
      <Typography
        sx={{
          fontSize: { xs: "13px", sm: "14px", md: "var(--font-size-14)" },
          fontWeight: "var(--font-weight-500)",
          color: "var( --text-muted)",
          mb: { xs: 3, sm: 3.5, md: 3 },
        }}
      >
        {t('subtitle')}
      </Typography>

      {/* Pricing Cards Grid */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)",
          },
          gap: { xs: 2.5, sm: 2.5, md: 3 },
          mb: { xs: 2.5, sm: 3 },
        }}
      >
        {pricingPlans.map((plan) => (
          <Card
            key={plan.id}
            onClick={(e) => {
              // Prevent card click if clicking on interactive elements
              if (e.target.closest('[data-interactive="true"]')) {
                return;
              }
              handleSelectPlan(plan.id);
            }}
            sx={{
              position: "relative",
              cursor: "pointer",
              border:
                selectedPlan === plan.id
                  ? "2px solid #45A735"
                  : "1px solid #E5E7EB",
              borderRadius: { xs: "12px", sm: "14px", md: "16px" },
              backgroundColor: selectedPlan === plan.id ? "#45A735" : "#FFFFFF",
              boxShadow:
                selectedPlan === plan.id
                  ? "0 4px 12px rgba(69, 167, 53, 0.2)"
                  : "0 1px 3px rgba(0, 0, 0, 0.1)",
              transition: "all 0.3s ease",
              overflow: "hidden",
              //   '&:hover': {
              //     borderColor: '#45A735',
              //     boxShadow: '0 4px 12px rgba(69, 167, 53, 0.15)',
              //   },
            }}
          >
            {/* Popular Badge */}
            {plan.popular && (
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  backgroundColor:
                    selectedPlan === plan.id ? "#FFFFFF" : "#FCC95B",
                  color: selectedPlan === plan.id ? "#000000" : "#1F2937",
                  fontSize: { xs: "13px", sm: "14px", md: "15px" },
                  fontWeight: 600,
                  padding: { xs: "8px 20px", sm: "10px 24px", md: "12px 28px" },
                  borderBottomLeftRadius: {
                    xs: "16px",
                    sm: "18px",
                    md: "20px",
                  },
                  borderTopRightRadius: { xs: "12px", sm: "14px", md: "16px" },
                }}
              >
                {t('popular')}
              </Box>
            )}

            <CardContent sx={{ p: { xs: 2.5, sm: 2.5, md: 2 } }}>
              {/* Clock Icon */}
              <AccessTimeIcon
                sx={{
                  fontSize: { xs: 24, sm: 24, md: 24 },
                  color: selectedPlan === plan.id ? "#FFFFFF" : "#6B7280",
                  mb: { xs: 1 },
                }}
              />

              {/* Plan Name - Hidden when custom duration is selected */}
              {!(plan.id === "plan-custom" && selectedPlan === plan.id) && (
                <Typography
                  sx={{
                    fontSize: {
                      xs: "16px",
                      sm: "var(--font-size-18)",
                      md: "var(--font-size-18)",
                    },
                    fontWeight: "var(--font-weight-600)",
                    color:
                      selectedPlan === plan.id
                        ? "#FFFFFF"
                        : "var(--dark-text-primary)",
                    mb: { xs: 1 },
                  }}
                >
                  {plan.hours}
                </Typography>
              )}

              {/* Price */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "baseline",
                  mb: 1,
                  gap: 0.5,
                }}
              >
                <Typography
                  sx={{
                    fontSize: {
                      xs: "22px",
                      sm: "22px",
                      md: "var(--font-size-24)",
                    },
                    fontWeight: "var(--font-weight-600)",
                    color:
                      selectedPlan === plan.id
                        ? "#FFFFFF"
                        : "var( --dark-text-primary)",
                  }}
                >
                  {plan.price}
                </Typography>
                {plan.hasInfo && (
                  <Tooltip
                    title={
                      <Box sx={{ p: 0.5 }}>
                        <Typography sx={{ fontSize: "13px", mb: 0.5 }}>
                          Hourly rate: {fmtINR(hourlyRate)} / hour
                        </Typography>
                        <Typography sx={{ fontSize: "13px", mb: 0.5 }}>
                          Full day = 8 hours × {selectedDays} day{selectedDays > 1 ? "s" : ""}
                        </Typography>
                        <Typography sx={{ fontSize: "13px" }}>
                          Total: {fmtINR(planCustom.subtotal)} + GST = {fmtINR(planCustom.total)}
                        </Typography>
                      </Box>
                    }
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
                          padding: "10px 16px", // Added more horizontal padding (left/right)
                          margin: "0 16px", // Added left/right margin

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
                        fontSize: { xs: 18, sm: 20 },
                        color: selectedPlan === plan.id ? "#FFFFFF" : "#9CA3AF",
                        cursor: "pointer",
                      }}
                    />
                  </Tooltip>
                )}
              </Box>

              {/* Price Details */}
              <Box
                sx={{
                  display: "flex",
                  gap: 1,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <Typography
                  sx={{
                    fontSize: { xs: "12px", sm: "13px" },
                    color: selectedPlan === plan.id ? "#FFFFFF" : "#484848",
                    fontWeight: 500,
                    fontStyle: "Italic",
                  }}
                >
                  {plan.pricePerHour}
                </Typography>
                <Typography
                  sx={{
                    fontStyle: "Italic",
                    fontSize: { xs: "12px", sm: "13px" },
                    color:
                      selectedPlan === plan.id
                        ? "rgba(255, 255, 255, 0.7)"
                        : "#9CA3AF",
                    textDecoration: "line-through",
                  }}
                >
                  {plan.originalPrice}
                </Typography>
              </Box>

              {/* Day Selector for Custom Duration */}
              {plan.showDaySelector && selectedPlan === plan.id && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    mt: 2,
                    pt: 2,
                    borderTop: "1px solid rgba(255, 255, 255, 0.3)",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: { xs: "13px", sm: "14px" },
                      fontWeight: 600,
                      color: "#FFFFFF",
                    }}
                  >
                    Qty.
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      backgroundColor: "#FFFFFF",
                      borderRadius: "8px",
                      padding: "4px 8px",
                      gap: 1,
                    }}
                    data-interactive="true"
                  >
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (selectedDays <= 1) {
                          return;
                        }
                        setSelectedDays((prev) => prev - 1);
                      }}
                      disabled={selectedDays <= 1}
                      sx={{
                        color: selectedDays <= 1 ? "#D1D5DB" : "#1F2937",
                        padding: "4px",
                        cursor: selectedDays <= 1 ? "not-allowed" : "pointer",
                        "&:hover": { 
                          backgroundColor: selectedDays <= 1 ? "transparent" : "#F3F4F6" 
                        },
                        "&:disabled": { 
                          color: "#D1D5DB",
                          pointerEvents: "none",
                        },
                      }}
                    >
                      <RemoveIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                    <Typography
                      sx={{
                        fontSize: { xs: "16px", sm: "18px" },
                        fontWeight: 600,
                        color: "#1F2937",
                        minWidth: "32px",
                        textAlign: "center",
                      }}
                    >
                      {selectedDays}
                    </Typography>
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (selectedDays >= 4) {
                          return;
                        }
                        setSelectedDays((prev) => prev + 1);
                      }}
                      disabled={selectedDays >= 4}
                      sx={{
                        color: selectedDays >= 4 ? "#D1D5DB" : "#1F2937",
                        padding: "4px",
                        cursor: selectedDays >= 4 ? "not-allowed" : "pointer",
                        "&:hover": { 
                          backgroundColor: selectedDays >= 4 ? "transparent" : "#F3F4F6" 
                        },
                        "&:disabled": { 
                          color: "#D1D5DB",
                          pointerEvents: "none",
                        },
                      }}
                    >
                      <AddIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Helper Text */}
      <Typography
        sx={{
          fontSize: { xs: "12px", sm: "12px", md: "var(--font-size-12)" },
          color: "var( --text-muted)",
          fontStyle: "normal",
          lineHeight: 1.5,
          fontWeight: "var(--font-weight-400)",
          mb: { xs: 3, md: 2 },
        }}
      >
        {t('extendLaterHelper')}
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

      {/* When Should The Resource Assigned Section - Only show when a plan is selected */}
      {selectedPlan && (
        <Box sx={{ mt: { xs: 4, sm: 5, md: 4 } }}>
          {/* Section Header */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
            <Typography
              sx={{
                fontSize: { xs: "18px", sm: "20px", md: "var(--font-size-24)" },
                fontWeight: "var(--font-weight-700)",
                color: "var(--text-primary)",
              }}
            >
              {t('whenAssigned')}
            </Typography>
            <Tooltip
              title={t('assignmentTooltip')}
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
                    maxWidth: "280px",
                    padding: "10px 16px", // Added more horizontal padding (left/right)
                    margin: "0 16px", // Added left/right margin

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
                  fontSize: 22,
                  color: "#9CA3AF",
                  cursor: "pointer",
                }}
              />
            </Tooltip>
          </Box>

          {/* Options */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,

              mb: { xs: 2, sm: 3, md: 4 },
            }}
          >
            {/* Instant Option - Hidden for Custom Duration */}
            {selectedPlan !== "plan-custom" && (
              <Card
                onClick={() => {
                  if (instantAvailable) {
                    handleSelectAssignment("instant");
                  }
                }}
                sx={{
                  border:
                    selectedAssignment === "instant"
                      ? "2px solid #45A735"
                      : "1px solid #E5E7EB",
                  borderRadius: "16px",
                  cursor: instantAvailable ? "pointer" : "not-allowed",
                  boxShadow: "none",
                  transition: "all 0.3s ease",
                  opacity: instantAvailable ? 1 : 0.6,
                  "&:hover": {
                    borderColor: instantAvailable ? "#45A735" : "#E5E7EB",
                    boxShadow: "none",
                  },
                }}
              >
                <CardContent
                  sx={{
                    p: "12px !important",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 2,
                    pb: "12px !important",

                    alignItems: "center",
                  }}
                >
                  {selectedAssignment === "instant" ? (
                    <RadioButtonCheckedIcon
                      sx={{ color: "#45A735", fontSize: 24, mt: 0.5 }}
                    />
                  ) : (
                    <RadioButtonUncheckedIcon
                      sx={{
                        color: instantAvailable ? "#E5E7EB" : "#D1D5DB",
                        fontSize: 24,
                        mt: 0.5,
                      }}
                    />
                  )}

                  {/* Badge/Icon Container */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      // width: 76,
                      // height: 76,
                      borderRadius: "12px",
                      // backgroundColor: "#F0FDF4",
                      flexShrink: 0,
                    }}
                  >
                    <Image
                      src="/images/book-services/Instant-Badge.svg"
                      alt={t('instantBadge')}
                      width={67}
                      height={30}
                      priority
                      style={{
                        opacity: 1,
                        borderRadius: "3.66px",
                        paddingRight: "0",
                        paddingLeft: "0",
                      }}
                    />
                  </Box>

                  <Box sx={{ flex: 1 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 1,
                        mb: 0.5,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "16px",
                          fontWeight: 600,
                          color: "#1F2937",
                        }}
                      ></Typography>
                      <Typography
                        sx={{
                          fontSize: "17.09px",
                          fontWeight: 600,
                          color: "#0A0A25",
                        }}
                      >
                        {t('in10Min')}
                      </Typography>
                    </Box>
                    <Typography
                      sx={{
                        fontSize: "14px",
                        color: "#6B7280",
                        fontWeight: 400,
                      }}
                    >
                      {instantAvailable
                        ? t('getStartedRightAway')
                        : t('insufficientTime')}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Schedule for Later Option */}
            <Card
              onClick={() => handleSelectAssignment("schedule")}
              sx={{
                border:
                  selectedAssignment === "schedule"
                    ? "2px solid #45A735"
                    : "1px solid #E5E7EB",
                borderRadius: "16px",
                cursor: "pointer",
                boxShadow: "none",
                transition: "all 0.3s ease",
                "&:hover": {
                  borderColor: "#45A735",
                  boxShadow: "none",
                },
              }}
            >
              <CardContent
                sx={{
                  p: "12px !important",

                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                  {selectedAssignment === "schedule" ? (
                    <RadioButtonCheckedIcon
                      sx={{ color: "#45A735", fontSize: 24, mt: 0.5 }}
                    />
                  ) : (
                    <RadioButtonUncheckedIcon
                      sx={{ color: "#D1D5DB", fontSize: 24, mt: 0.5 }}
                    />
                  )}
                  <Box sx={{ flex: 1 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        mb: 0.5,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "16px",
                          fontWeight: 600,
                          color: "#1F2937",
                        }}
                      >
                        {t('scheduleForLater')}
                      </Typography>
                      {/* Info Badge - Show for custom duration */}
                      {selectedPlan === "plan-custom" &&
                        selectedAssignment === "schedule" && (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.75,
                              backgroundColor: "#E7F4E5",
                              // border: "1px solid #45A735",
                              borderRadius: "50px",
                              padding: { xs: "5px 12px", sm: "6px 14px" },
                            }}
                          >
                            <InfoOutlinedIcon
                              sx={{
                                fontSize: { xs: 15, sm: 16 },
                                color: "#45A735",
                              }}
                            />
                            <Typography
                              sx={{
                                fontSize: { xs: "12px", sm: "12px" },
                                fontWeight: 400,
                                color: "#000000",
                                lineHeight: "100%",
                              }}
                            >
                              {t('onlyFourDays')}
                            </Typography>
                          </Box>
                        )}
                    </Box>
                    <Typography
                      sx={{
                        fontSize: "14px",
                        color: "#9CA3AF",
                      }}
                    >
                      {t('preferredDayTime')}
                    </Typography>
                  </Box>
                </Box>

                {/* Date and Time Selector - Show when Schedule for Later is selected */}
                {selectedAssignment === "schedule" && (
                  <Box sx={{ mt: 2 }}>
                    {/* Date Selector */}
                    <Box sx={{ mb: 3 }}>
                      <Box
                        sx={{
                          position: "relative",
                          display: "flex",
                          alignItems: "center",
                          gap: { xs: 0.5, sm: 1 },
                        }}
                      >
                        {/* Left Arrow */}
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavigateDates("back");
                          }}
                          disabled={!canScrollLeft}
                          sx={{
                            width: { xs: 32, sm: 36, md: 40 },
                            height: { xs: 32, sm: 36, md: 40 },
                            backgroundColor: "#45A735",
                            color: "#fff",
                            flexShrink: 0,
                            "&:hover": { backgroundColor: "#3D9330" },
                            "&:disabled": {
                              backgroundColor: "#E5E7EB",
                              color: "#9CA3AF",
                            },
                          }}
                        >
                          <ArrowBackIosNewIcon
                            sx={{ fontSize: { xs: 12, sm: 14, md: 16 } }}
                          />
                        </IconButton>

                        {/* Date Chips - Scrollable */}
                        <Box
                          ref={dateScrollContainerRef}
                          sx={{
                            flex: 1,
                            display: "flex",
                            gap: { xs: 0.75, sm: 1, md: 1.5 },
                            overflowX: "auto",
                            overflowY: "hidden",
                            scrollBehavior: "smooth",
                            scrollSnapType: "x mandatory",
                            WebkitOverflowScrolling: "touch", // Smooth scrolling on iOS
                            // Hide scrollbar
                            "&::-webkit-scrollbar": {
                              display: "none",
                            },
                            msOverflowStyle: "none", // IE and Edge
                            scrollbarWidth: "none", // Firefox
                            px: { xs: 0.5, sm: 1 },
                          }}
                        >
                          {allDates.map((dateObj, index) => {
                            const isSelected = selectedDates.some(
                              (selectedDate) =>
                                selectedDate.getTime() === dateObj.date.getTime()
                            );

                            return (
                              <Box
                                key={index}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectDate(dateObj);
                                }}
                                sx={{
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  gap: { xs: 0.25, sm: 0.5 },
                                  padding: {
                                    xs: "6px 8px",
                                    sm: "8px 10px",
                                    md: "12px 16px",
                                  },
                                  minWidth: {
                                    xs: "50px",
                                    sm: "60px",
                                    md: "80px",
                                  },
                                  flexShrink: 0, // Prevent shrinking in scroll container
                                  maxWidth: {
                                    xs: "70px",
                                    sm: "80px",
                                    md: "100px",
                                  },
                                  borderRadius: {
                                    xs: "6px",
                                    sm: "7px",
                                    md: "8px",
                                  },
                                  cursor: dateObj.isDisabled
                                    ? "not-allowed"
                                    : "pointer",
                                  backgroundColor: isSelected
                                    ? "#45A73521"
                                    : dateObj.isDisabled
                                      ? "#E5E7EB"
                                      : "#F3F4F6",
                                  opacity: dateObj.isDisabled ? 0.5 : 1,
                                  transition: "all 0.2s ease",
                                  border: isSelected
                                    ? "2px solid #45A735"
                                    : dateObj.isToday && !isSelected
                                      ? "1px solid #45A735"
                                      : "none",
                                  scrollSnapAlign: "start", // Snap to dates when scrolling
                                  "&:hover": {
                                    backgroundColor: dateObj.isDisabled
                                      ? "#E5E7EB"
                                      : isSelected
                                        ? "#45A73521"
                                        : "#E5E7EB",
                                  },
                                }}
                              >
                                <Typography
                                  sx={{
                                    fontSize: {
                                      xs: "9px",
                                      sm: "10px",
                                      md: "13px",
                                    },
                                    fontWeight: 500,
                                    color: isSelected
                                      ? "#45A735"
                                      : dateObj.isToday
                                        ? "#45A735"
                                        : "#6B7280",
                                    lineHeight: 1,
                                  }}
                                >
                                  {dateObj.isToday ? t('today') : dateObj.dayLabel}
                                </Typography>
                                <Typography
                                  sx={{
                                    fontSize: {
                                      xs: "16px",
                                      sm: "18px",
                                      md: "22px",
                                    },
                                    fontWeight: 700,
                                    color: isSelected
                                      ? "#45A735"
                                      : dateObj.isToday
                                        ? "#45A735"
                                        : "#1F2937",
                                    lineHeight: 1,
                                  }}
                                >
                                  {dateObj.dateNumber}
                                </Typography>
                              </Box>
                            );
                          })}
                        </Box>

                        {/* Right Arrow */}
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavigateDates("forward");
                          }}
                          disabled={!canScrollRight}
                          sx={{
                            width: { xs: 32, sm: 36, md: 40 },
                            height: { xs: 32, sm: 36, md: 40 },
                            backgroundColor: "#45A735",
                            color: "#fff",
                            flexShrink: 0,
                            "&:hover": { backgroundColor: "#3D9330" },
                          }}
                        >
                          <ArrowForwardIosIcon
                            sx={{ fontSize: { xs: 12, sm: 14, md: 16 } }}
                          />
                        </IconButton>
                      </Box>
                    </Box>

                    {/* Time Selection — only the 4-hour plan asks the user
                        to pick a slot. 8-hour and custom plans consume the
                        full day (both fixed slots: 9 AM–6 PM), so the picker
                        is hidden and a virtual full-day slot is auto-selected
                        in the effect above. */}
                    {selectedDates.length > 0 && selectedPlan === "plan-4" && (
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: { xs: "column", sm: "row" },
                          alignItems: { xs: "flex-start", sm: "center" },
                          gap: { xs: 2, sm: 2, md: 3 },
                          flexWrap: "wrap",
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: { xs: "13px", sm: "14px" },
                            fontWeight: 500,
                            color: "#6B7280",
                            flexShrink: 0,
                          }}
                        >
                          {t('selectTime')}
                        </Typography>

                        {/* Time Slots - Responsive Layout */}
                        <Box
                          sx={{
                            display: "flex",
                            gap: { xs: 2, sm: 2.5, md: 3 },
                            flexWrap: "wrap",
                            width: { xs: "100%", sm: "auto" },
                          }}
                        >
                          {timeSlots.map((slot) => (
                            <Box
                              key={slot.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                // Prevent selecting passed time slots
                                if (!slot.isPassed) {
                                  handleSelectTimeSlot(slot.id);
                                }
                              }}
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: { xs: 0.75, sm: 1 },
                                cursor: slot.isPassed
                                  ? "not-allowed"
                                  : "pointer",
                                flex: { xs: "1 1 auto", sm: "0 0 auto" },
                                minWidth: 0,
                                opacity: slot.isPassed ? 0.5 : 1,
                              }}
                            >
                              {selectedTimeSlot === slot.id ? (
                                <RadioButtonCheckedIcon
                                  sx={{
                                    color: "#45A735",
                                    fontSize: { xs: 20, sm: 22 },
                                    flexShrink: 0,
                                  }}
                                />
                              ) : (
                                <RadioButtonUncheckedIcon
                                  sx={{
                                    color: slot.isPassed
                                      ? "#E5E7EB"
                                      : "#D1D5DB",
                                    fontSize: { xs: 20, sm: 22 },
                                    flexShrink: 0,
                                  }}
                                />
                              )}
                              <Typography
                                sx={{
                                  fontSize: { xs: "13px", sm: "14px" },
                                  fontWeight:
                                    selectedTimeSlot === slot.id ? 600 : 400,
                                  color: slot.isPassed ? "#9CA3AF" : "#1F2937",
                                  whiteSpace: { xs: "normal", sm: "nowrap" },
                                  textDecoration: slot.isPassed
                                    ? "line-through"
                                    : "none",
                                }}
                              >
                                {slot.label}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>
      )}

      {/* Spacer - Pushes buttons to bottom */}
      <Box sx={{ flex: 1 }} />

      {/* Back and Continue Buttons - Sticky at Bottom */}
      <Box
        sx={{
          position: "sticky",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "#FFF",

          // padding: { xs: "16px 20px", sm: "20px 24px", md: "24px 32px" },
          paddingTop: { xs: "16px", sm: "20px", md: "24px" },
          paddingBottom: { xs: "16px", sm: "20px", md: "24px" },
          display: "flex",
          justifyContent: "flex-end",
          zIndex: 10,

          paddingRight: { xs: 0, sm: 0, md: 0 },
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
              padding: { xs: "12px 48px", sm: "13px 56px", md: "8px 30px" },
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
            if (!hoursBookingData) return;
            const {
              selectedPlan,
              selectedAssignment,
              selectedDates,
              selectedSlotDetails,
            } = hoursBookingData;
            const storedTechIds = localStorage.getItem("_selected_tech_ids");
            const techIds = storedTechIds ? JSON.parse(storedTechIds) : [];
            const serviceId = localStorage.getItem("_service_id");
            if (!serviceId) {
              showError("Service ID is missing. Please go back and select a service.");
              return;
            }
            // let durationTime = 9;
            // if (selectedPlan === "plan-4") durationTime = 4;
            // else if (selectedPlan === "plan-8") durationTime = 8;
            // // Determine selectedDays based on plan type
            // const numDays = selectedPlan === "plan-custom" ? selectedDays : 1;

            let durationTime = 8;
            if (selectedPlan === "plan-4") durationTime = 4;
            else if (selectedPlan === "plan-8") durationTime = 8;
            else if (selectedPlan === "plan-custom")
              durationTime = 8 * selectedDays;
            // Determine selectedDays based on plan type
            const numDays = selectedPlan === "plan-custom" ? selectedDays : 1;

            let pricingPayload;
            if (selectedAssignment === "instant") {
              const currentDateTime = new Date().toISOString();
              pricingPayload = {
                services: [
                  {
                    serviceId,
                    technologyIds: techIds,
                    selectedDays: numDays,
                    requirements: "Selected from web v3",
                    preferredStartDate: currentDateTime,
                    preferredEndDate: currentDateTime,
                    durationTime,
                    startTime: selectedSlotDetails?.startTime || "",
                    endTime: selectedSlotDetails?.endTime || "",
                    timeSlot: {
                      startTime: selectedSlotDetails?.startTime || "",
                      endTime: selectedSlotDetails?.endTime || "",
                    },
                    bookingType: "instant",
                  },
                ],
              };
            } else {
              const formattedDate = formatLocalSelectedDate(selectedDates[0]);
              pricingPayload = {
                services: [
                  {
                    serviceId,
                    technologyIds: techIds,
                    selectedDays: numDays,
                    requirements: "Selected from web v3",
                    preferredStartDate: formattedDate,
                    preferredEndDate: formattedDate,
                    durationTime,
                    startTime: selectedSlotDetails.startTime,
                    endTime: selectedSlotDetails.endTime,
                    timeSlot: {
                      startTime: selectedSlotDetails.startTime,
                      endTime: selectedSlotDetails.endTime,
                    },
                    bookingType: "later",
                  },
                ],
              };
            }
            try {
              setIsPricingLoading(true);
              // Use Redux isAuthenticated (not just localStorage token)
              // so expired/stale tokens don't trigger authenticated API flows
              if (isAuthenticated) {
                // User is logged in - Fetch customer bookings to get jobId
                console.log(
                  "🔐 User logged in - Fetching customer bookings...",
                );

                try {
                  const bookingsResponse = await dispatch(
                    fetchCustomerBookings("pending"),
                  ).unwrap();

                  console.log("📚 Bookings Response:", bookingsResponse);

                  // Check if bookings exist
                  if (
                    bookingsResponse?.data &&
                    bookingsResponse.data.length > 0
                  ) {
                    const jobId = bookingsResponse.data[0]._id;
                    console.log("🆔 Found Job ID:", jobId);

                    // Push jobId to URL
                    router.push(`?jobId=${jobId}`, { scroll: false });

                    console.log(
                      "📤 Updating job with payload:",
                      pricingPayload,
                    );

                    // UPDATE existing job
                    const resultAction = await dispatch(
                      updateJob({
                        jobId,
                        jobData: pricingPayload,
                      }),
                    );

                    // Refresh dashboard stats after job update
                    dispatch(fetchDashboardStats());

                    if (updateJob.fulfilled.match(resultAction)) {
                      console.log(
                        "✅ Job updated successfully:",
                        resultAction.payload,
                      );

                      // Store data in localStorage
                      if (selectedAssignment === "instant") {
                        localStorage.setItem(
                          "_selected_date",
                          new Date().toISOString(),
                        );
                        localStorage.setItem(
                          "_selected_time_slot",
                          JSON.stringify({
                            startTime: selectedSlotDetails?.startTime || "",
                            endTime: selectedSlotDetails?.endTime || "",
                          }),
                        );
                      } else {
                        localStorage.setItem(
                          "_selected_date",
                          formatLocalSelectedDate(selectedDates[0]),
                        );
                        localStorage.setItem(
                          "_selected_time_slot",
                          JSON.stringify({
                            startTime: selectedSlotDetails.startTime,
                            endTime: selectedSlotDetails.endTime,
                          }),
                        );
                      }
                      localStorage.setItem("_selected_plan", selectedPlan);
                      localStorage.setItem(
                        "_selected_assignment_type",
                        selectedAssignment,
                      );
                      localStorage.setItem(
                        "_duration_time",
                        durationTime.toString(),
                      );
                      localStorage.setItem(
                        "_pricing_data",
                        JSON.stringify(resultAction.payload),
                      );

                      nextStep();
                    } else {
                      showError("Failed to update job. Please try again.");
                    }
                  } else {
                    // NO EXISTING BOOKING - CREATE NEW JOB
                    console.log(
                      "🆕 No existing bookings - Creating new job...",
                    );

                    // Transform pricingPayload to jobPayload format
                    const jobPayload = {
                      services: pricingPayload.services.map((service) => ({
                        serviceId: service.serviceId,
                        technologyIds: service.technologyIds,
                        selectedDays: service.selectedDays,
                        requirements:
                          service.requirements || "Selected from web v3",
                        preferredStartDate: service.preferredStartDate,
                        preferredEndDate: service.preferredEndDate,
                        durationTime: service.durationTime,
                        startTime: service.startTime || "09:00",
                        endTime: service.endTime || "18:00",
                        timeSlot: {
                          startTime: service.timeSlot?.startTime || "09:00",
                          endTime: service.timeSlot?.endTime || "18:00",
                        },
                        bookingType: service.bookingType || "later",
                      })),
                    };

                    console.log("📤 Creating job with payload:", jobPayload);

                    // CREATE new job
                    const createdJobRaw = await dispatch(
                      createJob(jobPayload),
                    ).unwrap();
                    // Backend may return either the unwrapped inner data { job }
                    // or the full envelope { data: { job } }. Normalize.
                    const createdJob = createdJobRaw?.job
                      ? createdJobRaw
                      : createdJobRaw?.data || createdJobRaw;
                    const createdJobId = createdJob?.job?._id || createdJob?._id;
                    console.log("✅ Job created:", createdJob);
                    console.log("✅ Job ID:", createdJobId);
                    dispatch(fetchDashboardStats());
                    // Store the created job ID and push to URL
                    if (createdJobId) {
                      const newJobId = createdJobId;
                      console.log("💾 Stored created jobssssss ID:", newJobId);
                      router.push(`?jobId=${newJobId}`, { scroll: false });

                      // Store data in localStorage
                      if (selectedAssignment === "instant") {
                        localStorage.setItem(
                          "_selected_date",
                          new Date().toISOString(),
                        );
                        localStorage.setItem(
                          "_selected_time_slot",
                          JSON.stringify({
                            startTime: selectedSlotDetails?.startTime || "",
                            endTime: selectedSlotDetails?.endTime || "",
                          }),
                        );
                      } else {
                        localStorage.setItem(
                          "_selected_date",
                          formatLocalSelectedDate(selectedDates[0]),
                        );
                        localStorage.setItem(
                          "_selected_time_slot",
                          JSON.stringify({
                            startTime: selectedSlotDetails.startTime,
                            endTime: selectedSlotDetails.endTime,
                          }),
                        );
                      }
                      localStorage.setItem("_selected_plan", selectedPlan);
                      localStorage.setItem(
                        "_selected_assignment_type",
                        selectedAssignment,
                      );
                      localStorage.setItem(
                        "_duration_time",
                        durationTime.toString(),
                      );
                      localStorage.setItem(
                        "_pricing_data",
                        JSON.stringify(createdJob),
                      );

                      nextStep();
                    } else {
                      showError("Failed to create job. Please try again.");
                    }
                  }
                } catch (bookingError) {
                  console.error(
                    "❌ Error in booking flow:",
                    bookingError,
                  );
                  console.error("❌ Payload that failed:", pricingPayload);
                  console.error(
                    "❌ localStorage._service_id:",
                    typeof window !== "undefined" && localStorage.getItem("_service_id"),
                    "_selected_tech_ids:",
                    typeof window !== "undefined" && localStorage.getItem("_selected_tech_ids"),
                  );
                  const status =
                    bookingError?.response?.status ||
                    bookingError?.status ||
                    bookingError?.payload?.error?.code;
                  const msg =
                    bookingError?.response?.data?.error?.message ||
                    bookingError?.error?.message ||
                    bookingError?.payload?.error?.message ||
                    bookingError?.message ||
                    (typeof bookingError === "string" ? bookingError : null) ||
                    "Failed to process booking. Please try again.";
                  if (status === 401 || /token|unauthor|expired/i.test(String(msg))) {
                    showWarning("Your session has expired. Please log in again.");
                    if (typeof window !== "undefined") {
                      ["token", "user", "userType", "isNewUser"].forEach((k) =>
                        localStorage.removeItem(k),
                      );
                      window.location.replace(
                        `/login?next=${encodeURIComponent(window.location.pathname)}`,
                      );
                    }
                    return;
                  }
                  showError(msg);
                }
              } else {
                // Guest user - compute pricing locally and continue without protected API
                console.log("👤 Guest user - using local pricing data");
                const subtotal = hourlyRate * durationTime * numDays;
                const gstAmount = Math.round(subtotal * 0.18);
                const totalPriceWithGst = subtotal + gstAmount;
                const startDate =
                  selectedAssignment === "instant"
                    ? new Date().toISOString()
                    : formatLocalSelectedDate(selectedDates[0]);

                const guestPricingData = {
                  data: {
                    servicesWithPricing: [
                      {
                        serviceId: {
                          _id: serviceId,
                          name: activeService?.name || "",
                        },
                        technologyIds: techIds.map((id) => ({ _id: id })),
                        selectedDays: numDays,
                        requirements: "Selected from web v3",
                        preferredStartDate: startDate,
                        preferredEndDate: startDate,
                        durationTime,
                        startTime: selectedSlotDetails?.startTime || "09:00",
                        endTime: selectedSlotDetails?.endTime || "18:00",
                        timeSlot: {
                          startTime: selectedSlotDetails?.startTime || "09:00",
                          endTime: selectedSlotDetails?.endTime || "18:00",
                        },
                        bookingType: selectedAssignment || "later",
                      },
                    ],
                    totalPricing: {
                      basePrice: subtotal,
                      gstAmount,
                      totalPriceWithGst,
                      discountAmount: 0,
                    },
                  },
                };

                if (selectedAssignment === "instant") {
                  localStorage.setItem("_selected_date", new Date().toISOString());
                  localStorage.setItem(
                    "_selected_time_slot",
                    JSON.stringify({
                      startTime: selectedSlotDetails?.startTime || "",
                      endTime: selectedSlotDetails?.endTime || "",
                    }),
                  );
                } else {
                  localStorage.setItem(
                    "_selected_date",
                    formatLocalSelectedDate(selectedDates[0]),
                  );
                  localStorage.setItem(
                    "_selected_time_slot",
                    JSON.stringify({
                      startTime: selectedSlotDetails.startTime,
                      endTime: selectedSlotDetails.endTime,
                    }),
                  );
                }

                localStorage.setItem("_selected_plan", selectedPlan);
                localStorage.setItem(
                  "_selected_assignment_type",
                  selectedAssignment,
                );
                localStorage.setItem("_duration_time", durationTime.toString());
                localStorage.setItem(
                  "_pricing_data",
                  JSON.stringify(guestPricingData),
                );

                nextStep();
              }
            } catch (error) {
              console.error("❌ Error:", error);
              showError("Failed to process request. Please try again.");
            } finally {
              setIsPricingLoading(false);
            }
          }}
          disabled={!hoursBookingData || isPricingLoading}
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
          {isPricingLoading ? t('loading') : t('continue')}
        </Button>
      </Box>
    </Box>
  );
};

export default HoursStep;
