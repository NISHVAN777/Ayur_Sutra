import React from "react";
import { LucideIcon, FolderSearch } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = FolderSearch,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="bg-white rounded-xl border border-stone-200/80 p-8 text-center flex flex-col items-center justify-center my-4">
      <div className="w-12 h-12 rounded-full bg-ayur-50 flex items-center justify-center text-ayur-600 mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-base font-bold text-stone-900 font-serif">{title}</h4>
      <p className="text-xs text-stone-500 max-w-sm mt-1 mb-4">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 text-xs font-semibold text-white bg-ayur-700 hover:bg-ayur-800 rounded-lg transition-colors shadow-sm"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
