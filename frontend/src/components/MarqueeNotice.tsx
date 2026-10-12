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
            ? 'JanSetu Bihar (जनसेतु बिहार) — आवेदन एवं शिकायत प्रबंधन पोर्टल। "सम्राट का विज़न, नए बिहार का मिशन।" — राज्य के सभी 38 जिलों एवं 243 निर्वाचन क्षेत्रों में पारदर्शी समाधान व अनुश्रवण व्यवस्था सक्रिय है।'
            : 'Welcome to JanSetu Bihar — Application & Grievance Management Portal. "Samrat’s Vision, Mission of New Bihar." — Active grievance intake, prioritization, and tracking across all 38 Districts & 243 Assembly Constituencies.'}
        </div>
      </div>
    </div>
  );
};

