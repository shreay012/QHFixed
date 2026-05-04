"use client";

import { useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/redux/store/hooks";
import {
  fetchServiceById,
  setSelectedService,
} from "@/lib/redux/slices/discoverSlice/discoverserviceSlice";
import { selectLocale } from "@/lib/redux/slices/regionSlice/regionSlice";

import { LeftComponent, RightComponent } from "@/features/services/components";
import CustomProgressScrollbar from "@/components/ui/CustomProgressScrollbar";
import CmsBannerSlider from "@/components/cms/CmsBannerSlider";

export default function ServiceDetailsPage() {
  const leftScrollRef = useRef(null);
  const params = useParams();
  const { id } = params;

  const dispatch = useAppDispatch();
  const { selectedService, error: serviceError } = useAppSelector((state) => state.services);
  // Watch the active locale so we re-fetch with fresh translations whenever
  // the user switches language (the backend resolves locale from X-Lang header
  // sent by axiosInstance on every request).
  const locale = useAppSelector(selectLocale);

  // Track whether this is the very first mount so we only seed from
  // sessionStorage once — not every time the locale changes.
  const seededRef = useRef(false);

  useEffect(() => {
    if (!id) return;
    // Pre-seed Redux from sessionStorage on first load only so the page can
    // render immediately without waiting for the network round-trip. The
    // route param can be either the ObjectId or the slug (backend resolves
    // both), so accept a match on either side.
    const matchesUrl = (svc) =>
      svc && (String(svc._id) === String(id) || String(svc.slug) === String(id));

    if (!seededRef.current) {
      seededRef.current = true;
      const cached = typeof window !== "undefined"
        ? sessionStorage.getItem("selectedService")
        : null;
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (matchesUrl(parsed)) {
            dispatch(setSelectedService(parsed));
          }
        } catch {}
      }
    }
    // Fetch fresh data — runs on initial mount AND whenever locale changes,
    // ensuring the left section re-renders in the newly selected language.
    dispatch(fetchServiceById(id));
  }, [id, locale, dispatch]);

  // Only use selectedService if it matches the current page id (or slug) —
  // prevents briefly showing a previous service's content while the new one
  // loads. Slug-based URLs (homepage links) used to fail this check because
  // selectedService._id is an ObjectId and id is a slug — accept either.
  const service =
    selectedService &&
    (String(selectedService._id) === String(id) || String(selectedService.slug) === String(id))
      ? selectedService
      : null;

  // Show spinner while we have no data and no error.  Once `service` is
  // populated (from either sessionStorage seed or the API fetch) the spinner
  // disappears and children render with real data.
  const showSpinner = !service && !serviceError;

  if (showSpinner) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#45A735] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[#636363]">Loading service details...</p>
        </div>
      </div>
    );
  }

  if (serviceError && !service) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500 mb-2 font-semibold">Service not found</p>
          <p className="text-[#636363] text-sm">This service may no longer be available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-82px)] lg:overflow-hidden">
      {/* Left Side - Scrollable with Custom Scrollbar */}
      <div className="w-full lg:w-[55%] lg:relative">
        <div
          ref={leftScrollRef}
          className="lg:h-full overflow-y-auto overflow-x-hidden hide-scrollbar"
        >
          <div
            className="px-4 sm:px-6 lg:pl-0 lg:pt-0 lg:pb-0 py-6 lg:py-0"
            style={{ paddingRight: "9px" }}
          >
            {/* CMS slot: service-detail-top — admin-managed callouts /
                upsell banners shown above the service write-up. */}
            <CmsBannerSlider position="service-detail-top" className="mb-6" />
            <LeftComponent selectedService={service} />
          </div>
        </div>

        {/* Custom Progress Scrollbar - Desktop Only */}
        <div className="hidden lg:block">
          <CustomProgressScrollbar scrollContainerRef={leftScrollRef} />
        </div>
      </div>

      {/* Right Side - Fixed with internal scroll */}
      <div className="w-full lg:w-[45%] lg:sticky lg:top-0 lg:h-[calc(100vh-64px)] lg:overflow-hidden">
        <RightComponent serviceId={id} selectedService={service} />
      </div>
    </div>
  );
}
