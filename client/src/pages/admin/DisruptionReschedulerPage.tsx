import React, { useEffect, useState } from "react";
import { therapistService } from "../../services/therapistService";
import { disruptionService } from "../../services/disruptionService";
import { DisruptionPlan, Therapist } from "../../types";
import { Alert } from "../../components/common/Alert";
import { formatDate, formatTime } from "../../utils/formatters";
import { CalendarX2, Search, CheckCircle2, ArrowRight } from "lucide-react";

const PHASE_LABEL: Record<string, string> = { PURVAKARMA: "Purvakarma", PRADHANA_KARMA: "Pradhana Karma", PASCHAT_KARMA: "Paschat Karma" };

export const DisruptionReschedulerPage: React.FC = () => {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [therapistId, setTherapistId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [plan, setPlan] = useState<DisruptionPlan | null>(null);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    therapistService.getAll().then((r) => setTherapists(r.therapists)).catch((e) => setError(e.message));
  }, []);

  const payload = () => ({ therapistId, startDate, endDate: endDate || startDate, reason });

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(""); setApplied(false);
    try {
      setPlan(await disruptionService.preview(payload()));
    } catch (err: any) {
      setError(err.message); setPlan(null);
    } finally {
      setBusy(false);
    }
  };

  const handleApply = async () => {
    setBusy(true); setError("");
    try {
      setPlan(await disruptionService.apply(payload()));
      setApplied(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const input = "w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ayur-500/20 focus:border-ayur-600";
  const reassigned = plan ? plan.courses.flatMap((c) => c.items).filter((i) => i.status === "REASSIGNED").length : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-serif text-stone-900">Disruption Rescheduler</h1>
        <p className="text-xs text-stone-500 mt-1">
          Record a practitioner's unplanned leave. The system reassigns qualified therapists and free treatment suites for all
          remaining sessions of every affected course, without changing the order of the treatment.
        </p>
      </div>

      <form onSubmit={handlePreview} className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <label className="text-[11px] font-semibold text-stone-600 md:col-span-1">Therapist on leave
          <select className={`${input} mt-1`} value={therapistId} onChange={(e) => setTherapistId(e.target.value)} required>
            <option value="">Select therapist</option>
            {therapists.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <label className="text-[11px] font-semibold text-stone-600">Leave from
          <input type="date" className={`${input} mt-1`} value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        </label>
        <label className="text-[11px] font-semibold text-stone-600">Leave to
          <input type="date" className={`${input} mt-1`} value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
        <label className="text-[11px] font-semibold text-stone-600">Reason
          <input className={`${input} mt-1`} placeholder="e.g. Medical leave" value={reason} onChange={(e) => setReason(e.target.value)} required />
        </label>
        <button type="submit" disabled={busy} className="py-2.5 bg-ayur-700 hover:bg-ayur-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
          <Search className="w-4 h-4" /> Preview Reassignment
        </button>
      </form>

      {error && <Alert type="error">{error}</Alert>}

      {plan && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[["Affected sessions", plan.affectedSessions], ["Sessions updated", reassigned], ["Unresolved", plan.unresolved]].map(([label, value]) => (
              <div key={label as string} className="bg-white rounded-2xl border border-stone-200 p-4">
                <div className="text-[10px] font-bold uppercase tracking-wide text-stone-400">{label}</div>
                <div className="text-2xl font-bold text-stone-900 mt-1">{value}</div>
              </div>
            ))}
          </div>

          {plan.affectedSessions === 0 && <Alert type="info">No scheduled sessions of this therapist fall in the selected dates.</Alert>}
          {applied && <Alert type="success" title="Leave recorded">Sessions were rescheduled. The patients, the new therapists and the therapist on leave have been notified.</Alert>}

          {plan.courses.map((c) => (
            <div key={c.courseId} className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-stone-100 flex items-center gap-2">
                <CalendarX2 className="w-4 h-4 text-saffron-600" />
                <span className="text-sm font-bold text-stone-900">{c.patientName}</span>
                <span className="text-xs text-stone-500">· {c.therapyName}</span>
              </div>
              <table className="w-full text-xs">
                <thead className="bg-stone-50 text-[10px] uppercase tracking-wide text-stone-500">
                  <tr>
                    <th className="text-left px-4 py-2">Day</th><th className="text-left px-4 py-2">Procedure</th>
                    <th className="text-left px-4 py-2">Current booking</th><th></th><th className="text-left px-4 py-2">New booking</th>
                    <th className="text-left px-4 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {c.items.map((i) => (
                    <tr key={i.sessionId} className={i.status === "REASSIGNED" ? "bg-saffron-50/40" : ""}>
                      <td className="px-4 py-2.5 font-bold">Day {i.dayNumber}</td>
                      <td className="px-4 py-2.5">{i.procedure}<div className="text-[10px] text-stone-400">{PHASE_LABEL[i.phase || ""] || ""}</div></td>
                      <td className="px-4 py-2.5 text-stone-600">{formatDate(i.from.date)}, {formatTime(i.from.startTime)}<div className="text-[10px]">{i.from.therapistName} · {i.from.roomName}</div></td>
                      <td><ArrowRight className="w-3.5 h-3.5 text-stone-400" /></td>
                      <td className="px-4 py-2.5">
                        {i.to ? <>{formatDate(i.to.date)}, {formatTime(i.to.startTime)}<div className="text-[10px]">{i.to.therapistName} · {i.to.roomName}</div></> : "No slot found"}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${i.status === "REASSIGNED" ? "bg-saffron-100 text-saffron-800" : i.status === "UNCHANGED" ? "bg-emerald-50 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                          {i.status === "REASSIGNED" ? `Changed: ${i.changes.join(", ").toLowerCase()}` : i.status.toLowerCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          {!applied && plan.affectedSessions > 0 && (
            <button onClick={handleApply} disabled={busy || plan.unresolved > 0}
              className="px-5 py-2.5 bg-ayur-700 hover:bg-ayur-800 text-white text-xs font-bold rounded-xl flex items-center gap-2 disabled:opacity-50">
              <CheckCircle2 className="w-4 h-4" /> Record Leave & Apply Reassignment
            </button>
          )}
        </div>
      )}
    </div>
  );
};
