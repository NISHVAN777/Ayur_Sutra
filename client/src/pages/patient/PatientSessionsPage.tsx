import React, { useState, useEffect } from "react";
import { patientService } from "../../services/patientService";
import { sessionService } from "../../services/sessionService";
import { requestService } from "../../services/requestService";
import { TherapySession, SessionRequest } from "../../types";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { StatusBadge } from "../../components/common/StatusBadge";
import { Modal } from "../../components/common/Modal";
import { Alert } from "../../components/common/Alert";
import { formatDate, formatTime, formatDateTime } from "../../utils/formatters";
import { Clock, Calendar, CalendarClock, XCircle, RefreshCw, CheckCircle2, History, AlertCircle } from "lucide-react";

export const PatientSessionsPage: React.FC = () => {
  const [sessions, setSessions] = useState<TherapySession[]>([]);
  const [requests, setRequests] = useState<SessionRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals state
  const [selectedSession, setSelectedSession] = useState<TherapySession | null>(null);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState<boolean>(false);
  const [isCancelOpen, setIsCancelOpen] = useState<boolean>(false);
  const [isReplacementOpen, setIsReplacementOpen] = useState<boolean>(false);

  // Form states
  const [reason, setReason] = useState<string>("");
  const [preferredDate, setPreferredDate] = useState<string>("");
  const [preferredTime, setPreferredTime] = useState<string>("");

  // Submitting & Feedback
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [sessRes, reqRes] = await Promise.all([
        patientService.getSessions(),
        requestService.getAll(),
      ]);
      setSessions(sessRes.sessions);
      setRequests(reqRes.requests || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openRescheduleModal = (session: TherapySession) => {
    setSelectedSession(session);
    setReason("");
    setPreferredDate("");
    setPreferredTime("");
    setModalError(null);
    setIsRescheduleOpen(true);
  };

  const openCancelModal = (session: TherapySession) => {
    setSelectedSession(session);
    setReason("");
    setModalError(null);
    setIsCancelOpen(true);
  };

  const openReplacementModal = (session: TherapySession) => {
    setSelectedSession(session);
    setReason("Unable to attend previous scheduled session; requesting replacement session.");
    setPreferredDate("");
    setPreferredTime("");
    setModalError(null);
    setIsReplacementOpen(true);
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) return;
    setIsSubmitting(true);
    setModalError(null);

    try {
      const res = await sessionService.requestReschedule(selectedSession.id, {
        reason,
        preferredDate: preferredDate || undefined,
        preferredTime: preferredTime || undefined,
      });
      setIsRescheduleOpen(false);
      setSuccessMessage(res.message || "Reschedule request submitted successfully for admin review.");
      await loadData();
    } catch (err: any) {
      setModalError(err.message || "Failed to submit reschedule request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) return;
    setIsSubmitting(true);
    setModalError(null);

    try {
      const res = await sessionService.requestCancel(selectedSession.id, {
        reason,
      });
      setIsCancelOpen(false);
      setSuccessMessage(res.message || "Cancellation request submitted successfully for admin review.");
      await loadData();
    } catch (err: any) {
      setModalError(err.message || "Failed to submit cancellation request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplacementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) return;
    setIsSubmitting(true);
    setModalError(null);

    try {
      const res = await sessionService.requestReplacement(selectedSession.id, {
        reason,
        preferredDate: preferredDate || undefined,
        preferredTime: preferredTime || undefined,
      });
      setIsReplacementOpen(false);
      setSuccessMessage(res.message || "Replacement session request submitted successfully for admin review.");
      await loadData();
    } catch (err: any) {
      setModalError(err.message || "Failed to submit replacement request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeclineReplacement = async (session: TherapySession) => {
    if (!window.confirm("Confirm: You choose not to reschedule this missed session. It will remain in your treatment history.")) {
      return;
    }
    try {
      const res = await sessionService.declineReplacement(session.id);
      setSuccessMessage(res.message || "Acknowledged choice not to reschedule.");
      await loadData();
    } catch (err: any) {
      console.error(err);
    }
  };

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading your therapy sessions..." />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-serif text-stone-900">Your Therapy Schedule</h1>
        <p className="text-xs text-stone-500 mt-1">
          Complete schedule of all daily Panchakarma sessions and your schedule request history.
        </p>
      </div>

      {successMessage && (
        <Alert type="success" className="mb-4">
          {successMessage}
        </Alert>
      )}

      {/* Missed Sessions Notice Banner if any */}
      {sessions.some((s) => s.status === "MISSED") && (
        <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-700" />
            <span>Missed Session Opportunity</span>
          </div>
          <p className="text-amber-800">
            You have one or more sessions marked as missed. You may submit a request for a replacement session to ensure your complete therapy course is fulfilled.
          </p>
        </div>
      )}

      {/* Sessions Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-stone-900 font-serif flex items-center gap-2">
            <Calendar className="w-4 h-4 text-ayur-700" /> Daily Therapy Sessions
          </h3>
          <span className="text-xs text-stone-500">{sessions.length} sessions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-600 font-bold border-b border-stone-200">
              <tr>
                <th className="px-4 py-3">Day</th>
                <th className="px-4 py-3">Date & Time</th>
                <th className="px-4 py-3">Therapy</th>
                <th className="px-4 py-3">Practitioner</th>
                <th className="px-4 py-3">Treatment Suite</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {sessions.map((s) => {
                const isScheduled = s.status === "SCHEDULED";
                const isMissed = s.status === "MISSED";

                return (
                  <tr key={s.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="px-4 py-3.5 font-bold font-serif text-ayur-800">
                      Day {s.dayNumber}
                      {s.replacementForSessionId && (
                        <span className="block text-[10px] font-normal text-amber-700">
                          (Replacement)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-stone-900">{formatDate(s.sessionDate)}</div>
                      <div className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-stone-400" />
                        {formatTime(s.startTime)} - {formatTime(s.endTime)}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-stone-800">{s.course?.therapyName}</td>
                    <td className="px-4 py-3.5 text-stone-700">{s.therapist?.user.name}</td>
                    <td className="px-4 py-3.5 text-stone-600">{s.room?.roomName}</td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={s.status} size="sm" />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isScheduled && (
                          <>
                            <button
                              onClick={() => openRescheduleModal(s)}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-stone-100 hover:bg-ayur-50 hover:text-ayur-800 text-stone-700 rounded-lg transition-colors flex items-center gap-1"
                              title="Request reschedule for this session"
                            >
                              <CalendarClock className="w-3.5 h-3.5" /> Request Reschedule
                            </button>
                            <button
                              onClick={() => openCancelModal(s)}
                              className="px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1"
                              title="Request session cancellation"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Request Cancel
                            </button>
                          </>
                        )}

                        {isMissed && (
                          <>
                            <button
                              onClick={() => openReplacementModal(s)}
                              className="px-2.5 py-1 text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors flex items-center gap-1 shadow-xs"
                              title="Request a replacement session for this missed treatment"
                            >
                              <RefreshCw className="w-3.5 h-3.5" /> Request Replacement
                            </button>
                            <button
                              onClick={() => handleDeclineReplacement(s)}
                              className="px-2 py-1 text-[11px] font-medium text-stone-500 hover:bg-stone-100 rounded-lg transition-colors"
                              title="Keep as missed without replacement"
                            >
                              Don't Reschedule
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Request History Section */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <h3 className="text-base font-bold text-stone-900 font-serif mb-4 flex items-center gap-2">
          <History className="w-4 h-4 text-ayur-700" /> Your Request History ({requests.length})
        </h3>

        {requests.length === 0 ? (
          <p className="text-xs text-stone-400 py-4 text-center">
            You have not submitted any reschedule or cancellation requests yet.
          </p>
        ) : (
          <div className="divide-y divide-stone-100">
            {requests.map((req) => (
              <div key={req.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-ayur-900">
                      {req.requestType === "RESCHEDULE"
                        ? "Reschedule Request"
                        : req.requestType === "CANCEL"
                          ? "Cancellation Request"
                          : "Replacement Session Request"}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        req.status === "PENDING"
                          ? "bg-amber-50 text-amber-800 border border-amber-200"
                          : req.status === "APPROVED"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-rose-50 text-rose-800 border border-rose-200"
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>

                  <p className="text-stone-600 text-[11px]">
                    <strong>Reason:</strong> {req.reason}
                    {req.preferredDate && (
                      <span className="ml-2 text-stone-500">
                        (Preferred: {formatDate(req.preferredDate)}{req.preferredTime ? ` at ${req.preferredTime}` : ""})
                      </span>
                    )}
                  </p>

                  {req.adminNotes && (
                    <p className="text-[11px] text-stone-700 bg-stone-50 p-2 rounded-lg italic">
                      <strong>Clinic Review Notes:</strong> {req.adminNotes}
                    </p>
                  )}
                </div>

                <div className="text-[10px] text-stone-400 shrink-0">
                  Submitted: {formatDateTime(req.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Request Reschedule Modal */}
      <Modal
        isOpen={isRescheduleOpen}
        onClose={() => setIsRescheduleOpen(false)}
        title="Request Session Reschedule"
        subtitle={`Day ${selectedSession?.dayNumber} — ${selectedSession?.course?.therapyName}`}
      >
        {modalError && <Alert type="error" className="mb-4">{modalError}</Alert>}

        <form onSubmit={handleRescheduleSubmit} className="space-y-4 text-xs">
          <div className="p-3 bg-stone-50 rounded-xl space-y-1 text-stone-700">
            <div className="font-semibold text-stone-900">Current Session Details:</div>
            <div><strong>Treatment:</strong> {selectedSession?.course?.therapyName}</div>
            <div><strong>Date & Time:</strong> {selectedSession && formatDate(selectedSession.sessionDate)} at {selectedSession && formatTime(selectedSession.startTime)}</div>
            <div><strong>Practitioner:</strong> {selectedSession?.therapist?.user.name}</div>
            <div><strong>Suite:</strong> {selectedSession?.room?.roomName}</div>
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              Reason for Reschedule (Required)
            </label>
            <textarea
              rows={3}
              required
              placeholder="e.g. Unavailable during morning hours due to travel; requesting afternoon or next day..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-1 focus:ring-ayur-600 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Preferred Date (Optional preference)
              </label>
              <input
                type="date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-1 focus:ring-ayur-600 text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Preferred Time (Optional preference)
              </label>
              <input
                type="text"
                placeholder="e.g. 14:00 or Afternoon"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-1 focus:ring-ayur-600 text-xs"
              />
            </div>
          </div>

          <p className="text-[11px] text-stone-500">
            Note: Preferred dates and times are reviewed by clinic administration against therapist and suite availability. Your current session remains confirmed until approved.
          </p>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsRescheduleOpen(false)}
              className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-xl font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || reason.trim().length < 3}
              className="px-5 py-2 bg-ayur-700 text-white rounded-xl font-bold hover:bg-ayur-800 shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Request Cancellation Modal */}
      <Modal
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        title="Request Session Cancellation"
        subtitle={`Day ${selectedSession?.dayNumber} — ${selectedSession?.course?.therapyName}`}
      >
        {modalError && <Alert type="error" className="mb-4">{modalError}</Alert>}

        <form onSubmit={handleCancelSubmit} className="space-y-4 text-xs">
          <div className="p-3 bg-stone-50 rounded-xl space-y-1 text-stone-700">
            <div><strong>Treatment:</strong> {selectedSession?.course?.therapyName}</div>
            <div><strong>Date:</strong> {selectedSession && formatDate(selectedSession.sessionDate)} at {selectedSession && formatTime(selectedSession.startTime)}</div>
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              Cancellation Reason (Required)
            </label>
            <textarea
              rows={3}
              required
              placeholder="e.g. Unforeseen personal emergency..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-1 focus:ring-ayur-600 text-xs"
            />
          </div>

          <p className="text-[11px] text-stone-500">
            Your cancellation request will be reviewed by clinic administration. Your session status will remain active until formally processed.
          </p>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCancelOpen(false)}
              className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-xl font-semibold"
            >
              Keep Session
            </button>
            <button
              type="submit"
              disabled={isSubmitting || reason.trim().length < 3}
              className="px-5 py-2 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Submit Cancellation Request"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Request Replacement Modal */}
      <Modal
        isOpen={isReplacementOpen}
        onClose={() => setIsReplacementOpen(false)}
        title="Request Replacement Session"
        subtitle={`Original Missed Session: Day ${selectedSession?.dayNumber} (${selectedSession?.course?.therapyName})`}
      >
        {modalError && <Alert type="error" className="mb-4">{modalError}</Alert>}

        <form onSubmit={handleReplacementSubmit} className="space-y-4 text-xs">
          <div className="p-3 bg-amber-50 rounded-xl text-amber-900 text-[11px] space-y-1">
            <div><strong>Original Missed Session:</strong> {selectedSession && formatDate(selectedSession.sessionDate)} at {selectedSession && formatTime(selectedSession.startTime)}</div>
            <div>The original session will remain in your treatment history as MISSED, and an approved replacement session will be added to complete your course.</div>
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              Reason / Availability Note (Required)
            </label>
            <textarea
              rows={3}
              required
              placeholder="e.g. Requesting replacement session to complete treatment course..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-1 focus:ring-ayur-600 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Preferred Replacement Date (Optional)
              </label>
              <input
                type="date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-1 focus:ring-ayur-600 text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Preferred Time (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 10:00 AM or Morning"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-1 focus:ring-ayur-600 text-xs"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsReplacementOpen(false)}
              className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-xl font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || reason.trim().length < 3}
              className="px-5 py-2 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Submit Replacement Request"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
