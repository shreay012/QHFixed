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
import HeroSectionV3 from '@/features/booking/components/HeroSectionV3';

export default function Homepage() {
  return (
    <div className="w-full min-h-screen bg-white">
      <HeroSection />
      <ClientLogos />
      <CarouselSection />
      <WhyQuickSection />
      <BookResourceSection />
      <VibeCoding />
      <HeroSectionV3 />
      <HowHireWork />
      <HireWithConfidence />
      <WeDeploy />
      <ClientSection />
      <TechStack />
      <LetAnswer />
    </div>
  );
}
