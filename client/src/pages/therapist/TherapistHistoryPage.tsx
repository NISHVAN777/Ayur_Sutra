import React, { useState, useEffect } from "react";
import { therapistService } from "../../services/therapistService";
import { TherapySession } from "../../types";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { formatDate, formatTime } from "../../utils/formatters";
import { FileText, CheckCircle2 } from "lucide-react";

export const TherapistHistoryPage: React.FC = () => {
  const [history, setHistory] = useState<TherapySession[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await therapistService.getHistory();
        setHistory(res.history);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadHistory();
  }, []);

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading treatment logs..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-serif text-stone-900">Treatment History & Clinical Logs</h1>
        <p className="text-xs text-stone-500 mt-1">
          Historical record of completed Panchakarma procedures and recorded observations.
        </p>
      </div>

      <div className="space-y-4">
        {history.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-xs text-stone-500">
            No completed treatment records logged yet.
          </div>
        ) : (
          history.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-stone-900 font-serif">
                      Day {s.dayNumber} — {s.patient?.user.name}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Completed
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {s.course?.therapyName} • {formatDate(s.sessionDate)} at {formatTime(s.startTime)}
                  </p>
                </div>

                <div className="text-xs text-stone-500 sm:text-right">
                  Room: {s.room?.roomName}
                </div>
              </div>

              {s.treatmentNotes && (
                <div className="mt-3 pt-3 border-t border-stone-100 bg-stone-50 p-3.5 rounded-xl text-xs text-stone-700">
                  <strong className="block text-stone-900 font-serif mb-1">
                    Recorded Clinical Treatment Notes:
                  </strong>
                  <p className="leading-relaxed italic">"{s.treatmentNotes}"</p>
                  {s.completedAt && (
                    <span className="text-[10px] text-stone-400 block mt-1.5">
                      Timestamp: {s.completedAt}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
