"use client";

import ArrowOutwardIcon from "@mui/icons-material/ArrowOutward";
import Image from "next/image";
import { useI18nRouter } from "@/lib/hooks/useI18nRouter";
import { useTranslations } from "next-intl";
import { getServiceIcon } from "@/lib/utils/serviceIcon";
import { useCmsTranslate } from "@/lib/i18n/useCmsTranslate";

const CardPrimary = ({ card }) => {
  const router = useI18nRouter();
  const tCommon = useTranslations("common");
  const tCms = useCmsTranslate();
  // console.log("Card Data:", card);

  // Get first 5 technologies names separated by pipes.
  // Supports either array of strings or array of { name } objects.
  const getTechnologiesText = () => {
    if (!card?.technologies || card.technologies.length === 0) {
      return card?.content || card?.description || "No technologies available";
    }

    return card.technologies
      .slice(0, 5)
      .map((tech) => (typeof tech === "string" ? tech : tech?.name))
      .filter(Boolean)
      .map((name) => tCms(name))
      .join(" | ");
  };

  const handleHireExperts = () => {
    if (card?._id) {
      // Store the selected service in sessionStorage
      sessionStorage.setItem("selectedService", JSON.stringify(card));
      // Navigate to the service details page — prefer the SEO-friendly slug
      // when present, fall back to the Mongo _id (backend route accepts both).
      const segment = card.slug || card._id;
      router.push(`/service-details/${segment}`);
    }
  };

  // Check if device supports hover (desktop) - disable hover on mobile/touch devices
  const isTouchDevice = () => {
    if (typeof window !== "undefined") {
      return "ontouchstart" in window || navigator.maxTouchPoints > 0;
    }
    return false;
  };

  // const handleMouseEnter = (e) => {
  //   if (isTouchDevice()) return;
  //   e.currentTarget.style.backgroundImage = `url(/images/card-with-hover.png)`;
  //   e.currentTarget.style.borderColor = "#78EB54";
  //   const img = e.currentTarget.querySelector('img[alt="icon"]');
  //   if (img) img.style.filter = "brightness(0) invert(1)";
  // };

  // const handleMouseLeave = (e) => {
  //   if (isTouchDevice()) return;
  //   e.currentTarget.style.backgroundImage = `url(/images/card-without-hover.png)`;
  //   e.currentTarget.style.borderColor = "#D9D9D9";
  //   const img = e.currentTarget.querySelector('img[alt="icon"]');
  //   if (img)
  //     img.style.filter =
  //       "brightness(0) saturate(100%) invert(42%) sepia(63%) saturate(857%) hue-rotate(72deg) brightness(91%) contrast(89%)";
  // };

  const handleMouseEnter = (e) => {
    if (isTouchDevice()) return;
    e.currentTarget.style.transition = "all 0.5s ease-in-out"; // 1 second animation
    e.currentTarget.style.backgroundImage = `url(/images/card-with-hover.png)`;
    e.currentTarget.style.borderColor = "#78EB54";
    const img = e.currentTarget.querySelector('img[alt="icon"]');
    if (img) {
      img.style.transition = "filter 0.5s ease-in-out"; // 1 second for icon
      img.style.filter = "brightness(0) invert(1)";
    }
  };

  const handleMouseLeave = (e) => {
    if (isTouchDevice()) return;
    e.currentTarget.style.transition = "all 0.5s ease-in-out"; // 1 second animation
    e.currentTarget.style.backgroundImage = `url(/images/card-without-hover.png)`;
    e.currentTarget.style.borderColor = "#D9D9D9";
    const img = e.currentTarget.querySelector('img[alt="icon"]');
    if (img) {
      img.style.transition = "filter 0.5s ease-in-out"; // 1 second for icon
      img.style.filter =
        "brightness(0) saturate(100%) invert(42%) sepia(63%) saturate(857%) hue-rotate(72deg) brightness(91%) contrast(89%)";
    }
  };

  return (
    <div
      className="group relative rounded-2xl border-2 border-[#D9D9D9] md:group-hover:border-[#78EB54] p-6 shadow-[0px_14px_24px_0px_rgba(0,0,0,0.07)] transition-all duration-500 bg-cover bg-center flex flex-col"
      style={{
        backgroundImage: `url(/images/card-without-hover.png)`,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="mb-6 flex items-center">
        <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full border-2 border-[#B4B4B4] bg-white md:group-hover:border-[#78EB54] md:group-hover:bg-[#78EB54] transition-all shrink-0 p-2 sm:p-3">
          <Image
            src={getServiceIcon(card)}
            alt="icon"
            width={28}
            height={28}
            className="object-contain transition-all sm:w-10 sm:h-10"
            style={{
              filter:
                "brightness(0) saturate(100%) invert(42%) sepia(63%) saturate(857%) hue-rotate(72deg) brightness(91%) contrast(89%)",
            }}
          />
        </div>
        <div className="flex-1 h-px bg-[#B4B4B4] md:group-hover:bg-[#78EB54] transition-all"></div>
      </div>
      <div className="flex-grow">
        <h3 className="text-[12px] sm:text-[20px] font-bold leading-[100%] tracking-[0%] align-middle text-[#000000] md:group-hover:text-white transition-colors font-['Open_Sauce_One_Bold']">
          {tCms(card?.name)}
        </h3>
        <p className="mt-4 text-[11px] sm:text-[16px] font-medium leading-[170%] tracking-[0%] align-middle text-[#636363] md:group-hover:text-white/90 transition-colors font-['Open_Sauce_One_Medium'] line-clamp-2 sm:line-clamp-4">
          {getTechnologiesText()}
        </p>
      </div>
      <div className="mt-6">
        <button
          onClick={handleHireExperts}
          className="relative inline-flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 md:group-hover:w-auto md:group-hover:px-5 md:group-hover:gap-2 rounded-full bg-lime-600 text-white text-sm font-semibold md:group-hover:bg-white md:group-hover:text-lime-600 transition-all duration-500 ease-in-out shadow-md md:hover:shadow-lg overflow-hidden"
        >
          <span className="absolute left-5 opacity-0 md:group-hover:opacity-100 md:group-hover:relative md:group-hover:left-0 whitespace-nowrap transition-all duration-500 ease-in-out">
            {tCommon("hireExperts")}
          </span>
          <ArrowOutwardIcon
            sx={{ fontSize: { xs: 14, sm: 18 } }}
            className="shrink-0"
          />
        </button>
      </div>
    </div>
  );
};

export default CardPrimary;
