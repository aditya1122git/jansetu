import React from 'react';
import { Compass, Sparkles } from './icons';

interface WelcomeSectionProps {
  language: 'hi' | 'en';
}

export const WelcomeSection: React.FC<WelcomeSectionProps> = ({ language }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 my-6">
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200/80 shadow-sm relative overflow-hidden">
        {/* Subtle accent bar at top */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#1C4D8D] via-[#C35504] to-[#1C4D8D]" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-4xl">
            {/* Header Badge & Title */}
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-lg bg-orange-50 text-[#C35504]">
                <Sparkles className="w-5 h-5" />
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-[#1C4D8D] tracking-tight">
                {language === 'hi' ? 'JanSetu Bihar में आपका स्वागत है' : 'Welcome to JanSetu Bihar'}
              </h3>
            </div>

            {/* Main Paragraph */}
            <p className="text-sm sm:text-base text-gray-700 leading-relaxed font-normal text-justify">
              {language === 'hi'
                ? 'जनसमस्याओं और आवेदनों का बेहतर प्रबंधन एक व्यवस्थित प्रक्रिया से शुरू होता है। JanSetu Bihar का उद्देश्य आवेदन संबंधी जानकारी को सुव्यवस्थित रखना, लंबित मामलों पर नज़र बनाए रखना और प्रत्येक आवेदन की प्रगति का रिकॉर्ड उपलब्ध कराना है।'
                : 'Effective management of citizen grievances and applications begins with an organized process. The mission of JanSetu Bihar is to streamline application records, maintain vigilant oversight on pending matters, and provide transparent progress tracking for every record.'}
            </p>

            {/* Supporting sentence highlighted */}
            <div className="flex items-start gap-2 bg-blue-50/60 border-l-4 border-[#1C4D8D] p-3 rounded-r-lg text-xs sm:text-sm font-semibold text-[#1C4D8D]">
              <Compass className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#C35504]" />
              <span>
                {language === 'hi'
                  ? 'एक ही प्लेटफॉर्म पर आवेदन दर्ज करें, रिकॉर्ड खोजें, प्राथमिकता निर्धारित करें और कार्रवाई की स्थिति को व्यवस्थित रूप से ट्रैक करें।'
                  : 'Register applications, search records, define priority classifications, and systematically track action status all within one integrated platform.'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

