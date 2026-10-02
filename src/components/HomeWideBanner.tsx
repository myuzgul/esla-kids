'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight } from 'lucide-react';

export interface BannerItem {
  id: string;
  title: string;
  subtitle?: string | null;
  badge?: string | null;
  buttonText?: string | null;
  buttonLink?: string | null;
  image: string;
  order: number;
  isActive: boolean;
}

interface Props {
  banners: BannerItem[];
}

export function HomeWideBanner({ banners }: Props) {
  const [current, setCurrent] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const activeBanners = banners && banners.length > 0 ? banners : [];

  const nextSlide = () => {
    if (activeBanners.length <= 1) return;
    setCurrent((prev) => (prev + 1) % activeBanners.length);
  };

  const prevSlide = () => {
    if (activeBanners.length <= 1) return;
    setCurrent((prev) => (prev - 1 + activeBanners.length) % activeBanners.length);
  };

  useEffect(() => {
    if (isHovered || activeBanners.length <= 1) return;

    timerRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % activeBanners.length);
    }, 5500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isHovered, activeBanners.length]);

  if (activeBanners.length === 0) {
    return null;
  }

  return (
    <section 
      className="relative w-full overflow-hidden bg-charcoal-950 select-none border-b border-cream-200"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Banner Slides Container */}
      <div className="relative w-full h-[400px] sm:h-[480px] md:h-[540px] lg:h-[580px]">
        {activeBanners.map((banner, index) => {
          const isActive = index === current;

          return (
            <div
              key={banner.id}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                isActive ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              {/* Background Image */}
              <img
                src={banner.image}
                alt={banner.title}
                className="w-full h-full object-cover object-center transform scale-100 transition-transform duration-7000 ease-out"
                style={{ transform: isActive ? 'scale(1.04)' : 'scale(1)' }}
              />

              {/* Gradient Overlays for High Legibility */}
              {/* Left-to-right dark gradient for text */}
              <div className="absolute inset-0 bg-gradient-to-r from-charcoal-950/90 via-charcoal-900/60 to-transparent lg:w-2/3" />
              {/* Subtle overall dark overlay for mobile */}
              <div className="absolute inset-0 bg-charcoal-950/30 lg:hidden" />
              {/* Bottom gradient fade */}
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-charcoal-950/60 to-transparent" />

              {/* Content Overlay */}
              <div className="absolute inset-0 flex items-center">
                <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 w-full">
                  <div className="max-w-2xl space-y-4 sm:space-y-6">
                    {/* Badge */}
                    {banner.badge && (
                      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/20 backdrop-blur-md border border-brand-400/40 text-brand-300 text-xs font-black tracking-wider uppercase animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <Sparkles className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
                        <span>{banner.badge}</span>
                      </div>
                    )}

                    {/* Title */}
                    <h2 className="font-heading font-black text-2xl sm:text-4xl md:text-5xl lg:text-6xl text-white tracking-tight leading-[1.12] drop-shadow-sm">
                      {banner.title}
                    </h2>

                    {/* Subtitle */}
                    {banner.subtitle && (
                      <p className="text-xs sm:text-base md:text-lg text-slate-200 font-normal leading-relaxed line-clamp-3 sm:line-clamp-none max-w-xl drop-shadow-xs">
                        {banner.subtitle}
                      </p>
                    )}

                    {/* CTA Button */}
                    {banner.buttonText && banner.buttonLink && (
                      <div className="pt-2">
                        <Link
                          href={banner.buttonLink}
                          className="inline-flex items-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl bg-brand-500 hover:bg-brand-600 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-xl shadow-brand-500/30 transition-all group"
                        >
                          <span>{banner.buttonText}</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Arrows (Shown if more than 1 banner) */}
      {activeBanners.length > 1 && (
        <>
          <button
            type="button"
            onClick={prevSlide}
            aria-label="Önceki Banner"
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/30 hover:bg-brand-500 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-90"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          <button
            type="button"
            onClick={nextSlide}
            aria-label="Sonraki Banner"
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/30 hover:bg-brand-500 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-90"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Dots Indicator */}
          <div className="absolute bottom-4 sm:bottom-6 inset-x-0 z-20 flex items-center justify-center gap-2">
            {activeBanners.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setCurrent(index)}
                aria-label={`Banner ${index + 1}`}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  current === index
                    ? 'w-8 h-2.5 bg-brand-500 shadow-md shadow-brand-500/50'
                    : 'w-2.5 h-2.5 bg-white/50 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
