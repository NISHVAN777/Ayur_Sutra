import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { patientService } from "../../services/patientService";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { CareJourneyTimeline } from "../../components/journey/CareJourneyTimeline";
import { Sparkles, Calendar, Heart, ArrowRight, Bell, FileText, UserCheck, Phone } from "lucide-react";

export const PatientDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await patientService.getDashboard();
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading your Panchakarma care journey..." />;
  }

  const patient = data?.patient;
  const activeCourse = data?.activeCourse;
  const recentNotifs = data?.recentNotifications || [];
  const primaryTherapist = activeCourse?.sessions?.[0]?.therapist;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-stone-900">
            Welcome, {patient?.name}
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Welcome to your personalized AyurSutra Panchakarma healing portal.
          </p>
        </div>

        <Link
          to="/patient/ai"
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-saffron-500 to-saffron-600 hover:from-saffron-600 hover:to-saffron-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all shrink-0"
        >
          <Sparkles className="w-4 h-4" /> Ask Ayurveda AI Guide
        </Link>
      </div>

      {/* Active Course Care Journey */}
      {activeCourse ? (
        <CareJourneyTimeline course={activeCourse} />
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-xs text-stone-500">
          <p className="text-sm font-bold text-stone-800 font-serif mb-1">
            No Active Therapy Course Currently Scheduled
          </p>
          <p>Please consult with your Ayurvedic doctor to schedule a Panchakarma regimen.</p>
        </div>
      )}

      {/* Practitioner Profile & Patient Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Assigned Practitioner Profile Card */}
        {primaryTherapist && (
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ayur-700 bg-ayur-50 px-2 py-0.5 rounded border border-ayur-200">
                  Assigned Practitioner
                </span>
                <UserCheck className="w-4 h-4 text-ayur-700" />
              </div>

              <div className="flex items-center gap-3.5 mb-3">
                {primaryTherapist.avatarUrl ? (
                  <img
                    src={primaryTherapist.avatarUrl}
                    alt={primaryTherapist.user?.name}
                    className="w-14 h-14 rounded-2xl object-cover border border-stone-200 shadow-xs"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-ayur-100 border border-ayur-200 text-ayur-800 flex items-center justify-center font-serif font-bold text-xl shadow-inner">
                    {primaryTherapist.user?.name?.charAt(0) || "D"}
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-sm text-stone-900 font-serif">
                    {primaryTherapist.user?.name}
                  </h4>
                  <p className="text-xs font-semibold text-ayur-700">
                    {primaryTherapist.specialization}
                  </p>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Experience: <strong>{primaryTherapist.experience}</strong>
                  </p>
                </div>
              </div>

              {primaryTherapist.bio && (
                <p className="text-[11px] text-stone-600 bg-stone-50 p-3 rounded-xl leading-relaxed border border-stone-100">
                  {primaryTherapist.bio}
                </p>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-stone-100 text-[11px] text-stone-500 flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-stone-400" />
              <span>Clinic Contact: {primaryTherapist.phone}</span>
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className={`bg-white rounded-2xl border border-stone-200 p-6 shadow-sm ${primaryTherapist ? "md:col-span-1" : "md:col-span-2"}`}>
          <h3 className="text-base font-bold text-stone-900 font-serif mb-4 flex items-center gap-2">
            <span>🌿</span> Patient Care Actions
          </h3>

          <div className="space-y-2.5">
            <Link
              to="/patient/journey"
              className="p-3.5 rounded-xl border border-stone-200 hover:border-ayur-300 hover:bg-ayur-50/50 transition-all flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-3">
                <Heart className="w-4 h-4 text-ayur-700" />
                <span className="font-bold text-stone-800">My Care Journey Timeline</span>
              </div>
              <ArrowRight className="w-4 h-4 text-stone-400" />
            </Link>

            <Link
              to="/patient/sessions"
              className="p-3.5 rounded-xl border border-stone-200 hover:border-ayur-300 hover:bg-ayur-50/50 transition-all flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-ayur-700" />
                <span className="font-bold text-stone-800">All Scheduled Sessions</span>
              </div>
              <ArrowRight className="w-4 h-4 text-stone-400" />
            </Link>

            <Link
              to="/patient/history"
              className="p-3.5 rounded-xl border border-stone-200 hover:border-ayur-300 hover:bg-ayur-50/50 transition-all flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-ayur-700" />
                <span className="font-bold text-stone-800">Clinical Observations & Notes</span>
              </div>
              <ArrowRight className="w-4 h-4 text-stone-400" />
            </Link>
          </div>
        </div>

        {/* Recent Reminders */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-stone-900 font-serif flex items-center gap-2">
              <Bell className="w-4 h-4 text-ayur-700" /> Session Reminders & Alerts
            </h3>
            <Link
              to="/patient/notifications"
              className="text-xs font-semibold text-ayur-700 hover:underline"
            >
              View all
            </Link>
          </div>

          <div className="space-y-3">
            {recentNotifs.length === 0 ? (
              <p className="text-xs text-stone-400 py-4 text-center">No reminders right now.</p>
            ) : (
              recentNotifs.slice(0, 3).map((n: any) => (
                <div key={n.id} className="p-3 rounded-xl bg-stone-50 border border-stone-100 text-xs">
                  <div className="font-bold text-stone-900">{n.title}</div>
                  <p className="text-stone-600 text-[11px] mt-0.5 leading-relaxed">{n.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
