'use client';

import React from 'react';
import Image from 'next/image';
import { useI18nRouter } from '@/lib/hooks/useI18nRouter';
import { useTranslations } from 'next-intl';
import { useCmsTranslate } from '@/lib/i18n/useCmsTranslate';

const TechnologyPill = ({ label }) => (
  <div className="flex items-center gap-1 md:gap-2 bg-white rounded-full px-3 md:px-4 py-1.5 md:py-2 shadow-sm border border-transparent hover:border-[#45A735] transition-all cursor-pointer group">
    <span className="text-[#343741] text-[10px] md:text-sm font-medium whitespace-nowrap">{label}</span>
    <Image 
      src="/images/resource-services/book-resource-arrow.svg" 
      alt="arrow" 
      width={10} 
      height={10} 
      className="opacity-70 group-hover:opacity-100 transition-opacity md:w-4 md:h-4"
    />
  </div>
);

const ServiceCardGridV3 = ({ service, backgroundColor, iconUrl }) => {
  const router = useI18nRouter();
  const tServiceDetails = useTranslations('serviceDetails');
  const tCms = useCmsTranslate();

  const displayedTechs = service.technologies?.slice(0, 7) || [];

  const navigateToService = () => {
    if (!service?._id) return;
    sessionStorage.setItem("selectedService", JSON.stringify(service));
    router.push(`/service-details/${service.slug || service._id}`);
  };

  const handleBookNow = navigateToService;
  const handleViewAll = navigateToService;

  return (
    <div 
      className="rounded-[20px] md:rounded-[32px] p-4 md:p-8 flex flex-col h-full shadow-lg relative overflow-hidden"
      style={{ backgroundColor }}
    >
      {/* Background Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ 
          backgroundImage: "url('/images/resource-services/book-resource-bg.png')",
          backgroundSize: 'cover',
          mixBlendMode: 'overlay'
        }}
      />

      <div className="relative z-10 flex flex-col h-full">
        {/* Header: Icon + Title */}
        <div className="flex items-center gap-2 md:gap-4 mb-2">
          <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center shrink-0">
            <Image 
              src={iconUrl} 
              alt={service.name} 
              width={24} 
              height={24} 
              className="brightness-0 invert md:w-8 md:h-8"
            />
          </div>
          <h3 className="text-white text-lg md:text-2xl font-bold font-['Open_Sauce_One_Bold']">
            {tCms(service.name)}
          </h3>
        </div>

        {/* Tagline — uses admin tagline (service.tagline / content) first,
            then trims the description to a one-liner so each card shows its
            own copy instead of a global hardcoded string. */}
        <p className="text-white/90 text-xs md:text-sm mb-4 md:mb-6 ml-10 md:ml-14 font-['Open_Sauce_One_Regular'] line-clamp-2">
          {tCms(service.tagline) ||
            tCms(service.content) ||
            (() => {
              const desc = tCms(service.descriptionI18n || service.description) || '';
              const firstSentence = String(desc).split(/[.!?]/)[0];
              return firstSentence ? firstSentence.trim() + '.' : '';
            })() ||
            ''}
        </p>

        {/* Divider */}
        <div className="h-[1px] bg-white/20 w-full mb-4 md:mb-6" />

        {/* Technologies Wrap */}
        <div className="flex flex-wrap gap-2 md:gap-3 mb-4 md:mb-8 flex-grow content-start">
          {displayedTechs.map((tech, index) => (
            <TechnologyPill key={`${tech.id}-${index}`} label={tCms(tech.name)} />
          ))}
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between mt-auto gap-2">
          <button 
            onClick={handleViewAll}
            className="text-white text-xs md:text-sm font-semibold underline underline-offset-2 md:underline-offset-4 decoration-2 hover:text-white/80 transition-colors cursor-pointer"
          >
            View All ({service.technologies?.length || 0})
          </button>
          
          <button 
            onClick={handleBookNow}
            className="bg-white px-4 md:px-8 py-2 md:py-3 rounded-lg md:rounded-xl font-bold text-xs md:text-sm hover:bg-white/90 transition-colors shadow-md cursor-pointer"
            style={{ color: backgroundColor }}
          >
            {tServiceDetails('bookNow')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServiceCardGridV3;
