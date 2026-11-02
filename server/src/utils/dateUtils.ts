import { format, addDays, parseISO, isValid } from "date-fns";

export function calculateEndTime(startTime: string, durationMinutes: number = 60): string {
  const [hours, minutes] = startTime.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
}

export function isTimeOverlapping(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  return startA < endB && endA > startB;
}

export function generateSessionDates(startDateStr: string, durationDays: number): string[] {
  const dates: string[] = [];
  const baseDate = parseISO(startDateStr);
  if (!isValid(baseDate)) {
    throw new Error(`Invalid start date: ${startDateStr}`);
  }
  for (let i = 0; i < durationDays; i++) {
    const d = addDays(baseDate, i);
    dates.push(format(d, "yyyy-MM-dd"));
  }
  return dates;
}

export function formatToDisplayTime(timeStr: string): string {
  if (!timeStr) return "";
  const [hoursStr, minutesStr] = timeStr.split(":");
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  const displayMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${displayHours}:${displayMinutes} ${period}`;
}
