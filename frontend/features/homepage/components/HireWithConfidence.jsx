"use client";

import { Box, Button, Typography } from "@mui/material";
import Image from "next/image";
import Link from "@/components/common/I18nLink";
import { useTranslations } from "next-intl";

const HireWithConfidence = () => {
  const t = useTranslations("homepage.hireConfidence");
  return (
    <section className="py-0 sm:py-12 px-0 sm:px-4 md:py-16 bg-gray-50">
      <div className="max-w-8xl mx-auto lg:px-20">
        <Box
          className="rounded-none sm:rounded-3xl overflow-hidden relative"
          sx={{
            backgroundColor: "#26472B",
            display: "flex",
            flexDirection: "column",
            minHeight: { xs: "auto", lg: "556px" },
          }}
        >
          {/* Mobile Layout */}
          <div className="lg:hidden">
            {/* Green Content Section */}
            <div className="relative p-6 pb-5 text-center">
              <h2 className="font-bold text-white mb-4 leading-[120%] text-lg sm:text-xl md:text-[26px]">
                {t("title")}
                <br />
                {t("titleLine2")}
              </h2>

              <p
                className="font-normal mb-6 text-sm sm:text-base md:text-[12px] leading-relaxed"
                style={{ color: "#D9D9D9" }}
              >
                {t("bodyFull")}
              </p>

              <div className="mb-4 flex justify-center">
                <Link
                  href="/book-your-resource"
                  style={{ textDecoration: "none" }}
                >
                  <Button
                    variant="contained"
                    className="rounded-full font-semibold normal-case"
                    sx={{
                      backgroundColor: "white",
                      color: "black",
                      borderRadius: "10px",
                      width: { xs: "100px", md: "110px" },
                      height: { xs: "35px", md: "48px" },
                      "&:hover": {
                        backgroundColor: "#f0f0f0",
                      },
                      textTransform: "none",
                      fontSize: { xs: "14px", md: "16px" },
                      fontWeight: 600,
                    }}
                  >
                    {t("tryNow")}
                  </Button>
                </Link>
              </div>

              <p className="text-[#B4B4B4] text-[14px]">
                {t("termsApply")}
              </p>

              {/* Guaranteed Refund Icon - Bottom Left on Mobile */}
              <div className="absolute bottom-[-75%] left-6 z-10">
                <Image
                  src="/images/book-services/starticonimage.svg"
                  alt="Guaranteed 100% Refund"
                  width={120}
                  height={120}
                  className="w-[115px] h-[120px]"
                />
              </div>
            </div>

            {/* Image Section */}
            <div className="relative w-full h-[360px]">
              <Image
                src="/images/agree-hand-shake-business.png"
                alt="Professional"
                width={650}
                height={407}
                className="w-full h-full object-cover"
                style={{ objectPosition: "center top" }}
              />
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden lg:flex flex-col flex-1 relative">
            {/* Guaranteed Refund Icon - Centered between sections on Desktop */}
            <div
              className="absolute z-[1]"
              style={{ left: "54%", top: "8%", transform: "translateX(-50%)" }}
            >
              <Image
                src="/images/book-services/starticonimage.svg"
                alt="Guaranteed 100% Refund"
                width={131}
                height={131}
                className="w-[131px] h-[131px]"
              />
            </div>

            <div className="flex flex-row flex-1">
              {/* Left Content Section */}
              <div className="flex-1 p-12 flex flex-col justify-center relative z-10">
                <h2 className="font-bold text-white mb-6 leading-[150%] capitalize text-[42px]">
                  {t("title")}
                  <br />
                  {t("titleLine2")}
                </h2>

                <p
                  className="font-normal mb-8 max-w-md text-[20px] leading-relaxed"
                  style={{ color: "#D9D9D9" }}
                >
                  {t("body")}
                </p>

                <div className="mb-6">
                  {/* <Button
                    variant="contained"
                    className="rounded-full font-semibold normal-case"
                    sx={{
                      backgroundColor: "white",
                      color: "black",
                      borderRadius: "13px",
                      width: "126px",
                      height: "55px",
                      "&:hover": {
                        backgroundColor: "#f0f0f0",
                      },
                      textTransform: "none",
                      fontSize: "20px",
                      fontWeight: 600,
                    }}
                  >
                    Try Now
                  </Button> */}

                  <Link href="/book-your-resource" style={{ textDecoration: 'none' }}>
  <Button
    variant="contained"
    className="rounded-full font-semibold normal-case"
    sx={{
      backgroundColor: "white",
      color: "black",
      borderRadius: "13px",
      width: "126px",
      height: "55px",
      "&:hover": {
        backgroundColor: "#f0f0f0",
      },
      textTransform: "none",
      fontSize: "20px",
      fontWeight: 600,
    }}
  >
    {t("tryNow")}
  </Button>
</Link>
                </div>

                {/* <p className="text-gray-300 text-[14px]">
                  *Terms & Condition Apply
                </p> */}
              </div>

              {/* Right Image Section */}
              <div className="flex-1 relative min-h-[400px]">
                <Image
                  src="/images/agree-hand-shake-business.png"
                  alt="Professional"
                  width={650}
                  height={407}
                  className="w-full h-full object-cover"
                  style={{ objectPosition: "center" }}
                />
              </div>
            </div>

            {/* Bottom Text */}
            <div className="px-8 py-6 text-center">
              <p className="text-white text-base leading-relaxed">
                {t("bodyFull")}
              </p>
            </div>
          </div>
        </Box>
      </div>
    </section>
  );
};

export default HireWithConfidence;
