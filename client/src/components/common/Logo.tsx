import React from "react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showSubtitle?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = "md",
  showSubtitle = true,
  className = "",
}) => {
  const iconSizes = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-14 h-14",
  };

  const titleSizes = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-2xl",
  };

  const svgSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-7 h-7",
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* English Healthcare Wellness Emblem */}
      <div
        className={`${iconSizes[size]} rounded-xl bg-gradient-to-br from-ayur-700 to-ayur-900 flex items-center justify-center text-white shadow-md shadow-ayur-900/10 shrink-0`}
      >
        <svg
          className={`${svgSizes[size]} text-white`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Medical Wellness Leaf & Vitality Cross */}
          <path d="M12 2a10 10 0 0 1 10 10c0 5.5-4.5 10-10 10S2 17.5 2 12A10 10 0 0 1 12 2z" />
          <path d="M12 6v12" />
          <path d="M8 10c2-2 6-2 8 0" />
          <path d="M8 14c2 2 6 2 8 0" />
        </svg>
      </div>

      <div>
        <div className="flex items-center gap-2">
          <span
            className={`font-serif font-bold ${titleSizes[size]} tracking-tight text-ayur-900 leading-none`}
          >
            AYURSUTRA
          </span>
          <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-ayur-50 text-ayur-700 border border-ayur-200">
            Panchakarma
          </span>
        </div>
        {showSubtitle && (
          <p className="text-[11px] text-stone-500 tracking-wide mt-0.5 leading-none">
            Therapy Scheduling & Patient Management
          </p>
        )}
      </div>
    </div>
  );
};
