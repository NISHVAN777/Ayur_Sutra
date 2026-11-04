import React, { useEffect, useState } from "react";
import { wellnessService } from "../../services/wellnessService";
import { WellnessLog, AgniStatus, BowelStatus } from "../../types";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { Alert } from "../../components/common/Alert";
import { formatDate } from "../../utils/formatters";
import { Utensils, Flame, Sparkles, Sunrise, Moon, AlertTriangle, ClipboardList } from "lucide-react";

const AGNI_OPTIONS: Array<{ value: AgniStatus; label: string; hint: string }> = [
  { value: "SAMA", label: "Balanced (Sama)", hint: "Normal hunger, food digests well" },
  { value: "VISHAMA", label: "Irregular (Vishama)", hint: "Hunger comes and goes, gas or bloating" },
  { value: "TIKSHNA", label: "Sharp (Tikshna)", hint: "Very hungry, acidity or burning" },
  { value: "MANDA", label: "Weak (Manda)", hint: "Low appetite, heaviness after food" },
];

const BOWEL_OPTIONS: Array<{ value: BowelStatus; label: string }> = [
  { value: "NORMAL", label: "Normal" },
  { value: "CONSTIPATED", label: "Constipated" },
  { value: "LOOSE", label: "Loose" },
];

const REACTIONS = ["Light and relaxed", "Heaviness", "Mild bloating", "Mild fatigue", "Headache", "Body ache",
  "Nausea", "Dizziness", "Fever", "Rash", "Disturbed sleep"];

const AGNI_LABEL: Record<AgniStatus, string> = { SAMA: "Sama", VISHAMA: "Vishama", TIKSHNA: "Tikshna", MANDA: "Manda" };

export const WellnessLogPage: React.FC = () => {
  const [logs, setLogs] = useState<WellnessLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [latest, setLatest] = useState<WellnessLog | null>(null);

  const [breakfast, setBreakfast] = useState("");
  const [lunch, setLunch] = useState("");
  const [dinner, setDinner] = useState("");
  const [agniStatus, setAgniStatus] = useState<AgniStatus>("SAMA");
  const [bowelStatus, setBowelStatus] = useState<BowelStatus>("NORMAL");
  const [reactions, setReactions] = useState<string[]>([]);
  const [energyLevel, setEnergyLevel] = useState(3);
  const [discomfortLevel, setDiscomfortLevel] = useState(2);
  const [notes, setNotes] = useState("");

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await wellnessService.getMine();
      setLogs(res.logs);
      setLatest((prev) => prev || res.logs[0] || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleReaction = (r: string) =>
    setReactions((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");
    try {
      const res = await wellnessService.submit({ breakfast, lunch, dinner, agniStatus, bowelStatus, reactions, energyLevel, discomfortLevel, notes });
      setLatest(res.log);
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const input = "w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ayur-500/20 focus:border-ayur-600";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-serif text-stone-900">Daily Wellness Log</h1>
        <p className="text-xs text-stone-500 mt-1">
          Record your meals, digestion (Agni) and how your body felt today. The Ayurveda AI assistant reviews your entry and gives
          instructions for before and after your next session.
        </p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <form onSubmit={handleSubmit} className="lg:col-span-3 bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-5">
          <div>
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2"><Utensils className="w-4 h-4 text-ayur-700" /> Today's Meals</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              <input className={input} placeholder="Breakfast" value={breakfast} onChange={(e) => setBreakfast(e.target.value)} />
              <input className={input} placeholder="Lunch" value={lunch} onChange={(e) => setLunch(e.target.value)} />
              <input className={input} placeholder="Dinner" value={dinner} onChange={(e) => setDinner(e.target.value)} />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2"><Flame className="w-4 h-4 text-saffron-600" /> Digestive Status (Agni)</h3>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {AGNI_OPTIONS.map((o) => (
                <button type="button" key={o.value} onClick={() => setAgniStatus(o.value)}
                  className={`text-left p-3 rounded-xl border transition-all ${agniStatus === o.value ? "bg-ayur-50 border-ayur-600 ring-1 ring-ayur-600" : "bg-white border-stone-200 hover:border-ayur-300"}`}>
                  <div className="text-xs font-bold text-stone-900">{o.label}</div>
                  <div className="text-[10px] text-stone-500 mt-0.5">{o.hint}</div>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-[11px] font-semibold text-stone-600 w-24">Bowel movement</span>
              {BOWEL_OPTIONS.map((o) => (
                <button type="button" key={o.value} onClick={() => setBowelStatus(o.value)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border ${bowelStatus === o.value ? "bg-ayur-700 text-white border-ayur-700" : "bg-white text-stone-600 border-stone-200"}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-stone-900">Physical Reactions</h3>
            <div className="flex flex-wrap gap-2 mt-3">
              {REACTIONS.map((r) => (
                <button type="button" key={r} onClick={() => toggleReaction(r)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border ${reactions.includes(r) ? "bg-saffron-50 text-saffron-800 border-saffron-400" : "bg-white text-stone-600 border-stone-200"}`}>
                  {r}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <label className="text-[11px] font-semibold text-stone-600">
                Energy level: <span className="text-stone-900">{energyLevel}/5</span>
                <input type="range" min={1} max={5} value={energyLevel} onChange={(e) => setEnergyLevel(Number(e.target.value))} className="w-full accent-ayur-700" />
              </label>
              <label className="text-[11px] font-semibold text-stone-600">
                Discomfort level: <span className="text-stone-900">{discomfortLevel}/10</span>
                <input type="range" min={0} max={10} value={discomfortLevel} onChange={(e) => setDiscomfortLevel(Number(e.target.value))} className="w-full accent-saffron-600" />
              </label>
            </div>
            <textarea className={`${input} mt-3`} rows={2} placeholder="Anything else you noticed today (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <button type="submit" disabled={isSaving}
            className="w-full py-2.5 bg-ayur-700 hover:bg-ayur-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
            <Sparkles className="w-4 h-4" /> {isSaving ? "Reviewing your entry..." : "Save Log & Get AI Guidance"}
          </button>
        </form>

        <div className="lg:col-span-2 space-y-4">
          {latest?.guidance ? (
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2"><Sparkles className="w-4 h-4 text-ayur-700" /> AI Guidance</h3>
                <span className="text-[10px] text-stone-400">{formatDate(latest.logDate)}{latest.dayNumber ? ` · Day ${latest.dayNumber}` : ""}</span>
              </div>
              <p className="text-xs text-stone-600">{latest.guidance.summary}</p>
              {latest.guidance.alerts.length > 0 && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-800 flex gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> <span>{latest.guidance.alerts.join(" ")} Your therapist has been informed.</span>
                </div>
              )}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wide text-ayur-800 flex items-center gap-1.5"><Sunrise className="w-3.5 h-3.5" /> Before your next session</h4>
                <ul className="mt-2 space-y-1.5">{latest.guidance.preTreatment.map((t, i) => <li key={i} className="text-xs text-stone-700 leading-relaxed">• {t}</li>)}</ul>
              </div>
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wide text-saffron-700 flex items-center gap-1.5"><Moon className="w-3.5 h-3.5" /> After the session</h4>
                <ul className="mt-2 space-y-1.5">{latest.guidance.postTreatment.map((t, i) => <li key={i} className="text-xs text-stone-700 leading-relaxed">• {t}</li>)}</ul>
              </div>
              <p className="text-[10px] text-stone-400 border-t border-stone-100 pt-2">
                General guidance only. It does not replace your doctor's advice.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-stone-300 p-6 text-center text-xs text-stone-500">
              Save today's log to receive personalised instructions.
            </div>
          )}

          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2 p-5 pb-3"><ClipboardList className="w-4 h-4 text-ayur-700" /> Recent Entries</h3>
            {isLoading ? <LoadingSpinner text="Loading logs..." /> : (
              <div className="divide-y divide-stone-100">
                {logs.length === 0 && <div className="p-5 text-xs text-stone-500">No entries yet.</div>}
                {logs.slice(0, 5).map((l) => (
                  <button key={l.id} onClick={() => setLatest(l)} className="w-full text-left px-5 py-3 hover:bg-stone-50 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-stone-900">{formatDate(l.logDate)}{l.dayNumber ? ` · Day ${l.dayNumber}` : ""}</div>
                      <div className="text-[11px] text-stone-500 mt-0.5">{l.reactions.join(", ") || "No reactions"}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] font-semibold text-ayur-800">Agni: {AGNI_LABEL[l.agniStatus]}</div>
                      <div className="text-[10px] text-stone-500">Discomfort {l.discomfortLevel}/10</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
