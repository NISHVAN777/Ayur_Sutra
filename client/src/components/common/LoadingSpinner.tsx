import React from "react";

export const LoadingSpinner: React.FC<{ size?: "sm" | "md" | "lg"; text?: string }> = ({
  size = "md",
  text,
}) => {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4",
  }[size];

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div
        className={`${sizeClasses} border-ayur-200 border-t-ayur-700 rounded-full animate-spin`}
      />
      {text && <p className="text-sm font-medium text-stone-600 mt-3">{text}</p>}
    </div>
  );
};
