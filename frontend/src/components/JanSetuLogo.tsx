import React from 'react';

interface JanSetuLogoProps {
  className?: string;
  variant?: 'light' | 'dark'; // 'light' for white backgrounds, 'dark' for navy backgrounds
  showTagline?: boolean;
  language?: 'hi' | 'en';
}

export const JanSetuLogo: React.FC<JanSetuLogoProps> = ({
  className = '',
  variant = 'light',
  showTagline = false,
  language = 'hi'
}) => {
  const isDark = variant === 'dark';

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Original Geometric Bridge/Connector Emblem ("JanSetu" - Bridge of the People) */}
      <div className="relative flex-shrink-0">
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow-sm"
        >
          {/* Outer Rounded Hexagonal / Shield Base */}
          <rect
            x="2"
            y="2"
            width="44"
            height="44"
            rx="12"
            fill={isDark ? '#0f2d57' : '#1C4D8D'}
            stroke={isDark ? '#3b82f6' : '#C35504'}
            strokeWidth="2"
          />
          {/* Bridge Arch (Setu) */}
          <path
            d="M8 34 C 16 18, 32 18, 40 34"
            stroke="#ffffff"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Golden Suspension / Pathway Lines */}
          <path
            d="M14 26 L 14 34"
            stroke="#C35504"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M24 20 L 24 34"
            stroke="#F59E0B"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M34 26 L 34 34"
            stroke="#C35504"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Nexus Point at apex */}
          <circle cx="24" cy="14" r="3.5" fill="#F59E0B" stroke="#ffffff" strokeWidth="1.5" />
        </svg>
      </div>

      {/* Wordmark */}
      <div className="flex flex-col text-left">
        <div className="flex items-baseline gap-1.5 leading-none">
          <span
            className={`text-xl sm:text-2xl font-black tracking-tight ${
              isDark ? 'text-white' : 'text-[#1C4D8D]'
            }`}
          >
            E-Sewa
          </span>
          <span
            className="text-xl sm:text-2xl font-black tracking-tight text-[#C35504]"
          >
            Tarapur
          </span>
          <span
            className={`text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded ml-1 ${
              isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-50 text-[#1C4D8D]'
            }`}
          >
            ई-सेवा
          </span>
        </div>

        <div
          className={`text-[11px] sm:text-xs font-semibold mt-1 tracking-tight ${
            isDark ? 'text-blue-200' : 'text-gray-600'
          }`}
        >
          {language === 'hi'
            ? 'आवेदन एवं शिकायत प्रबंधन पोर्टल'
            : 'Application & Grievance Management Portal'}
        </div>

        {showTagline && language === 'hi' && (
          <div
            className={`text-[10px] font-bold mt-0.5 italic ${
              isDark ? 'text-amber-300' : 'text-[#C35504]'
            }`}
          >
            जनता की बात, समाधान के साथ।
          </div>
        )}
      </div>
    </div>
  );
};
