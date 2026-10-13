import React from 'react';
import { AlertCircle } from './icons';

interface MarqueeNoticeProps {
  language: 'hi' | 'en';
}

export const MarqueeNotice: React.FC<MarqueeNoticeProps> = ({ language }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 mt-3">
      <div className="bg-amber-50 border-y border-amber-200 py-1.5 px-3 flex items-center overflow-hidden text-sm">
        <div className="flex items-center gap-1 text-[#C35504] font-bold flex-shrink-0 pr-3 z-10 bg-amber-50 shadow-sm">
          <AlertCircle className="w-4 h-4 text-[#C35504]" />
          <span>{language === 'hi' ? 'सूचना:' : 'Notice:'}</span>
        </div>
        <div className="whitespace-nowrap animate-marquee text-[#1C4D8D] font-medium text-xs sm:text-sm">
          {language === 'hi'
            ? 'E-Sewa Tarapur (ई-सेवा तारापुर) — मुंगेर जिले के तारापुर विधानसभा क्षेत्र हेतु आवेदन एवं शिकायत प्रबंधन पोर्टल।'
            : 'Welcome to E-Sewa Tarapur — Application & Grievance Management Portal for Tarapur Assembly Constituency, Munger.'}
        </div>
      </div>
    </div>
  );
};

