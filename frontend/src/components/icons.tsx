import React from 'react';

type IconProps = React.HTMLAttributes<HTMLElement> & {
  size?: number | string;
  strokeWidth?: number;
};

const icon = (fontAwesomeClass: string) =>
  React.forwardRef<HTMLElement, IconProps>(({ className = '', size, style, strokeWidth: _strokeWidth, ...props }, ref) => (
    <span
      ref={ref}
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ fontSize: size, ...style }}
      {...props}
    >
      <i className={fontAwesomeClass} aria-hidden="true" />
    </span>
  ));

export const AlertCircle = icon('fa-solid fa-circle-exclamation');
export const AlertTriangle = icon('fa-solid fa-triangle-exclamation');
export const ArrowRight = icon('fa-solid fa-arrow-right');
export const BarChart2 = icon('fa-solid fa-chart-column');
export const BarChart3 = icon('fa-solid fa-chart-simple');
export const Building = icon('fa-solid fa-building');
export const Building2 = Building;
export const Calendar = icon('fa-solid fa-calendar-days');
export const Check = icon('fa-solid fa-check');
export const CheckCircle = icon('fa-solid fa-circle-check');
export const CheckCircle2 = CheckCircle;
export const ChevronDown = icon('fa-solid fa-chevron-down');
export const ChevronLeft = icon('fa-solid fa-chevron-left');
export const ChevronRight = icon('fa-solid fa-chevron-right');
export const Clock = icon('fa-solid fa-clock');
export const Compass = icon('fa-solid fa-compass');
export const Database = icon('fa-solid fa-database');
export const Download = icon('fa-solid fa-download');
export const Edit2 = icon('fa-solid fa-pen-to-square');
export const Envelope = icon('fa-solid fa-envelope');
export const ExternalLink = icon('fa-solid fa-arrow-up-right-from-square');
export const Eye = icon('fa-solid fa-eye');
export const EyeOff = icon('fa-solid fa-eye-slash');
export const FilePlus = icon('fa-solid fa-file-circle-plus');
export const FileSpreadsheet = icon('fa-solid fa-file-excel');
export const FileText = icon('fa-solid fa-file-lines');
export const Filter = icon('fa-solid fa-filter');
export const FolderPlus = icon('fa-solid fa-folder-plus');
export const Globe = icon('fa-solid fa-globe');
export const HelpCircle = icon('fa-solid fa-circle-question');
export const History = icon('fa-solid fa-clock-rotate-left');
export const Home = icon('fa-solid fa-house');
export const Image = icon('fa-solid fa-image');
export const KeyRound = icon('fa-solid fa-key');
export const LayoutGrid = icon('fa-solid fa-table-cells-large');
export const List = icon('fa-solid fa-list');
export const Lock = icon('fa-solid fa-lock');
export const LogOut = icon('fa-solid fa-right-from-bracket');
export const MapPin = icon('fa-solid fa-location-dot');
export const Menu = icon('fa-solid fa-bars');
export const Paperclip = icon('fa-solid fa-paperclip');
export const Pause = icon('fa-solid fa-pause');
export const Phone = icon('fa-solid fa-phone');
export const PhoneCall = Phone;
export const PieChart = icon('fa-solid fa-chart-pie');
export const Play = icon('fa-solid fa-play');
export const Plus = icon('fa-solid fa-plus');
export const PlusCircle = icon('fa-solid fa-circle-plus');
export const Printer = icon('fa-solid fa-print');
export const RefreshCw = icon('fa-solid fa-rotate');
export const RotateCcw = icon('fa-solid fa-arrow-rotate-left');
export const Save = icon('fa-solid fa-floppy-disk');
export const Search = icon('fa-solid fa-magnifying-glass');
export const Send = icon('fa-solid fa-paper-plane');
export const Settings = icon('fa-solid fa-gear');
export const Shield = icon('fa-solid fa-shield-halved');
export const ShieldAlert = icon('fa-solid fa-shield-halved');
export const ShieldCheck = icon('fa-solid fa-shield');
export const SlidersHorizontal = icon('fa-solid fa-sliders');
export const Sparkles = icon('fa-solid fa-wand-magic-sparkles');
export const Tag = icon('fa-solid fa-tag');
export const Trash2 = icon('fa-solid fa-trash-can');
export const TrendingUp = icon('fa-solid fa-arrow-trend-up');
export const Upload = icon('fa-solid fa-upload');
export const User = icon('fa-solid fa-user');
export const UserPlus = icon('fa-solid fa-user-plus');
export const Users = icon('fa-solid fa-users');
export const X = icon('fa-solid fa-xmark');
export const ZoomIn = icon('fa-solid fa-magnifying-glass-plus');
