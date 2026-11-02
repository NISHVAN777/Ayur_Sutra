import React from "react";
import { getStatusBadgeColor } from "../../utils/formatters";

interface StatusBadgeProps {
  status: string;
  className?: string;
  size?: "sm" | "md";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = "", size = "md" }) => {
  const colorClasses = getStatusBadgeColor(status);
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${colorClasses} ${sizeClasses} ${className}`}
    >
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-current opacity-75"></span>
      {status}
    </span>
  );
};
