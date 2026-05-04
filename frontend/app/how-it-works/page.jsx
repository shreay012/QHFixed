import {
  HowHireWork,
  HireWithConfidence,
  BookResourceSection,
  HowItWorksFaq,
} from "@/features/homepage/components";
import HowQuickHireWorksWithvideo from "@/features/about/components/HowQuickHireWorksWithvideo";
// Featured "Not sure what you need?" banner — same CMS record renders here,
// on /, and on /book-your-resource. Edit once in /admin/cms/banners.
import HeroSectionV3 from "@/features/booking/components/HeroSectionV3";

export default function HowItWorksPage() {
  return (
    <div className="w-full min-h-screen bg-white">
      {/* <HowHireWork /> */}
      <HowQuickHireWorksWithvideo hideVideo={false} />
      <HireWithConfidence />
      <BookResourceSection />
      <HeroSectionV3 />
      <HowItWorksFaq />
    </div>
  );
}
