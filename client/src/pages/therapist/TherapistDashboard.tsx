import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { therapistService } from "../../services/therapistService";
import { sessionService } from "../../services/sessionService";
import { SessionRequest, TherapySession } from "../../types";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { StatusBadge } from "../../components/common/StatusBadge";
import { Modal } from "../../components/common/Modal";
import { Alert } from "../../components/common/Alert";
import { formatTime, formatDate } from "../../utils/formatters";
import { Activity, Clock, CheckCircle2, XCircle, FileText, User, CalendarClock, Send, AlertCircle, RefreshCw } from "lucide-react";
import { StatCard } from "../../components/common/StatCard";
import { requestService } from "../../services/requestService";

export const TherapistDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [requests, setRequests] = useState<SessionRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Complete Session Modal
  const [selectedSession, setSelectedSession] = useState<TherapySession | null>(null);
  const [treatmentNotes, setTreatmentNotes] = useState<string>("");
  const [bloodPressure, setBloodPressure] = useState<string>("");
  const [pulseRate, setPulseRate] = useState<string>("");
  const [temperature, setTemperature] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [symptomScore, setSymptomScore] = useState<number>(5);
  const [pathya, setPathya] = useState<string>("");
  const [apathya, setApathya] = useState<string>("");
  const [lifestyleInstructions, setLifestyleInstructions] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Full Therapy Plan Modal
  const [planPatientId, setPlanPatientId] = useState<string | null>(null);
  const [planData, setPlanData] = useState<{ patient: any; activeCourse: any; courses: any[] } | null>(null);
  const [isPlanLoading, setIsPlanLoading] = useState<boolean>(false);

  // Request Reschedule Modal
  const [rescheduleSession, setRescheduleSession] = useState<TherapySession | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>("");
  const [rescheduleTime, setRescheduleTime] = useState<string>("10:00");
  const [rescheduleReason, setRescheduleReason] = useState<string>("");

  // Request Cancel Modal
  const [cancelSession, setCancelSession] = useState<TherapySession | null>(null);
  const [cancelReason, setCancelReason] = useState<string>("");

  // Recommend Replacement Modal
  const [recommendSession, setRecommendSession] = useState<TherapySession | null>(null);
  const [recommendDate, setRecommendDate] = useState<string>("");
  const [recommendTime, setRecommendTime] = useState<string>("10:00");
  const [recommendReason, setRecommendReason] = useState<string>("");

  const [modalSuccess, setModalSuccess] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadDashboard = async () => {
    setIsLoading(true);
    try {
      const [res, reqRes] = await Promise.all([
        therapistService.getDashboard(),
        requestService.getAll(),
      ]);
      setData(res);
      setRequests(reqRes.requests);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleOpenPlan = async (patientId: string) => {
    setPlanPatientId(patientId);
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

  const handleCompleteSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      await sessionService.complete(selectedSession.id, {
        treatmentNotes,
        bloodPressure: bloodPressure || undefined,
        pulseRate: pulseRate ? parseInt(pulseRate, 10) : undefined,
        temperature: temperature ? parseFloat(temperature) : undefined,
        weight: weight ? parseFloat(weight) : undefined,
        symptomScore: symptomScore || undefined,
        pathya: pathya || undefined,
        apathya: apathya || undefined,
        lifestyleInstructions: lifestyleInstructions || undefined,
      });
      setSelectedSession(null);
      setTreatmentNotes("");
      setBloodPressure("");
      setPulseRate("");
      setTemperature("");
      setWeight("");
      setPathya("");
      setApathya("");
      setLifestyleInstructions("");
      loadDashboard();
    } catch (err: any) {
      setActionError(err.message || "Failed to complete session.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkMissed = async (sessionId: string) => {
    const reason = window.prompt("Enter reason for marking this session as MISSED:", "Patient was unable to attend scheduled Panchakarma session.");
    if (reason === null) return;
    try {
      await sessionService.markMissed(sessionId, reason.trim() || "Patient missed scheduled treatment session.");
      loadDashboard();
    } catch (err: any) {
      alert(err.message || "Failed to mark session missed.");
    }
  };

  const handleRequestReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleSession) return;
    setIsSubmitting(true);
    setModalError(null);
    try {
      await sessionService.requestReschedule(rescheduleSession.id, {
        preferredDate: rescheduleDate,
        preferredTime: rescheduleTime,
        reason: rescheduleReason,
      });
      setModalSuccess("Reschedule request submitted for Admin review.");
      setTimeout(() => {
        setRescheduleSession(null);
        setRescheduleDate("");
        setRescheduleTime("10:00");
        setRescheduleReason("");
        setModalSuccess(null);
        loadDashboard();
      }, 1200);
    } catch (err: any) {
      setModalError(err.message || "Failed to submit reschedule request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelSession) return;
    setIsSubmitting(true);
    setModalError(null);
    try {
      await sessionService.requestCancel(cancelSession.id, {
        reason: cancelReason,
      });
      setModalSuccess("Cancellation request submitted for Admin review.");
      setTimeout(() => {
        setCancelSession(null);
        setCancelReason("");
        setModalSuccess(null);
        loadDashboard();
      }, 1200);
    } catch (err: any) {
      setModalError(err.message || "Failed to submit cancellation request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecommendReplacement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recommendSession) return;
    setIsSubmitting(true);
    setModalError(null);
    try {
      await sessionService.recommendReschedule(recommendSession.id, {
        preferredDate: recommendDate,
        preferredTime: recommendTime,
        reason: recommendReason,
      });
      setModalSuccess("Replacement recommendation submitted for Admin scheduling.");
      setTimeout(() => {
        setRecommendSession(null);
        setRecommendDate("");
        setRecommendTime("10:00");
        setRecommendReason("");
        setModalSuccess(null);
        loadDashboard();
      }, 1200);
    } catch (err: any) {
      setModalError(err.message || "Failed to recommend replacement session.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading today's clinical queue..." />;
  }

  const stats = data?.stats;
  const todaySessions: TherapySession[] = data?.todaySessions || [];
  const nextSession = data?.nextSession;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-stone-900">
            Therapist Dashboard — My Day
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Today is {formatDate(data?.date)}. Manage daily Panchakarma sessions and clinical treatment notes.
          </p>
        </div>

        <Link
          to="/therapist/history"
          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-xl font-bold text-xs shadow-xs transition-colors"
        >
          <FileText className="w-4 h-4 text-ayur-700" /> View Treatment History
        </Link>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Sessions"
          value={stats?.todayTotal || 0}
          icon={Activity}
          description="Total allocated today"
          colorScheme="ayur"
        />
        <StatCard
          title="Completed Today"
          value={stats?.todayCompleted || 0}
          icon={CheckCircle2}
          description="Finished procedures"
          colorScheme="saffron"
        />
        <StatCard
          title="Pending Sessions"
          value={stats?.todayPending || 0}
          icon={Clock}
          description="Awaiting treatment"
          colorScheme="clay"
        />
        <StatCard
          title="All-Time Sessions"
          value={stats?.allTimeCompleted || 0}
          icon={User}
          description="Total completed"
          colorScheme="blue"
        />
      </div>

      {/* Next Up Urgent Hero Card */}
      {nextSession && (
        <div className="bg-gradient-to-r from-ayur-800 to-ayur-950 rounded-2xl p-6 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-saffron-500 text-white animate-pulse">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-ayur-200">
                Next Immediate Patient
              </span>
              <h3 className="text-xl font-bold font-serif">{nextSession.patient?.user.name}</h3>
              <div className="text-xs text-ayur-200 mt-1 flex flex-wrap items-center gap-3">
                <span>
                  🌿 Day {nextSession.dayNumber} of {nextSession.course?.durationDays} ({nextSession.course?.therapyName})
                </span>
                <span>•</span>
                <span>⏰ {formatTime(nextSession.startTime)}</span>
                <span>•</span>
                <span>🚪 {nextSession.room?.roomName} ({nextSession.room?.roomNumber})</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setSelectedSession(nextSession);
              setTreatmentNotes("");
            }}
            className="px-5 py-2.5 bg-saffron-500 hover:bg-saffron-600 text-white font-bold text-xs rounded-xl shadow-sm transition-all shrink-0"
          >
            Start & Record Notes
          </button>
        </div>
      )}

      {/* Today's Full Schedule */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
        <h3 className="text-base font-bold text-stone-900 font-serif mb-4 flex items-center gap-2">
          <span>📋</span> Today's Clinical Schedule ({todaySessions.length})
        </h3>

        {todaySessions.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500">
            No therapy sessions assigned for today. Enjoy your day!
          </div>
        ) : (
          <div className="space-y-3">
            {todaySessions.map((session) => {
              const isCompleted = session.status === "COMPLETED";

              return (
                <div
                  key={session.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isCompleted
                      ? "bg-stone-50/70 border-stone-200"
                      : "bg-white border-ayur-200 shadow-xs"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-xs text-stone-900 font-serif">
                        {formatTime(session.startTime)} - {formatTime(session.endTime)}
                      </span>
                      <StatusBadge status={session.status} size="sm" />
                      <span className="text-[11px] font-bold text-ayur-800 bg-ayur-50 px-2 py-0.5 rounded">
                        Day {session.dayNumber} of {session.course?.durationDays}
                      </span>
                    </div>

                    <div className="text-xs text-stone-800 font-bold">
                      {session.patient?.user.name}
                      <span className="text-stone-500 font-normal ml-2">
                        ({session.course?.therapyName})
                      </span>
                    </div>

                    <div className="text-[11px] text-stone-500 flex items-center gap-3">
                      <span>🚪 {session.room?.roomName} (Room {session.room?.roomNumber})</span>
                      <span>📞 {session.patient?.phone}</span>
                    </div>

                    {session.patient?.medicalNotes && (
                      <div className="text-[11px] text-stone-600 bg-stone-50 p-2 rounded-lg mt-2 italic">
                        <strong>Patient Health Notes:</strong> {session.patient.medicalNotes}
                      </div>
                    )}

                    {session.treatmentNotes && (
                      <div className="text-[11px] text-emerald-800 bg-emerald-50/70 p-2 rounded-lg mt-2">
                        <strong>Recorded Treatment Notes:</strong> {session.treatmentNotes}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleOpenPlan(session.patientId)}
                      className="px-2.5 py-1.5 bg-ayur-50 hover:bg-ayur-100 text-ayur-800 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1 border border-ayur-200/60"
                      title="View entire therapy course plan"
                    >
                      <FileText className="w-3.5 h-3.5" /> Plan
                    </button>

                    {session.status === "SCHEDULED" && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedSession(session);
                            setTreatmentNotes("");
                            setBloodPressure(session.bloodPressure || "");
                            setPulseRate(session.pulseRate ? String(session.pulseRate) : "");
                            setTemperature(session.temperature ? String(session.temperature) : "");
                            setWeight(session.weight ? String(session.weight) : "");
                            setSymptomScore(session.symptomScore || 5);
                            setPathya(session.pathya || "");
                            setApathya(session.apathya || "");
                            setLifestyleInstructions(session.lifestyleInstructions || "");
                          }}
                          className="px-3 py-1.5 bg-ayur-700 hover:bg-ayur-800 text-white rounded-lg font-bold text-xs shadow-xs transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                        </button>
                        <button
                          onClick={() => handleMarkMissed(session.id)}
                          className="px-3 py-1.5 bg-stone-100 hover:bg-rose-50 hover:text-rose-700 text-stone-600 rounded-lg font-semibold text-xs transition-colors"
                        >
                          Missed
                        </button>
                        <button
                          onClick={() => {
                            setRescheduleSession(session);
                            setRescheduleDate(session.sessionDate);
                            setRescheduleTime(session.startTime);
                            setRescheduleReason("");
                            setModalError(null);
                            setModalSuccess(null);
                          }}
                          className="px-2.5 py-1.5 bg-stone-100 hover:bg-ayur-50 hover:text-ayur-800 text-stone-700 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1"
                        >
                          <CalendarClock className="w-3.5 h-3.5" /> Reschedule
                        </button>
                        <button
                          onClick={() => {
                            setCancelSession(session);
                            setCancelReason("");
                            setModalError(null);
                            setModalSuccess(null);
                          }}
                          className="px-2.5 py-1.5 bg-stone-100 hover:bg-rose-50 hover:text-rose-700 text-stone-600 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Cancel
                        </button>
                      </>
                    )}

                    {session.status === "MISSED" && (
                      <button
                        onClick={() => {
                          setRecommendSession(session);
                          setRecommendDate("");
                          setRecommendTime("10:00");
                          setRecommendReason("Patient missed previous scheduled session. Recommending replacement procedure to maintain multi-day Panchakarma protocol continuity.");
                          setModalError(null);
                          setModalSuccess(null);
                        }}
                        className="px-3 py-1.5 bg-saffron-600 hover:bg-saffron-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Recommend Replacement
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Practitioner Request History & Clinical Queue */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
        <h3 className="text-base font-bold text-stone-900 font-serif mb-2 flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-ayur-700" /> Your Submitted Schedule Requests & Recommendations
        </h3>
        <p className="text-xs text-stone-500 mb-4">
          All schedule adjustments and replacement recommendations are reviewed and approved by clinic administrators.
        </p>

        {requests.length === 0 ? (
          <div className="p-6 text-center text-xs text-stone-400 bg-stone-50 rounded-xl">
            No schedule or replacement requests submitted.
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div
                key={req.id}
                className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-900 font-serif">
                      {req.requestType} REQUEST — Day {req.session?.dayNumber || req.course?.durationDays} ({req.course?.therapyName})
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        req.status === "APPROVED"
                          ? "bg-emerald-100 text-emerald-800"
                          : req.status === "REJECTED"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>

                  <div className="text-stone-600">
                    Patient: <strong>{req.patient?.user?.name || req.patient?.name}</strong> • Requested on {formatDate(req.createdAt.substring(0, 10))}
                  </div>

                  {req.preferredDate && (
                    <div className="text-[11px] text-ayur-800 font-medium">
                      Preferred Reschedule: {formatDate(req.preferredDate)} at {req.preferredTime || "10:00"}
                    </div>
                  )}

                  <div className="text-stone-600 italic bg-white p-2 rounded-lg border border-stone-100 text-[11px]">
                    Reason: "{req.reason}"
                  </div>

                  {req.adminNotes && (
                    <div className="text-stone-700 bg-stone-100 p-2 rounded-lg text-[11px]">
                      <strong>Admin Notes:</strong> {req.adminNotes}
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-stone-400 text-right">
                  {req.status === "PENDING" ? (
                    <span className="text-amber-700 font-semibold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Awaiting Admin
                    </span>
                  ) : (
                    <span>Resolved</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Complete Session Modal with Vitals & Pathya */}
      <Modal
        isOpen={!!selectedSession}
        onClose={() => setSelectedSession(null)}
        title="Complete Session & Record Clinical Vitals"
        subtitle={`Day ${selectedSession?.dayNumber} — ${selectedSession?.patient?.user?.name} (${selectedSession?.course?.therapyName})`}
      >
        {actionError && <Alert type="error" className="mb-4">{actionError}</Alert>}

        <form onSubmit={handleCompleteSession} className="space-y-4 text-xs max-h-[72vh] overflow-y-auto pr-1">
          {/* Clinical Vitals Section */}
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
            <h4 className="font-bold text-stone-800 flex items-center gap-1.5 text-xs font-serif">
              <span>🩺</span> Patient Clinical Vitals
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">Blood Pressure</label>
                <input
                  type="text"
                  placeholder="120/80"
                  value={bloodPressure}
                  onChange={(e) => setBloodPressure(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">Pulse (bpm)</label>
                <input
                  type="number"
                  placeholder="72"
                  value={pulseRate}
                  onChange={(e) => setPulseRate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">Temp (°F)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="98.6"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="65.0"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Symptom Severity Score (1 = Minimal / Relieved, 10 = Severe): <strong className="text-ayur-800">{symptomScore}/10</strong>
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={symptomScore}
                onChange={(e) => setSymptomScore(parseInt(e.target.value, 10))}
                className="w-full accent-ayur-700"
              />
            </div>
          </div>

          {/* Treatment Notes */}
          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              Clinical Observations & Treatment Notes (Required)
            </label>
            <textarea
              rows={3}
              required
              value={treatmentNotes}
              onChange={(e) => setTreatmentNotes(e.target.value)}
              placeholder="e.g. Basti procedure administered with warm herbal oil. Retention time 3 hours. Good tolerance."
              className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-1 focus:ring-ayur-600 text-xs leading-relaxed"
            />
          </div>

          {/* Pathya / Apathya / Lifestyle */}
          <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200/60 space-y-2.5">
            <h4 className="font-bold text-stone-800 text-xs font-serif flex items-center gap-1.5">
              <span>🌿</span> Dietary & Post-Therapy Guidelines (Pathya / Apathya)
            </h4>
            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-0.5">Pathya (Dietary Recommendations)</label>
                <input
                  type="text"
                  placeholder="e.g. Warm rice soup, boiled vegetables, ginger water"
                  value={pathya}
                  onChange={(e) => setPathya(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-0.5">Apathya (Foods to Avoid)</label>
                <input
                  type="text"
                  placeholder="e.g. Cold water, oily/fried foods, heavy dairy"
                  value={apathya}
                  onChange={(e) => setApathya(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-0.5">Lifestyle / Rest Instructions</label>
                <input
                  type="text"
                  placeholder="e.g. Avoid direct cold air / AC, restful nap, gentle walk"
                  value={lifestyleInstructions}
                  onChange={(e) => setLifestyleInstructions(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setSelectedSession(null)}
              className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-xl font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !treatmentNotes.trim()}
              className="px-5 py-2 bg-ayur-700 text-white rounded-xl font-bold hover:bg-ayur-800 shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? "Recording..." : "Complete & Save Vitals"}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Full Therapy Plan Modal */}
      <Modal
        isOpen={!!planPatientId}
        onClose={() => {
          setPlanPatientId(null);
          setPlanData(null);
        }}
        title={`Comprehensive Therapy Plan — ${planData?.patient?.name || "Patient"}`}
        subtitle={planData?.activeCourse ? `${planData.activeCourse.therapyName} (${planData.activeCourse.durationDays} Days Course)` : undefined}
      >
        {isPlanLoading ? (
          <div className="py-12">
            <LoadingSpinner size="md" text="Loading comprehensive therapy plan..." />
          </div>
        ) : planData?.activeCourse ? (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1 text-xs">
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

                    {(s.bloodPressure || s.pulseRate || s.temperature || s.weight || s.symptomScore) && (
                      <div className="p-2.5 bg-white border border-stone-200 rounded-lg grid grid-cols-2 sm:grid-cols-5 gap-2 text-[10px] text-stone-700 my-2">
                        {s.bloodPressure && <div><strong>BP:</strong> {s.bloodPressure}</div>}
                        {s.pulseRate && <div><strong>Pulse:</strong> {s.pulseRate} bpm</div>}
                        {s.temperature && <div><strong>Temp:</strong> {s.temperature} °F</div>}
                        {s.weight && <div><strong>Weight:</strong> {s.weight} kg</div>}
                        {s.symptomScore && <div><strong>Symptom:</strong> {s.symptomScore}/10</div>}
                      </div>
                    )}

                    {(s.pathya || s.apathya || s.lifestyleInstructions) && (
                      <div className="p-2.5 bg-amber-50/60 border border-amber-200/50 rounded-lg space-y-1 text-[11px] text-stone-700 mt-2">
                        {s.pathya && <div>🌿 <strong>Pathya (Diet):</strong> {s.pathya}</div>}
                        {s.apathya && <div>🚫 <strong>Apathya (Avoid):</strong> {s.apathya}</div>}
                        {s.lifestyleInstructions && <div>🧘 <strong>Lifestyle:</strong> {s.lifestyleInstructions}</div>}
                      </div>
                    )}

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

      {/* Request Reschedule Modal */}
      <Modal
        isOpen={!!rescheduleSession}
        onClose={() => setRescheduleSession(null)}
        title="Request Session Reschedule"
        subtitle={`Day ${rescheduleSession?.dayNumber} — ${rescheduleSession?.patient?.user.name} (${rescheduleSession?.course?.therapyName})`}
      >
        {modalError && <Alert type="error" className="mb-4">{modalError}</Alert>}
        {modalSuccess && <Alert type="success" className="mb-4">{modalSuccess}</Alert>}

        <form onSubmit={handleRequestReschedule} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Preferred Date</label>
              <input
                type="date"
                required
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-1 focus:ring-ayur-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Preferred Time</label>
              <select
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-1 focus:ring-ayur-600"
              >
                <option value="09:00">09:00 AM</option>
                <option value="10:00">10:00 AM</option>
                <option value="11:00">11:00 AM</option>
                <option value="14:00">02:00 PM</option>
                <option value="15:00">03:00 PM</option>
                <option value="16:00">04:00 PM</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">Clinical Reason for Reschedule (Required)</label>
            <textarea
              rows={3}
              required
              placeholder="e.g. Patient requires preparation interval adjustment or practitioner schedule conflict..."
              value={rescheduleReason}
              onChange={(e) => setRescheduleReason(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-1 focus:ring-ayur-600 text-xs"
            />
          </div>

          <div className="p-3 bg-stone-50 rounded-xl text-[11px] text-stone-600">
            Rescheduling requests are submitted to clinic administrators for final room and therapist conflict validation.
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRescheduleSession(null)}
              className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-xl font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !rescheduleReason.trim() || !rescheduleDate}
              className="px-5 py-2 bg-ayur-700 text-white rounded-xl font-bold hover:bg-ayur-800 shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Submit Reschedule Request"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Request Cancel Modal */}
      <Modal
        isOpen={!!cancelSession}
        onClose={() => setCancelSession(null)}
        title="Request Session Cancellation"
        subtitle={`Day ${cancelSession?.dayNumber} — ${cancelSession?.patient?.user.name} (${cancelSession?.course?.therapyName})`}
      >
        {modalError && <Alert type="error" className="mb-4">{modalError}</Alert>}
        {modalSuccess && <Alert type="success" className="mb-4">{modalSuccess}</Alert>}

        <form onSubmit={handleRequestCancel} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-stone-700 mb-1">Reason for Cancellation (Required)</label>
            <textarea
              rows={3}
              required
              placeholder="e.g. Clinical contraindication observed; recommend course pause or cancellation of this day..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-1 focus:ring-ayur-600 text-xs"
            />
          </div>

          <div className="p-3 bg-stone-50 rounded-xl text-[11px] text-stone-600">
            Cancellation requests are sent to clinic administrators for formal processing and notification to the patient.
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCancelSession(null)}
              className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-xl font-semibold"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !cancelReason.trim()}
              className="px-5 py-2 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Submit Cancellation Request"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Recommend Replacement Modal */}
      <Modal
        isOpen={!!recommendSession}
        onClose={() => setRecommendSession(null)}
        title="Recommend Replacement Session"
        subtitle={`For Missed Day ${recommendSession?.dayNumber} — ${recommendSession?.patient?.user.name}`}
      >
        {modalError && <Alert type="error" className="mb-4">{modalError}</Alert>}
        {modalSuccess && <Alert type="success" className="mb-4">{modalSuccess}</Alert>}

        <form onSubmit={handleRecommendReplacement} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Recommended Date</label>
              <input
                type="date"
                required
                value={recommendDate}
                onChange={(e) => setRecommendDate(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-1 focus:ring-ayur-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Recommended Time</label>
              <select
                value={recommendTime}
                onChange={(e) => setRecommendTime(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-1 focus:ring-ayur-600"
              >
                <option value="09:00">09:00 AM</option>
                <option value="10:00">10:00 AM</option>
                <option value="11:00">11:00 AM</option>
                <option value="14:00">02:00 PM</option>
                <option value="15:00">03:00 PM</option>
                <option value="16:00">04:00 PM</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">Clinical Justification / Recommendation Notes</label>
            <textarea
              rows={3}
              required
              value={recommendReason}
              onChange={(e) => setRecommendReason(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-1 focus:ring-ayur-600 text-xs"
            />
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200/70 rounded-xl text-[11px] text-amber-900">
            <strong>Panchakarma Protocol:</strong> The missed session record will remain intact in the patient history. Approving this recommendation will create a separate replacement session linked to the course.
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRecommendSession(null)}
              className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-xl font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !recommendReason.trim() || !recommendDate}
              className="px-5 py-2 bg-saffron-600 text-white rounded-xl font-bold hover:bg-saffron-700 shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Submit Recommendation"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
