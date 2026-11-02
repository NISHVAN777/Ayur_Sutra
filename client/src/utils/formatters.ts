import { format, parseISO, isValid } from "date-fns";

export function formatDate(dateString?: string | null): string {
  if (!dateString) return "N/A";
  try {
    const d = parseISO(dateString);
    if (!isValid(d)) return dateString;
    return format(d, "MMM d, yyyy");
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateTimeString?: string | null): string {
  if (!dateTimeString) return "N/A";
  try {
    const d = parseISO(dateTimeString);
    if (!isValid(d)) return dateTimeString;
    return format(d, "MMM d, yyyy h:mm a");
  } catch {
    return dateTimeString;
  }
}

export function formatTime(timeString?: string | null): string {
  if (!timeString) return "N/A";
  const [hours, minutes] = timeString.split(":");
  if (hours === undefined || minutes === undefined) return timeString;
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

export function getStatusBadgeColor(status: string): string {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "SCHEDULED":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "MISSED":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "CANCELLED":
      return "bg-stone-100 text-stone-600 border-stone-200";
    case "ACTIVE":
      return "bg-ayur-50 text-ayur-700 border-ayur-200";
    case "INACTIVE":
      return "bg-stone-100 text-stone-500 border-stone-200";
    default:
      return "bg-stone-50 text-stone-700 border-stone-200";
  }
}
