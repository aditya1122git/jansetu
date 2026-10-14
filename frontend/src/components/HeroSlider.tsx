import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from './icons';

const slides = [
  {
    id: 1,
    image: '/assets/Web_Images/Slide2.webp',
    alt: 'बढ़ता बिहार, बदलता बिहार - E-Sewa Tarapur'
  },
  {
    id: 2,
    image: '/assets/Web_Images/Slide1.webp',
    alt: 'सम्राट का विज़न, नए बिहार का मिशन - E-Sewa Tarapur'
  },
  {
    id: 3,
    image: '/assets/Web_Images/Slide3.webp',
    alt: 'सम्राट की हुंकार, विकास को मिली रफ़्तार - E-Sewa Tarapur'
  },
  {
    id: 4,
    image: '/assets/Web_Images/Slide4.png',
    alt: 'सम्राट चौधरी की पहचान विकास, सुशासन और स्वाभिमान - E-Sewa Tarapur'
  }
];

export const HeroSlider: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<any>(null);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  useEffect(() => {
    if (!isPaused) {
      timerRef.current = setInterval(() => {
        nextSlide();
      }, 4000); // 4 seconds interval exactly as configured on reference website
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, isPaused]);

  return (
    <div
      className="relative w-full max-w-[1240px] mx-auto overflow-hidden bg-slate-950 group shadow-xl sm:rounded-2xl my-2"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Slides Container */}
      <div
        className="flex transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {slides.map((slide, idx) => (
          <div
            key={slide.id}
            className="w-full flex-shrink-0 relative h-[380px] sm:h-[440px] md:h-[480px] lg:h-[500px] bg-slate-950 flex items-center justify-center overflow-hidden"
          >
            {/* Ambient matching background */}
            <img
              src={slide.image}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-110 pointer-events-none select-none"
            />
            {/* Crisp uncropped slide */}
            <img
              src={slide.image}
              alt={slide.alt}
              className="relative z-10 max-w-full max-h-full w-auto h-auto object-contain select-none drop-shadow-md"
              loading={idx === 0 ? 'eager' : 'lazy'}
            />
          </div>
        ))}
      </div>

      {/* Previous Button */}
      <button
        onClick={prevSlide}
        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-black/40 hover:bg-black/70 text-white rounded-full flex items-center justify-center backdrop-blur-sm opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 z-10 shadow-md"
        aria-label="Previous Slide"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      {/* Next Button */}
      <button
        onClick={nextSlide}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-black/40 hover:bg-black/70 text-white rounded-full flex items-center justify-center backdrop-blur-sm opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 z-10 shadow-md"
        aria-label="Next Slide"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Indicator Pills */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`transition-all duration-300 rounded-full h-2.5 ${
              currentIndex === idx
                ? 'w-8 bg-[#C35504] shadow-md'
                : 'w-2.5 bg-white/70 hover:bg-white'
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

