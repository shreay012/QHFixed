import {
  Mainbanner,
  ServiceSelectionGridV5,
  HeroSectionV3,
  BookYourResourceGrid,
  VideoSectionV3,
  BookingFaq,
  ExpertCardV3,
} from "@/features/booking/components";
import CmsBannerSlider from "@/components/cms/CmsBannerSlider";

export const metadata = {
  title: "Book Your Resource - QuickHire",
  description:
    "Require a tech or software resource? Get an experienced developer, designer, QA, and more. Hire verified professionals in minutes.",
  openGraph: {
    title: "Book Your Resource - QuickHire",
    description:
      "Hire verified tech professionals immediately - developers, designers, QA engineers, and more.",
    url: "https://quickhire.com/book-your-resource",
    images: [
      {
        url: "/images/booking-og.jpg",
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default function BookResourcePage() {
  return (
    <main className="flex-1">
      <Mainbanner />

      {/* CMS slot: booking-flow-top — admins can rotate booking-flow
          promos / expert-match callouts here without touching code. */}
      <div className="max-w-7xl mx-auto px-4 my-6">
        <CmsBannerSlider position="booking-flow-top" />
      </div>

      <ServiceSelectionGridV5 />
      <HeroSectionV3 />
      <BookYourResourceGrid />
      <VideoSectionV3 />
      <BookingFaq />
    </main>
  );
}
