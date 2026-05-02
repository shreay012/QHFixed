import {
  HeroSection,
  ClientLogos,
  CarouselSection,
  WhyQuickSection,
  BookResourceSection,
  VibeCoding,
  HowHireWork,
  HireWithConfidence,
  WeDeploy,
  ClientSection,
  TechStack,
  LetAnswer,
} from '@/features/homepage/components';
import CmsBannerStrip from '@/components/cms/CmsBannerStrip';
import CmsBannerSlider from '@/components/cms/CmsBannerSlider';

export default function Homepage() {
  return (
    <div className="w-full min-h-screen bg-white">
      {/* CMS-driven announcement strip — admins control via /admin/cms/banners */}
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <CmsBannerStrip position="home-top" />
      </div>

      {/* Complete Homepage - All sections in original order */}
      <HeroSection />
      <ClientLogos />

      {/* CMS slider: home-secondary — slot below the marquee, used for
          expert-match / promo banners admins can rotate without a deploy. */}
      <div className="max-w-7xl mx-auto px-4 my-8">
        <CmsBannerSlider position="home-secondary" />
      </div>

      <CarouselSection />
      <WhyQuickSection />
      <BookResourceSection />
      <VibeCoding />

      {/* CMS slider: home-mid — second slot for ongoing campaigns. */}
      <div className="max-w-7xl mx-auto px-4 my-8">
        <CmsBannerSlider position="home-mid" />
      </div>

      <HowHireWork />
      <HireWithConfidence />
      <WeDeploy />
      <ClientSection />
      <TechStack />
      <LetAnswer />

      {/* CMS slider: home-bottom — final slot before footer. */}
      <div className="max-w-7xl mx-auto px-4 my-8">
        <CmsBannerSlider position="home-bottom" />
      </div>
    </div>
  );
}
