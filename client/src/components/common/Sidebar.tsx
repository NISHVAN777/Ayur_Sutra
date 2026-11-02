import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  DoorOpen,
  Calendar,
  Layers,
  Sparkles,
  BarChart3,
  Bell,
  Activity,
  History,
  CalendarClock,
  HeartHandshake,
  FilePlus2,
} from "lucide-react";

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role;

  const adminNav = [
    { label: "Dashboard", to: "/admin", icon: LayoutDashboard, end: true },
    { label: "Patients", to: "/admin/patients", icon: Users },
    { label: "Therapists", to: "/admin/therapists", icon: UserCheck },
    { label: "Treatment Rooms", to: "/admin/rooms", icon: DoorOpen },
    { label: "Therapy Courses", to: "/admin/courses", icon: Layers, end: true },
    { label: "Schedule Course", to: "/admin/courses/create", icon: FilePlus2 },
    { label: "Master Calendar", to: "/admin/calendar", icon: Calendar },
    { label: "Reports & Analytics", to: "/admin/reports", icon: BarChart3 },
    { label: "Notifications", to: "/admin/notifications", icon: Bell },
  ];

  const therapistNav = [
    { label: "My Day", to: "/therapist", icon: Activity, end: true },
    { label: "Today's Sessions", to: "/therapist/my-day", icon: CalendarClock },
    { label: "Assigned Patients", to: "/therapist/patients", icon: Users },
    { label: "Treatment History", to: "/therapist/history", icon: History },
  ];

  const patientNav = [
    { label: "My Dashboard", to: "/patient", icon: LayoutDashboard, end: true },
    { label: "Care Journey", to: "/patient/journey", icon: HeartHandshake },
    { label: "Upcoming Sessions", to: "/patient/sessions", icon: CalendarClock },
    { label: "Treatment History", to: "/patient/history", icon: History },
    { label: "Notifications", to: "/patient/notifications", icon: Bell },
    { label: "Ayurveda AI Guide", to: "/patient/ai", icon: Sparkles },
  ];

  const navItems =
    role === "ADMIN" ? adminNav : role === "THERAPIST" ? therapistNav : patientNav;

  return (
    <aside className="w-64 bg-white border-r border-stone-200/80 min-h-[calc(100vh-61px)] p-4 flex flex-col justify-between shrink-0">
      <div>
        <div className="px-3 mb-3 text-[10px] font-bold uppercase tracking-wider text-stone-400">
          Navigation ({role})
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-ayur-700 text-white shadow-sm shadow-ayur-900/20"
                      : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Ayurvedic Wellness Prompt Card */}
      <div className="p-4 rounded-xl bg-ayur-50 border border-ayur-200/70 text-xs mt-6">
        <div className="flex items-center gap-2 text-ayur-800 font-bold mb-1">
          <span className="text-sm">🌿</span> Panchakarma Protocol
        </div>
        <p className="text-stone-600 text-[11px] leading-relaxed">
          Courses operate as contiguous multi-day healing journeys. All sessions are atomically tracked.
        </p>
      </div>
    </aside>
  );
};
