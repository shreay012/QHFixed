"use client";

import React, { useState } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useTranslations } from "next-intl";
import { useCmsTranslate } from "@/lib/i18n/useCmsTranslate";

const ServiceFaq = ({ serviceData, isLoading }) => {
  const t = useTranslations("serviceFaq");
  // Admin can save FAQs as either plain strings (legacy) or i18n objects
  // ({en, de, …}). tCms picks the active locale for both shapes.
  const tCms = useCmsTranslate();
  const [expanded, setExpanded] = useState(false);

  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  // Static fallback FAQs (from translations so they can be localized)
  const staticFaqs = [
    { id: "panel1", question: t("q1"), answer: t("a1") },
    { id: "panel2", question: t("q2"), answer: t("a2") },
    { id: "panel3", question: t("q3"), answer: t("a3") },
  ];

  // Get FAQs from API or use static fallback if empty
  const faqs =
    serviceData?.faqs?.length > 0
      ? serviceData.faqs.map((faq, index) => ({
          id: `panel${index + 1}`,
          question: tCms(faq.questionI18n || faq.question) || "",
          answer: tCms(faq.answerI18n || faq.answer) || "",
        }))
      : staticFaqs;

  return (
    <section style={{ backgroundColor: "#FFFFFF", padding: "16px 38px" }}>
      <div
        className="max-w-4xl mx-auto"
        // style={{
        //   paddingTop: 'clamp(24px, 4vw, px)',
        //   paddingBottom: 'clamp(24px, 4vw, 48px)'
        // }}
      >
        {/* Header */}
        <div className="mb-12">
          <Typography
            variant="h2"
            className="text-left font-bold"
            sx={{
              fontSize: { xs: "2rem", md: "2.5rem", lg: "var(--font-size-35)" },
              fontWeight: "var( --font-weight-400)",
              color: "#374151",
            }}
          >
            {t("headingPart1")}{" "}
            <span
              style={{
                color: "var(--quickhire-green)",
                fontStyle: "italic",
                fontWeight: "var(--font-weight-700)",
              }}
            >
              {t("headingHighlight")}
            </span>{" "}
            {t("headingPart2")}
          </Typography>
        </div>

        {/* FAQ Accordions */}
        <div className="space-y-4">
          {faqs.map((faq) => (
            <Accordion
              key={faq.id}
              expanded={expanded === faq.id}
              onChange={handleChange(faq.id)}
              sx={{
                border: "1px solid #E5E7EB",
                borderRadius: "12px !important",
                boxShadow: "none",
                "&:before": {
                  display: "none",
                },
                "&.Mui-expanded": {
                  margin: "0 0 16px 0",
                },
              }}
            >
              <AccordionSummary
                expandIcon={
                  <ExpandMoreIcon
                    sx={{
                      color: "#45A735",
                      fontSize: "28px",
                    }}
                  />
                }
                sx={{
                  padding: "20px 24px",
                  "& .MuiAccordionSummary-content": {
                    margin: "12px 0",
                  },
                }}
              >
                <Typography
                  sx={{
                    fontSize: "16px",
                    fontWeight: 500,
                    color: "#374151",
                    lineHeight: 1.6,
                  }}
                >
                  Q: {faq.question}
                </Typography>
              </AccordionSummary>
              <AccordionDetails
                sx={{
                  padding: "0 24px 24px 24px",
                  borderTop: "1px solid #F3F4F6",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "15px",
                    color: "#6B7280",
                    lineHeight: 1.7,
                  }}
                >
                  {faq.answer}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServiceFaq;
