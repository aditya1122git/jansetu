import React from 'react';
import { ArrowRight, BarChart3, Database, FilePlus } from './icons';

interface ServiceCardsProps {
  onOpenSection: (section: 'form' | 'table' | 'reports') => void;
  language: 'hi' | 'en';
}

export const ServiceCards: React.FC<ServiceCardsProps> = ({ onOpenSection, language }) => {
  return (
    <section className="service-section py-10 md:py-14 border-t border-b border-[#ffd7b5]">
      <div className="max-w-7xl mx-auto px-4">
        {/* Section Heading */}
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#C35504] tracking-tight">
            {language === 'hi' ? 'प्रमुख सेवाएं एवं अनुश्रवण मॉड्यूल' : 'Core Services & Operational Modules'}
          </h2>
          <p className="text-gray-600 text-sm sm:text-base mt-1.5 max-w-2xl mx-auto font-medium">
            {language === 'hi'
              ? 'E-Sewak Tarapur के तीन मुख्य स्तंभ — पारदर्शी, जवाबदेह और सुव्यवस्थित सेवा प्रवाह'
              : 'Three core pillars of E-Sewak Tarapur — Transparent, accountable, and structured operational workflows.'}
          </p>
        </div>

        {/* 3 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* CARD 1: नया आवेदन */}
          <div
            onClick={() => onOpenSection('form')}
            className="custom-card group"
            role="button"
            tabIndex={0}
            aria-label="New Application"
          >
            <div className="icon-box">
              <FilePlus className="h-7 w-7 text-white" />
            </div>
            <h4>{language === 'hi' ? 'नया आवेदन' : 'New Application'}</h4>
            <p>
              {language === 'hi'
                ? 'नया आवेदन दर्ज करें, आवश्यक जानकारी जोड़ें और संबंधित दस्तावेजों को सुरक्षित रूप से संलग्न करें।'
                : 'Record new incoming applications, attach supporting documents, and securely assign priority.'}
            </p>
            <div className="card-link">
              <span>{language === 'hi' ? 'आवेदन दर्ज करें' : 'File Application'}</span>
              <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
            </div>
            <div className="bottom-line" />
          </div>

          {/* CARD 2: आवेदन की स्थिति */}
          <div
            onClick={() => onOpenSection('table')}
            className="custom-card group"
            role="button"
            tabIndex={0}
            aria-label="Application Status"
          >
            <div className="icon-box">
              <Database className="h-7 w-7 text-white" />
            </div>
            <h4>{language === 'hi' ? 'आवेदन की स्थिति' : 'Application Status'}</h4>
            <p>
              {language === 'hi'
                ? 'आवेदन संख्या, जिला, विधानसभा या अन्य उपलब्ध जानकारी के आधार पर रिकॉर्ड खोजें और वर्तमान स्थिति देखें।'
                : 'Search records by application ID, district, assembly constituency, or applicant details to check current progress.'}
            </p>
            <div className="card-link">
              <span>{language === 'hi' ? 'रिकॉर्ड देखें' : 'View Records'}</span>
              <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
            </div>
            <div className="bottom-line" />
          </div>

          {/* CARD 3: रिपोर्ट एवं विश्लेषण */}
          <div
            onClick={() => onOpenSection('reports')}
            className="custom-card group"
            role="button"
            tabIndex={0}
            aria-label="Reports & Analytics"
          >
            <div className="icon-box">
              <BarChart3 className="h-7 w-7 text-white" />
            </div>
            <h4>{language === 'hi' ? 'रिपोर्ट एवं विश्लेषण' : 'Reports & Analytics'}</h4>
            <p>
              {language === 'hi'
                ? 'जिला-वार, विधानसभा-वार, प्राथमिकता और स्थिति के अनुसार आवेदन रिकॉर्ड का विश्लेषण करें।'
                : 'Analyze application records by district, constituency, priority tier, and resolution status.'}
            </p>
            <div className="card-link">
              <span>{language === 'hi' ? 'रिपोर्ट देखें' : 'View Reports'}</span>
              <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
            </div>
            <div className="bottom-line" />
          </div>
        </div>
      </div>
    </section>
  );
};

