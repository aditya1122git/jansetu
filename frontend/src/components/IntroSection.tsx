import React from 'react';
import { Database, CheckCircle2, Eye, ShieldCheck } from './icons';

interface IntroSectionProps {
  language: 'hi' | 'en';
}

export const IntroSection: React.FC<IntroSectionProps> = ({ language }) => {
  return (
    <section className="py-12 bg-gray-50/70 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4">
        {/* Section Heading & Subheading */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 bg-blue-50 text-[#1C4D8D] px-3 py-1 rounded-full text-xs font-bold mb-3 border border-blue-200">
            <ShieldCheck className="w-3.5 h-3.5 text-[#C35504]" />
            <span>{language === 'hi' ? 'विशेषताएं एवं क्षमताएं' : 'Key Capabilities'}</span>
          </div>

          <h3 className="text-2xl sm:text-3xl font-black text-[#1C4D8D] tracking-tight mb-3">
            {language === 'hi' ? 'आवेदन प्रबंधन, अब और व्यवस्थित' : 'Application Management, Systematized'}
          </h3>

          <p className="text-sm sm:text-base text-gray-700 leading-relaxed text-justify sm:text-center">
            {language === 'hi'
              ? 'किसी भी आवेदन की सही जानकारी और समय पर समीक्षा उसके प्रभावी प्रबंधन में महत्वपूर्ण भूमिका निभाती है। E-Sewa Tarapur आवेदन रिकॉर्ड को एक सुव्यवस्थित स्थान पर रखने, महत्वपूर्ण मामलों को अलग पहचानने और लंबित आवेदनों पर नियमित फॉलो-अप बनाए रखने में सहायता करता है।'
              : 'Accurate recordkeeping and timely review play an indispensable role in efficient application governance. E-Sewa Tarapur assists in maintaining all intake records in a structured repository, distinguishing high-priority matters, and sustaining regular follow-up on active files.'}
          </p>
        </div>

        {/* Three Feature Blocks */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Feature 1: व्यवस्थित रिकॉर्ड */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#1C4D8D] flex items-center justify-center mb-4">
                <Database className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">
                {language === 'hi' ? '१. व्यवस्थित रिकॉर्ड' : '1. Structured Records'}
              </h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                {language === 'hi'
                  ? 'आवेदन विवरण, संलग्न दस्तावेज और संबंधित जानकारी को एक ही रिकॉर्ड में सुरक्षित रखें।'
                  : 'Consolidate citizen intake details, supporting attachments, and verification notes securely within a single immutable file.'}
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-1.5 text-xs font-bold text-[#1C4D8D]">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <span>Unified Document Vault</span>
            </div>
          </div>

          {/* Feature 2: स्पष्ट स्थिति */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-[#C35504] flex items-center justify-center mb-4">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">
                {language === 'hi' ? '२. स्पष्ट स्थिति' : '2. Transparent Status'}
              </h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                {language === 'hi'
                  ? 'Pending, In Progress और Completed जैसे स्टेटस के माध्यम से प्रत्येक आवेदन की वर्तमान स्थिति पहचानें।'
                  : 'Clearly track stage-by-stage progression through standard statuses: Pending, In Progress, and Completed.'}
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-1.5 text-xs font-bold text-[#C35504]">
              <span className="w-2 h-2 rounded-full bg-[#C35504]" />
              <span>{language === 'hi' ? 'सम्राट का विज़न, नए बिहार का मिशन' : 'Vision of Samrat, Mission of New Bihar'}</span>
            </div>
          </div>

          {/* Feature 3: बेहतर निगरानी */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
                <Eye className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">
                {language === 'hi' ? '३. बेहतर निगरानी' : '3. Proactive Oversight'}
              </h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                {language === 'hi'
                  ? 'Important और Normal प्राथमिकताओं, फॉलो-अप तथा रिपोर्ट के माध्यम से कार्यों की समीक्षा करें।'
                  : 'Review operations smoothly with dual Important & Normal priority queues, scheduled reminder follow-ups, and district-level reports.'}
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-1.5 text-xs font-bold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span>Prioritized Status Oversight</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

