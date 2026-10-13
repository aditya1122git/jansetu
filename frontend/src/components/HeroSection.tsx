import React from 'react';
import { PlusCircle, Search, ArrowRight } from './icons';

interface HeroSectionProps {
  onOpenSection: (section: 'form' | 'table') => void;
  language: 'hi' | 'en';
  fullWidth?: boolean;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenSection, language, fullWidth = false }) => {
  return (
    <div className={`${fullWidth ? 'w-full px-4 sm:px-6' : 'max-w-7xl px-4'} mx-auto mt-6`}>
      <div className="bg-gradient-to-r from-[#0f2d57] via-[#163c6f] to-[#1C4D8D] rounded-2xl p-6 sm:p-8 md:p-10 text-white shadow-xl relative overflow-hidden border border-blue-900/40">
        {/* Subtle decorative background circles */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-bold text-amber-300 mb-4 border border-white/10">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>E-Sewa Tarapur • {language === 'hi' ? 'आवेदन एवं शिकायत प्रबंधन पोर्टल' : 'Application Management'}</span>
          </div>

          {/* Headings */}
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight mb-3">
            {language === 'hi' ? 'जनता की बात, समाधान के साथ।' : 'Every Application Matters.'}
          </h2>

          {/* Description */}
          <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed font-normal mb-8 text-justify sm:text-left">
            {language === 'hi'
              ? 'E-Sewa Tarapur एक व्यवस्थित आवेदन एवं शिकायत प्रबंधन पोर्टल है, जहाँ प्राप्त आवेदनों का रिकॉर्ड, उनकी प्राथमिकता, वर्तमान स्थिति और आगे की कार्रवाई को एक ही स्थान पर व्यवस्थित किया जा सकता है।'
              : 'E-Sewa Tarapur brings applications, records, follow-ups and progress tracking together in one organized platform. Find the information you need, monitor application status and keep every record easy to manage.'}
          </p>

          {/* Buttons */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <button
              onClick={() => onOpenSection('form')}
              className="inline-flex items-center gap-2.5 bg-[#C35504] hover:bg-[#a64700] text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg transition duration-200 transform hover:-translate-y-0.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{language === 'hi' ? 'नया आवेदन दर्ज करें' : 'File New Application'}</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </button>

            <button
              onClick={() => onOpenSection('table')}
              className="inline-flex items-center gap-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/30 backdrop-blur-sm px-6 py-3 rounded-xl font-bold text-sm transition duration-200"
            >
              <Search className="w-4 h-4 text-amber-300" />
              <span>{language === 'hi' ? 'आवेदन की स्थिति देखें' : 'View Application Status'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

