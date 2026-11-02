import React from "react";
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";

interface AlertProps {
  type?: "info" | "success" | "warning" | "error";
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type = "info",
  title,
  children,
  className = "",
}) => {
  const styles = {
    info: {
      container: "bg-sky-50 text-sky-900 border-sky-200",
      icon: Info,
      iconColor: "text-sky-600",
    },
    success: {
      container: "bg-emerald-50 text-emerald-900 border-emerald-200",
      icon: CheckCircle2,
      iconColor: "text-emerald-600",
    },
    warning: {
      container: "bg-amber-50 text-amber-900 border-amber-200",
      icon: AlertTriangle,
      iconColor: "text-amber-600",
    },
    error: {
      container: "bg-rose-50 text-rose-900 border-rose-200",
      icon: AlertCircle,
      iconColor: "text-rose-600",
    },
  }[type];

  const IconComponent = styles.icon;

  return (
    <div className={`p-4 rounded-xl border flex items-start gap-3 text-sm ${styles.container} ${className}`}>
      <IconComponent className={`w-5 h-5 shrink-0 mt-0.5 ${styles.iconColor}`} />
      <div className="flex-1">
        {title && <h5 className="font-semibold mb-1">{title}</h5>}
        <div className="text-stone-700 leading-relaxed">{children}</div>
      </div>
    </div>
  );
};
