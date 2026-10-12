import React, { useEffect, useRef, useState } from 'react';
import { Home, Menu, X, ChevronDown, FileText, Database, BarChart3, Shield, MapPin } from './icons';
import { User } from '../types';

interface NavbarProps {
  currentUser: User | null;
  onOpenSection: (section: 'form' | 'table' | 'reports' | 'master' | 'admin') => void;
  language: 'hi' | 'en';
  onGoHome?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onOpenSection,
  language,
  onGoHome
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [servicesDropdown, setServicesDropdown] = useState(false);
  const servicesMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (servicesMenuRef.current && !servicesMenuRef.current.contains(event.target as Node)) {
        setServicesDropdown(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setServicesDropdown(false);
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  return (
    <nav className="bg-[#1C4D8D] text-white shadow-md sticky top-0 z-40 border-t border-blue-800">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-12">
        {/* Home icon button */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              if (onGoHome) onGoHome();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="p-2 hover:bg-[#163c6f] rounded transition text-white"
            title="Home"
          >
            <Home className="w-5 h-5" />
          </button>
          <span className="font-bold text-sm tracking-wide hidden sm:inline-block px-2 border-l border-blue-400">
            {language === 'hi' ? 'होम' : 'Home'}
          </span>
        </div>

        {/* Desktop Menu */}
        <div className={currentUser ? 'hidden md:flex items-center space-x-1 text-sm font-medium' : 'hidden'}>
          {/* Services Dropdown */}
          <div ref={servicesMenuRef} className="relative">
            <button
              onClick={() => setServicesDropdown(value => !value)}
              aria-haspopup="menu"
              aria-expanded={servicesDropdown}
              className="flex items-center gap-1 px-3 py-2 rounded hover:bg-[#163c6f] transition"
            >
              <FileText className="w-4 h-4 text-blue-200" />
              <span>{language === 'hi' ? 'आवेदन सेवाएं' : 'Application Services'}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {servicesDropdown && (
              <div
                role="menu"
                className="absolute top-full left-0 mt-0.5 w-60 bg-white text-gray-800 rounded-md shadow-xl border border-gray-100 py-1.5 z-50 animate-fadeIn"
              >
                <button
                  onClick={() => {
                    onOpenSection('form');
                    setServicesDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 text-xs sm:text-sm hover:bg-orange-50 hover:text-[#C35504] flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-[#C35504]"></span>
                  {language === 'hi' ? 'नया आवेदन / शिकायत दर्ज करें' : 'New Application / Complaint'}
                </button>
                <button
                  onClick={() => {
                    onOpenSection('table');
                    setServicesDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 text-xs sm:text-sm hover:bg-blue-50 hover:text-[#1C4D8D] flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-[#1C4D8D]"></span>
                  {language === 'hi' ? 'आवेदन स्थिति व डेटाबेस खोज' : 'Application Status & Database'}
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => onOpenSection('table')}
            className="flex items-center gap-1.5 px-3 py-2 rounded hover:bg-[#163c6f] transition"
          >
            <Database className="w-4 h-4 text-blue-200" />
            <span>{language === 'hi' ? 'आवेदन डेटाबेस' : 'Application Database'}</span>
          </button>

          <button
            onClick={() => onOpenSection('reports')}
            className="flex items-center gap-1.5 px-3 py-2 rounded hover:bg-[#163c6f] transition"
          >
            <BarChart3 className="w-4 h-4 text-emerald-300" />
            <span>{language === 'hi' ? 'रिपोर्ट व एनालिटिक्स' : 'Reports & Analytics'}</span>
          </button>

          <button
            onClick={() => onOpenSection('master')}
            className="flex items-center gap-1.5 px-3 py-2 rounded hover:bg-[#163c6f] transition"
          >
            <MapPin className="w-4 h-4 text-yellow-300" />
            <span>{language === 'hi' ? 'बिहार मास्टर डेटा' : 'Bihar Master Data (38/243)'}</span>
          </button>

          {currentUser && currentUser.role === 'ADMIN' && (
            <button
              onClick={() => onOpenSection('admin')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 rounded text-xs font-bold transition shadow-sm ml-2"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{language === 'hi' ? 'एडमिन पैनल' : 'Admin Panel'}</span>
            </button>
          )}
        </div>

        {/* Mobile menu toggle */}
        <div className={currentUser ? 'md:hidden' : 'hidden'}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 rounded hover:bg-[#163c6f] text-white"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {currentUser && isOpen && (
        <div className="md:hidden bg-[#163c6f] px-4 pt-2 pb-4 space-y-2 border-t border-blue-900 text-sm">
          <button
            onClick={() => {
              onOpenSection('form');
              setIsOpen(false);
            }}
            className="w-full text-left py-2 px-3 rounded hover:bg-[#1C4D8D] flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            {language === 'hi' ? 'नया आवेदन दर्ज करें' : 'New Application Entry'}
          </button>
          <button
            onClick={() => {
              onOpenSection('table');
              setIsOpen(false);
            }}
            className="w-full text-left py-2 px-3 rounded hover:bg-[#1C4D8D] flex items-center gap-2"
          >
            <Database className="w-4 h-4" />
            {language === 'hi' ? 'आवेदन स्थिति व डेटाबेस' : 'Application Status & Database'}
          </button>
          <button
            onClick={() => {
              onOpenSection('reports');
              setIsOpen(false);
            }}
            className="w-full text-left py-2 px-3 rounded hover:bg-[#1C4D8D] flex items-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            {language === 'hi' ? 'रिपोर्ट्स व डैशबोर्ड' : 'Reports & Analytics'}
          </button>
          <button
            onClick={() => {
              onOpenSection('master');
              setIsOpen(false);
            }}
            className="w-full text-left py-2 px-3 rounded hover:bg-[#1C4D8D] flex items-center gap-2"
          >
            <MapPin className="w-4 h-4" />
            {language === 'hi' ? 'बिहार 38 जिले व 243 निर्वाचन क्षेत्र' : 'Bihar Master Data (38 Districts & 243 ACs)'}
          </button>
          {currentUser && currentUser.role === 'ADMIN' && (
            <button
              onClick={() => {
                onOpenSection('admin');
                setIsOpen(false);
              }}
              className="w-full text-left py-2 px-3 rounded bg-amber-600 hover:bg-amber-700 flex items-center gap-2 font-bold"
            >
              <Shield className="w-4 h-4" />
              {language === 'hi' ? 'एडमिनिस्ट्रेशन कंट्रोल' : 'Admin Control Panel'}
            </button>
          )}
        </div>
      )}
    </nav>
  );
};

