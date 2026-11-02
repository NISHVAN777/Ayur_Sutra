import React from "react";
import { MasterCalendar } from "../../components/calendar/MasterCalendar";

export const CalendarPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-serif text-stone-900">
          Clinic Master Calendar
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          Complete clinic schedule with multi-filter across therapists, rooms, patients, and session statuses.
        </p>
      </div>

      <MasterCalendar />
    </div>
  );
};
