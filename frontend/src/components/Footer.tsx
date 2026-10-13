import React from 'react';
import { JanSetuLogo } from './JanSetuLogo';
import { Home, FileText, Database, BarChart3, ChevronRight } from './icons';

interface FooterProps {
  onOpenSection: (section: 'form' | 'table' | 'reports' | 'admin' | 'appointments') => void;
  language: 'hi' | 'en';
}

export const Footer: React.FC<FooterProps> = ({ onOpenSection, language }) => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#0f2d57] text-white pt-10 pb-6 border-t-2 border-[#C35504] mt-10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-8">
          {/* Column 1: Brand & Description (7 Cols) */}
          <div className="md:col-span-7 space-y-4">
            <JanSetuLogo variant="dark" language={language} showTagline={true} />
            <p className="text-blue-100/90 text-xs sm:text-sm leading-relaxed max-w-xl text-justify sm:text-left">
              {language === 'hi'
                ? 'आवेदन प्रबंधन, रिकॉर्ड ट्रैकिंग और व्यवस्थित फॉलो-अप के लिए एक एकीकृत प्लेटफॉर्म।'
                : 'An integrated workspace for transparent intake, priority classification, and progress oversight across Tarapur Assembly Constituency in Munger.'}
            </p>
            {language === 'hi' && (
              <div className="flex items-center gap-2 text-xs text-amber-300/90 font-medium">
                <span>ध्येय वाक्य:</span>
                <span className="italic font-bold">
                  "जनता की बात, समाधान के साथ।"
                </span>
              </div>
            )}
          </div>

          {/* Column 2: Useful Navigation Links (5 Cols) */}
          <div className="md:col-span-5 md:pl-8">
            <h5 className="font-bold text-xs uppercase tracking-wider text-amber-300 mb-3 border-b border-blue-800 pb-2">
              {language === 'hi' ? 'त्वरित लिंक' : 'Quick Navigation'}
            </h5>
            <ul className="space-y-2.5 text-xs text-blue-100">
              <li>
                <button
                  onClick={scrollToTop}
                  className="hover:text-white hover:underline flex items-center gap-2 text-left transition group"
                >
                  <Home className="w-3.5 h-3.5 text-blue-300 group-hover:text-amber-300" />
                  <span>{language === 'hi' ? 'मुख्य पृष्ठ (Home)' : 'Home'}</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenSection('form')}
                  className="hover:text-white hover:underline flex items-center gap-2 text-left transition group"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-300 group-hover:text-amber-300" />
                  <span>{language === 'hi' ? 'नया आवेदन (New Application)' : 'New Application'}</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenSection('table')}
                  className="hover:text-white hover:underline flex items-center gap-2 text-left transition group"
                >
                  <Database className="w-3.5 h-3.5 text-blue-300 group-hover:text-amber-300" />
                  <span>{language === 'hi' ? 'आवेदन स्थिति (Application Status)' : 'Application Status'}</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenSection('reports')}
                  className="hover:text-white hover:underline flex items-center gap-2 text-left transition group"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-blue-300 group-hover:text-amber-300" />
                  <span>{language === 'hi' ? 'रिपोर्ट एवं विश्लेषण (Reports)' : 'Reports & Analytics'}</span>
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Minimal Copyright Line & Independent Status */}
        <div className="border-t border-blue-900/80 pt-5 text-center text-xs text-blue-200/90 space-y-1">
          <div>
            &copy; {new Date().getFullYear()} E-Sewak Tarapur — Application & Grievance Management Portal. All rights reserved.
          </div>
          <div className="text-[11px] text-blue-300/70">
            Independent Application Management Platform • Secure Multi-Tier Access • 200 MB Document Repository
          </div>
        </div>
      </div>
    </footer>
  );
};

