// "use client";

// import { ButtonPrimary } from "@/components/ui";
// import Image from "next/image";
// import Link from "next/link";
// import Button from "@mui/material/Button";
// import CheckCircleIcon from "@mui/icons-material/CheckCircle";
// import { useState, useEffect } from "react";

// import { useAppDispatch, useAppSelector } from "@/lib/redux/store/hooks";
// import { fetchAllServices } from "@/lib/redux/slices/discoverSlice/discoverserviceSlice";

// const talentCards = [
//   { label: "Ai Engineer", image: "/images/homepage/ai-engineer.png" },
//   { label: "Developer", image: "/images/homepage/developer.png" },
//   { label: "Quality Assurance", image: "/images/homepage/quality.png" },
//   { label: "Designer", image: "/images/homepage/designer.png" },
//   { label: "Security Engineer", image: "/images/homepage/secqurity.png" },
//   { label: "DevOps Engineer", image: "/images/homepage/deveops.png" },
//   { label: "Content Writer", image: "/images/homepage/content.png" },
//   { label: "IT Support Engineer", image: "/images/homepage/it-support.png" },
//   { label: "CRM Developer", image: "/images/homepage/crm.png" },
// ];

// const HeroSection = () => {
//   const [currentText, setCurrentText] = useState(0);
//   const [isAnimating, setIsAnimating] = useState(false);

//   const dispatch = useAppDispatch();
//   const { allServices, isLoading, error } = useAppSelector(
//     (state) => state.services,
//   );

//   useEffect(() => {
//     dispatch(fetchAllServices());
//   }, [dispatch]);

//   // console.log("All Services:", allServices);
//   const texts = [
//     {
//       text: "Get On-Demand Tech & Software Experts in",
//       highlight: "Just 10 Minutes",
//     },
//     {
//       text: "Work With Trusted, Experienced",
//       highlight: "Tech Professionals",
//     },
//     {
//       text: "Fast Execution With Complete",
//       highlight: "Peace of Mind",
//     },
//   ];

//   useEffect(() => {
//     const interval = setInterval(() => {
//       setIsAnimating(true);
//       setTimeout(() => {
//         setCurrentText((prev) => (prev + 1) % texts.length);
//         setIsAnimating(false);
//       }, 400); // Match animation duration
//     }, 4000); // Change text every 4 seconds

//     return () => clearInterval(interval);
//   }, []);

//   return (
//     <section className="w-full bg-white">
//       <div className="mx-auto flex w-full max-w-[90%] flex-col gap-4 px-0 sm:px-4 py-12 md:px-6 md:py-16 lg:flex-row lg:items-center lg:gap-16 xl:px-0">
//         <div className="flex-1 space-y-6">
//           <div className="space-y-4">
//             <h1
//               className="text-[19px] sm:text-3xl md:text-[43px] font-weight-700 leading-tight text-[#484848]"
//               style={{
//                 animation: isAnimating
//                   ? "fadeSlideOut 0.4s ease-in-out forwards"
//                   : "fadeSlideIn 0.4s ease-in-out forwards",
//                 minHeight: { xs: "40px", md: "80px" },
//                 willChange: "transform, opacity",
//               }}
//             >
//               {texts[currentText].text}{" "}
//               <span className="text-[#45A735]">
//                 {texts[currentText].highlight}
//               </span>
//             </h1>
//             <p className="max-w-2xl text-sm text-[#636363] sm:text-base md:text-lg">
//               Hire verified full-time pros instantly, guided by TPM for seamless
//               delivery
//             </p>
//           </div>

//           <div className="flex flex-wrap items-center gap-3 sm:gap-4">
//             <ButtonPrimary />
//             {/* <div className=" h-8 w-px bg-slate-300 sm:block" /> */}
//             <div className="h-8 w-0.5 bg-black sm:block" />

//             <Link href="/how-it-works" style={{ textDecoration: "none" }}>
//               <Button
//                 variant="outlined"
//                 sx={{
//                   borderColor: "#65A30D",
//                   color: "#334155",
//                   textTransform: "none",
//                   borderRadius: "8px",
//                   padding: {
//                     xs: "14px 24px",
//                     sm: "14px 24px",
//                     md: "13px 38px",
//                   },
//                   fontSize: { xs: "12px", sm: "16px" },
//                 }}
//               >
//                 How It works
//               </Button>
//             </Link>
//           </div>

//           {/* <div className="flex flex-wrap items-center gap-6 text-sm text-slate-600"> */}
//           <div className="hidden sm:flex flex-wrap items-center gap-6 text-sm text-slate-600">
//             {/* <div className="flex items-center gap-2">
//               <CheckCircleIcon className="text-lime-600" fontSize="small" />
//               500+ vetted professionals
//             </div> */}
//             <div className="flex items-center gap-2">
//               <Image src="/checkicon.svg" alt="check" width={24} height={24} />
//               500+ vetted professionals
//             </div>
//             <div className="flex items-center gap-2">
//               <Image src="/checkicon.svg" alt="check" width={24} height={24} />
//               Enterprise-grade support
//             </div>
//             <div className="flex items-center gap-2">
//               <Image src="/checkicon.svg" alt="check" width={24} height={24} />
//               Secure delivery
//             </div>
//           </div>
//         </div>

//         <div className="w-full lg:w-auto rounded-2xl ring-[1.5px] ring-slate-100 bg-white p-4 sm:p-5">
//           <div className="space-y-1">
//             {/* <h2 className="text-xl sm:text-2xl font-bold text-slate-700"> */}
//             <h2 className="text-[13px] sm:text-2xl font-bold text-slate-700">
//               Discover The <span className="text-lime-600">Tech Talent</span>{" "}
//               You Need
//             </h2>
//             <p
//               // className="text-xs sm:text-sm"
//               className="text-[12px] sm:text-sm"
//               style={{ color: "var(--text-muted)" }}
//             >
//               Availability Are Based On Indian Standard Time
//             </p>
//           </div>
//           <div className="mt-6 grid grid-cols-3 gap-3 sm:gap-4 md:grid-cols-3">
//             {/* <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3"> */}
//             {allServices?.data?.services
//               ?.slice(0, 9)
//               .map(({ name, icon_name, _id }) => (
//                 <Link
//                   // href={`/service-details/${name.replace(/ /g, "-")}`}
//                   href={`/service-details/${name.replace(/[ /]/g, "-")}`}
//                   key={_id}
//                   onClick={(e) => {
//                     // Store the FULL service object
//                     sessionStorage.setItem(
//                       "selectedService",
//                       JSON.stringify({ name, _id }), // Store entire service object
//                     );
//                     console.log(
//                       "Stored service:",
//                       JSON.stringify({ name, _id }),
//                     ); // Debug log
//                   }}
//                 >
//                   <div
//                     className="card-primary card-primary-before mb-3 w-full cursor-pointer min-h-[100px] md:min-h-[130px]"
//                     style={{
//                       maxWidth: "154px",
//                       gap: "9.46px",
//                       opacity: 1,
//                       paddingTop: "12px",
//                       paddingBottom: "12px",
//                       display: "flex",
//                       flexDirection: "column",
//                     }}
//                   >
//                     <div className="flex items-center justify-center">
//                       <Image
//                         src={`https://quickhire.services/backend${icon_name}`}
//                         alt={name}
//                         width={42}
//                         height={42}
//                         className="object-contain sm:w-[52px] sm:h-[52px]"
//                         style={{
//                           filter:
//                             "brightness(0) saturate(100%) invert(51%) sepia(94%) saturate(449%) hue-rotate(60deg) brightness(95%) contrast(88%)",
//                         }}
//                       />
//                     </div>
//                     {/* <span className="text-sm sm:text-base text-[#113333]"> */}
//                     <span className="text-[9px] sm:text-base text-[#113333]">
//                       {name.slice(0, 19)} {name.length > 17 ? "" : ""}
//                     </span>
//                   </div>
//                 </Link>
//               ))}
//           </div>
//         </div>
//       </div>
//     </section>
//   );
// };

// export default HeroSection;

// final code
"use client";

import { ButtonPrimary } from "@/components/ui";
import Image from "next/image";
import Link from "@/components/common/I18nLink";
import Button from "@mui/material/Button";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useState, useEffect } from "react";
import { twMerge } from 'tailwind-merge'

import { useAppDispatch, useAppSelector } from "@/lib/redux/store/hooks";
import { fetchAllServices } from "@/lib/redux/slices/discoverSlice/discoverserviceSlice";
import { getServiceIcon } from "@/lib/utils/serviceIcon";
import ServiceCardSkeleton from "./ServiceCardSkeleton";
import { Skeleton } from "@mui/material";
import { useTranslations } from "next-intl";

const HeroSection = () => {
  const t = useTranslations("hero");
  const [currentText, setCurrentText] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const dispatch = useAppDispatch();
  const { allServices, isLoading, error } = useAppSelector(
    (state) => state.services,
  );

  // Backend can return either an array or { data: { services: [...] } }.
  const servicesList = Array.isArray(allServices)
    ? allServices
    : Array.isArray(allServices?.data?.services)
      ? allServices.data.services
      : Array.isArray(allServices?.data)
        ? allServices.data
        : [];
  const hasServices = servicesList.length > 0;

  useEffect(() => {
    dispatch(fetchAllServices());
  }, [dispatch]);

  const texts = [
    { text: t("text1"), highlight: t("highlight1") },
    { text: t("text2"), highlight: t("highlight2") },
    { text: t("text3"), highlight: t("highlight3") },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentText((prev) => (prev + 1) % texts.length);
        setIsAnimating(false);
      }, 400); // Match animation duration
    }, 4000); // Change text every 4 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="w-full bg-white">
      <div className="mx-auto flex w-full max-w-[90%] flex-col gap-4 px-0 sm:px-4 py-12 md:px-6 md:py-16 lg:flex-row lg:items-center lg:gap-16 xl:px-0">
        <div className="flex-1 space-y-6">
          <div className="space-y-4">
            <h1
              className="text-[19px] sm:text-3xl md:text-[43px] font-weight-700 leading-tight text-[#484848]"
              style={{
                animation: isAnimating
                  ? "fadeSlideOut 0.4s ease-in-out forwards"
                  : "fadeSlideIn 0.4s ease-in-out forwards",
                minHeight: { xs: "40px", md: "80px" },
                willChange: "transform, opacity",
              }}
            >
              {texts[currentText].text}{" "}
              <span className="text-[#45A735]">
                {texts[currentText].highlight}
              </span>
            </h1>
            <p className="max-w-2xl text-sm text-[#636363] sm:text-base md:text-lg">
              {t("tagline")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <ButtonPrimary />
            {/* <div className=" h-8 w-px bg-slate-300 sm:block" /> */}
            <div className="h-8 w-0.5 bg-black/40 sm:block" />

            <Link href="/how-it-works" style={{ textDecoration: "none" }}>
              <Button
                variant="outlined"
                sx={{
                  borderColor: "#65A30D",
                  color: "#334155",
                  textTransform: "none",
                  borderRadius: "8px",
                  padding: {
                    xs: "14px 24px",
                    sm: "14px 24px",
                    md: "13px 38px",
                  },
                  fontSize: { xs: "12px", sm: "16px" },
                }}
              >
                {t("howItWorks")}
              </Button>
            </Link>
          </div>

          <div className="hidden sm:flex flex-wrap items-center gap-6 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <Image src="/checkicon.svg" alt="check" width={24} height={24} />
              {t("stat1")}
            </div>
            <div className="flex items-center gap-2">
              <Image src="/checkicon.svg" alt="check" width={24} height={24} />
              {t("stat2")}
            </div>
            <div className="flex items-center gap-2">
              <Image src="/checkicon.svg" alt="check" width={24} height={24} />
              {t("stat3")}
            </div>
          </div>
        </div>

        <div className="w-full lg:w-auto rounded-2xl ring-[1.5px] ring-slate-100 bg-white p-4 sm:p-5">
          {isLoading || !hasServices ?<div className={twMerge("space-y-1")}>
            {/* <h2 className="text-xl sm:text-2xl font-bold text-slate-700"> */}
            <Skeleton
        variant="text"
        animation="wave"
        width="70%"
        height={16}
        className="text-[9px] sm:text-base"
        style={{ marginTop: "8px" }}
      />
            <Skeleton
                    variant="text"
                    animation="wave"
                    width="90%"
                    height={16}
                    className="text-[9px] sm:text-base"
                    style={{ marginTop: "8px" }}
                  />
          </div>
          :
          <div className={twMerge("space-y-1",isLoading || !hasServices ? "invisible" : "visible")}>
            {/* <h2 className="text-xl sm:text-2xl font-bold text-slate-700"> */}
            <h2 className="text-[13px] sm:text-2xl font-bold text-slate-700">
              {t("discoverTitle")} <span className="text-lime-600">{t("discoverHighlight")}</span>{" "}
              {t("discoverTitleEnd")}
            </h2>
            <p
              className="text-[12px] sm:text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              {t("availabilityNote")}
            </p>
          </div>}
          <div className="mt-6 grid grid-cols-3 gap-3 sm:gap-4 md:grid-cols-3">
            {/* <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3"> */}
            {isLoading || !hasServices
              ? Array.from({ length: 9 }).map((_, index) => (
                  <ServiceCardSkeleton key={index} />
                ))
              : servicesList.slice(0, 9).map((svc) => {
                  const { name, _id, slug } = svc;
                  const iconSrc = getServiceIcon(svc);
                  return (
                    <Link
                      href={`/service-details/${slug || _id}`}
                      key={_id}
                      onClick={() => {
                        sessionStorage.setItem(
                          "selectedService",
                          JSON.stringify(svc),
                        );
                      }}
                    >
                      <div
                        className="card-primary card-primary-before mb-3 w-full cursor-pointer min-h-[100px] md:min-h-[130px]"
                        style={{
                          maxWidth: "154px",
                          gap: "9.46px",
                          opacity: 1,
                          paddingTop: "12px",
                          paddingBottom: "12px",
                          display: "flex",
                          flexDirection: "column",
                        }}
                      >
                        <div className="flex items-center justify-center">
                          <Image
                            src={iconSrc}
                            alt={name}
                            width={42}
                            height={42}
                            className="object-contain sm:w-[52px] sm:h-[52px]"
                            style={{
                              filter:
                                "brightness(0) saturate(100%) invert(51%) sepia(94%) saturate(449%) hue-rotate(60deg) brightness(95%) contrast(88%)",
                            }}
                          />
                        </div>
                        <span className="text-[9px] sm:text-base text-[#113333]">
                          {String(name).slice(0, 19)}
                        </span>
                      </div>
                    </Link>
                  );
                })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
