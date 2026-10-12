import React from 'react';
import { User as UserIcon, LogOut, ShieldCheck } from './icons';
import { User } from '../types';
import { JanSetuLogo } from './JanSetuLogo';

interface HeaderProps {
  currentUser: User | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  language: 'hi' | 'en';
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onOpenLogin,
  onLogout,
  language
}) => {
  return (
    <header className="bg-white py-3 border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
        {/* Brand Section: CM Photo + JanSetu Logo & Wordmark */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap sm:flex-nowrap justify-center sm:justify-start">
          {/* Small Professional Circular Photo of CM Samrat Choudhary */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="relative group">
              <img
                src="/assets/Web_Images/cm_samrat_choudhary_portrait.png"
                alt="CM Samrat Choudhary"
                className="w-11 h-11 sm:w-13 sm:h-13 md:w-14 md:h-14 rounded-full object-cover border-2 border-[#C35504] shadow-sm ring-2 ring-orange-100/90 transition-transform duration-200 group-hover:scale-105"
                loading="eager"
              />
            </div>

            {/* Subtle leader caption on medium+ screens */}
            <div className="hidden lg:block text-left leading-tight border-r border-gray-200 pr-3 mr-0.5">
              <div className="text-[11px] font-extrabold text-gray-900">
                {language === 'hi' ? 'श्री सम्राट चौधरी' : 'Shri Samrat Choudhary'}
              </div>
              <div className="text-[10px] font-semibold text-[#C35504]">
                {language === 'hi' ? 'माननीय मुख्यमंत्री' : 'Hon’ble Chief Minister'}
              </div>
            </div>
          </div>

          {/* Existing E-Sewak Tarapur Name & Logo clearly visible */}
          <JanSetuLogo language={language} showTagline={true} />
        </div>

        {/* User / Login Action */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full shadow-sm">
              <div className="w-8 h-8 rounded-full bg-[#1C4D8D] text-white flex items-center justify-center font-bold text-xs">
                {currentUser.name.charAt(0)}
              </div>
              <div className="text-left text-xs">
                <div className="font-bold text-gray-900 leading-none">{currentUser.name}</div>
                <div className="text-[#1C4D8D] font-semibold text-[11px] flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="w-3 h-3" />
                  {currentUser.role}
                </div>
              </div>
              <button
                onClick={onLogout}
                title="Logout"
                className="ml-2 text-gray-500 hover:text-red-600 p-1 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="inline-flex items-center gap-2 bg-[#1C4D8D] hover:bg-[#163c6f] text-white px-5 py-2 rounded-full font-semibold text-xs sm:text-sm shadow-md transition duration-200 transform hover:-translate-y-0.5"
            >
              <UserIcon className="w-4 h-4" />
              <span>{language === 'hi' ? 'लॉगिन' : 'Login'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

