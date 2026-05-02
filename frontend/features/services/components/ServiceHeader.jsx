"use client";

import React from "react";
import { Box, Typography } from "@mui/material";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useCmsTranslate } from "@/lib/i18n/useCmsTranslate";

const ServiceHeader = ({ serviceData, isLoading }) => {
  const t = useTranslations("serviceHeader");
  // tCms picks the active locale from both raw i18n objects {en,hi,…} AND
  // CMS string maps — so name/description update instantly when locale changes.
  const tCms = useCmsTranslate();

  // Platform-default 4 chips. Used when the service hasn't overridden them
  // via the admin "Page Content" tab.
  const defaultFeatures = [
    { defaultIcon: "/images/book-services/service-icon1.svg", text: t("feature1"), alt: "Verified" },
    { defaultIcon: "/images/book-services/service-icon2.svg", text: t("feature2"), alt: "Security" },
    { defaultIcon: "/images/book-services/service-icon3.svg", text: t("feature3"), alt: "Pricing" },
    { defaultIcon: "/images/book-services/service-icon4.svg", text: t("feature4"), alt: "Manager" },
  ];

  // SERVICE_CMS_SECTIONS_V1 — admin can override the 4 chips per service.
  // Each cms feature is { icon, label } — icon is optional (falls back to
  // the corresponding platform SVG by index, or the first one if more chips
  // were added than defaults).  Label is i18n-flattened by axios already.
  const cmsFeatures = Array.isArray(serviceData?.features) ? serviceData.features : [];
  const features = (cmsFeatures.length > 0
    ? cmsFeatures.map((f, idx) => ({
        text: tCms(f?.labelI18n || f?.label) || "",
        icon: f?.icon
          ? (
              // Allow either a URL or an emoji/short string.
              /^https?:\/\//.test(f.icon) || f.icon.startsWith("/")
                ? <img src={f.icon} alt="" width={24} height={24} style={{ width: 24, height: 24, objectFit: "contain" }} />
                : <span style={{ fontSize: 22, lineHeight: 1 }}>{f.icon}</span>
            )
          : (
              <Image
                src={defaultFeatures[idx % defaultFeatures.length].defaultIcon}
                alt={defaultFeatures[idx % defaultFeatures.length].alt}
                width={24}
                height={24}
              />
            ),
      }))
    : defaultFeatures.map((f) => ({
        text: f.text,
        icon: <Image src={f.defaultIcon} alt={f.alt} width={24} height={24} />,
      }))
  ).filter((f) => f.text);

  return (
    <section
      className="relative overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, rgba(243, 249, 241, 1) 0%, rgba(255, 255, 255, 1) 100%)",
        padding: "48px 16px",
      }}
    >
      <div
        className="max-w-7xl mx-auto"
        // style={{
        //   paddingTop: 'clamp(24px, 4vw, 48px)',
        //   paddingBottom: 'clamp(24px, 4vw, 48px)'
        // }}
      >
        {/* Top Badge — service name + (admin) category */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          <Box
            sx={{
              backgroundColor: "#FFFFFF",
              padding: "8px 24px",
              borderRadius: "24px",
            }}
          >
            <Typography
              sx={{
                fontSize: "var(--font-size-16)",
                fontWeight: "var(--font-weight-600)",
                color: "var(--dark-text-primary)",
              }}
            >
              {tCms(serviceData?.nameI18n || serviceData?.name) || "Service"}
            </Typography>
          </Box>
          {serviceData?.category && (
            <Box
              sx={{
                backgroundColor: "#F2F9F1",
                color: "#26472B",
                padding: "8px 16px",
                borderRadius: "24px",
                border: "1px solid #D6EBCF",
              }}
            >
              <Typography
                sx={{
                  fontSize: "var(--font-size-14)",
                  fontWeight: "var(--font-weight-500)",
                }}
              >
                {serviceData.category}
              </Typography>
            </Box>
          )}
        </div>

        {/* Main Heading */}
        <div className="text-center mb-4">
          <Typography
            variant="h1"
            sx={{
              fontSize: {
                xs: "1.5rem",
                md: "2.75rem",
                lg: "var(--font-size-22)",
              },
              fontWeight: "var(--font-weight-600)",
              color: "var( --dark--text-secondary)",
              lineHeight: 1.2,
            }}
          >
            {t("heading", { service: tCms(serviceData?.nameI18n || serviceData?.name) || "" })}{" "}
            <span style={{ color: "#45A735" }}>{t("headingHighlight")}</span>
          </Typography>
        </div>

        {/* Subheading */}
        <div className="text-center mb-12">
          <Typography
            sx={{
              fontSize: { xs: "16px", md: "var(--font-size-14)" },
              color: "var(--text-secondary)",
              maxWidth: "800px",
              margin: "0 auto",
            }}
          >
            {tCms(serviceData?.descriptionI18n || serviceData?.description) || t("subheading")}
          </Typography>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center">
          <div className="flex justify-center relative">
            <Box
              sx={{
                position: "relative",
                width: { xs: "280px", md: "320px" },
                height: { xs: "350px", md: "400px" },
              }}
            >
              {/* Service hero image — driven by admin (services.imageUrl).
                  Falls back to the default illustration when admin hasn't
                  uploaded a service-specific image yet. */}
              {serviceData?.imageUrl || serviceData?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={serviceData.imageUrl || serviceData.image}
                  alt={
                    typeof serviceData?.name === 'string'
                      ? serviceData.name
                      : (serviceData?.name?.en || 'Service')
                  }
                  className="relative z-10 w-full h-full object-cover rounded-[16px]"
                />
              ) : (
                <Image
                  src="/images/book-services/service_man.png"
                  alt="QuickHire Professional"
                  width={258}
                  height={253}
                  className="relative z-10 w-full h-full object-cover rounded-[16px]"
                />
              )}
            </Box>
          </div>

          <div className="flex flex-col gap-6">
            {/* Feature Chips Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:pr-[30px]">
              {features.map((feature, index) => (
                <Box
                  key={index}
                  sx={{
                    // backgroundColor: '#FFFFFF',
                    padding: "12px 16px",
                    borderRadius: "12px",
                    border:
                      "1px solid var(--Ui-Color-Secondary-Light, #D9E5E3)",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    // boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                  }}
                >
                  {feature.icon}
                  <Typography
                    sx={{
                      fontSize: "var(--font-size-12)",
                      color: "#374151",
                      fontWeight: "var(--font-weight-400)",
                    }}
                  >
                    {feature.text}
                  </Typography>
                </Box>
              ))}
            </div>

            {/* Quote Section */}
            <Box sx={{ mt: 4 }}>
              <Image
                src="/images/book-services/service-banner.svg"
                alt="Helped 1000+ Startups ship faster"
                width={500}
                height={120}
                className="w-full h-auto"
              />
            </Box>

            {/* Building Illustration Placeholder */}
            <Box
              sx={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: "200px",
                height: "200px",
                opacity: 0.1,
                pointerEvents: "none",
                display: { xs: "none", lg: "block" },
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServiceHeader;
