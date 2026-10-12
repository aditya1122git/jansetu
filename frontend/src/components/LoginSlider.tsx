import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, Sparkles, Building2, ShieldCheck, FileText, CheckCircle2 } from './icons';

export interface LoginSlideItem {
  id: number;
  image: string;
  badge: { hi: string; en: string };
  title: { hi: string; en: string };
  subtitle: { hi: string; en: string };
  alt: string;
  imagePosition?: string;
  icon?: string;
}

const slides: LoginSlideItem[] = [
  {
    id: 1,
    image: '/assets/Web_Images/cm_samrat_choudhary.png',
    badge: {
      hi: 'माननीय मुख्यमंत्री',
      en: 'Hon’ble Chief Minister'
    },
    title: {
      hi: 'श्री सम्राट चौधरी',
      en: 'Shri Samrat Choudhary'
    },
    subtitle: {
      hi: 'JanSetu Bihar — जनता की बात, समाधान के साथ। जन-समस्याओं के त्वरित एवं पारदर्शी समाधान हेतु संकल्पित सुशासन।',
      en: 'JanSetu Bihar — Transparent & Responsive Governance dedicated to efficient application management.'
    },
    alt: 'CM Samrat Choudhary - JanSetu Bihar Portal',
    imagePosition: 'object-center'
  },
  {
    id: 2,
    image: '/assets/Web_Images/Slide2.webp',
    badge: {
      hi: 'लोक शिकायत निवारण प्रणाली',
      en: 'Citizen Grievance Redressal'
    },
    title: {
      hi: 'सम्राट का विज़न, नए बिहार का मिशन',
      en: 'Samrat’s Vision, Mission of New Bihar'
    },
    subtitle: {
      hi: 'प्रत्येक नागरिक आवेदन की त्रिस्तरीय निगरानी, पारदर्शी समीक्षा एवं समयबद्ध निस्तारण प्रणाली।',
      en: 'JanSetu Bihar — Citizen Grievance Redressal: End-to-end multi-tier tracking from intake to verified resolution.'
    },
    alt: 'JanSetu Bihar Citizen Grievance Redressal Banner',
    imagePosition: 'object-center'
  },
  {
    id: 3,
    image: '/assets/Web_Images/Slide1.webp',
    badge: {
      hi: 'आधारभूत संरचना एवं विकास',
      en: 'Infrastructure & Development'
    },
    title: {
      hi: 'बिहार समग्र विकास — 38 जिले व 243 विधानसभा क्षेत्र',
      en: 'Bihar Infrastructure Projects & Regional Development'
    },
    subtitle: {
      hi: 'वाल्मीकि नगर से चकाई तक सड़क, सेतु, स्वास्थ्य एवं जन-कल्याणकारी परियोजनाओं का तीव्र विस्तार।',
      en: 'Empowering all 38 districts and 243 assembly constituencies with modern infrastructure, bridges, and public amenities.'
    },
    alt: 'Bihar Infrastructure and Delimitation Banner',
    imagePosition: 'object-center'
  },
  {
    id: 4,
    image: '/assets/Web_Images/Slide3.webp',
    badge: {
      hi: 'विकास एवं सुशासन',
      en: 'Development & Good Governance'
    },
    title: {
      hi: 'सम्राट की हुंकार, विकास को मिली रफ़्तार',
      en: 'Samrat’s Clarion Call — Rapid Pace to Development'
    },
    subtitle: {
      hi: 'बिहार के समग्र विकास, पारदर्शी समीक्षा एवं जनकल्याणकारी योजनाओं का तीव्र क्रियान्वयन।',
      en: 'Accelerating Bihar’s holistic growth with transparent reviews and rapid execution of public welfare initiatives.'
    },
    alt: 'सम्राट की हुंकार, विकास को मिली रफ़्तार - JanSetu Bihar',
    imagePosition: 'object-center'
  },
  {
    id: 5,
    image: '/assets/Web_Images/Slide4.webp',
    badge: {
      hi: 'संकल्प एवं सुशासन',
      en: 'Resolution & Governance'
    },
    title: {
      hi: 'सम्राट का संकल्प, बिहार का विकल्प',
      en: 'Samrat’s Resolution — Bihar’s Progressive Choice'
    },
    subtitle: {
      hi: 'जनता की बात, समाधान के साथ — पारदर्शी सुशासन, समयबद्ध निस्तारण एवं सशक्त बिहार।',
      en: 'Responsive governance dedicated to transparent, verified, and time-bound grievance redressal.'
    },
    alt: 'सम्राट का संकल्प, बिहार का विकल्प - JanSetu Bihar',
    imagePosition: 'object-center'
  }
];

interface LoginSliderProps {
  language: 'hi' | 'en';
}

export const LoginSlider: React.FC<LoginSliderProps> = ({ language }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});

  const sliderRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<any>(null);

  // Check reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const listener = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', listener);
    }
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', listener);
      }
    };
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  }, []);

  // Automatic transition every 4.5 seconds (4500 ms) within 4–5 seconds requirement
  useEffect(() => {
    if (!isPaused && !prefersReducedMotion) {
      timerRef.current = setInterval(() => {
        nextSlide();
      }, 4500);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [nextSlide, isPaused, prefersReducedMotion]);

  // Keyboard navigation support
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      prevSlide();
    } else if (e.key === 'ArrowRight') {
      nextSlide();
    }
  };

  const handleImageError = (id: number) => {
    setFailedImages((prev) => ({ ...prev, [id]: true }));
  };

  return (
    <div
      ref={sliderRef}
      role="region"
      aria-roledescription="carousel"
      aria-label="JanSetu Bihar Government Portal Sliding Image Banner"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      className="login-slider relative w-full overflow-hidden bg-slate-950 text-white shadow-2xl group outline-none select-none border-b-2 border-amber-500/80"
    >
      {/* Viewport with Increased Vertical Breadth / Height */}
      <div className="relative w-full h-[360px] sm:h-[420px] md:h-[460px] lg:h-[490px] overflow-hidden bg-slate-950">
        {/* Horizontal Sliding Reel Container */}
        <div
          className={`flex w-full h-full ${
            prefersReducedMotion ? '' : 'transition-transform duration-700 ease-in-out'
          }`}
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {slides.map((slide, index) => {
            const isError = failedImages[slide.id];
            const isActive = index === currentIndex;

            return (
              <div
                key={slide.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`Slide ${index + 1} of ${slides.length}: ${slide.title[language]}`}
                aria-hidden={!isActive}
                className="relative w-full h-full flex-shrink-0 overflow-hidden bg-slate-950 flex items-center justify-center"
              >
                {/* Ambient glow matching slide palette */}
                <img
                  src={slide.image}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-110 pointer-events-none select-none"
                />

                {/* Banner Photograph */}
                {!isError ? (
                  <img
                    src={slide.image}
                    alt={slide.alt}
                    onError={() => handleImageError(slide.id)}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    className="relative z-10 max-w-full max-h-full w-auto h-auto object-contain select-none drop-shadow-md"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#0c2340] via-[#1C4D8D] to-[#0a192f] flex items-center justify-center p-6 text-center">
                    <div className="max-w-md">
                      <Sparkles className="w-12 h-12 text-amber-400 mx-auto mb-2 opacity-80" />
                      <div className="text-xl font-bold text-white">{slide.title[language]}</div>
                      <div className="text-xs text-blue-200 mt-1">{slide.subtitle[language]}</div>
                    </div>
                  </div>
                )}

                {/* Government Portal Vignette Gradients (Only for raw CM portrait slide 1) */}
                {slide.id === 1 && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/45 to-slate-950/20 pointer-events-none" />
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/35 to-transparent pointer-events-none" />
                  </>
                )}

                {/* Top Subtle Edge Highlight */}
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-white to-emerald-600 opacity-80" />

                {/* Slide Caption & Themes (Only for slide 1 so banner text is completely unobstructed) */}
                {slide.id === 1 && (
                  <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-7 md:p-10 lg:p-12 z-20 pointer-events-none">
                    <div className="max-w-3xl transform transition-transform duration-500 ease-out translate-y-0">
                      {/* Official Category / Theme Badge */}
                      <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 px-3 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider mb-2 sm:mb-3 shadow-lg pointer-events-auto">
                        <Sparkles className="w-3.5 h-3.5 text-slate-950 flex-shrink-0" />
                        <span>{slide.badge[language]}</span>
                      </div>

                      {/* Headline */}
                      <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-white tracking-tight drop-shadow-lg leading-tight mb-1.5 sm:mb-2.5">
                        {slide.title[language]}
                      </h2>

                      {/* Bilingual Subtitle / Theme Statement */}
                      <p className="text-xs sm:text-sm md:text-base text-blue-100 font-medium leading-relaxed max-w-2xl drop-shadow line-clamp-2 sm:line-clamp-none">
                        {slide.subtitle[language]}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Previous Slide Navigation Arrow */}
      <button
        type="button"
        onClick={prevSlide}
        aria-label="Previous Slide"
        className="absolute left-2 sm:left-5 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-slate-950/65 hover:bg-[#1C4D8D] text-white flex items-center justify-center backdrop-blur-md border border-white/20 shadow-xl transition-all duration-200 z-30 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 hover:scale-105"
      >
        <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {/* Next Slide Navigation Arrow */}
      <button
        type="button"
        onClick={nextSlide}
        aria-label="Next Slide"
        className="absolute right-2 sm:right-5 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-slate-950/65 hover:bg-[#1C4D8D] text-white flex items-center justify-center backdrop-blur-md border border-white/20 shadow-xl transition-all duration-200 z-30 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 hover:scale-105"
      >
        <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {/* Slide Indicators / Pagination Dots & Controls */}
      <div className="absolute bottom-3 sm:bottom-4 right-4 sm:right-8 flex items-center gap-2.5 z-30 pointer-events-auto bg-slate-950/75 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 shadow-lg">
        {/* Pagination Dots */}
        <div className="flex items-center gap-1.5">
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              aria-current={currentIndex === idx ? 'true' : 'false'}
              className={`transition-all duration-300 rounded-full h-2.5 ${
                currentIndex === idx
                  ? 'w-7 sm:w-8 bg-amber-400 shadow-sm'
                  : 'w-2.5 bg-white/40 hover:bg-white/80'
              }`}
            />
          ))}
        </div>

        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={() => setIsPaused(!isPaused)}
          aria-label={isPaused ? 'Resume auto transition' : 'Pause auto transition'}
          className="ml-1 text-slate-300 hover:text-white transition p-0.5"
          title={isPaused ? 'Resume slideshow' : 'Pause slideshow'}
        >
          {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
        </button>

        {/* Slide Counter */}
        <span className="text-[11px] text-slate-300 font-mono font-bold pl-1.5 border-l border-white/20">
          0{currentIndex + 1} / 0{slides.length}
        </span>
      </div>
    </div>
  );
};

export default LoginSlider;

