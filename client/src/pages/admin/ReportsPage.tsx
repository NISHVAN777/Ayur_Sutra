import React, { useState, useEffect } from "react";
import { adminService } from "../../services/adminService";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { Activity, UserCheck, Layers } from "lucide-react";

export const ReportsPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadReports() {
      try {
        const res = await adminService.getReports();
        setData(res.summary);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadReports();
  }, []);

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Generating clinical analytics & reports..." />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-serif text-stone-900">
          Clinic Analytics & Reports
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          Operational statistics, therapy modality distributions, and therapist session workloads.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
          <h3 className="text-base font-bold text-stone-900 font-serif mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-ayur-700" /> Therapy Distribution
          </h3>

          <div className="space-y-3">
            {Object.entries(data?.therapyDistribution || {}).map(([therapy, count]: any) => (
              <div key={therapy} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-stone-700">
                  <span>{therapy}</span>
                  <span>{count} courses</span>
                </div>
                <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-ayur-700 h-full rounded-full"
                    style={{ width: `${(count / (data?.totalCourses || 1)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
          <h3 className="text-base font-bold text-stone-900 font-serif mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-ayur-700" /> Session Status Metrics
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
              <span className="text-[10px] font-bold text-emerald-800 uppercase">Completed</span>
              <div className="text-2xl font-bold font-serif text-emerald-900 mt-1">
                {data?.sessionStatusCounts?.COMPLETED || 0}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
              <span className="text-[10px] font-bold text-amber-800 uppercase">Scheduled</span>
              <div className="text-2xl font-bold font-serif text-amber-900 mt-1">
                {data?.sessionStatusCounts?.SCHEDULED || 0}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-100">
              <span className="text-[10px] font-bold text-rose-800 uppercase">Missed</span>
              <div className="text-2xl font-bold font-serif text-rose-900 mt-1">
                {data?.sessionStatusCounts?.MISSED || 0}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-stone-100 border border-stone-200">
              <span className="text-[10px] font-bold text-stone-700 uppercase">Cancelled</span>
              <div className="text-2xl font-bold font-serif text-stone-800 mt-1">
                {data?.sessionStatusCounts?.CANCELLED || 0}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm md:col-span-2">
          <h3 className="text-base font-bold text-stone-900 font-serif mb-4 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-ayur-700" /> Practitioner Session Workload
          </h3>

          <div className="divide-y divide-stone-100">
            {data?.therapistWorkload?.map((w: any) => (
              <div key={w.name} className="py-3 flex items-center justify-between text-xs">
                <span className="font-bold text-stone-900">{w.name}</span>
                <div className="flex items-center gap-6">
                  <span className="text-emerald-700 font-semibold">{w.completed} Completed</span>
                  <span className="text-amber-700 font-semibold">{w.scheduled} Upcoming</span>
                  <span className="font-bold text-stone-800">
                    Total: {w.completed + w.scheduled} sessions
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
