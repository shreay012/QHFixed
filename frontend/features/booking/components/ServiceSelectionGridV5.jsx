"use client";

import { useState, useEffect, useRef } from "react";
import ServiceCardGridV3 from "./ServiceCardGridV3";
import { useI18nRouter } from "@/lib/hooks/useI18nRouter";
import { useTranslations } from "next-intl";

import { useAppDispatch, useAppSelector } from "@/lib/redux/store/hooks";
import { fetchAllServices } from "@/lib/redux/slices/discoverSlice/discoverserviceSlice";
import { getServiceIcon } from "@/lib/utils/serviceIcon";
import { useCmsTranslate } from "@/lib/i18n/useCmsTranslate";

const SERVICE_COLORS = {
  "Ai Engineers": "#135773",
  "E-Commerce": "#264746",
  "Java Developer": "#471373",
  "Front-End Developer": "#137351",
  "Back-end Developer": "#855107",
  "Security Engineer": "#BF9222",
  "UI/UX Designer": "#BF9222",
  "IT Support Engineer": "#791E46",
  "QA Engineer": "#135773",
  "DevOps Engineer": "#264746",
  "Third Party Integration": "#471373",
  "Digital Marketing": "#137351",
  "Mobile App Developer": "#855107",
  "SAP Consultant": "#734913",
  "Full Stack Developer": "#BF9222",
  "Content Writer": "#791E46",
};

const getServiceColor = (serviceName) => {
  return SERVICE_COLORS[serviceName] || "#135773"; // fallback color
};
const ServiceSelectionGridV5 = () => {
  const tBookExperts = useTranslations("bookExperts");
  const tCommon = useTranslations("common");
  const tCms = useCmsTranslate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [initialService, setInitialService] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const initialCount = 6;
  const dropdownRef = useRef(null);

  const router = useI18nRouter();

  const dispatch = useAppDispatch();
  const { allServices, isLoading, error } = useAppSelector(
    (state) => state.services,
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  const handleServiceSelect = (service) => {
    if (!service?._id) return;

    setInitialService(service.name);
    sessionStorage.setItem("selectedService", JSON.stringify(service));
    setIsDropdownOpen(false);
    router.push(`/service-details/${service.slug || service._id}`);
  };

  useEffect(() => {
    dispatch(fetchAllServices());
  }, [dispatch]);

  // allServices is now a flat array from the backend
  const servicesList = Array.isArray(allServices) ? allServices : [];

  const displayedServices = showAll
    ? servicesList
    : servicesList.slice(0, initialCount);

  const totalServices = servicesList.length;

  return (
    <section
      id="book-experts-section"
      className="w-full bg-[#F2F9F1] py-5 md:py-24"
    >
      <div className="mx-auto max-w-[1440px] px-6 sm:px-12 lg:px-20">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-12">
          <div className="flex flex-col gap-2">
            <h2 className="text-[26px] md:text-[48px] font-bold leading-tight text-[#404040] text-center md:text-left font-['Open_Sauce_One_Bold']">
              {tBookExperts("title")}
            </h2>
            <p className="text-[14px] md:text-[22px] text-[#636363] text-center md:text-left font-['Open_Sauce_One_Regular']">
              {tBookExperts("subtitle")}
            </p>
          </div>

          {/* Custom Dropdown */}
          <div
            ref={dropdownRef}
            className="relative mt-4 md:mt-0 flex justify-center md:justify-start"
          >
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-3 bg-[#F5F5F5] border border-[#E0E0E0] px-6 py-3 rounded-xl text-[#666666] font-medium hover:bg-gray-100 transition-all min-w-[180px] justify-between shadow-sm"
            >
              <span>{initialService ? tCms(initialService) : tCommon("allServices")}</span>
              <svg
                className={`w-5 h-5 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {isDropdownOpen && (
              // <div className="absolute right-0 mt-0 w-full max-h-72 overflow-y-auto bg-white border border-[#E0E0E0] rounded-xl shadow-xl z-50">
              //   {allServices?.data?.services?.map((service) => (
              //     <button
              //       key={service._id}
              //       onClick={() => handleServiceSelect(service)}
              //       className="w-full text-left px-6 py-3 text-[#666666] hover:bg-green-50 hover:text-[#45A735] transition-colors border-b last:border-none border-[#F0F0F0]"
              //     >
              //       {service.name}
              //     </button>
              //   ))}
              // </div>
              <div className="absolute right-0 mt-[50px] w-full max-h-72 overflow-y-auto hide-scrollbar bg-white border border-[#E0E0E0] rounded-xl shadow-xl z-50">
                {servicesList.map((service) => (
                  <button
                    key={service._id}
                    onClick={() => handleServiceSelect(service)}
                    className="w-full text-left px-6 py-3 text-[#666666] hover:bg-green-50 hover:text-[#45A735] transition-colors border-b last:border-none border-[#F0F0F0]"
                  >
                    {tCms(service.name)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Big Cards Grid V3 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10 mb-16">
          {isLoading ? (
            <p className="col-span-full text-center text-gray-600">
              {tCommon("loadingServices")}
            </p>
          ) : displayedServices?.length > 0 ? (
            displayedServices.map((service) => (
              <ServiceCardGridV3
                key={service._id}
                service={service}
                // backgroundColor={service.backgroundColor || "#135773"}
                backgroundColor={getServiceColor(service.name)}
                iconUrl={getServiceIcon(service)}
              />
            ))
          ) : (
            <p className="col-span-full text-center text-gray-600">
              {tBookExperts("noServices")}
            </p>
          )}
        </div>

        {/* Load More Button - Only show if more than 6 services */}
        {totalServices > 6 && (
          <div className="flex justify-center">
            <button
              onClick={() => setShowAll(!showAll)}
              className="bg-[#45A735] text-white px-12 py-4 rounded-xl font-bold text-[18px] hover:bg-[#3d942d] transition-all shadow-md active:scale-95"
            >
              {showAll ? "Show Less" : "Load More"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default ServiceSelectionGridV5;
