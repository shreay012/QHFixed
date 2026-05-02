"use client";
import { CardPrimary } from "@/components/ui";
import Button from "@mui/material/Button";
import Link from "@/components/common/I18nLink";
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/store/hooks";
import { fetchAllServices } from "@/lib/redux/slices/discoverSlice/discoverserviceSlice";
import { useTranslations } from "next-intl";

const BookResourceSection = () => {
  const t = useTranslations("bookExperts");
  const dispatch = useAppDispatch();
  const { allServices, isLoading, error } = useAppSelector(
    (state) => state.services,
  );

  useEffect(() => {
    dispatch(fetchAllServices());
  }, [dispatch]);

  return (
    <section
      className="w-full py-12 sm:py-16 md:py-20"
      style={{ backgroundColor: "var( --bg-tertiary)" }}
    >
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-8 sm:gap-10 md:gap-12 px-4 sm:px-6 lg:flex-row lg:gap-16">
        <div className="w-full lg:max-w-[280px] space-y-4 sm:space-y-6">
          <div className="flex items-start gap-4 sm:gap-5 border-l-0 sm:border-l-4 md:border-l-6 border-lime-500 pl-0 sm:pl-4 md:pl-5 justify-center sm:justify-start">
            <h2
              className="leading-[150%] tracking-[0px] capitalize font-['Open_Sauce_One_ExtraBold'] text-center sm:text-left"
              style={{
                color: "#404040",
                fontWeight: 700,
                fontSize: "clamp(24px, 5vw, 36px)",
              }}
            >
              {t("title")}
            </h2>
          </div>
          <p className="text-[16px] sm:text-[18px] md:text-[20px] font-normal leading-[150%] tracking-[0px] capitalize text-[#636363] font-['Open_Sauce_One_Regular'] text-center sm:text-left">
            {t("subtitle")}
          </p>
          <div className="flex justify-center sm:justify-start">
            <Link href="/book-your-resource" style={{ textDecoration: "none" }}>
              <Button
                variant="contained"
                className="rounded-[8px] font-['Open_Sauce_One_Regular']"
                sx={{
                  background:
                    "linear-gradient(to right, #26472B 50%, #3FA12B 50%)",
                  backgroundSize: "200% 100%",
                  backgroundPosition: "right bottom",
                  textTransform: "none",
                  padding: { xs: "14px 20px", sm: "16px 24px" },
                  color: "#FFFFFF",
                  fontWeight: 700,
                  fontSize: "clamp(14px, 2.5vw, 16px)",
                  width: { xs: "200px", sm: "auto" },
                  // boxShadow: "0px 14px 34px 0px #78EB5473",
                  transition:
                    "background-position 0.3s ease-out, box-shadow 0.3s ease",
                  "&:hover": {
                    backgroundPosition: "left bottom",
                    boxShadow: "0px 14px 34px 0px #78EB5473",
                  },
                }}
              >
                {t("ctaBtn")}
              </Button>
            </Link>
          </div>
        </div>

        {/* <div className="grid flex-1 grid-cols-1 gap-1 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
          {allServices?.data?.services.slice(0, 9).map((card) => (
            <CardPrimary card={card} key={card?.name} />
          ))}
        </div> */}
        <div className="grid flex-1 grid-cols-2 gap-1 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
          {(() => {
            const list = Array.isArray(allServices)
              ? allServices
              : Array.isArray(allServices?.data?.services)
                ? allServices.data.services
                : Array.isArray(allServices?.data)
                  ? allServices.data
                  : [];
            if (isLoading && list.length === 0) {
              return <p className="col-span-full text-center">{t("loading")}</p>;
            }
            if (list.length === 0) {
              return <p className="col-span-full text-center">{t("noServices")}</p>;
            }
            return list.slice(0, 6).map((card) => (
              <CardPrimary card={card} key={card?._id || card?.name} />
            ));
          })()}
        </div>
      </div>
    </section>
  );
};

export default BookResourceSection;
