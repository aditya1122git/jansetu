import React from 'react';
import { FilePlus, SlidersHorizontal, RefreshCw, BarChart2 } from './icons';

interface WorkflowSectionProps {
  language: 'hi' | 'en';
}

export const WorkflowSection: React.FC<WorkflowSectionProps> = ({ language }) => {
  const steps = [
    {
      title: language === 'hi' ? 'आवेदन दर्ज करें' : 'Register Intake',
      desc: language === 'hi' ? 'आवश्यक विवरण और दस्तावेज जोड़ें।' : 'Enter applicant information, constituency, and attachments.',
      icon: FilePlus,
      color: 'from-blue-600 to-[#1C4D8D]',
      borderColor: 'border-blue-600'
    },
    {
      title: language === 'hi' ? 'प्राथमिकता निर्धारित करें' : 'Set Priority Tier',
      desc: language === 'hi' ? 'आवेदन को Important या Normal श्रेणी में रखें।' : 'Classify into Important or Normal priority categories.',
      icon: SlidersHorizontal,
      color: 'from-amber-600 to-[#C35504]',
      borderColor: 'border-amber-600'
    },
    {
      title: language === 'hi' ? 'स्थिति और कार्रवाई अपडेट करें' : 'Update Actions',
      desc: language === 'hi' ? 'आवेदन की प्रगति तथा फॉलो-अप रिकॉर्ड करें।' : 'Log stage updates, officer routing, and follow-up notes.',
      icon: RefreshCw,
      color: 'from-blue-700 to-[#163c6f]',
      borderColor: 'border-blue-700'
    },
    {
      title: language === 'hi' ? 'रिपोर्ट और समीक्षा' : 'Review & Reports',
      desc: language === 'hi' ? 'आवेदन की वर्तमान स्थिति और संबंधित रिपोर्ट देखें।' : 'Monitor resolution status and audit metrics.',
      icon: BarChart2,
      color: 'from-emerald-600 to-teal-700',
      borderColor: 'border-emerald-600'
    }
  ];

  return (
    <section className="py-12 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4">
        {/* Section Heading */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-block text-[#C35504] font-bold text-xs uppercase tracking-wider mb-1">
            {language === 'hi' ? 'प्रक्रिया एवं कार्यप्रवाह' : 'Operational Lifecycle'}
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-[#1C4D8D] tracking-tight">
            {language === 'hi' ? 'आवेदन से प्रगति तक' : 'From Submission to Progress'}
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 mt-1.5">
            {language === 'hi'
              ? '४ सरल चरणों में सुव्यवस्थित एवं जवाबदेह प्रबंधन चक्र'
              : 'Structured 4-step governance cycle designed for transparency and timely follow-up.'}
          </p>
        </div>

        {/* 4-Step Process: Horizontal on desktop, Vertical on mobile */}
        <div className="relative">
          {/* Subtle horizontal connecting line on desktop */}
          <div className="hidden md:block absolute top-1/2 left-12 right-12 h-0.5 bg-gray-200 -translate-y-6 z-0" />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
            {steps.map((item, idx) => {
              const IconComponent = item.icon;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-sm hover:shadow-md transition duration-200 text-center relative flex flex-col items-center"
                >
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${item.color} text-white flex items-center justify-center shadow-md mb-3`}><IconComponent className="w-5 h-5" /></div>

                  {/* Title */}
                  <h4 className="font-extrabold text-gray-900 text-base mb-1.5">
                    {item.title}
                  </h4>

                  {/* Description */}
                  <p className="text-xs text-gray-600 leading-relaxed max-w-xs">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

