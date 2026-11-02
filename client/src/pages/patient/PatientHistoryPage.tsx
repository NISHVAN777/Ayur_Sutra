import React, { useState, useEffect } from "react";
import { patientService } from "../../services/patientService";
import { TherapySession } from "../../types";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { formatDate, formatTime } from "../../utils/formatters";
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw } from "lucide-react";

export const PatientHistoryPage: React.FC = () => {
  const [history, setHistory] = useState<TherapySession[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await patientService.getHistory();
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
    return <LoadingSpinner size="lg" text="Loading treatment history..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-serif text-stone-900">Treatment History & Clinical Records</h1>
        <p className="text-xs text-stone-500 mt-1">
          Complete historical record of completed, missed, and replacement Panchakarma therapy sessions.
        </p>
      </div>

      <div className="space-y-4">
        {history.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-xs text-stone-500">
            No treatment records found in history yet.
          </div>
        ) : (
          history.map((s) => {
            const isCompleted = s.status === "COMPLETED";
            const isMissed = s.status === "MISSED";
            const isCancelled = s.status === "CANCELLED";

            return (
              <div
                key={s.id}
                className={`bg-white rounded-2xl border p-6 shadow-sm transition-all ${
                  isMissed ? "border-amber-200 bg-amber-50/20" : "border-stone-200"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm font-serif text-stone-900">
                      Day {s.dayNumber} of {s.course?.durationDays} — {s.course?.therapyName}
                    </span>

                    {isCompleted && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Completed
                      </span>
                    )}

                    {isMissed && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Missed Session
                      </span>
                    )}

                    {isCancelled && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Cancelled
                      </span>
                    )}

                    {s.replacementForSessionId && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" /> Replacement Session
                      </span>
                    )}
                  </div>

                  <span className="text-xs text-stone-500">
                    {formatDate(s.sessionDate)} at {formatTime(s.startTime)}
                  </span>
                </div>

                <div className="text-xs text-stone-600 mb-3">
                  Practitioner: <strong>{s.therapist?.user.name}</strong> • Suite: {s.room?.roomName} ({s.room?.roomNumber})
                </div>

                {isCompleted && s.treatmentNotes && (
                  <div className="bg-stone-50 p-4 rounded-xl text-xs text-stone-700 leading-relaxed italic border border-stone-100">
                    <strong className="not-italic text-stone-900 block mb-1">Doctor's Clinical Notes:</strong>
                    "{s.treatmentNotes}"
                  </div>
                )}

                {isMissed && s.missedReason && (
                  <div className="bg-amber-50/80 p-3.5 rounded-xl text-xs text-amber-900 border border-amber-200">
                    <strong>Reason Recorded:</strong> {s.missedReason}
                    <p className="text-[11px] text-amber-800 mt-1">
                      Missed sessions remain permanently documented in your health record. If a replacement session was approved, it appears as an additional day in your active schedule.
                    </p>
                  </div>
                )}

                {isCancelled && s.cancelReason && (
                  <div className="bg-rose-50 p-3.5 rounded-xl text-xs text-rose-900 border border-rose-200">
                    <strong>Cancellation Reason:</strong> {s.cancelReason}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
