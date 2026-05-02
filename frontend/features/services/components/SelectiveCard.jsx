"use client";

import React from "react";
import { Box, Typography, Chip } from "@mui/material";
import ArrowOutwardIcon from "@mui/icons-material/ArrowOutward";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { useTranslations } from "next-intl";
import { useCmsTranslate } from "@/lib/i18n/useCmsTranslate";

const SelectiveCard = ({ serviceData, isLoading }) => {
  const tServiceDetails = useTranslations("serviceDetails");
  const t = useTranslations("selectiveCard");
  const tCms = useCmsTranslate();
  // No longer fetching data here - receiving it as props

  // Get technologies dynamically from API — handles both plain strings and
  // rich i18n objects { name, en, hi, … }. tCms picks the active locale so
  // tech chip labels update immediately when the user switches language.
  const engineers = (serviceData?.technologies || []).map((tech) => {
    if (!tech) return '';
    if (typeof tech === 'string') return tCms(tech);
    // Rich object — prefer nameI18n (raw multi-locale) → then the object itself
    return tCms(tech?.nameI18n || tech) || tech?.name || tech?.en || tech?.id || '';
  }).filter(Boolean);

  // Get notIncluded items dynamically from API, with fallback for empty array.
  // tCms translates plain strings via CMS map and i18n objects via locale pick.
  const notIncluded =
    serviceData?.notIncluded?.length > 0
      ? serviceData.notIncluded.map((item) => {
          if (!item) return '';
          return typeof item === 'string' ? tCms(item) : tCms(item) || item?.name || item?.id || '';
        }).filter(Boolean)
      : [t("default1"), t("default2"), t("default3"), t("default4")];

  // SERVICE_CMS_SECTIONS_V1 — admin can override the "What You Get" promises
  // per service. Each entry is i18n-flattened by axios. Fall back to the
  // 4 platform-default promises shipped in messages/{locale}.json.
  const cmsPromises = Array.isArray(serviceData?.promises) ? serviceData.promises : [];
  const promises = (cmsPromises.length > 0
    ? cmsPromises.map((p) => (typeof p === 'string' ? tCms(p) : tCms(p) || '')).filter(Boolean)
    : [t("promise1"), t("promise2"), t("promise3"), t("promise4")]);

  // Working hours / Transparent Execution title + subtitle — single i18n
  // strings on the service. Empty → fall back to the messages defaults.
  const transparentTitle = tCms(serviceData?.transparentTitleI18n || serviceData?.transparentTitle)
    || t("transparentTitle");
  const transparentSubtitle = tCms(serviceData?.transparentSubtitleI18n || serviceData?.transparentSubtitle)
    || t("transparentSubtitle");
  const workingHours = tCms(serviceData?.workingHoursI18n || serviceData?.workingHours)
    || t("workingHours");

  if (isLoading) {
    return (
      <section style={{ backgroundColor: "#FFFFFF", padding: "48px 16px" }}>
        <div className="max-w-7xl mx-auto text-center">
          <Typography>{tServiceDetails("loading")}</Typography>
        </div>
      </section>
    );
  }

  return (
    <section style={{ backgroundColor: "#FFFFFF", padding: "48px 16px" }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Typography
            sx={{
              fontSize: "var(--font-size-14 )",
              color: "var(--text-secondary)",
              fontWeight: "var(--font-weight-500)",
              marginBottom: "8px",
            }}
          >
            {t("subhead")}
          </Typography>
          <Typography
            variant="h2"
            className="font-bold"
            sx={{
              fontSize: { xs: "2rem", md: "2.5rem", lg: "var(--font-size-24)" },
              fontWeight: "var(--font-weight-700)",
              color: "var(--text-primary)",
            }}
          >
            {t("heading")}
          </Typography>
        </div>

        {/* Engineers Chips - Dynamic from API */}
        {engineers.length > 0 ? (
          <div className="flex flex-wrap justify-center items-center gap-4 mb-16 max-w-4xl mx-auto">
            {engineers.map((engineerName, index) => (
              <Chip
                key={index}
                label={engineerName}
                icon={
                  <ArrowOutwardIcon
                    sx={{
                      fontSize: "24px !important",
                      color: "#45A735 !important",
                    }}
                  />
                }
                sx={{
                  backgroundColor: "#45A73512",
                  padding: "24px 16px",
                  fontSize: "var(--font-size-18)",
                  fontWeight: "var(--font-weight-400)",
                  color: "var(--text-primary)",
                  borderRadius: "50px",
                  "& .MuiChip-label": {
                    paddingRight: "12px",
                    paddingLeft: "8px",
                  },
                  "& .MuiChip-icon": {
                    order: 1,
                    marginLeft: "8px",
                    marginRight: "0",
                  },
                  "&:hover": {
                    backgroundColor: "#45A73512",
                    cursor: "pointer",
                  },
                }}
              />
            ))}
          </div>
        ) : (
          <div className="text-center mb-16">
            <Typography sx={{ color: "var(--text-secondary)" }}>
              {t("noTechnologies")}
            </Typography>
          </div>
        )}

        {/* Divider Line */}
        <div className="max-w-6xl mx-auto mb-12">
          <hr style={{ border: "none", borderTop: "1px solid #E5E7EB" }} />
        </div>

        {/* Transparent Execution Section */}
        <div className="text-center mb-8 max-w-4xl mx-auto">
          <Typography
            sx={{
              fontSize: { xs: "24px", md: "24px", lg: "var(--font-size-24)" },
              fontWeight: "var(--font-weight-500)",
              color: "var(--dark-text-primary)",
              mb: 2,
            }}
          >
            {transparentTitle}
          </Typography>
          <Typography
            sx={{
              fontSize: { xs: "15px", md: "var(--font-size-14)" },
              fontWeight: "var(--font-weight-400)",
              color: "var(--text-secondary)",
              mb: 4,
            }}
          >
            {transparentSubtitle}
          </Typography>

          {/* Working Hours Badge */}
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: "12px",
              backgroundColor: "#E8F5E6",
              padding: "12px 24px",
              borderRadius: "50px",
              border: "1px solid #D1E7CE",
              mb: 6,
            }}
          >
            <CheckCircleIcon sx={{ color: "#45A735", fontSize: "24px" }} />
            <Typography
              sx={{
                fontSize: "16px",
                fontWeight: 500,
                color: "#1F2937",
              }}
            >
              {workingHours}
            </Typography>
          </Box>
        </div>

        {/* Promises and Not Included Boxes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {/* QuickHire Promises */}
          <Box
            sx={{
              border: "2px solid #45A735",
              borderRadius: "16px",
              padding: "32px",
              backgroundColor: "#F5FFF5",
            }}
          >
            <Typography
              sx={{
                fontSize: "24px",
                fontWeight: 600,
                color: "#1F2937",
                marginBottom: "24px",
                paddingLeft: "12px",
                borderLeft: "4px solid #45A735",
              }}
            >
              {t("whatYouGet")}
            </Typography>
            <div className="space-y-3">
              {promises.map((promise, index) => (
                <Box
                  key={index}
                  className="flex items-center gap-3 px-4 py-3 rounded-full"
                  sx={{
                    backgroundColor: "#E8F5E6",
                  }}
                >
                  <CheckCircleIcon
                    sx={{ color: "#45A735", fontSize: "24px" }}
                  />
                  <Typography
                    sx={{
                      fontSize: "15px",
                      color: "#374151",
                      fontWeight: 500,
                    }}
                  >
                    {promise}
                  </Typography>
                </Box>
              ))}
            </div>
          </Box>

          {/* What is not Included */}
          <Box
            sx={{
              border: "2px solid #EF4444",
              borderRadius: "16px",
              padding: "32px",
              backgroundColor: "#FFF5F5",
            }}
          >
            <Typography
              sx={{
                fontSize: "24px",
                fontWeight: 600,
                color: "#1F2937",
                marginBottom: "24px",
                paddingLeft: "12px",
                borderLeft: "4px solid #EF4444",
              }}
            >
              {t("whatsNotIncluded")}
            </Typography>
            <div className="space-y-3">
              {notIncluded.map((item, index) => (
                <Box
                  key={index}
                  className="flex items-center gap-3 px-4 py-3 rounded-full"
                  sx={{
                    backgroundColor: "#FEE2E2",
                  }}
                >
                  <CancelIcon sx={{ color: "#EF4444", fontSize: "24px" }} />
                  <Typography
                    sx={{
                      fontSize: "15px",
                      color: "#374151",
                      fontWeight: 500,
                    }}
                  >
                    {item}
                  </Typography>
                </Box>
              ))}
            </div>
          </Box>
        </div>
      </div>
    </section>
  );
};

export default SelectiveCard;
