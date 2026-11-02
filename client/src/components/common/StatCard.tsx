import React from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: string;
  colorScheme?: "ayur" | "saffron" | "clay" | "blue";
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  description,
  trend,
  colorScheme = "ayur",
}) => {
  const bgIcons: Record<string, string> = {
    ayur: "bg-ayur-50 text-ayur-700 border-ayur-100",
    saffron: "bg-saffron-50 text-saffron-700 border-saffron-100",
    clay: "bg-clay-50 text-clay-700 border-clay-100",
    blue: "bg-sky-50 text-sky-700 border-sky-100",
  };

  return (
    <div className="bg-white rounded-xl border border-stone-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">{title}</p>
          <p className="text-2xl font-bold text-stone-900 mt-1 font-serif">{value}</p>
        </div>
        <div className={`p-3 rounded-lg border ${bgIcons[colorScheme] || bgIcons.ayur}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      {(description || trend) && (
        <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
          {description && <span>{description}</span>}
          {trend && <span className="text-ayur-600 font-medium">{trend}</span>}
        </div>
      )}
    </div>
  );
};
