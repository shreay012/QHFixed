"use client";

import Link from "@/components/common/I18nLink";
import Image from "next/image";
import { Box, Typography, Grid, Container } from "@mui/material";
import { useTranslations } from "next-intl";

// FOOTER_URL_FIX_V1: env vars may be unset on Vercel previews / new deploys —
// fall back to "#" so Link doesn't render `undefined/<path>` (which 404s
// every RSC prefetch and clutters the console).
const BLOG_BASE = process.env.NEXT_PUBLIC_BLOG_BASE_URL || "";
const ENTERPRISE_BASE = process.env.NEXT_PUBLIC_ENTERPRISE_BASE_URL || "";

const Footer = () => {
  const t = useTranslations("footer");
  return (
    <Box
      component="footer"
      sx={{
        width: "100%",
        backgroundColor: "#F2F9F1",
      }}
    >
      <Container
        maxWidth={false}
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: { xs: 3, md: "15" },
          py: { xs: 4 },
          pl: { xs: 3, sm: 4, md: "66px" },
          pr: { xs: 3, sm: 4, md: "66px" },
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            justifyContent: { md: "start" },
            alignItems: { xs: "center", md: "flex-start" },
            gap: { xs: 4, md: 6, lg: 28 },
            textAlign: { xs: "center", md: "left" },
            "@media (min-width: 1200px)": {
              gap: "120px",
            },
          }}
        >
          <Box
            sx={{
              maxWidth: { xs: "100%", md: "390px" },
              width: { xs: "100%", md: "auto" },
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: { xs: "center", md: "flex-start" },
              }}
            >
              <Image
                src="/quickhire-logo.svg"
                alt="QuickHire"
                width={150}
                height={40}
                style={{ height: "auto", width: "auto", maxHeight: "40px" }}
              />
            </Box>
            <Typography
              sx={{
                mt: 2,
                fontSize: { xs: "11px", lg: "16px" },
                fontWeight: 400,
                color: "#322C42",
                lineHeight: 1.6,
              }}
            >
              {t("tagline")}
            </Typography>
          </Box>

          {/* Knowledge Hub */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: { xs: 2, md: 2.5 },
              alignItems: { xs: "center", md: "flex-start" },
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontSize: { xs: "14px", md: "20px", lg: "22px" },
                fontWeight: 600,
                color: "var(--quickhire-green)",
              }}
            >
              {t("knowledgeHub")}
            </Typography>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
                alignItems: { xs: "center", md: "flex-start" },
              }}
            >
              <Link
                href="/industry-perspectives"
                style={{ textDecoration: "none" }}
              >
                <Typography
                  sx={{
                    fontSize: { xs: "11px", md: "15px" },
                    fontWeight: 400,
                    color: "#322C42",
                    textDecoration: "none",
                    "&:hover": {
                      color: "var(--quickhire-green)",
                    },
                  }}
                >
                  {t("industryPerspectives")}
                </Typography>
              </Link>

              <Link
                href={ENTERPRISE_BASE ? `${ENTERPRISE_BASE}/home` : "#"}
                style={{ textDecoration: "none" }}
              >
                <Typography
                  sx={{
                    fontSize: { xs: "11px", md: "15px" },
                    fontWeight: 400,
                    color: "#322C42",
                    textDecoration: "none",
                    "&:hover": {
                      color: "var(--quickhire-green)",
                    },
                  }}
                >
                  {t("enterprise")}
                </Typography>
              </Link>

              <Link href="/about-us" style={{ textDecoration: "none" }}>
                <Typography
                  sx={{
                    fontSize: { xs: "11px", md: "15px" },
                    fontWeight: 400,
                    color: "#322C42",
                    textDecoration: "none",
                    "&:hover": {
                      color: "var(--quickhire-green)",
                    },
                  }}
                >
                  {t("aboutUs")}
                </Typography>
              </Link>
              <Link href="/faq" style={{ textDecoration: "none" }}>
                <Typography
                  sx={{
                    fontSize: { xs: "11px", md: "15px" },
                    fontWeight: 400,
                    color: "#322C42",
                    textDecoration: "none",
                    "&:hover": {
                      color: "var(--quickhire-green)",
                    },
                  }}
                >
                  {t("faqs")}
                </Typography>
              </Link>
            </Box>
          </Box>

          {/* Company */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: { xs: 2, md: 2.5 },
              alignItems: { xs: "center", md: "flex-start" },
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontSize: { xs: "18px", md: "20px", lg: "22px" },
                fontWeight: 600,
                color: "var(--quickhire-green)",
              }}
            >
              {t("company")}
            </Typography>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
                alignItems: { xs: "center", md: "flex-start" },
              }}
            >
              <Link href="/how-it-works" style={{ textDecoration: "none" }}>
                <Typography
                  sx={{
                    fontSize: { xs: "12px", md: "15px" },
                    fontWeight: 400,
                    color: "#322C42",
                    textDecoration: "none",
                    "&:hover": {
                      color: "var(--quickhire-green)",
                    },
                  }}
                >
                  {t("howItWorks")}
                </Typography>
              </Link>
              <Link href="/contact-us" style={{ textDecoration: "none" }}>
                <Typography
                  sx={{
                    fontSize: { xs: "12px", md: "15px" },
                    fontWeight: 400,
                    color: "#322C42",
                    textDecoration: "none",
                    "&:hover": {
                      color: "var(--quickhire-green)",
                    },
                  }}
                >
                  {t("contactUs")}
                </Typography>
              </Link>
              <Link
                href="/terms-and-conditions"
                style={{ textDecoration: "none" }}
              >
                <Typography
                  sx={{
                    fontSize: { xs: "12px", md: "15px" },
                    fontWeight: 400,
                    color: "#322C42",
                    textDecoration: "none",
                    "&:hover": {
                      color: "var(--quickhire-green)",
                    },
                  }}
                >
                  {t("termsConditions")}
                </Typography>
              </Link>
              <Link
                href="/privacy-policy"
                style={{ textDecoration: "none" }}
              >
                <Typography
                  sx={{
                    fontSize: { xs: "12px", md: "15px" },
                    fontWeight: 400,
                    color: "#322C42",
                    textDecoration: "none",
                    "&:hover": {
                      color: "var(--quickhire-green)",
                    },
                  }}
                >
                  {t("privacyPolicy")}
                </Typography>
              </Link>
              <Link
                href="/cancellation-and-refund-policy"
                style={{ textDecoration: "none" }}
              >
                <Typography
                  sx={{
                    fontSize: { xs: "12px", md: "15px" },
                    fontWeight: 400,
                    color: "#322C42",
                    textDecoration: "none",
                    "&:hover": {
                      color: "var(--quickhire-green)",
                    },
                  }}
                >
                  {t("cancellationPolicy")}
                </Typography>
              </Link>
            </Box>
          </Box>

          {/* Follow Us - Social Icons */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: { xs: 2, md: 2.5 },
              alignItems: { xs: "center", md: "flex-start" },
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontSize: { xs: "18px", md: "20px", lg: "22px" },
                fontWeight: 600,
                color: "var(--quickhire-green)",
              }}
            >
              {t("followUs")}
            </Typography>
            <Box
              sx={{
                display: "flex",
                gap: { xs: 2.5, md: 3 },
                alignItems: "center",
                justifyContent: { xs: "center", md: "flex-start" },
              }}
            >
              <Link
                href="https://www.instagram.com/quickhire__services_/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none" }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "opacity 0.3s ease",
                    "&:hover": {
                      opacity: 0.7,
                    },
                  }}
                >
                  <Image
                    src="/images/footer/insta_logo.png"
                    alt="Instagram"
                    width={24}
                    height={24}
                    style={{ width: "24px", height: "24px" }}
                  />
                </Box>
              </Link>

              <Link
                href="https://www.linkedin.com/company/quickhire-services/?viewAsMember=true"
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none" }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "opacity 0.3s ease",
                    "&:hover": {
                      opacity: 0.7,
                    },
                  }}
                >
                  <Image
                    src="/images/footer/linkedin_logo.png"
                    alt="LinkedIn"
                    width={24}
                    height={24}
                    style={{ width: "24px", height: "24px" }}
                  />
                </Box>
              </Link>

              <Link
                href="https://in.pinterest.com/quickhire_services/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none" }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "opacity 0.3s ease",
                    "&:hover": {
                      opacity: 0.7,
                    },
                  }}
                >
                  <Image
                    src="/images/footer/pinterest_logo.png"
                    alt="Pinterest"
                    width={24}
                    height={24}
                    style={{ width: "24px", height: "24px" }}
                  />
                </Box>
              </Link>

              <Link
                href="https://www.youtube.com/@QuickhireServices"
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none" }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "opacity 0.3s ease",
                    "&:hover": {
                      opacity: 0.7,
                    },
                  }}
                >
                  <Image
                    src="/images/footer/yt_logo.png"
                    alt="YouTube"
                    width={24}
                    height={24}
                    style={{ width: "24px", height: "24px" }}
                  />
                </Box>
              </Link>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
