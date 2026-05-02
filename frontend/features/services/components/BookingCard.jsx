"use client";

import React from "react";
import { Box, Typography, Card } from "@mui/material";
import { useTranslations } from "next-intl";
import { useCmsTranslate } from "@/lib/i18n/useCmsTranslate";

const BookingCard = ({ serviceData, isLoading }) => {
  const t = useTranslations("bookingCard");
  const tCms = useCmsTranslate();

  // Platform default — same 5 steps shipped in messages/{locale}.json.
  const defaultSteps = [
    { title: t("step1Title"), description: t("step1Desc") },
    { title: t("step2Title"), description: t("step2Desc") },
    { title: t("step3Title"), description: t("step3Desc") },
    { title: t("step4Title"), description: t("step4Desc") },
    { title: t("step5Title"), description: t("step5Desc") },
  ];

  // SERVICE_CMS_SECTIONS_V1 — admin can override the steps per service.
  const cmsSteps = Array.isArray(serviceData?.processSteps) ? serviceData.processSteps : [];
  const allSteps = (cmsSteps.length > 0
    ? cmsSteps.map((s) => ({
        title:       tCms(s?.titleI18n || s?.title) || "",
        description: tCms(s?.descriptionI18n || s?.description) || "",
      })).filter((s) => s.title)
    : defaultSteps
  ).map((s, i) => ({ ...s, number: i + 1 }));

  // Render layout: first 2 in the wide grid, the rest in the 3-up row.
  const firstRowSteps  = allSteps.slice(0, 2);
  const secondRowSteps = allSteps.slice(2);

  return (
    <section
      style={{ backgroundColor: "var(--bg-tertiary)", padding: "48px 16px" }}
    >
      <div
        className="max-w-7xl mx-auto"
        // style={{
        //   paddingTop: 'clamp(24px, 4vw, 48px)',
        //   paddingBottom: 'clamp(24px, 4vw, 48px)'
        // }}
      >
        {/* Header */}
        <div className="mb-12">
          <Typography
            variant="h2"
            className="font-bold"
            sx={{
              fontSize: { xs: "2rem", md: "2.5rem", lg: "var(--font-size-35)" },
              fontWeight: 700,
              color: "var(--dark--text-secondary)",
            }}
          >
            {t("headingPrefix")}{" "}
            <span
              style={{
                color: "var(--quickhire-green)",
                fontWeight: "var(--font-weight-700)",
                fontStyle: "italic",
              }}
            >
              {t("brand")}
            </span>{" "}
            {t("headingSuffix")}
          </Typography>
        </div>

        {/* First Row - 2 Large Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {firstRowSteps.map((step) => (
            <Card
              key={step.number}
              sx={{
                borderRadius: "16px",
                padding: "24px",
                boxShadow: "none",

                backgroundColor: "#FFFFFF",
                minHeight: "220px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              {/* Number Badge */}
              <Box
                className="flex items-center justify-center rounded-full"
                sx={{
                  width: "33px",
                  height: "33px",
                  backgroundColor: "#45A735",
                  color: "var(--bg-primary)",
                  fontSize: "var(--font-size-14)",
                  fontWeight: "var(--font-weight-700)",
                }}
              >
                {step.number}
              </Box>

              {/* Title */}
              <Typography
                sx={{
                  fontSize: "var(--font-size-180)",
                  fontWeight: "var(--font-weight-700)",
                  color: "var(--text-primary)",
                }}
              >
                {step.title}
              </Typography>

              {/* Description */}
              <Typography
                sx={{
                  fontWeight: "var(--font-weight-400)",
                  fontSize: "var(--font-size-14)",
                  color: "var(--text-secondary)",
                }}
              >
                {step.description}
              </Typography>
            </Card>
          ))}
        </div>

        {/* Second Row - 3 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {secondRowSteps.map((step) => (
            <Card
              key={step.number}
              sx={{
                borderRadius: "16px",
                padding: "24px",
                boxShadow: "none",

                backgroundColor: "#FFFFFF",
                minHeight: "220px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              {/* Number Badge */}
              <Box
                className="flex items-center justify-center rounded-full"
                sx={{
                  width: "33px",
                  height: "33px",
                  backgroundColor: "#45A735",
                  color: "var(--bg-primary)",
                  fontSize: "var(--font-size-14)",
                  fontWeight: "var(--font-weight-700)",
                }}
              >
                {step.number}
              </Box>

              {/* Title */}
              <Typography
                sx={{
                  fontSize: "var(--font-size-180)",
                  fontWeight: "var(--font-weight-700)",
                  color: "var(--text-primary)",
                }}
              >
                {step.title}
              </Typography>

              {/* Description */}
              <Typography
                sx={{
                  fontWeight: "var(--font-weight-400)",
                  fontSize: "var(--font-size-14)",
                  color: "var(--text-secondary)",
                }}
              >
                {step.description}
              </Typography>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BookingCard;
