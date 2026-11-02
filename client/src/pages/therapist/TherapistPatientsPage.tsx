import React, { useState, useEffect } from "react";
import { therapistService } from "../../services/therapistService";
import { TherapySession, TherapyCourse } from "../../types";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { StatusBadge } from "../../components/common/StatusBadge";
import { Modal } from "../../components/common/Modal";
import { Users, Phone, Calendar, Eye, Activity, Heart, Thermometer, Scale, AlertCircle } from "lucide-react";
import { formatDate, formatTime } from "../../utils/formatters";

export const TherapistPatientsPage: React.FC = () => {
  const [sessions, setSessions] = useState<TherapySession[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Full Therapy Plan modal state
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [planData, setPlanData] = useState<{ patient: any; activeCourse: any; courses: any[] } | null>(null);
  const [isPlanLoading, setIsPlanLoading] = useState<boolean>(false);

  useEffect(() => {
    async function loadSessions() {
      try {
        const res = await therapistService.getSessions();
        setSessions(res.sessions);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSessions();
  }, []);

  const handleOpenPlan = async (patientId: string) => {
    setSelectedPatientId(patientId);
    setIsPlanLoading(true);
    try {
      const res = await therapistService.getPatientTherapyPlan(patientId);
      setPlanData(res);
    } catch (err) {
      console.error("Failed to load therapy plan:", err);
    } finally {
      setIsPlanLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading assigned patients..." />;
  }

  // Group unique patients
  const uniquePatientsMap = new Map<string, any>();
  sessions.forEach((s) => {
    if (s.patient && !uniquePatientsMap.has(s.patientId)) {
      uniquePatientsMap.set(s.patientId, {
        patient: s.patient,
        course: s.course,
        lastSessionDate: s.sessionDate,
      });
    }
  });

  const uniquePatients = Array.from(uniquePatientsMap.values());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-serif text-stone-900">Assigned Patients</h1>
        <p className="text-xs text-stone-500 mt-1">
          Patients undergoing active Panchakarma therapies under your direct clinical supervision.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {uniquePatients.map(({ patient, course, lastSessionDate }) => (
          <div
            key={patient.id}
            className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-ayur-100 text-ayur-800 font-bold flex items-center justify-center font-serif text-base">
                  {patient.user.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-stone-900">{patient.user.name}</h3>
                  <p className="text-xs text-stone-500">📞 {patient.phone}</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-stone-100 space-y-2 text-xs text-stone-600">
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase font-bold">Active Protocol</span>
                  <strong className="text-stone-800">{course?.therapyName} ({course?.durationDays} Days)</strong>
                </div>
                {patient.medicalNotes && (
                  <div className="bg-stone-50 p-2.5 rounded-lg text-[11px] text-stone-700 mt-2">
                    <strong>Clinical Diagnosis:</strong> {patient.medicalNotes}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-stone-100">
              <button
                onClick={() => handleOpenPlan(patient.id)}
                className="w-full px-3 py-2 bg-ayur-50 hover:bg-ayur-100 text-ayur-800 border border-ayur-200 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" /> View Full Therapy Plan
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* View Full Therapy Plan Modal */}
      <Modal
        isOpen={!!selectedPatientId}
        onClose={() => {
          setSelectedPatientId(null);
          setPlanData(null);
        }}
        title={`Full Therapy Plan — ${planData?.patient?.name || "Patient"}`}
        subtitle={planData?.activeCourse ? `${planData.activeCourse.therapyName} (${planData.activeCourse.durationDays} Days Course)` : undefined}
      >
        {isPlanLoading ? (
          <div className="py-12">
            <LoadingSpinner size="md" text="Loading comprehensive therapy plan..." />
          </div>
        ) : planData?.activeCourse ? (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1 text-xs">
            {/* Patient Header Summary */}
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-stone-700">
              <div>
                <span className="text-[10px] text-stone-400 block uppercase font-bold">Gender / Age</span>
                <strong>{planData.patient.gender} • {planData.patient.dateOfBirth}</strong>
              </div>
              <div>
                <span className="text-[10px] text-stone-400 block uppercase font-bold">Phone</span>
                <strong>{planData.patient.phone}</strong>
              </div>
              <div>
                <span className="text-[10px] text-stone-400 block uppercase font-bold">Course Status</span>
                <span className="font-bold text-ayur-800">{planData.activeCourse.status}</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-400 block uppercase font-bold">Start Date</span>
                <strong>{formatDate(planData.activeCourse.startDate)}</strong>
              </div>
            </div>

            {/* Daily Sessions Timeline */}
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-stone-900 font-serif">Daily Session Progression</h4>
              {planData.activeCourse.sessions?.map((s: any) => {
                const phaseColor =
                  s.phase === "PURVAKARMA"
                    ? "bg-amber-100 text-amber-800 border-amber-200"
                    : s.phase === "PRADHANA_KARMA"
                    ? "bg-ayur-100 text-ayur-800 border-ayur-200"
                    : "bg-purple-100 text-purple-800 border-purple-200";

                return (
                  <div
                    key={s.id}
                    className={`p-4 rounded-xl border ${
                      s.status === "COMPLETED"
                        ? "bg-stone-50/80 border-stone-200"
                        : "bg-white border-ayur-200 shadow-xs"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-stone-900">
                          Day {s.dayNumber} — {formatDate(s.sessionDate)}
                        </span>
                        {s.phase && (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${phaseColor}`}>
                            {s.phase.replace("_", " ")}
                          </span>
                        )}
                        <StatusBadge status={s.status} size="sm" />
                      </div>
                      <span className="text-[11px] text-stone-500 font-mono">
                        ⏰ {formatTime(s.startTime)} - {formatTime(s.endTime)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-stone-600 mb-2">
                      <div>
                        <strong>Procedure:</strong> <span className="text-ayur-900 font-semibold">{s.procedure || s.course?.therapyName || "Standard Protocol"}</span>
                      </div>
                      <div>
                        <strong>Room:</strong> {s.room?.roomName} (Room {s.room?.roomNumber})
                      </div>
                    </div>

                    {/* Vitals if recorded */}
                    {(s.bloodPressure || s.pulseRate || s.temperature || s.weight || s.symptomScore) && (
                      <div className="p-2.5 bg-white border border-stone-200 rounded-lg grid grid-cols-2 sm:grid-cols-5 gap-2 text-[10px] text-stone-700 my-2">
                        {s.bloodPressure && <div><strong>BP:</strong> {s.bloodPressure}</div>}
                        {s.pulseRate && <div><strong>Pulse:</strong> {s.pulseRate} bpm</div>}
                        {s.temperature && <div><strong>Temp:</strong> {s.temperature} °F</div>}
                        {s.weight && <div><strong>Weight:</strong> {s.weight} kg</div>}
                        {s.symptomScore && <div><strong>Symptom:</strong> {s.symptomScore}/10</div>}
                      </div>
                    )}

                    {/* Pathya / Apathya / Lifestyle */}
                    {(s.pathya || s.apathya || s.lifestyleInstructions) && (
                      <div className="p-2.5 bg-amber-50/60 border border-amber-200/50 rounded-lg space-y-1 text-[11px] text-stone-700 mt-2">
                        {s.pathya && <div>🌿 <strong>Pathya (Diet):</strong> {s.pathya}</div>}
                        {s.apathya && <div>🚫 <strong>Apathya (Avoid):</strong> {s.apathya}</div>}
                        {s.lifestyleInstructions && <div>🧘 <strong>Lifestyle:</strong> {s.lifestyleInstructions}</div>}
                      </div>
                    )}

                    {/* Treatment Notes */}
                    {s.treatmentNotes && (
                      <div className="mt-2 text-[11px] text-stone-700 bg-emerald-50/60 p-2 rounded-lg border border-emerald-200/50">
                        <strong>Clinical Observations:</strong> {s.treatmentNotes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-stone-500 text-xs">
            No active therapy plan found for this patient.
          </div>
        )}
      </Modal>
    </div>
  );
};

